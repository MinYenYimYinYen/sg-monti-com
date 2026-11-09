import {
  RgAccountCore,
  RgAccountRaw,
} from "@/app/realGreen/rgAccount/RgAccountTypes";

function remapRgAccount(raw: RgAccountRaw): RgAccountCore {
  return {
    rgAccountId: raw.accountID,
    rgDescription: raw.accountDescription,
  };
}

export function remapRgAccounts(raw: RgAccountRaw[]): RgAccountCore[] {
  return raw.map(remapRgAccount);
}
