/**
 * ComponentKitPage — /admin/component-kit
 *
 * Priority 0 component kit showcase — AiQ Realignment Option 2.
 * Renders all three kit components with live state so the founder can
 * interact with them before they are wired into section pages.
 *
 * Gated: superuserOnly (same gate as Signal Approval).
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { Sparkles, ChevronRight, Info } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ChipSelect, ChipMultiSelect } from "@/components/kit/ChipSelect";
import { KeywordExpand, type KeywordExpandBasis } from "@/components/kit/KeywordExpand";
import { BenchmarkNumeric, type NumericBasis } from "@/components/kit/BenchmarkNumeric";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─── Demo data ────────────────────────────────────────────────────────────────

const SECTOR_OPTIONS = [
  { value: "financial_services", label: "Financial services" },
  { value: "technology", label: "Technology" },
  { value: "healthcare", label: "Healthcare" },
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "professional_services", label: "Professional services" },
  { value: "public_sector", label: "Public sector" },
  { value: "education", label: "Education" },
];

const HEADCOUNT_OPTIONS = [
  { value: "1_50", label: "1–50" },
  { value: "51_250", label: "51–250" },
  { value: "251_1000", label: "251–1,000" },
  { value: "1001_5000", label: "1,001–5,000" },
  { value: "5001_plus", label: "5,001+" },
];

const HR_SYSTEM_OPTIONS = [
  { value: "workday", label: "Workday" },
  { value: "sap_successfactors", label: "SAP SuccessFactors" },
  { value: "oracle_hcm", label: "Oracle HCM" },
  { value: "bamboohr", label: "BambooHR" },
  { value: "personio", label: "Personio" },
  { value: "hibob", label: "HiBob" },
  { value: "adp", label: "ADP" },
  { value: "other", label: "Other" },
];

// ─── Section wrapper ──────────────────────────────────────────────────────────

function KitSection({
  title,
  subtitle,
  tag,
  children,
}: {
  title: string;
  subtitle?: string;
  tag?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {tag && (
              <Badge variant="outline" className="text-[10px] font-mono">
                {tag}
              </Badge>
            )}
          </div>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 space-y-6">{children}</div>
    </section>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function ProvenancePill({ basis }: { basis: string | undefined }) {
  if (!basis) return null;
  const map: Record<string, { label: string; cls: string }> = {
    benchmark_default: { label: "benchmark_default", cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
    user_provided:    { label: "user_provided",    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
    self_declared:    { label: "self_declared",    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
    ai_drafted:       { label: "ai_drafted",       cls: "bg-primary/10 text-primary" },
    owned:            { label: "owned",            cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
    empty:            { label: "empty",            cls: "bg-muted text-muted-foreground" },
  };
  const m = map[basis] ?? { label: basis, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium", m.cls)}>
      basis: {m.label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ComponentKitPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isPlatformSuperuser = (user as any)?.isPlatformSuperuser === true;

  // Gate
  if (user !== null && user !== undefined && !isPlatformSuperuser) {
    navigate("/dashboard");
    return null;
  }

  // ── ChipSelect state ──
  const [sector, setSector] = useState<string | null>(null);
  const [sectorOther, setSectorOther] = useState("");

  const [headcount, setHeadcount] = useState<string | null>(null);

  const [hrSystems, setHrSystems] = useState<string[]>([]);
  const [hrSystemsOther, setHrSystemsOther] = useState("");

  // ── KeywordExpand state ──
  const [narrative, setNarrative] = useState("");
  const [narrativeBasis, setNarrativeBasis] = useState<KeywordExpandBasis>("empty");

  const [painPoint, setPainPoint] = useState("");
  const [painPointBasis, setPainPointBasis] = useState<KeywordExpandBasis>("empty");

  // ── BenchmarkNumeric state ──
  const [hiresPerYear, setHiresPerYear] = useState<number | undefined>(undefined);
  const [hiresBasis, setHiresBasis] = useState<NumericBasis | undefined>(undefined);

  const [costPerHire, setCostPerHire] = useState<number | undefined>(undefined);
  const [costBasis, setCostBasis] = useState<NumericBasis | undefined>(undefined);

  const [attritionRate, setAttritionRate] = useState<number | undefined>(undefined);
  const [attritionBasis, setAttritionBasis] = useState<NumericBasis | undefined>(undefined);

  // ── AI draft mutation (reuses existing backgroundInputs.aiDraft) ──
  const aiDraftMut = trpc.backgroundInputs.aiDraft.useMutation();

  const makeAiDraft = (fieldType: "successNarrative" | "painPoint") =>
    async (hint: string) => {
      const result = await aiDraftMut.mutateAsync({ fieldType, hint });
      return result.draft;
    };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Admin</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Component Kit</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Priority 0 Component Kit</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Live showcase of the three reusable input components for the AiQ Realignment Option 2 section rework.
          All components are interactive — state and provenance basis are shown below each field.
        </p>
        <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50/60 dark:bg-amber-900/20 dark:border-amber-700/40 p-3 text-xs text-amber-800 dark:text-amber-300">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            This page is superuser-only and will not appear in any tenant's navigation.
            It exists solely for founder sign-off before components are wired into section pages.
          </span>
        </div>
      </div>

      <Separator />

      {/* ── 1. ChipSelect ── */}
      <KitSection
        title="ChipSelect"
        subtitle="Single-select and multi-select chip groups. Replaces free-text for categorical fields."
        tag="ChipSelect.tsx"
      >
        <FieldRow
          label="Sector (single-select, with Other escape hatch)"
          hint="Section A — replaces the current free-text sector input"
        >
          <ChipSelect
            options={SECTOR_OPTIONS}
            value={sector}
            onChange={setSector}
            other
            otherValue={sectorOther}
            onOtherChange={setSectorOther}
          />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">value:</span>
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              {sector ?? "null"}
              {sector === "__other__" && sectorOther ? ` → "${sectorOther}"` : ""}
            </code>
          </div>
        </FieldRow>

        <FieldRow
          label="Headcount band (single-select, no Other)"
          hint="Section A — replaces the current text input for headcount"
        >
          <ChipSelect
            options={HEADCOUNT_OPTIONS}
            value={headcount}
            onChange={setHeadcount}
          />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">value:</span>
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{headcount ?? "null"}</code>
          </div>
        </FieldRow>

        <FieldRow
          label="HR systems in use (multi-select, max 5, with Other)"
          hint="Section D — replaces the current 15 numeric inputs for HR system coverage"
        >
          <ChipMultiSelect
            options={HR_SYSTEM_OPTIONS}
            value={hrSystems}
            onChange={setHrSystems}
            max={5}
            other
            otherValue={hrSystemsOther}
            onOtherChange={setHrSystemsOther}
          />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">value:</span>
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              [{hrSystems.join(", ")}]
            </code>
          </div>
        </FieldRow>
      </KitSection>

      {/* ── 2. KeywordExpand ── */}
      <KitSection
        title="KeywordExpand"
        subtitle="Keyword-seed → AI-draft → user-edit → owned. Full §4b provenance wiring."
        tag="KeywordExpand.tsx"
      >
        <FieldRow
          label="Success narrative (Section E — currently a cold textarea)"
          hint="Type a few keywords (e.g. 'skills, AI adoption, 2026'), then click ✨ AI"
        >
          <KeywordExpand
            value={narrative}
            onChange={setNarrative}
            basis={narrativeBasis}
            onBasisChange={setNarrativeBasis}
            onAiDraft={makeAiDraft("successNarrative")}
            maxLength={500}
            minRows={4}
          />
          <div className="flex items-center gap-2 mt-1">
            <ProvenancePill basis={narrativeBasis} />
          </div>
        </FieldRow>

        <FieldRow
          label="Top pain point (Section I — currently a cold textarea)"
          hint="Type a few keywords (e.g. 'attrition, manager capability'), then click ✨ AI"
        >
          <KeywordExpand
            value={painPoint}
            onChange={setPainPoint}
            basis={painPointBasis}
            onBasisChange={setPainPointBasis}
            onAiDraft={makeAiDraft("painPoint")}
            maxLength={200}
            minRows={2}
          />
          <div className="flex items-center gap-2 mt-1">
            <ProvenancePill basis={painPointBasis} />
          </div>
        </FieldRow>
      </KitSection>

      {/* ── 3. BenchmarkNumeric ── */}
      <KitSection
        title="BenchmarkNumeric"
        subtitle="Numeric input with sector benchmark pre-fill and B1 provenance basis toggle."
        tag="BenchmarkNumeric.tsx"
      >
        <FieldRow
          label="Hires per year (Section D)"
          hint="Benchmark: 42 hires/year for UK professional services 251–1,000 FTE (CIPD 2024)"
        >
          <BenchmarkNumeric
            value={hiresPerYear}
            onChange={setHiresPerYear}
            basis={hiresBasis}
            onBasisChange={setHiresBasis}
            benchmark={42}
            unit="hires/yr"
            benchmarkSource="CIPD 2024 median"
            min={0}
          />
          <div className="flex items-center gap-2 mt-1">
            <ProvenancePill basis={hiresBasis} />
            <span className="text-xs text-muted-foreground">value: {hiresPerYear ?? "undefined"}</span>
          </div>
        </FieldRow>

        <FieldRow
          label="Cost per hire (Section D)"
          hint="Benchmark: £3,200 for UK professional services (CIPD 2024)"
        >
          <BenchmarkNumeric
            value={costPerHire}
            onChange={setCostPerHire}
            basis={costBasis}
            onBasisChange={setCostBasis}
            benchmark={3200}
            unit="£"
            benchmarkSource="CIPD 2024 median"
            min={0}
            step={100}
          />
          <div className="flex items-center gap-2 mt-1">
            <ProvenancePill basis={costBasis} />
            <span className="text-xs text-muted-foreground">value: {costPerHire ?? "undefined"}</span>
          </div>
        </FieldRow>

        <FieldRow
          label="Voluntary attrition rate (Section D)"
          hint="Benchmark: 14% for UK professional services (CIPD 2024)"
        >
          <BenchmarkNumeric
            value={attritionRate}
            onChange={setAttritionRate}
            basis={attritionBasis}
            onBasisChange={setAttritionBasis}
            benchmark={14}
            unit="%"
            benchmarkSource="CIPD 2024 median"
            min={0}
            max={100}
            step={0.5}
          />
          <div className="flex items-center gap-2 mt-1">
            <ProvenancePill basis={attritionBasis} />
            <span className="text-xs text-muted-foreground">value: {attritionRate ?? "undefined"}</span>
          </div>
        </FieldRow>
      </KitSection>

      {/* Footer */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Component file locations</p>
        <p><code className="font-mono">client/src/components/kit/ChipSelect.tsx</code></p>
        <p><code className="font-mono">client/src/components/kit/KeywordExpand.tsx</code></p>
        <p><code className="font-mono">client/src/components/kit/BenchmarkNumeric.tsx</code></p>
        <p className="pt-1">
          All three components are self-contained, have no server dependencies (KeywordExpand accepts an async
          <code className="font-mono mx-1">onAiDraft</code> callback), and are ready to be wired into section pages
          in the order defined by the Realignment Audit 4 rework schedule.
        </p>
      </div>
    </div>
  );
}
