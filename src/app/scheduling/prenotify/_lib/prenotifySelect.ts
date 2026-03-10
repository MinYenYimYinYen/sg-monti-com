import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { NotificationType } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { CallAhead } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { ContactPoint } from "@/app/realGreen/_lib/subTypes/PhoneRaw";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { chunkObjectArray } from "@/lib/primatives/typeUtils/chunkArray";

export type PrenotificationData = {
  customer: Customer;
  services: Service[];
  callAheads: CallAhead[];
  contactPoints: ContactPoint[];
};

export type PrenotificationMap = Map<
  string,
  Map<NotificationType, Map<number, PrenotificationData>>
>;

export type DateSummary = {
  serviceCount: number;
  notificationCounts: Map<NotificationType, number>;
};

const selectPrenotifications = createSelector(
  [centralSelect.customers, globalSettingsSelect.settings],
  (customers, globalSettings): PrenotificationMap => {
    const result = new Map<
      string,
      Map<
        NotificationType,
        Map<
          number,
          {
            customer: Customer;
            services: Service[];
            callAheads: CallAhead[];
            contactPoints: ContactPoint[];
          }
        >
      >
    >();

    customers
      .filter((c) => c.x.hasPrintedServices)
      .forEach((customer) => {
        // Level 1: Group services by scheduleDate
        const servicesByDate = new Grouper(customer.x.printedServices)
          .groupBy((s) => s.lastAssigned.schedDate)
          .toMap();

        servicesByDate.forEach((services, scheduleDate) => {
          // Ensure date key exists in result
          if (!result.has(scheduleDate)) {
            result.set(scheduleDate, new Map());
          }
          const dateMap = result.get(scheduleDate)!;

          // Deduplicate callAheads by callAheadId before grouping
          const allCallAheads = services.flatMap((s) => s.x.callAheads);
          const uniqueCallAheadsMap = new Map<number, CallAhead>();
          allCallAheads.forEach((ca) => {
            uniqueCallAheadsMap.set(ca.callAheadId, ca);
          });
          const uniqueCallAheads = Array.from(uniqueCallAheadsMap.values());

          // Level 2: Group callAheads by NotificationType
          const callAheadsByType = new Grouper(uniqueCallAheads)
            .groupBy((ca) => ca.type)
            .toMap();

          callAheadsByType.forEach((callAheads, notificationType) => {
            // Ensure notificationType key exists in dateMap
            if (!dateMap.has(notificationType)) {
              dateMap.set(notificationType, new Map());
            }
            const typeMap = dateMap.get(notificationType)!;

            // Level 3: Build contact points using phoneMap and set customer data
            const allowedContactTypes =
              globalSettings.phoneMap[notificationType];

            const contactPointMap = new Map<string, ContactPoint>();

            customer.contactPoints
              .filter((cp) => allowedContactTypes?.includes(cp.type))
              .forEach((cp) => {
                contactPointMap.set(`${cp.type}:${cp.point}`, cp);
              });

            typeMap.set(customer.custId, {
              customer,
              services, // ALL services for this date
              callAheads, // Only callAheads with this notificationType
              contactPoints: Array.from(contactPointMap.values()),
            });
          });
        });
      });

    return result;
  },
);

const selectPrenotificationSummaries = createSelector(
  [selectPrenotifications],
  (prenotifications): Map<string, DateSummary> => {
    const summaries = new Map<string, DateSummary>();

    prenotifications.forEach((dateMap, date) => {
      // Count unique services across all customers for this date
      const serviceSet = new Set<number>();

      dateMap.forEach((customerMap) => {
        customerMap.forEach(({ services }) => {
          services.forEach((service) => serviceSet.add(service.servId));
        });
      });

      // Build notification counts map from existing types
      const notificationCounts = new Map<NotificationType, number>();
      dateMap.forEach((customerMap, notificationType) => {
        notificationCounts.set(notificationType, customerMap.size);
      });

      summaries.set(date, {
        serviceCount: serviceSet.size,
        notificationCounts,
      });
    });

    return summaries;
  },
);

const selectPrenotificationsByDateAndType = (
  date: string,
  type: NotificationType,
) =>
  createSelector([selectPrenotifications], (prenotifications) => {
    return prenotifications.get(date)?.get(type);
  });

export type RoboPreNotifData = {
  serviceName: string;
  points: string[];
};

export type EmailPreNotifData = {
  subject: string;
  message: string;
  points: string[];
  hashKey: string;
};

export type TextPreNotifData = {
  message: string;
  points: string[];
  hashKey: string;
}

export const getMessages = {
  [NotificationType.Phone]: (
    _date: string,
    prenotificationData: PrenotificationData[],
  ) => {
    const pointsByServCode = new Map<string, string[]>();
    prenotificationData.forEach((pnData) => {
      const { customer, services, callAheads, contactPoints } = pnData;
      console.log("contactPoints", contactPoints);
      const serviceName = services.map((s) => s.servCode.longName).join(", ");
      const existingPoints = pointsByServCode.get(serviceName) || [];
      pointsByServCode.set(serviceName, [
        ...existingPoints,
        ...contactPoints.map((cp) => cp.point.slice(0,10)),
      ]);
    });
    const roboData: RoboPreNotifData[] = Array.from(
      pointsByServCode.entries(),
    ).map(([serviceName, points]) => {
      return { serviceName, points };
    });
    return roboData;
  },
  [NotificationType.Email]: (
    date: string,
    prenotificationData: PrenotificationData[],
  ) => {
    const pointsByServCodeAndMsg = new Map<string, string[]>();
    const keywordIdToMessage = new Map<string, string>();

    prenotificationData.forEach((pnData) => {
      const { customer, services, callAheads, contactPoints } = pnData;
      const serviceName = services.map((s) => s.servCode.longName).join(", ");

      // Build keyword ID to message mapping and collect unique keyword IDs
      const uniqueKeywordIds = new Set<string>();
      callAheads.forEach((ca) => {
        ca.keywordIds.forEach((keywordId) => {
          uniqueKeywordIds.add(keywordId);
          if (!keywordIdToMessage.has(keywordId)) {
            keywordIdToMessage.set(keywordId, ca.keywordMessage);
          }
        });
      });

      const keywordIds = Array.from(uniqueKeywordIds).join(",");
      const hashKey = serviceName + "♪" + keywordIds;
      const existingPoints = pointsByServCodeAndMsg.get(hashKey) || [];
      pointsByServCodeAndMsg.set(hashKey, [
        ...existingPoints,
        ...contactPoints.map((cp) => cp.point),
      ]);
    });
    const emailDataUnchunked: EmailPreNotifData[] = Array.from(pointsByServCodeAndMsg.entries()).map(
      ([hashKey, points]) => {
        const [serviceName, keywordIdsStr] = hashKey.split("♪");
        const keywordIds = keywordIdsStr ? keywordIdsStr.split(",") : [];
        const keywordMessage = keywordIds
          .map((id) => keywordIdToMessage.get(id))
          .filter(Boolean)
          .join(" ");
        const baseMessage = `Hello!\nWe have your ${serviceName} scheduled for ${date}, weather permitting.\nThank You!\nSpring-Green\nFeel free to call or text us at 763-489-0007`;
        const message = [baseMessage, keywordMessage].join(" ").trim();
        const subject = `Spring-Green: ${serviceName} scheduled for ${date}`;
        return { subject, message, points, hashKey: hashKey.replace("♪", "-") };
      },
    );

    const emailData: EmailPreNotifData[] = chunkObjectArray(
      emailDataUnchunked,
      "points",
      50,
    );
    return emailData;
  },
  [NotificationType.Text]: (
    date: string,
    prenotificationData: PrenotificationData[],
  ) => {
    const pointsByServCodeAndMsg = new Map<string, string[]>();
    const keywordIdToMessage = new Map<string, string>();

    prenotificationData.forEach((pnData) => {
      const { customer, services, callAheads, contactPoints } = pnData;
      const serviceName = services.map((s) => s.servCode.longName).join(", ");

      // Build keyword ID to message mapping and collect unique keyword IDs
      const uniqueKeywordIds = new Set<string>();
      callAheads.forEach((ca) => {
        ca.keywordIds.forEach((keywordId) => {
          uniqueKeywordIds.add(keywordId);
          if (!keywordIdToMessage.has(keywordId)) {
            keywordIdToMessage.set(keywordId, ca.keywordMessage);
          }
        });
      });

      const keywordIds = Array.from(uniqueKeywordIds).join(",");
      const hashKey = serviceName + "♪" + keywordIds;
      const existingPoints = pointsByServCodeAndMsg.get(hashKey) || [];
      pointsByServCodeAndMsg.set(hashKey, [
        ...existingPoints,
        ...contactPoints.map((cp) => cp.point),
      ]);
    });
    const textDataUnchunked: TextPreNotifData[] = Array.from(pointsByServCodeAndMsg.entries()).map(
      ([hashKey, points]) => {
        const [serviceName, keywordIdsStr] = hashKey.split("♪");
        const keywordIds = keywordIdsStr ? keywordIdsStr.split(",") : [];
        const keywordMessage = keywordIds
          .map((id) => keywordIdToMessage.get(id))
          .filter(Boolean)
          .join(" ");
        const baseMessage = `Hi, this is Spring-Green! We have your ${serviceName} scheduled for ${date}, weather permitting.`;
        const message = [baseMessage, keywordMessage].join(" ").trim();
        return { message, points, hashKey: hashKey.replace("♪", "-") };
      },
    );

    const textData: TextPreNotifData[] = chunkObjectArray(
      textDataUnchunked,
      "points",
      10,
    );
    return textData;
  },
  [NotificationType.Manual]: (
    date: string,
    prenotificationData: PrenotificationData[],
  ) => {
    return [...prenotificationData];
  },
};

const selectPrenotificationMessagePoints = (
  date: string,
  type: NotificationType,
) =>
  createSelector(
    [selectPrenotificationsByDateAndType(date, type)],
    (prenotificationsByCustId) => {
      if (!prenotificationsByCustId) return [];
      const prenotifications = Array.from(prenotificationsByCustId.values());
      return getMessages[type](date, prenotifications);
      // const messageData = prenotifications.map((p) => {
      //   const { customer, services, callAheads, contactPoints } = p;
      //   const serviceName = services
      //     .map((s) => s.servCode.longName)
      //     .join(", ");
      //   const keywordMessages = callAheads.map((ca) => ca.keywordMessage);
      //
      //   return {
      //     date,
      //     type,
      //   };
      // });
    },
  );

export const prenotifySelect = {
  prenotifications: selectPrenotifications,
  summaries: selectPrenotificationSummaries,
  messagePoints: selectPrenotificationMessagePoints,
};
