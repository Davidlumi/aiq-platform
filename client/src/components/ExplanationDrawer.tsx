/**
 * ExplanationDrawer - AiQ Core Trust & Explainability Component
 *
 * Required on every score, readiness state, and policy decision display.
 * Implements the "Why does this score exist?" pattern from the build bible.
 *
 * Usage:
 *   <ExplanationDrawer trigger={<button>Why?</button>} title="How this score is calculated">
 *     <ScoreBreakdown ... />
 *   </ExplanationDrawer>
 */

import { useState } from "react";
import { X, Info, ChevronRight, AlertTriangle, CheckCircle, Clock, Target, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { scoreToColor, formatPeakonScore } from "@/lib/peakon-colors";

// --- Drawer Shell -------------------------------------------------------------

interface ExplanationDrawerProps {
  trigger: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  side?: "right" | "bottom";
}

export function ExplanationDrawer({
  trigger,
  title,
  subtitle,
  children,
  side = "right",
}: ExplanationDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer inline-flex">
        {trigger}
      </span>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed z-50 bg-card shadow-2xl transition-transform duration-300 flex flex-col",
          side === "right"
            ? "top-0 right-0 h-full w-full max-w-[480px]"
            : "bottom-0 left-0 right-0 max-h-[80vh] rounded-t-2xl",
          open
            ? "translate-x-0 translate-y-0"
            : side === "right"
            ? "translate-x-full"
            : "translate-y-full"
        )}
        style={{ borderLeft: side === "right" ? "1px solid oklch(22% 0.030 240)" : undefined }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between p-5 shrink-0"
          style={{ borderBottom: "1px solid oklch(22% 0.030 240)" }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "var(--card)" }}
            >
              <Info className="w-4 h-4" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <h2
                className="font-semibold text-base"
                style={{ color: "var(--foreground)" }}
              >
                {title}
              </h2>
              {subtitle && (
                <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg transition-colors shrink-0"
            style={{ color: "#9CA3AF" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "oklch(22% 0.030 240)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>
      </div>
    </>
  );
}

// --- Score Breakdown Panel ----------------------------------------------------

interface CapabilityFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
  color: string;
  evidenceCount?: number;
}

interface ScoreBreakdownProps {
  overallScore: number;
  confidenceLevel: "high" | "medium" | "low";
  dataPoints: number;
  lastUpdated: string;
  factors: CapabilityFactor[];
}

export function ScoreBreakdown({
  overallScore,
  confidenceLevel,
  dataPoints,
  lastUpdated,
  factors,
}: ScoreBreakdownProps) {
  const peakonColor = scoreToColor(overallScore);

  const confidenceColors = {
    high:   { bg: "oklch(18% 0.040 142)", text: "#4ADE80" },
    medium: { bg: "oklch(18% 0.040 68)",  text: "#FCD34D" },
    low:    { bg: "oklch(18% 0.040 27)",  text: "#F87171" },
  };
  const conf = confidenceColors[confidenceLevel];

  return (
    <div className="space-y-4">
      {/* Overall score */}
      <div className="p-4 rounded-xl" style={{ background: "var(--card)", border: "1px solid oklch(22% 0.030 240)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-muted-foreground">
            Overall AI Readiness Score
          </span>
          <span
            className="text-2xl font-bold font-mono px-2.5 py-1 rounded-lg"
            style={{ backgroundColor: peakonColor.bg, color: peakonColor.text }}
          >
            {formatPeakonScore(overallScore)}
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${overallScore}%`, background: peakonColor.bg }}
          />
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: conf.bg, color: conf.text }}
          >
            <Target className="w-3 h-3" />
            {confidenceLevel.charAt(0).toUpperCase() + confidenceLevel.slice(1)} confidence
          </span>
          <span className="text-xs" style={{ color: "#9CA3AF" }}>
            {dataPoints} data points · Updated {lastUpdated}
          </span>
        </div>
      </div>

      {/* Capability factors */}
      <div>
        <h4
          className="text-xs font-bold uppercase tracking-wider mb-3"
          style={{ color: "#9CA3AF"}}
        >
          Contributing Factors
        </h4>
        <div className="space-y-3">
          {factors.map((factor, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border" style={{ borderColor: "oklch(22% 0.030 240)" }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: factor.color }} />
                    <span className="text-sm font-semibold text-foreground">
                      {factor.name}
                    </span>
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>
                      {factor.weight}% weight
                    </span>
                  </div>
                  <p className="text-xs ml-4.5" style={{ color: "#6B7280" }}>
                    {factor.description}
                  </p>
                </div>
                <span
                  className="text-xs font-bold font-mono ml-3 px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: scoreToColor(factor.score).bg, color: scoreToColor(factor.score).text }}
                >
                  {formatPeakonScore(factor.score)}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${factor.score}%`, background: factor.color }}
                />
              </div>
              {factor.evidenceCount !== undefined && (
                <p className="text-xs mt-1.5" style={{ color: "#9CA3AF" }}>
                  {factor.evidenceCount} evidence items
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Policy Decision Explanation ---------------------------------------------

interface PolicyDecisionProps {
  policyName: string;
  result: "allow" | "restrict" | "flag" | "require_remediation";
  reason: string;
  conditions: Array<{ label: string; met: boolean; value?: string }>;
  remediation?: string;
}

export function PolicyDecisionExplanation({
  policyName,
  result,
  reason,
  conditions,
  remediation,
}: PolicyDecisionProps) {
  const resultConfig = {
    allow: { icon: CheckCircle, color: "var(--primary)", bg: "#DCFCE7", label: "Allowed" },
    restrict: { icon: AlertTriangle, color: "#DC2626", bg: "#FEE2E2", label: "Restricted" },
    flag: { icon: AlertTriangle, color: "#D97706", bg: "#FEF9C3", label: "Flagged" },
    require_remediation: { icon: Clock, color: "#6366F1", bg: "#EEF2FF", label: "Remediation Required" },
  };
  const config = resultConfig[result];
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      {/* Result badge */}
      <div className="p-4 rounded-xl" style={{ background: config.bg }}>
        <div className="flex items-center gap-2.5">
          <Icon className="w-5 h-5" style={{ color: config.color }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: config.color}}>
              {config.label} - {policyName}
            </p>
            <p className="text-xs mt-0.5" style={{ color: config.color, opacity: 0.8 }}>
              {reason}
            </p>
          </div>
        </div>
      </div>

      {/* Conditions */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>
          Conditions Evaluated
        </h4>
        <div className="space-y-2">
          {conditions.map((cond, idx) => (
            <div key={idx} className="flex items-center gap-2.5 py-2 px-3 rounded-lg" style={{ background: "var(--card)" }}>
              {cond.met ? (
                <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "var(--primary)" }} />
              ) : (
                <X className="w-4 h-4 shrink-0" style={{ color: "#DC2626" }} />
              )}
              <span className="text-sm flex-1 text-foreground">{cond.label}</span>
              {cond.value && (
                <span className="text-xs font-mono" style={{ color: "#6B7280" }}>{cond.value}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Remediation */}
      {remediation && (
        <div className="p-3.5 rounded-xl" style={{ background: "#EEF2FF", border: "1px solid #C7D2FE" }}>
          <div className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#6366F1" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#4338CA" }}>Remediation Path</p>
              <p className="text-xs mt-0.5" style={{ color: "#6366F1" }}>{remediation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Visibility Boundaries ----------------------------------------------------

interface VisibilityBoundariesProps {
  items: Array<{
    label: string;
    visibleToLearner: boolean;
    visibleToManager: boolean;
    visibleToAdmin: boolean;
    value?: string;
  }>;
}

export function VisibilityBoundaries({ items }: VisibilityBoundariesProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: "#6B7280" }}>
        This table shows exactly who can see each piece of your data.
      </p>
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "oklch(22% 0.030 240)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--card)", borderBottom: "1px solid oklch(22% 0.030 240)" }}>
              <th className="text-left px-3 py-2.5 text-xs font-semibold" style={{ color: "#6B7280" }}>Data</th>
              <th className="text-center px-2 py-2.5 text-xs font-semibold" style={{ color: "#6B7280" }}>You</th>
              <th className="text-center px-2 py-2.5 text-xs font-semibold" style={{ color: "#6B7280" }}>Manager</th>
              <th className="text-center px-2 py-2.5 text-xs font-semibold" style={{ color: "#6B7280" }}>Admin</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: idx < items.length - 1 ? "1px solid oklch(22% 0.030 240)" : undefined }}>
                <td className="px-3 py-2.5 text-foreground">
                  <div>{item.label}</div>
                  {item.value && <div className="text-xs" style={{ color: "#9CA3AF" }}>{item.value}</div>}
                </td>
                <td className="text-center px-2 py-2.5">
                  {item.visibleToLearner ? <Eye className="w-4 h-4 mx-auto" style={{ color: "var(--primary)" }} /> : <EyeOff className="w-4 h-4 mx-auto" style={{ color: "#D1D5DB" }} />}
                </td>
                <td className="text-center px-2 py-2.5">
                  {item.visibleToManager ? <Eye className="w-4 h-4 mx-auto" style={{ color: "var(--primary)" }} /> : <EyeOff className="w-4 h-4 mx-auto" style={{ color: "#D1D5DB" }} />}
                </td>
                <td className="text-center px-2 py-2.5">
                  {item.visibleToAdmin ? <Eye className="w-4 h-4 mx-auto" style={{ color: "var(--primary)" }} /> : <EyeOff className="w-4 h-4 mx-auto" style={{ color: "#D1D5DB" }} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Why Assigned -------------------------------------------------------------

interface WhyAssignedProps {
  itemTitle: string;
  reasons: Array<{
    type: "gap" | "policy" | "revalidation" | "manager" | "system";
    label: string;
    detail: string;
  }>;
}

export function WhyAssigned({ itemTitle, reasons }: WhyAssignedProps) {
  const typeConfig = {
    gap: { color: "#DC2626", bg: "rgba(238,102,119,0.10)", label: "Capability Gap" },
    policy: { color: "#b91c1c", bg: "rgba(170,51,119,0.10)", label: "Policy Requirement" },
    revalidation: { color: "#EE8866", bg: "rgba(238,136,102,0.10)", label: "Revalidation Due" },
    manager: { color: "#4477AA", bg: "rgba(68,119,170,0.10)", label: "Manager Assigned" },
    system: { color: "#047857", bg: "rgba(34,136,51,0.10)", label: "System Recommended" },
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium" style={{ color: "#0E1726"}}>
        Why <span className="font-semibold">"{itemTitle}"</span> is in your plan:
      </p>
      <div className="space-y-2">
        {reasons.map((reason, idx) => {
          const config = typeConfig[reason.type];
          return (
            <div key={idx} className="p-3 rounded-xl" style={{ background: config.bg }}>
              <div className="flex items-start gap-2">
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 mt-0.5"
                  style={{ background: config.color, color: "#fff" }}
                >
                  {config.label}
                </span>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#0E1726" }}>{reason.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{reason.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
