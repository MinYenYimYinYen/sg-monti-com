import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { NotificationType } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { CallAhead } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { ContactPoint } from "@/app/realGreen/_lib/subTypes/PhoneRaw";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

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

            if (!allowedContactTypes) {
              console.error('❌ ERROR: allowedContactTypes is undefined!');
              console.error('notificationType:', notificationType);
              console.error('phoneMap keys:', Object.keys(globalSettings.phoneMap));
              console.error('phoneMap:', globalSettings.phoneMap);
              console.error('Sample callAhead:', callAheads[0]);
            }

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

export const prenotifySelect = {
  prenotifications: selectPrenotifications,
  summaries: selectPrenotificationSummaries,
};
