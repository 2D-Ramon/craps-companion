"use client";

import Link from "next/link";
import { LiveTable } from "@/components/LiveTable";
import { useStore } from "@/lib/store";

export default function LivePage() {
  const { hydrated, active } = useStore();
  if (!hydrated) return <p className="text-muted pt-8">Loading session…</p>;
  if (!active) {
    return (
      <div className="pt-8 space-y-4">
        <p className="text-muted">No live session.</p>
        <Link href="/" className="inline-flex h-12 items-center px-4 rounded-xl bg-gold text-felt-deep font-semibold">
          Buy in
        </Link>
      </div>
    );
  }
  return <LiveTable />;
}
