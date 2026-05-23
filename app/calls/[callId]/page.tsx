import { notFound } from "next/navigation";

import { CallDetail } from "@/features/call-detail/CallDetail";
import { loadCallDetail } from "@/server/dashboard/load-call-detail";

export const dynamic = "force-dynamic";

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const { callId } = await params;
  const row = await loadCallDetail(callId);
  if (!row) notFound();
  return <CallDetail row={row} />;
}
