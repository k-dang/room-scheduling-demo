import { Suspense } from "react";
import { connection } from "next/server";
import { HomePageClient } from "./HomePageClient";
import { getSchedule } from "@/lib/data";

export default function HomePage() {
  return (
    <Suspense
      fallback={<div style={{ minHeight: "100vh", background: "#F8F7F5" }} />}
    >
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  // `todayBase()` calls new Date() in client components — under cacheComponents
  // that's request-time data, so defer this subtree to request time.
  await connection();
  const state = await getSchedule();
  return <HomePageClient state={state} />;
}
