import { StyleSheet } from "@react-pdf/renderer";

export const coverSheetsStyles = StyleSheet.create({
  page: {
    padding: 16,
    fontSize: 12,
  },
  service: {
    width: "100%",
    border: "1px solid black",
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  tempSeq: {
    fontSize: "16px",
    height: "24px",
    width: "24px",
    fontWeight: "bold",
    border: "1px solid black",
    borderRadius: "9999px",
    textAlign: "center",
  },
});
