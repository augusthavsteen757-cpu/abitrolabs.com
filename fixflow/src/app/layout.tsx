import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FixFlow – forstå dit håndværkertilbud", template: "%s · FixFlow" },
  description:
    "Upload dit håndværkertilbud og få det forklaret på almindeligt dansk: skjulte udgifter, uklare poster og de spørgsmål, du bør stille, før du skriver under.",
};

export const viewport: Viewport = { themeColor: "#f7f6f2", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  );
}
