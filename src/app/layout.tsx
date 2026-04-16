import type { Metadata } from "next";
import "../style/tailwind.css";
import "../style/globals.css";

import "react-toastify/dist/ReactToastify.css";
import { Providers } from "./providers";
import { ReactNode } from "react";
import NavBar from "@/components/navBar/NavBar";
import { ToastContainer } from "react-toastify";
import {GlobalLoader} from "@/components/globalLoader/GlobalLoader";

export const metadata: Metadata = {
  title: "SG Monti",
  description: "Tools for SGMonti",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={"h-screen flex flex-col"}>
        <Providers>
          <NavBar />
          <GlobalLoader />
          <main className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 min-h-0 overflow-hidden">
              {children}
            </div>
            <div id="footer-portal" className="h-6 shrink-0" />
          </main>
        </Providers>
        <ToastContainer />
      </body>
    </html>
  );
}
