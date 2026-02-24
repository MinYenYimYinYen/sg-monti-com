import { StyleSheet } from "@react-pdf/renderer";

export const headerStyles = StyleSheet.create({
  header: {
    padding: "3px 2px",
    width: "100%",
    border: "1px solid black",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: "10px",
  },
  servCode: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
  },
  servCodeValue: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    width: 20,
  },
});
