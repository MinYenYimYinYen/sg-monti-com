import {
  AssignableUser,
  CardAssignment,
} from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";

// Pure helpers for naming the person behind a card on screen.

/** "Luke Holker" becomes "Luke H.". A single word stays as it is, and nothing gives "". */
export function formatFirstNameLastInitial({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}): string {
  const first = firstName.trim();
  const lastInitial = lastName.trim().charAt(0).toUpperCase();
  if (!first) return lastInitial ? `${lastInitial}.` : "";
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

/**
 * The name shown above a transaction. A cardholder name typed on the card assignment wins,
 * because it names the person holding the card. Otherwise the site user responsible for the card
 * is shown. Several typed words are read as first name then last name, so the last word gives the
 * initial ("Mary Jo Smith" is "Mary S."). An unassigned card gives "", and the card number is
 * still shown under the description.
 */
export function formatCardholderLabel({
  cardAssignment,
  user,
}: {
  cardAssignment: Pick<CardAssignment, "cardholderName"> | undefined;
  user: Pick<AssignableUser, "firstName" | "lastName"> | undefined;
}): string {
  const typedWords = (cardAssignment?.cardholderName ?? "").trim().split(/\s+/).filter(Boolean);
  if (typedWords.length === 1) return typedWords[0];
  if (typedWords.length > 1) {
    return formatFirstNameLastInitial({
      firstName: typedWords[0],
      lastName: typedWords[typedWords.length - 1],
    });
  }
  return user ? formatFirstNameLastInitial(user) : "";
}
