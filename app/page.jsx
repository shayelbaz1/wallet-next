"use client";

// The dashboard seeds its initial state from localStorage (language, expenses,
// finance), so a server-rendered pass would always disagree with the client and
// throw a hydration mismatch. localStorage is the source of truth on first
// paint and there's no meaningful server HTML to produce, so this renders
// client-side only.
import { StrictMode } from "react";
import dynamic from "next/dynamic";

const Wallet = dynamic(() => import("@/lib/Wallet"), {
  ssr: false,
  // Matches the app background so there's no flash before mount.
  loading: () => <div className="min-h-screen bg-slate-950" />,
});

export default function Page() {
  return (
    <StrictMode>
      <Wallet />
    </StrictMode>
  );
}
