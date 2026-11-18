// This business files one Minnesota sales tax location, registered as 001, and files monthly. Both
// are hardcoded on purpose: a second location or a quarterly filing would need real settings.
export const MN_RETURN_LOCATION = "001";

/** `O` is an original return; `A` replaces one already filed, so it must carry the correct totals. */
export type MnReturnAmendFlag = "O" | "A";

export const MN_RETURN_LINE_ENDING = "\r\n";

// The first row, the third row and the first column of the file are reserved for the filer's own
// use. The state's example files fill them with these labels, so the export does the same.
export const MN_RETURN_FILLER = "FILLER";
