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
      <body suppressHydrationWarning>
        <Providers>
          <NavBar />
          <GlobalLoader />
          {children}
        </Providers>
        <ToastContainer />
        <div id="footer-portal" />
      </body>
    </html>
  );
}
