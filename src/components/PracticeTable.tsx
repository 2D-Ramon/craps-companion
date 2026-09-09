"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChipDisc } from "@/components/ChipDisc";
import { DiceFace } from "@/components/DiceFace";
import { GlancePercents } from "@/components/GlancePercents";
import { PracticeFelt } from "@/components/PracticeFelt";
import { RollStrip } from "@/components/RollStrip";
import { CHIP_VALUES, TABLE_MINS, betsOnTable, usePractice } from "@/lib/practice";
import { trueDie } from "@/lib/dice";
import { money } from "@/lib/format";
import type { Die } from "@/lib/types";

export function PracticeTable() {
  const {
    state,
    tapSpot,
    clearSpot,
    setChip,
    toggleTake,
    rollOnce,
    takeAllDown,
    undoBet,
    moveBet,
    repeatBets,
    placeAcross,
    placeInside,
    placeOutside,
    pause,
    resume,
    endGame,
    setBankSettings,
    fill72,
  } = usePractice();
  const [rolling, setRolling] = useState(false);
  const [preview, setPreview] = useState<{ a: Die; b: Die } | null>(null);
  const [sheet, setSheet] = useState(false);
  const [settings, setSettings] = useState(false);
  const [buyDraft, setBuyDraft] = useState(String(state.buyIn));
  const [minDraft, setMinDraft] = useState(String(state.tableMin));
  const [isFull, setIsFull] = useState(false);
  const lock = useRef(false);
  const ivRef = useRef<number>(0);

  useEffect(() => () => window.clearInterval(ivRef.current), []);

  const last = preview ?? (state.last ? { a: state.last.a, b: state.last.b } : null);
  const onTable = betsOnTable(state.bets);
  const pl = state.lastDelta;
  const paused = state.paused;

  useEffect(() => {
    let sentinel: WakeLockSentinel | undefined;
    const grab = async () => {
      try {
        sentinel = await navigator.wakeLock?.request("screen");
      } catch {
        /* unsupported */
      }
    };
    grab();
    const vis = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", vis);
    const onFs = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    onFs();
    return () => {
      document.removeEventListener("visibilitychange", vis);
      document.removeEventListener("fullscreenchange", onFs);
      void sentinel?.release();
    };
  }, [pause]);

  function enterFullscreen() {
    const node = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => void;
      webkitRequestFullScreen?: () => void;
    };
    const req =
      node.requestFullscreen?.bind(node) ||
      node.webkitRequestFullscreen?.bind(node) ||
      node.webkitRequestFullScreen?.bind(node);
    if (req && !document.fullscreenElement) {
      const out = req();
      if (out && typeof (out as Promise<void>).catch === "function") {
        void (out as Promise<void>).catch(() => {
          try {
            void node.requestFullscreen?.({ navigationUI: "hide" });
          } catch {
            /* blocked */
          }
        });
      }
    }
    try {
      const orient = screen.orientation as ScreenOrientation & { lock?: (m: string) => Promise<void> };
      void orient.lock?.("landscape");
    } catch {
      /* not supported */
    }
    window.scrollTo(0, 0);
  }

  function roll() {
    if (lock.current || paused) return;
    lock.current = true;
    setRolling(true);
    let ticks = 0;
    ivRef.current = window.setInterval(() => {
      setPreview({ a: trueDie(), b: trueDie() });
      ticks += 1;
      if (ticks >= 7) {
        window.clearInterval(ivRef.current);
        const pair = rollOnce();
        setPreview({ a: pair.a, b: pair.b });
        setRolling(false);
        lock.current = false;
        if (navigator.vibrate) navigator.vibrate(18);
      }
    }, 55);
  }

  return (
    <div className="practice-stage">
      <div className="practice-hud">
        <Link href="/" className="hud-leave">
          Table
        </Link>
        {!isFull ? (
          <button type="button" className="hud-leave hud-full" onClick={enterFullscreen}>
            Full screen
          </button>
        ) : null}
        <button
          type="button"
          className="hud-stat hud-bank-btn"
          onClick={() => {
            setBuyDraft(String(state.buyIn || state.bank));
            setMinDraft(String(state.tableMin || 5));
            setSettings(true);
          }}
        >
          <span>Bank · min ${state.tableMin || 5}</span>
          <b>{money(state.bank)}</b>
        </button>
        <div className="hud-stat">
          <span>Working</span>
          <b>{money(onTable)}</b>
        </div>
        <div className="hud-stat">
          <span>
            {state.rolls.some((r) => r.shooter === state.shooter) || !state.lastShooterPnl
              ? "Shooter"
              : "Last shooter"}
          </span>
          <b
            className={
              (state.rolls.some((r) => r.shooter === state.shooter) || !state.lastShooterPnl
                ? state.shooterPnl
                : state.lastShooterPnl) >= 0
                ? "text-win"
                : "text-danger"
            }
          >
            {money(
              state.rolls.some((r) => r.shooter === state.shooter) || !state.lastShooterPnl
                ? state.shooterPnl || 0
                : state.lastShooterPnl || 0,
              true
            )}
          </b>
        </div>
        <div className={`hud-dice ${rolling ? "is-rolling" : ""}`}>
          <div className="hud-puck">
            <span>{state.puck.on ? "Puck on" : "Puck off"}</span>
            <b>{state.puck.on ? `POINT ${state.puck.point}` : "COME OUT"}</b>
          </div>
          {last ? (
            <>
              <DiceFace n={last.a} size={34} rolling={rolling} />
              <DiceFace n={last.b} size={34} rolling={rolling} />
              <div className="hud-total">
                <b className={state.last?.total === 7 && !rolling ? "text-seven" : ""}>
                  {last.a + last.b}
                </b>
              </div>
              <div
                className={`hud-pl ${pl > 0 ? "win" : pl < 0 ? "loss" : "flat"}`}
              >
                {rolling ? "DICE OUT" : money(pl, true)}
              </div>
            </>
          ) : (
            <span className="hud-wait">Place a bet, then roll</span>
          )}
        </div>
        <button
          type="button"
          className={`hud-mode ${state.take ? "taking" : ""}`}
          onClick={toggleTake}
        >
          {state.take ? "REMOVE" : "PLACE"}
        </button>
        <button type="button" className="hud-roll" onClick={roll} disabled={rolling || paused}>
          {rolling ? "OUT" : "ROLL"}
        </button>
      </div>

      <p className="practice-msg">{state.msg || "\u00a0"}</p>

      <div className="roll-ticker" aria-label="Last 30 rolls">
        {(state.log || []).length === 0 ? (
          <span className="roll-ticker-empty">Rolls and win/loss show here</span>
        ) : (
          [...state.log].reverse().map((r, i) => (
            <div
              key={`${r.at}-${i}`}
              className={`roll-tick ${r.delta > 0 ? "win" : r.delta < 0 ? "loss" : ""} ${r.total === 7 ? "seven" : ""}`}
            >
              <span className="roll-tick-n">{r.total}</span>
              <span className="roll-tick-amt">{money(r.delta, true)}</span>
            </div>
          ))
        )}
      </div>

      <div className="table-rail">
        <div className="table-gutter">
          <div className="table-felt">
            <PracticeFelt
              bets={state.bets}
              puck={state.puck}
              lastTotal={rolling ? null : state.last?.total ?? null}
              take={state.take}
              onTap={tapSpot}
              onSwipeOff={clearSpot}
              onMove={moveBet}
            />
          </div>
        </div>
      </div>

      <div className="practice-rail-bottom">
        <div className="chip-tray" role="group" aria-label="Chip rack">
          {CHIP_VALUES.map((c) => (
            <ChipDisc
              key={c}
              denom={c}
              selected={!state.take && state.chip === c}
              onClick={() => setChip(c)}
              size={36}
            />
          ))}
        </div>
        <div className="rail-actions">
          <button type="button" onClick={placeAcross}>
            Across
          </button>
          <button type="button" onClick={placeInside}>
            Inside
          </button>
          <button type="button" onClick={placeOutside}>
            Outside
          </button>
          <button type="button" onClick={repeatBets}>
            Repeat
          </button>
          <button type="button" onClick={undoBet}>
            Undo
          </button>
          <button type="button" className={state.take ? "on" : ""} onClick={toggleTake}>
            Remove
          </button>
          <button type="button" onClick={takeAllDown}>
            Take all
          </button>
          <button type="button" onClick={() => setSheet(true)}>
            Stats
          </button>
          <button type="button" className="end-btn" onClick={endGame}>
            End game
          </button>
        </div>
      </div>

      {paused ? (
        <div className="pause-overlay" role="dialog" aria-label="Practice paused">
          <p>Practice paused</p>
          <span>You left the table. Resume this game or end it and start over.</span>
          <div>
            <button type="button" className="hud-roll" onClick={resume}>
              Resume
            </button>
            <button type="button" className="end-btn" onClick={endGame}>
              End game
            </button>
          </div>
        </div>
      ) : null}

      {settings ? (
        <div className="practice-sheet" role="dialog" aria-label="Bank settings">
          <div className="practice-sheet-bar">
            <p>Bankroll &amp; table min</p>
            <button type="button" onClick={() => setSettings(false)}>
              Close
            </button>
          </div>
          <div className="practice-sheet-body settings-form">
            <label>
              Starting bankroll $
              <input
                inputMode="numeric"
                value={buyDraft}
                onChange={(e) => setBuyDraft(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </label>
            <label>
              Table min
              <select value={minDraft} onChange={(e) => setMinDraft(e.target.value)}>
                {TABLE_MINS.map((m) => (
                  <option key={m} value={m}>
                    ${m}
                  </option>
                ))}
              </select>
            </label>
            <p className="settings-note">
              Save sets your pocket bank now. Place 6 and 8 use $6 units ($6 on a $5 table, $12 on
              $10). Across / Inside / Outside add the chip you have selected.
            </p>
            <button
              type="button"
              className="sheet-fill"
              onClick={() => {
                const bank = Number(buyDraft);
                const min = Number(minDraft);
                if (!(bank > 0)) return;
                setBankSettings(bank, min);
                setSettings(false);
              }}
            >
              Save
            </button>
          </div>
        </div>
      ) : null}

      {sheet ? (
        <div className="practice-sheet" role="dialog" aria-label="Practice stats">
          <div className="practice-sheet-bar">
            <p>Last rolls</p>
            <button type="button" onClick={() => setSheet(false)}>
              Close
            </button>
          </div>
          <div className="practice-sheet-body">
            <RollStrip rolls={state.rolls} n={72} withPuck />
            <GlancePercents rolls={state.rolls} windowSize={72} />
            <button type="button" className="sheet-fill" onClick={fill72}>
              Fill 72 no bets
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RotatePrompt() {
  return (
    <div className="rotate-prompt">
      <p className="rotate-mark">CRAPS</p>
      <div className="rotate-phone" aria-hidden>
        <div className="rotate-phone-body">
          <div className="rotate-mini-felt" />
        </div>
      </div>
      <h1>
        Turn the phone
        <br />
        sideways
      </h1>
      <p>A real table layout. Landscape is how the pit is built.</p>
    </div>
  );
}
