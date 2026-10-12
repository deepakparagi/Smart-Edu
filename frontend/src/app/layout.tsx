import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Smart Study | Your learning, in focus", description: "A calm workspace for focused learning." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
