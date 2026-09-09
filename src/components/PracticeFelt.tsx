"use client";

import { useRef, type ReactNode, type PointerEvent } from "react";
import { ChipStack } from "@/components/ChipDisc";
import type { Box, Die, PracticeBets, PracticeSpot, Puck } from "@/lib/types";

const POINTS: Box[] = [4, 5, 6, 8, 9, 10];

function Spot({
  spot,
  label,
  amount,
  className = "",
  hit = false,
  onTap,
  onSwipeOff,
  onMove,
  children,
}: {
  spot: PracticeSpot;
  label?: string;
  amount: number;
  className?: string;
  hit?: boolean;
  onTap: (spot: PracticeSpot) => void;
  onSwipeOff?: (spot: PracticeSpot) => void;
  onMove?: (from: PracticeSpot, to: PracticeSpot) => void;
  children?: ReactNode;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);

  function down(e: PointerEvent<HTMLButtonElement>) {
    start.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function finish(e: PointerEvent<HTMLButtonElement>) {
    const s = start.current;
    start.current = null;
    if (!s) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (amount > 0 && (Math.abs(dx) > 28 || Math.abs(dy) > 28)) {
      const hits = document.elementsFromPoint(e.clientX, e.clientY);
      for (const node of hits) {
        if (!(node instanceof Element)) continue;
        const el = node.closest("[data-spot]");
        const to = el?.getAttribute("data-spot") as PracticeSpot | null;
        if (to && to !== spot) {
          onMove?.(spot, to);
          return;
        }
      }
      onSwipeOff?.(spot);
      return;
    }
    if (Math.abs(dx) < 14 && Math.abs(dy) < 14) onTap(spot);
  }

  return (
    <button
      type="button"
      data-spot={spot}
      onPointerDown={down}
      onPointerUp={finish}
      onPointerCancel={finish}
      className={`cs-spot ${className} ${amount ? "has-bet" : ""} ${hit ? "hit-roll" : ""}`}
      aria-label={`${label || spot}${amount ? ` $${Math.round(amount)}` : ""}`}
    >
      {children ?? <span className="cs-lab">{label}</span>}
      {amount > 0 ? <ChipStack amount={amount} compact /> : null}
    </button>
  );
}

function Puck({ on, off = false }: { on?: boolean; off?: boolean }) {
  if (off) {
    return (
      <span className="puck puck-off" aria-label="Puck off">
        OFF
      </span>
    );
  }
  if (on) {
    return (
      <span className="puck puck-on" aria-label="Puck on">
        ON
      </span>
    );
  }
  return null;
}

function DiePip({ n, size = 18 }: { n: Die; size?: number }) {
  const pips: Record<Die, [number, number][]> = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72]],
  };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="cs-die" aria-hidden>
      <rect x="6" y="6" width="88" height="88" rx="16" fill="#b42318" />
      {pips[n].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={n === 6 ? 8 : 9} fill="#fff" />
      ))}
    </svg>
  );
}

function Pair({ a, b }: { a: Die; b: Die }) {
  return (
    <span className="cs-pair">
      <DiePip n={a} />
      <DiePip n={b} />
    </span>
  );
}

function numLabel(n: Box) {
  if (n === 6) return "SIX";
  if (n === 9) return "NINE";
  return String(n);
}

export function PracticeFelt({
  bets,
  puck,
  lastTotal,
  onTap,
  onSwipeOff,
  onMove,
}: {
  bets: PracticeBets;
  puck: Puck;
  lastTotal: number | null;
  take?: boolean;
  onTap: (spot: PracticeSpot) => void;
  onSwipeOff?: (spot: PracticeSpot) => void;
  onMove?: (from: PracticeSpot, to: PracticeSpot) => void;
}) {
  return (
    <div className="cs-table">
      <div className="cs-top">
      {POINTS.map((n) => (
        <div key={n} className="cs-num">
          <div className="cs-lay-row">
            <Spot
              spot={`lay${n}` as PracticeSpot}
              label="LAY"
              amount={bets.lay[n]}
              className="cs-lay"
              onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}
            />
            <Spot
              spot={`layOdds${n}` as PracticeSpot}
              label="ODDS"
              amount={bets.layOdds[n]}
              className={`cs-odds ${bets.lay[n] ? "can-odds" : ""}`}
              onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}
            />
          </div>
          <div className={`cs-num-body ${lastTotal === n ? "hit-roll" : ""}`}>
            <div className="cs-park-col">
              <Spot
                spot={`comeOn${n}` as PracticeSpot}
                label="C"
                amount={bets.comeOn[n]}
                className="cs-come-on"
                onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}
              />
              <Spot
                spot={`comeOdds${n}` as PracticeSpot}
                label="ODDS"
                amount={bets.comeOddsOn[n]}
                className={`cs-odds ${bets.comeOn[n] ? "can-odds" : ""}`}
                onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}
              />
            </div>
            <div className="cs-num-mid">
              {puck.on && puck.point === n ? <Puck on /> : null}
              <span className={`cs-num-word ${n === 6 || n === 9 ? "slant" : ""}`}>{numLabel(n)}</span>
            </div>
            <div className="cs-park-col">
              <Spot
                spot={`dcOn${n}` as PracticeSpot}
                label="DC"
                amount={bets.dcOn[n]}
                className="cs-dc-on"
                onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}
              />
              <Spot
                spot={`dcOdds${n}` as PracticeSpot}
                label="ODDS"
                amount={bets.dcOddsOn[n]}
                className={`cs-odds ${bets.dcOn[n] ? "can-odds" : ""}`}
                onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}
              />
            </div>
          </div>
          {n === 6 || n === 8 ? (
            <Spot
              spot={`place${n}` as PracticeSpot}
              label="PLACE"
              amount={bets.place[n]}
              className="cs-place"
              hit={lastTotal === n}
              onTap={onTap}
              onSwipeOff={onSwipeOff} onMove={onMove}
            />
          ) : (
            <div className="cs-place-buy">
              <Spot
                spot={`place${n}` as PracticeSpot}
                label="PLACE"
                amount={bets.place[n]}
                className="cs-place"
                hit={lastTotal === n}
                onTap={onTap}
                onSwipeOff={onSwipeOff} onMove={onMove}
              />
              <Spot
                spot={`buy${n}` as PracticeSpot}
                label="BUY"
                amount={bets.buy[n]}
                className="cs-buy"
                hit={lastTotal === n}
                onTap={onTap}
                onSwipeOff={onSwipeOff} onMove={onMove}
              />
            </div>
          )}
        </div>
      ))}

      <Spot spot="dc" amount={bets.dc} className="cs-dc" onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}>
        {!puck.on ? <Puck off /> : null}
        <span className="cs-dc-lab">
          Don&apos;t
          <br />
          Come
          <br />
          BAR
        </span>
        <Pair a={6} b={6} />
      </Spot>
      </div>

      <div className="cs-bottom">
      <div className="cs-hard">
        {(
          [
            [4, 2, 2, "7 TO 1"],
            [6, 3, 3, "9 TO 1"],
            [8, 4, 4, "9 TO 1"],
            [10, 5, 5, "7 TO 1"],
          ] as const
        ).map(([n, a, b, pay]) => (
          <Spot
            key={n}
            spot={`hard${n}` as PracticeSpot}
            amount={bets.hard[n]}
            className="cs-hard-spot"
            hit={lastTotal === n}
            onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}
          >
            <Pair a={a} b={b} />
            <span className="cs-pay">{pay}</span>
          </Spot>
        ))}
      </div>

      <div className="cs-horn-high">
        {(
          [
            ["hornHigh2", "HORN HIGH 2", bets.hornHigh2, 2],
            ["hornHigh3", "HORN HIGH 3", bets.hornHigh3, 3],
            ["hornHigh11", "HORN HIGH 11", bets.hornHigh11, 11],
            ["hornHigh12", "HORN HIGH 12", bets.hornHigh12, 12],
          ] as const
        ).map(([spot, lab, amt, tot]) => (
          <Spot
            key={spot}
            spot={spot}
            amount={amt}
            className="cs-badge"
            hit={lastTotal === tot}
            onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}
          >
            <span className="cs-badge-lab">{lab}</span>
          </Spot>
        ))}
      </div>

      <div className="cs-props">
        <Spot
          spot="any7"
          amount={bets.any7}
          className="cs-any7"
          hit={lastTotal === 7}
          onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}
        >
          <span className="cs-pay">4 TO 1</span>
          <span className="cs-red-lab">ANY SEVEN</span>
          <span className="cs-pay">4 TO 1</span>
        </Spot>
        <Spot spot="world" amount={bets.world} className="cs-badge cs-world" hit={lastTotal === 7} onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}>
          <span className="cs-badge-lab">WORLD BET</span>
        </Spot>

        <Spot spot="two" amount={bets.two} className="cs-hop cs-hop-2" hit={lastTotal === 2} onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}>
          <Pair a={1} b={1} />
          <span className="cs-pay">30 TO 1</span>
        </Spot>
        <Spot spot="twelve" amount={bets.twelve} className="cs-hop cs-hop-12" hit={lastTotal === 12} onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}>
          <Pair a={6} b={6} />
          <span className="cs-pay">30 TO 1</span>
        </Spot>
        <Spot
          spot="ce"
          amount={bets.ce}
          className="cs-badge cs-ce"
          hit={lastTotal === 2 || lastTotal === 3 || lastTotal === 11 || lastTotal === 12}
          onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}
        >
          <span className="cs-badge-lab">C &amp; E</span>
        </Spot>

        <Spot spot="three" amount={bets.three} className="cs-hop cs-hop-3" hit={lastTotal === 3} onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}>
          <Pair a={1} b={2} />
          <span className="cs-pay">15 TO 1</span>
        </Spot>
        <Spot spot="yo" amount={bets.yo} className="cs-hop cs-hop-11" hit={lastTotal === 11} onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}>
          <Pair a={5} b={6} />
          <span className="cs-pay">15 TO 1</span>
        </Spot>
        <Spot
          spot="threeWay"
          amount={bets.threeWay}
          className="cs-badge cs-3way"
          hit={lastTotal === 2 || lastTotal === 3 || lastTotal === 12}
          onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}
        >
          <span className="cs-badge-lab">3-WAY CRAPS</span>
        </Spot>

        <Spot
          spot="anyCraps"
          amount={bets.anyCraps}
          className="cs-anycraps"
          hit={lastTotal === 2 || lastTotal === 3 || lastTotal === 12}
          onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}
        >
          <span className="cs-pay">7 TO 1</span>
          <span className="cs-red-lab">ANY CRAPS</span>
          <span className="cs-pay">7 TO 1</span>
        </Spot>
        <Spot
          spot="horn"
          amount={bets.horn}
          className="cs-badge cs-horn-btn"
          hit={lastTotal === 2 || lastTotal === 3 || lastTotal === 11 || lastTotal === 12}
          onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}
        >
          <span className="cs-badge-lab">HORN BET</span>
        </Spot>
      </div>

      <div className="cs-lines">
        <Spot
          spot="come"
          amount={bets.come}
          className="cs-come"
          hit={lastTotal === 7 || lastTotal === 11}
          onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}
        >
          <span className="cs-come-lab">COME</span>
        </Spot>
        <Spot
          spot="field"
          amount={bets.field}
          className="cs-field"
          hit={
            lastTotal === 2 ||
            lastTotal === 3 ||
            lastTotal === 4 ||
            lastTotal === 9 ||
            lastTotal === 10 ||
            lastTotal === 11 ||
            lastTotal === 12
          }
          onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}
        >
          <span className="cs-field-row">
            <span className="cs-field-note">Pays Double</span>
            <span className="cs-circ">2</span>
            <span>· 3 · 4 · 9</span>
            <span className="cs-field-lab">FIELD</span>
            <span>10 · 11 ·</span>
            <span className="cs-circ">12</span>
            <span className="cs-field-note">Pays Triple</span>
          </span>
        </Spot>
        <div className="cs-dp-row">
          <Spot spot="dontOdds" amount={bets.dontOdds} className="cs-odds" label="DON'T ODDS" onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove} />
          <Spot spot="dont" amount={bets.dont} className="cs-dp" onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}>
            <span className="cs-red-lab">DON&apos;T PASS BAR</span>
            <Pair a={6} b={6} />
          </Spot>
        </div>
        <div className="cs-pass-row">
          <Spot
            spot="pass"
            amount={bets.pass}
            className="cs-pass"
            hit={lastTotal === 7 || lastTotal === 11}
            onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove}
          >
            <span className="cs-pass-lab">PASS LINE</span>
          </Spot>
          <Spot spot="passOdds" amount={bets.passOdds} className="cs-odds" label="ODDS" onTap={onTap} onSwipeOff={onSwipeOff} onMove={onMove} />
        </div>
      </div>
      </div>
    </div>
  );
}
