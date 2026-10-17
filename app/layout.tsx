import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ui/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Na Régua+",
  description: "Agendamento online para sua barbearia",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" className={`${geistSans.variable} h-full antialiased`}>
      <body className={`${geistSans.className} sharp-ui min-h-full flex flex-col`}>
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
