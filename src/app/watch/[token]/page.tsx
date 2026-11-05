import { SpectatorGame } from "@/components/spectator-game";
import { Suspense } from "react";

export const metadata = { title: "Watch a game | World Conquerer", robots: { index: false, follow: false } };

async function WatchContent({ params }: { params: Promise<{ token: string }> }) {
  return <SpectatorGame token={(await params).token} />;
}

export default function WatchPage({ params }: { params: Promise<{ token: string }> }) {
  return <Suspense fallback={<p className="p-8" role="status">Loading spectator view…</p>}><WatchContent params={params} /></Suspense>;
}
