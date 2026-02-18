"use client";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import { PDFTest } from "@/app/pdfTest/PDFTest";
import { useIsClient } from "@/lib/hooks/useIsClient";
import { useState } from "react";

export default function PDFTestPage() {
  const isClient = useIsClient();
  const [, setRefresh] = useState(0);

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {isClient && (
          <>
            <PDFDownloadLink document={<PDFTest />} fileName="test.pdf">
              {({ loading }) => (loading ? "Building PDF..." : "Download PDF")}
            </PDFDownloadLink>
            <button onClick={() => setRefresh((r) => r + 1)}>Refresh PDF</button>
          </>
        )}
      </div>

      <div style={{ height: "80vh", border: "1px solid #ddd" }}>
        {isClient && (
          <PDFViewer style={{ width: "100%", height: "100%" }} showToolbar={false}>
            <PDFTest />
          </PDFViewer>
        )}
      </div>
    </div>
  );
}