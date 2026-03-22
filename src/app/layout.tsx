import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BattleLearn",
  description:
    "Transform classroom learning into an asynchronous, cooperative RPG boss fight.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
