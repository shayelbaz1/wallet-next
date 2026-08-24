// Replaces the old index.html. Heebo is self-hosted via next/font instead of
// the two Google Fonts <link>s, so there's no render-blocking external request.
// <Wallet/> flips documentElement lang/dir at runtime for the language toggle;
// these are just the initial values.
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata = {
  title: "Wallet · ארנק",
  icons: { icon: "/favicon.svg" },
  // No auth yet — keep this out of search results.
  robots: { index: false, follow: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body>{children}</body>
    </html>
  );
}
