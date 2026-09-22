import { Inter } from "next/font/google";
import "@/assets/css/globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "FloodWatch Cebu",
  description: "FloodWatch Cebu — Tactical Disaster Response & Disaster Management Platform",
  icons: {
    icon: "/logofloodwatch.png",
    shortcut: "/logofloodwatch.png",
    apple: "/logofloodwatch.png",
  },
  openGraph: {
    title: "FloodWatch Cebu",
    description: "FloodWatch Cebu — Tactical Disaster Response & Disaster Management Platform",
    images: ["/logofloodwatch.png"],
  },
};

export default function RootLayout({ children, modal }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className={`${inter.className} min-h-full flex flex-col`}>
        {children}
        {modal}
      </body>
    </html>
  );
}
