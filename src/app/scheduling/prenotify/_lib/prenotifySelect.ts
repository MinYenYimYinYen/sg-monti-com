import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { NotificationType } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { CallAhead } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { ContactPoint } from "@/app/realGreen/_lib/subTypes/PhoneRaw";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { hashParams } from "@/store/reduxUtil/hashParams";
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

          // Level 2: Group callAheads by NotificationType
          const callAheadsByType = new Grouper(
            services.flatMap((s) => s.x.callAheads),
          )
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

type RoboPreNotifData = {
  serviceName: string;
  points: string[];
};

type EmailPreNotifData = {
  subject: string;
  message: string;
  points: string[];
};

type TextPreNotifData = {
  message: string;
  points: string[];
}

const getMessages = {
  [NotificationType.Phone]: (
    _date: string,
    prenotificationData: PrenotificationData[],
  ) => {
    const pointsByServCode = new Map<string, string[]>();
    prenotificationData.forEach((pnData) => {
      const { customer, services, callAheads, contactPoints } = pnData;
      const serviceName = services.map((s) => s.servCode.longName).join(", ");
      const existingPoints = pointsByServCode.get(serviceName) || [];
      pointsByServCode.set(serviceName, [
        ...existingPoints,
        ...pnData.contactPoints.map((cp) => cp.point).join(","),
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
    prenotificationData.forEach((pnData) => {
      const { customer, services, callAheads, contactPoints } = pnData;
      const serviceName = services.map((s) => s.servCode.longName).join(", ");
      const keywordMessage = callAheads
        .map((ca) => ca.keywordMessage)
        .join(" ");
      const existingPoints = pointsByServCodeAndMsg.get(serviceName) || [];
      const hashKey = serviceName + "♪" + keywordMessage;
      pointsByServCodeAndMsg.set(hashKey, [
        ...existingPoints,
        ...pnData.contactPoints.map((cp) => cp.point).join(";"),
      ]);
    });
    const emailDataUnchunked: EmailPreNotifData[] = Array.from(pointsByServCodeAndMsg.entries()).map(
      ([hashKey, points]) => {
        const [serviceName, keywordMessage] = hashKey.split("♪");
        const baseMessage = `Hello!\nWe have your ${serviceName} scheduled for ${date}, weather permitting.\nThank You!\nSpring-Green\nFeel free to call or text us at 763-489-0007`;
        const message = [baseMessage, keywordMessage].join(". ").trim();
        const subject = `Spring-Green: ${serviceName} scheduled for ${date}`;
        return { subject, message, points };
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
    prenotificationData.forEach((pnData) => {
      const { customer, services, callAheads, contactPoints } = pnData;
      const serviceName = services.map((s) => s.servCode.longName).join(", ");
      const keywordMessage = callAheads
        .map((ca) => ca.keywordMessage)
        .join(" ");
      const existingPoints = pointsByServCodeAndMsg.get(serviceName) || [];
      const hashKey = serviceName + "♪" + keywordMessage;
      pointsByServCodeAndMsg.set(hashKey, [
        ...existingPoints,
        ...pnData.contactPoints.map((cp) => cp.point).join(";"),
      ]);
    });
    const textDataUnchunked: TextPreNotifData[] = Array.from(pointsByServCodeAndMsg.entries()).map(
      ([hashKey, points]) => {
        const [serviceName, keywordMessage] = hashKey.split("♪");
        const baseMessage = `Hi, this is Spring-Green! We have your ${serviceName} scheduled for ${date}, weather permitting.`;
        const message = [baseMessage, keywordMessage].join(". ").trim();
        return { message, points };
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
};
