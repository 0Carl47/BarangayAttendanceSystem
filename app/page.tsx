"use client";

import dynamic from "next/dynamic";

const LegacyApp = dynamic(() => import("@/components/LegacyApp.jsx"), { ssr: false });

export default function Page() {
  return <LegacyApp />;
}
