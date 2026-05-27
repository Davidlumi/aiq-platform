/**
 * ROI Calculator — Interactive tool for prospects to estimate AiQ value
 */
import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { MarketingNav, MarketingFooter } from "./MarketingPage";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Calculator, TrendingUp, Clock, Users,
  PoundSterling, Target, Sparkles, ChevronDown, Info,
} from "lucide-react";

const navy = "#0a1628";
const greenHex = "#22c55e";
const indigo = "#6366f1";
const amber = "#f59e0b";
const cyan = "#06b6d4";

// --- ROI Model Constants ---
const MODEL = {
  // Attrition reduction
  avgAttritionRate: 0.18, // 18% industry avg for AI-capable roles
  attritionReductionFactor: 0.55, // AiQ reduces attrition by 55% (based on case studies)
  replacementCostMultiplier: 0.75, // Cost to replace = 75% of annual salary

  // Training efficiency
  genericTrainingWasteRate: 0.65, // 65% of generic training spend is wasted (wrong people, wrong content)
  targetedEfficiencyGain: 0.60, // AiQ targeting recovers 60% of that waste

  // Productivity
  avgProductivityLiftPerPoint: 0.003, // 0.3% productivity gain per readiness point improvement
  avgReadinessImprovement: 37, // 37pp avg improvement (from case studies)

  // Time savings
  hrTimePerEmployeePerYear: 4, // hours spent on manual capability tracking per employee
  hrHourlyCost: 65, // £65/hr avg HR professional cost

  // Platform cost (for payback calc)
  platformCostPerEmployee: 18, // £18/employee/month avg
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `£${(value / 1_000).toFixed(0)}K`;
  return `£${value.toFixed(0)}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-GB");
}

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  hint?: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
}

function SliderInput({ label, value, min, max, step, format, onChange, hint, icon: Icon, color }: SliderInputProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color }} />
          <span className="text-sm font-semibold text-white">{label}</span>
        </div>
        <span className="text-lg font-bold" style={{ color }}>{format(value)}</span>
      </div>
      {hint && <p className="text-xs text-slate-400 mb-3">{hint}</p>}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`,
          }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-slate-500">{format(min)}</span>
        <span className="text-[10px] text-slate-500">{format(max)}</span>
      </div>
    </div>
  );
}

interface ResultCardProps {
  label: string;
  value: string;
  subtitle: string;
  color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

function ResultCard({ label, value, subtitle, color, icon: Icon }: ResultCardProps) {
  return (
    <div className="rounded-xl border p-5 relative overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)", borderColor: `${color}30` }}>
      <div className="absolute top-3 right-3 opacity-10">
        <Icon className="w-10 h-10" style={{ color }} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">{label}</p>
      <p className="text-2xl md:text-3xl font-black text-white mb-1">{value}</p>
      <p className="text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

export default function ROICalculatorPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [teamSize, setTeamSize] = useState(500);
  const [avgSalary, setAvgSalary] = useState(55000);
  const [trainingSpend, setTrainingSpend] = useState(200000);
  const [attritionRate, setAttritionRate] = useState(18);

  const results = useMemo(() => {
    // 1. Attrition savings
    const currentAttritionCost = teamSize * (attritionRate / 100) * avgSalary * MODEL.replacementCostMultiplier;
    const reducedAttrition = currentAttritionCost * MODEL.attritionReductionFactor;
    const attritionSaving = reducedAttrition;

    // 2. Training efficiency savings
    const wastedTraining = trainingSpend * MODEL.genericTrainingWasteRate;
    const trainingSaving = wastedTraining * MODEL.targetedEfficiencyGain;

    // 3. Productivity gain
    const productivityGain = teamSize * avgSalary * MODEL.avgProductivityLiftPerPoint * MODEL.avgReadinessImprovement;

    // 4. HR time savings
    const hrTimeSaving = teamSize * MODEL.hrTimePerEmployeePerYear * MODEL.hrHourlyCost;

    // Total
    const totalAnnualSaving = attritionSaving + trainingSaving + productivityGain + hrTimeSaving;

    // Platform cost
    const annualPlatformCost = teamSize * MODEL.platformCostPerEmployee * 12;

    // Net ROI
    const netSaving = totalAnnualSaving - annualPlatformCost;
    const roiMultiple = totalAnnualSaving / annualPlatformCost;
    const paybackMonths = Math.ceil((annualPlatformCost / totalAnnualSaving) * 12);

    return {
      attritionSaving,
      trainingSaving,
      productivityGain,
      hrTimeSaving,
      totalAnnualSaving,
      annualPlatformCost,
      netSaving,
      roiMultiple,
      paybackMonths,
      readinessImprovement: MODEL.avgReadinessImprovement,
      retainedEmployees: Math.round(teamSize * (attritionRate / 100) * MODEL.attritionReductionFactor),
    };
  }, [teamSize, avgSalary, trainingSpend, attritionRate]);

  return (
    <div className="min-h-screen" style={{ background: navy }}>
      <MarketingNav />

      {/* Hero */}
      <section className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-4 px-3 py-1 rounded-full"
            style={{ background: "rgba(34,197,94,0.1)", color: greenHex, border: "1px solid rgba(34,197,94,0.2)" }}>
            ROI Calculator
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
            What's your AI capability gap{" "}
            <span style={{ color: greenHex }}>actually costing you?</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Enter your organisation's details below to see the projected return from closing
            AI capability gaps with AiQ. Based on real results from our beta partners.
          </p>
        </div>
      </section>

      {/* Calculator */}
      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* Inputs panel */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border p-7 sticky top-24"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-2 mb-6">
                  <Calculator className="w-5 h-5" style={{ color: greenHex }} />
                  <h2 className="text-lg font-bold text-white">Your organisation</h2>
                </div>

                <SliderInput
                  label="Team size"
                  value={teamSize}
                  min={50}
                  max={10000}
                  step={50}
                  format={(v) => formatNumber(v) + " people"}
                  onChange={setTeamSize}
                  hint="Number of employees in scope for AI capability development"
                  icon={Users}
                  color={greenHex}
                />

                <SliderInput
                  label="Average salary"
                  value={avgSalary}
                  min={25000}
                  max={120000}
                  step={5000}
                  format={(v) => formatCurrency(v)}
                  onChange={setAvgSalary}
                  hint="Average annual salary across the in-scope population"
                  icon={PoundSterling}
                  color={indigo}
                />

                <SliderInput
                  label="Current training spend"
                  value={trainingSpend}
                  min={10000}
                  max={2000000}
                  step={10000}
                  format={(v) => formatCurrency(v) + "/year"}
                  onChange={setTrainingSpend}
                  hint="Annual spend on AI/digital skills training programmes"
                  icon={Target}
                  color={amber}
                />

                <SliderInput
                  label="Current attrition rate"
                  value={attritionRate}
                  min={5}
                  max={35}
                  step={1}
                  format={(v) => v + "%"}
                  onChange={setAttritionRate}
                  hint="Annual voluntary turnover for AI-capable roles"
                  icon={TrendingUp}
                  color={cyan}
                />

                <div className="mt-6 p-3 rounded-lg" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <div className="flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: indigo }} />
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Projections based on aggregated beta partner results. Individual outcomes vary by sector, maturity, and implementation approach.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Results panel */}
            <div className="lg:col-span-3">
              {/* Headline results */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <ResultCard
                  label="Projected annual saving"
                  value={formatCurrency(results.totalAnnualSaving)}
                  subtitle="Total value from capability intelligence"
                  color={greenHex}
                  icon={TrendingUp}
                />
                <ResultCard
                  label="ROI multiple"
                  value={`${results.roiMultiple.toFixed(1)}x`}
                  subtitle="Return on platform investment"
                  color={indigo}
                  icon={Sparkles}
                />
                <ResultCard
                  label="Payback period"
                  value={`${results.paybackMonths} months`}
                  subtitle="Time to recover full investment"
                  color={cyan}
                  icon={Clock}
                />
              </div>

              {/* Breakdown */}
              <div className="rounded-2xl border p-7 mb-6"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
                <h3 className="text-sm font-semibold text-white mb-6">Value breakdown</h3>

                <div className="space-y-5">
                  {[
                    {
                      label: "Reduced attrition",
                      value: results.attritionSaving,
                      color: greenHex,
                      detail: `Retain ${results.retainedEmployees} employees who would otherwise leave — saving recruitment, onboarding, and lost productivity costs`,
                    },
                    {
                      label: "Training efficiency",
                      value: results.trainingSaving,
                      color: amber,
                      detail: "Eliminate wasted spend on generic training by targeting interventions to specific capability gaps identified by assessment",
                    },
                    {
                      label: "Productivity uplift",
                      value: results.productivityGain,
                      color: indigo,
                      detail: `+${results.readinessImprovement}pp average readiness improvement translates to measurable productivity gains across AI-augmented workflows`,
                    },
                    {
                      label: "HR time savings",
                      value: results.hrTimeSaving,
                      color: cyan,
                      detail: "Automated capability tracking replaces manual spreadsheet-based assessment, freeing HR time for strategic work",
                    },
                  ].map(({ label, value, color, detail }) => {
                    const pct = (value / results.totalAnnualSaving) * 100;
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-slate-300">{label}</span>
                          <span className="text-sm font-bold text-white">{formatCurrency(value)}</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5">{detail}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Total line */}
                <div className="mt-6 pt-5 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-300">Total projected annual value</span>
                    <span className="text-xl font-black" style={{ color: greenHex }}>{formatCurrency(results.totalAnnualSaving)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500">Less: AiQ platform cost ({formatCurrency(MODEL.platformCostPerEmployee)}/employee/month)</span>
                    <span className="text-sm text-slate-400">-{formatCurrency(results.annualPlatformCost)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <span className="text-sm font-bold text-white">Net annual benefit</span>
                    <span className="text-lg font-black text-white">{formatCurrency(results.netSaving)}</span>
                  </div>
                </div>
              </div>

              {/* Assumptions */}
              <div className="rounded-2xl border p-7 mb-6"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
                <h3 className="text-sm font-semibold text-white mb-4">Model assumptions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: "Attrition reduction", value: "55% (beta avg: Northbridge 67%, Harrington 67%)" },
                    { label: "Training waste rate", value: "65% of generic spend is mis-targeted" },
                    { label: "Readiness improvement", value: "+37pp (beta avg across 4 partners)" },
                    { label: "Replacement cost", value: "75% of annual salary" },
                    { label: "HR tracking time", value: "4 hrs/employee/year manual effort" },
                    { label: "Payback calculation", value: "Linear — assumes value accrues from month 3" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ background: greenHex }} />
                      <div>
                        <p className="text-xs font-semibold text-slate-300">{label}</p>
                        <p className="text-[11px] text-slate-500">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="rounded-2xl p-7 text-center"
                style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <h3 className="text-lg font-bold text-white mb-2">Ready to realise this value?</h3>
                <p className="text-sm text-slate-400 mb-5 max-w-md mx-auto">
                  Join our beta programme and start building evidence-based AI capability intelligence for your organisation.
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Link href="/beta">
                    <Button size="lg" className="gap-2 font-semibold px-6" style={{ background: greenHex, color: navy }}>
                      Apply for beta <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/case-studies">
                    <Button size="lg" variant="outline" className="gap-2 font-semibold px-6 border-slate-600 text-slate-200 hover:text-white">
                      See case studies
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />

      {/* Custom slider styles */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          border: 2px solid rgba(255,255,255,0.9);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          border: 2px solid rgba(255,255,255,0.9);
        }
      `}</style>
    </div>
  );
}
