import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/app/legal/_components/LegalPage";

export const metadata: Metadata = {
  title: "End-User License Agreement | SG Monti",
};

const sections: LegalSection[] = [
  {
    heading: "1. Who this agreement is with",
    paragraphs: [
      "This End-User License Agreement (the \"Agreement\") is between GM Lawncare Incorporated, a Minnesota corporation doing business as Spring-Green Lawn Care (the \"Company\"), and each person who uses the SG Monti web application at https://sgmonti.com (the \"Application\").",
      "By signing in to or using the Application you agree to this Agreement.",
    ],
  },
  {
    heading: "2. Who may use the Application",
    paragraphs: [
      "The Application is a private, internal business tool. It is available only to employees of the Company. Accounts are created only with administrator approval. Contractors, subcontractors and other outside parties are not given access.",
      "You may not allow anyone else to use your account. You are responsible for keeping your login credentials confidential and for activity under your account.",
    ],
  },
  {
    heading: "3. License",
    paragraphs: [
      "The Company grants you a limited, non-exclusive, non-transferable, revocable right to use the Application solely for the Company's internal business purposes, for as long as you are an employee with an approved account.",
      "You may not copy, resell, reverse engineer or provide the Application to others, or use it for any purpose other than Company business.",
    ],
  },
  {
    heading: "4. Acceptable use",
    paragraphs: [
      "You agree to use the Application honestly and carefully. You may not attempt to access data or functions your role does not permit, interfere with the Application's operation, or enter information you know to be false.",
      "Misuse of the Application may result in loss of access and in disciplinary action under Company policy.",
    ],
  },
  {
    heading: "5. No expectation of privacy; monitoring",
    paragraphs: [
      "The Application is a Company system. Activity on it is subject to administrator supervision and may be logged and reviewed. You should not expect privacy when using it. See the Privacy Policy at https://sgmonti.com/legal/privacy for how information is handled.",
    ],
  },
  {
    heading: "6. Third-party services",
    paragraphs: [
      "The Application connects to third-party services used by the Company, including RealGreen and Intuit QuickBooks Online. Your use of data from those services through the Application remains subject to the Company's policies and to those providers' own terms. Authorized users may use the QuickBooks connection only to record the Company's business transactions.",
    ],
  },
  {
    heading: "7. Company data",
    paragraphs: [
      "All data entered into or produced by the Application, including customer, financial and accounting information, belongs to the Company. You may use it only as your job requires and may not disclose it outside the Company except as the Company authorizes.",
    ],
  },
  {
    heading: "8. Disclaimer of warranties",
    paragraphs: [
      "The Application is provided \"as is\" and \"as available\", without warranties of any kind, express or implied. The Company does not guarantee that the Application will be uninterrupted or error-free. You are responsible for verifying that information, including financial entries sent to accounting systems, is correct.",
    ],
  },
  {
    heading: "9. Limitation of liability",
    paragraphs: [
      "To the extent permitted by law, the Company is not liable to you for indirect, incidental or consequential damages arising from your use of the Application.",
    ],
  },
  {
    heading: "10. Termination",
    paragraphs: [
      "Your access ends when your employment ends, and the Company revokes it immediately at that time. The Company may suspend or end access at any time.",
    ],
  },
  {
    heading: "11. Changes to this Agreement",
    paragraphs: [
      "The Company may update this Agreement from time to time. The current version is always available at https://sgmonti.com/legal/terms. Continued use after a change means you accept the updated Agreement.",
    ],
  },
  {
    heading: "12. Governing law",
    paragraphs: [
      "This Agreement is governed by the laws of the State of Minnesota, without regard to its conflict-of-law rules.",
    ],
  },
  {
    heading: "13. Contact",
    paragraphs: [
      "Luke Holker, Spring-Green Lawn Care, PO Box 1145, Monticello, MN 55362. Email: luke@sgmonti.com.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="End-User License Agreement"
      effectiveDate="November 2, 2026"
      sections={sections}
    />
  );
}
