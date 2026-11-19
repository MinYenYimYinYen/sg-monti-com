import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import {
  PostSalesTaxPaymentResult,
  RetrySalesTaxAttachmentsResult,
  SalesTaxPaymentStatus,
} from "@/app/salesTax/salesTaxPosting/SalesTaxPostingTypes";

// Posting writes to the real books, so post and retryAttachments hold the journal entry write
// capability (qboJournalEntries.write). Reading what was stored needs only the history read.
export interface SalesTaxPostingContract extends ApiContract {
  // Our own stored record of a month's payment, its adjustment and its files. Never touches QuickBooks.
  getStatus: {
    params: { periodEnd: string };
    result: DataResponse<SalesTaxPaymentStatus>;
  };
  // Posts the adjustment (when one is needed) and then the payment, and attaches the two files to
  // the payment once it has posted. The server re-reads the month-end balance and refuses to send
  // if it is not the one the caller saw. The amount is in whole cents.
  post: {
    params: {
      periodEnd: string;
      paymentCents: number;
      expectedBalanceCents: number;
      returnFileText: string;
      taxCodeReportCsv: string;
    };
    result: DataResponse<PostSalesTaxPaymentResult>;
  };
  // Attaches whatever the posted payment is still missing in QuickBooks. Creates no entry.
  retryAttachments: {
    params: { periodEnd: string };
    result: DataResponse<RetrySalesTaxAttachmentsResult>;
  };
}
