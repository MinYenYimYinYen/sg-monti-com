import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/app/legal/_components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | SG Monti",
};

const sections: LegalSection[] = [
  {
    heading: "1. Overview",
    paragraphs: [
      "This Privacy Policy explains how GM Lawncare Incorporated, a Minnesota corporation doing business as Spring-Green Lawn Care (the \"Company\"), handles information in the SG Monti web application at https://sgmonti.com (the \"Application\").",
      "The Application is a private, internal tool for Company employees only. It is not offered to the public, and non-employees do not have access to it.",
    ],
  },
  {
    heading: "2. No expectation of privacy",
    paragraphs: [
      "The Application is a Company system. Everything that happens on it is subject to administrator supervision, and activity may be logged and reviewed. Users should not expect privacy on this system.",
    ],
  },
  {
    heading: "3. Information we collect",
    paragraphs: [
      "Employee account information: your name, username and email address. Your password is stored only as a one-way hash, never in readable form.",
      "Business information used by the Application: customer, program, service, scheduling and similar operational data, much of it mirrored from the Company's RealGreen system.",
      "Accounting information: when the QuickBooks Online connection is used, the Application reads vendors and accounts from the Company's QuickBooks company file and records credit card expense transactions in it. It also stores the QuickBooks authorization tokens needed to keep the connection working.",
      "Credit card statement data: when an authorized user imports a card statement file, the Application stores the transaction date, description, amount and category for each row, and only the last four digits of the card number. It does not store full card numbers, expiration dates or security codes.",
      "Technical data: login session cookies set by the Application, and server logs needed to run and secure it. The Application does not use advertising trackers.",
    ],
  },
  {
    heading: "4. How we use information",
    paragraphs: [
      "We use information only to operate the Company's business: authenticating employees, scheduling and managing work, and recording the Company's expenses in its accounting system. We do not sell information, and we do not use it for advertising.",
    ],
  },
  {
    heading: "5. QuickBooks Online data",
    paragraphs: [
      "Access to QuickBooks Online is authorized by a Company administrator through Intuit's standard OAuth consent process. The Application uses that access only to read vendors and accounts and to create expense transactions for the Company. QuickBooks data is not shared outside the Company or used for any other purpose.",
      "QuickBooks authorization tokens are encrypted before they are stored and are never sent to a user's browser. An administrator can disconnect the Application from QuickBooks at any time, and the Company can also revoke access from within QuickBooks or through Intuit.",
    ],
  },
  {
    heading: "6. Who can see information",
    paragraphs: [
      "Only approved Company employees can sign in, and what each person can see or do depends on their role. Administrators can review activity on the system. Contractors and subcontractors have no access.",
    ],
  },
  {
    heading: "7. Service providers and sharing",
    paragraphs: [
      "The Application is hosted on Vercel, and its data is stored in MongoDB. These providers process information on the Company's behalf to run the Application. The Application also exchanges data with RealGreen and Intuit QuickBooks Online as described above.",
      "We do not otherwise disclose information to third parties, except where required by law.",
    ],
  },
  {
    heading: "8. Security",
    paragraphs: [
      "We use reasonable safeguards, including encrypted connections (HTTPS), hashed passwords, role-based access, encryption of stored QuickBooks tokens, and immediate removal of access when an employee leaves. No system is completely secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    heading: "9. Retention",
    paragraphs: [
      "We keep information for as long as it is needed for the Company's business and recordkeeping. When an employee leaves the Company, their access is revoked immediately. Records of past business activity may be kept after that for operational, accounting and legal purposes.",
    ],
  },
  {
    heading: "10. Your questions and requests",
    paragraphs: [
      "Because the Application is an internal employee system, questions about your information, or requests to correct it, should be directed to the contact below.",
    ],
  },
  {
    heading: "11. Changes to this policy",
    paragraphs: [
      "We may update this policy from time to time. The current version is always available at https://sgmonti.com/legal/privacy.",
    ],
  },
  {
    heading: "12. Contact",
    paragraphs: [
      "Luke Holker, Spring-Green Lawn Care, PO Box 1145, Monticello, MN 55362. Email: luke@sgmonti.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      effectiveDate="November 2, 2026"
      sections={sections}
    />
  );
}
