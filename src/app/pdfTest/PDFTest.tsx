"use client";
import { Page, Document, Text, View } from "@react-pdf/renderer";

export  function PDFTest() {
  return (
    <Document>
      <Page size={"LETTER"}>
        <Text>PDF Test</Text>
        <View>
          <Text>Some other text</Text>
          <Text>This is different again...</Text>
        </View>
      </Page>
    </Document>
  );
}