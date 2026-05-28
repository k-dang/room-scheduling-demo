import { Suspense } from "react";
import { connection } from "next/server";
import { getSchedule } from "@/lib/data";
import { ConcurrencyPageClient } from "./ConcurrencyPageClient";

export default function ConcurrencyPage() {
  return (
    <Suspense fallback={null}>
      <ConcurrencyContent />
    </Suspense>
  );
}

async function ConcurrencyContent() {
  await connection();
  const state = await getSchedule();
  return <ConcurrencyPageClient state={state} />;
}
