"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { pausePractice } from "@/lib/practice";
import { useStore } from "@/lib/store";

const TABS = [
  { href: "/", label: "Table", match: (p: string) => p === "/" || p.startsWith("/live") },
  { href: "/stats", label: "Stats" },
  { href: "/history", label: "History" },
  { href: "/rules", label: "Rules" },
  { href: "/practice", label: "Practice" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { active } = useStore();
  const practice = path === "/practice";
  const prev = useRef(path);
  useEffect(() => {
    if (prev.current === "/practice" && path !== "/practice") pausePractice();
    prev.current = path;
  }, [path]);
  return (
    <div className={`felt-bg min-h-dvh flex flex-col ${practice ? "shell-practice" : ""}`}>
      <a href="#main" className="df-skip">
        Skip to content
      </a>
      <header className="shell-header sticky top-0 z-20 bg-felt-deep/90 backdrop-blur border-b border-gold/40 px-4 pt-[max(0.6rem,env(safe-area-inset-top))] pb-2">
        <div className="flex items-baseline justify-between max-w-lg mx-auto">
          <p className="font-[family-name:var(--font-display)] tracking-[0.28em] text-gold text-[15px]">
            CRAPS
          </p>
          {practice ? (
            <p className="text-[11px] text-muted uppercase tracking-widest shrink-0">Practice</p>
          ) : active ? (
            <p className="text-[11px] text-gold/80 uppercase tracking-widest">
              Live · {active.casino || "table"}
            </p>
          ) : (
            <p className="text-[11px] text-muted uppercase tracking-widest">Step away. Tap. Glance.</p>
          )}
        </div>
      </header>
      <main
        id="main"
        className={
          practice
            ? "shell-main-practice flex-1 w-full min-h-0"
            : "flex-1 w-full max-w-lg mx-auto px-3 pb-36 pt-3"
        }
      >
        {children}
      </main>
      <nav className="shell-nav fixed bottom-0 inset-x-0 z-10 bg-felt-deep/95 border-t border-gold/30 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
        <div className="max-w-lg mx-auto grid grid-cols-5 text-center">
          {TABS.map((t) => {
            const on = t.match ? t.match(path) : path === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`py-3 text-xs tracking-wide ${
                  on ? "text-gold font-semibold border-t-2 border-gold -mt-px" : "text-muted"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
