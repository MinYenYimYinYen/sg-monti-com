import type { Metadata } from "next";
import "../style/globals.scss";
import "react-toastify/dist/ReactToastify.css";
import { Providers } from "./providers";
import { ReactNode } from "react";
import NavBar from "@/components/NavBar";
import { ToastContainer } from "react-toastify";

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
    <html lang="en">
      <body>
        <NavBar />
        <Providers>{children}</Providers>
        <ToastContainer />
      </body>
    </html>
  );
}
