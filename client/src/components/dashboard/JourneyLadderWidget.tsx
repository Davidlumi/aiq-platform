/**
 * JourneyLadderWidget
 * Shows the user's current Journey level, XP progress bar, and milestone badges.
 * Designed to sit in the Individual Dashboard between the hero card and domain tiles.
 */
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Zap, Trophy, Star, ChevronDown, ChevronUp, Lock } from "lucide-react";

// ── Colour palette (matches brand) ─────────────────────────────────────────
const LEVEL_COLOURS: Record<number, { bg: string; text: string; bar: string }> = {
  1:  { bg: "rgba(148,163,184,0.12)", text: "#94A3B8", bar: "#94A3B8" },
  2:  { bg: "rgba(148,163,184,0.12)", text: "#94A3B8", bar: "#94A3B8" },
  3:  { bg: "rgba(99,102,241,0.12)",  text: "#818CF8", bar: "#818CF8" },
  4:  { bg: "rgba(99,102,241,0.12)",  text: "#818CF8", bar: "#818CF8" },
  5:  { bg: "rgba(14,165,233,0.12)",  text: "#38BDF8", bar: "#38BDF8" },
  6:  { bg: "rgba(14,165,233,0.12)",  text: "#38BDF8", bar: "#38BDF8" },
  7:  { bg: "rgba(16,185,129,0.12)",  text: "#34D399", bar: "#34D399" },
  8:  { bg: "rgba(16,185,129,0.12)",  text: "#34D399", bar: "#34D399" },
  9:  { bg: "rgba(245,158,11,0.12)",  text: "#FBBF24", bar: "#FBBF24" },
  10: { bg: "rgba(245,158,11,0.12)",  text: "#FBBF24", bar: "#FBBF24" },
  11: { bg: "rgba(239,68,68,0.12)",   text: "#F87171", bar: "#F87171" },
  12: { bg: "rgba(239,68,68,0.12)",   text: "#F87171", bar: "#F87171" },
  13: { bg: "rgba(168,85,247,0.12)",  text: "#C084FC", bar: "#C084FC" },
  14: { bg: "rgba(168,85,247,0.12)",  text: "#C084FC", bar: "#C084FC" },
  15: { bg: "rgba(251,191,36,0.15)",  text: "#FCD34D", bar: "linear-gradient(90deg,#FCD34D,#F59E0B)" },
};

// Milestone levels that get a special badge
const MILESTONE_LEVELS = [5, 10, 15];

function getLevelColour(level: number) {
  return LEVEL_COLOURS[level] ?? LEVEL_COLOURS[1];
}

export function JourneyLadderWidget() {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading } = trpc.commercial.journey.getProgress.useQuery();
  const { data: milestones } = trpc.commercial.journey.getUnseenMilestones.useQuery();

  if (isLoading || !data) return null;

  const { currentLevel, levelLabel, progressPct, xpIntoLevel, xpNeededForNext, totalXp, levels } = data;
  const colours = getLevelColour(currentLevel);
  const isMaxLevel = currentLevel === 15;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* ── Main row ─────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 flex items-center gap-4">
        {/* Level badge */}
        <div
          className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
          style={{ background: colours.bg, border: `1px solid ${colours.text}30` }}
        >
          <span className="text-[10px] font-bold" style={{ color: colours.text }}>LVL</span>
          <span className="text-lg font-black leading-none" style={{ color: colours.text }}>{currentLevel}</span>
        </div>

        {/* Label + XP bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: colours.text }}>{levelLabel}</span>
              {MILESTONE_LEVELS.includes(currentLevel) && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: colours.bg, color: colours.text }}>
                  <Trophy size={9} className="inline mr-0.5" />Milestone
                </span>
              )}
            </div>
            <span className="text-xs" style={{ color: "#64748B" }}>
              {isMaxLevel ? `${totalXp.toLocaleString()} XP total` : `${xpIntoLevel} / ${xpNeededForNext} XP`}
            </span>
          </div>
          {/* XP progress bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${isMaxLevel ? 100 : progressPct}%`,
                background: typeof colours.bar === "string" && colours.bar.startsWith("linear") ? colours.bar : colours.bar,
              }}
            />
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="shrink-0 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: "#64748B" }}
          aria-label={expanded ? "Collapse journey ladder" : "Expand journey ladder"}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* ── Expanded: full ladder ─────────────────────────────────────────── */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Unseen milestones */}
          {milestones && milestones.length > 0 && (
            <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[11px] font-semibold mb-2" style={{ color: "#64748B" }}>New milestones</p>
              <div className="flex flex-wrap gap-2">
                {milestones.slice(0, 5).map((m: { id: string; milestoneType: string; label: string }) => (
                  <span key={m.id} className="text-[11px] px-2 py-1 rounded-lg flex items-center gap-1" style={{ background: "rgba(251,191,36,0.1)", color: "#FBBF24" }}>
                    <Trophy size={10} />
                    {m.milestoneType.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Level grid */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold mb-3" style={{ color: "#64748B" }}>Journey ladder</p>
            <div className="grid grid-cols-5 gap-2">
              {(levels as Array<{ level: number; label: string; xpRequired: number }>).map((l) => {
                const unlocked = l.level <= currentLevel;
                const isCurrent = l.level === currentLevel;
                const c = getLevelColour(l.level);
                return (
                  <div
                    key={l.level}
                    className="rounded-lg p-2 text-center relative"
                    style={{
                      background: unlocked ? c.bg : "rgba(255,255,255,0.03)",
                      border: isCurrent ? `1px solid ${c.text}60` : "1px solid rgba(255,255,255,0.05)",
                      opacity: unlocked ? 1 : 0.5,
                    }}
                  >
                    {isCurrent && (
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2">
                        <Star size={10} style={{ color: c.text }} fill={c.text} />
                      </div>
                    )}
                    {!unlocked && (
                      <Lock size={9} className="mx-auto mb-0.5" style={{ color: "#475569" }} />
                    )}
                    <p className="text-[10px] font-bold" style={{ color: unlocked ? c.text : "#475569" }}>{l.level}</p>
                    <p className="text-[9px] leading-tight mt-0.5" style={{ color: unlocked ? c.text : "#475569", opacity: 0.8 }}>{l.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
