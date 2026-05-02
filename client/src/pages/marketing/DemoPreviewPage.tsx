/**
 * DemoPreviewPage — public-facing demo of the AiQ platform
 * Shows a fully populated CPO/leader dashboard with realistic synthetic data
 * Accessible at /demo — no login required
 */
import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, TrendingUp, Target, AlertTriangle, CheckCircle2, ArrowRight,
  BarChart3, Brain, Zap, Shield, Workflow, Lightbulb, BookOpen,
  ChevronRight, Star, Clock, Award, Activity, Building2, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Realistic demo data ─────────────────────────────────────────────────────

const DEMO_ORG = {
  name: "Meridian Financial Group",
  sector: "Financial Services",
  hrTeamSize: 47,
  assessmentCoverage: 89, // %
  avgScore: 6.4,
  readinessLevel: "Developing",
};

const DOMAIN_DATA = [
  { key: "ai_interaction",        label: "AI Interaction & Prompting",    avg: 7.2, target: 8.5, color: "#22C55E", trend: +0.4 },
  { key: "ai_output_evaluation",  label: "AI Output Evaluation",          avg: 6.8, target: 8.0, color: "#22C55E", trend: +0.3 },
  { key: "ai_change_leadership",  label: "AI Change Leadership",          avg: 5.9, target: 7.5, color: "#F59E0B", trend: +0.1 },
  { key: "ai_ethics_governance",  label: "AI Ethics & Governance",        avg: 6.1, target: 8.0, color: "#F59E0B", trend: +0.2 },
  { key: "workforce_ai_readiness",label: "Workforce AI Readiness",        avg: 5.4, target: 7.0, color: "#EF4444", trend: -0.1 },
  { key: "ai_work_design",        label: "AI Work Design",                avg: 5.7, target: 7.5, color: "#EF4444", trend: +0.2 },
];

const READINESS_DISTRIBUTION = [
  { level: "Pioneering",   count: 4,  pct: 9,  color: "#22C55E" },
  { level: "Advanced",     count: 9,  pct: 19, color: "#84CC16" },
  { level: "Developing",   count: 18, pct: 38, color: "#F59E0B" },
  { level: "Emerging",     count: 11, pct: 23, color: "#F97316" },
  { level: "Foundation",   count: 5,  pct: 11, color: "#EF4444" },
];

const FUNCTION_BREAKDOWN = [
  { name: "HR Business Partners",  count: 14, avg: 6.8, coverage: 93 },
  { name: "Talent Acquisition",    count: 9,  avg: 7.1, coverage: 100 },
  { name: "L&D / OD",              count: 8,  avg: 6.2, coverage: 88 },
  { name: "HR Operations",         count: 11, avg: 5.9, coverage: 82 },
  { name: "Reward & Analytics",    count: 5,  avg: 6.6, coverage: 80 },
];

const TOP_PERFORMERS = [
  { name: "Sarah Chen",       role: "Senior HRBP",          score: 8.9, domain: "AI Interaction" },
  { name: "Marcus Williams",  role: "Head of TA",           score: 8.7, domain: "AI Output Eval" },
  { name: "Priya Sharma",     role: "L&D Manager",          score: 8.4, domain: "AI Ethics" },
  { name: "James O'Brien",    role: "HR Analytics Lead",    score: 8.2, domain: "Work Design" },
  { name: "Aisha Okonkwo",    role: "HRBP — Technology",    score: 8.1, domain: "Change Leadership" },
];

const PRIORITY_GAPS = [
  {
    domain: "Workforce AI Readiness",
    gap: 1.6,
    affectedCount: 23,
    urgency: "high",
    insight: "Nearly half your team cannot confidently assess AI readiness in their business units — a critical gap as your firm accelerates AI adoption.",
  },
  {
    domain: "AI Work Design",
    gap: 1.8,
    affectedCount: 19,
    urgency: "high",
    insight: "HR Operations and L&D staff lack the skills to redesign workflows around AI tools — limiting the ROI of your current AI investments.",
  },
  {
    domain: "AI Change Leadership",
    gap: 1.6,
    affectedCount: 15,
    urgency: "medium",
    insight: "Senior HRBPs show confidence gaps in leading AI-driven change programmes — consider targeted coaching for this cohort.",
  },
];

const LEARNING_PROGRESS = [
  { name: "AI Interaction Fundamentals",   completions: 31, enrolled: 38, pct: 82 },
  { name: "Evaluating AI Outputs",         completions: 24, enrolled: 35, pct: 69 },
  { name: "AI Ethics in HR Practice",      completions: 19, enrolled: 28, pct: 68 },
  { name: "Workforce Readiness Assessment",completions: 12, enrolled: 29, pct: 41 },
  { name: "AI-Augmented Work Design",      completions: 8,  enrolled: 22, pct: 36 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function DemoNav() {
  return (
    <div className="sticky top-0 z-50 bg-[#0A0F1E]/95 backdrop-blur border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-[#00FF88]/20 flex items-center justify-center">
                <span className="text-[#00FF88] font-bold text-xs">AQ</span>
              </div>
              <span className="text-white font-semibold text-sm">HR AiQ</span>
            </div>
          </Link>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[#00FF88]" />
            <span className="text-xs text-[#00FF88] font-medium">Demo Preview</span>
          </div>
          <Badge className="bg-white/10 text-white/70 border-white/20 text-xs font-normal">
            {DEMO_ORG.name}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/50">Viewing as: CPO / HR Leader</span>
          <Link href="/beta">
            <Button size="sm" className="bg-[#00FF88] text-[#0A0F1E] hover:bg-[#00FF88]/90 font-semibold text-xs h-8">
              Apply for beta <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub: string; color: string; icon: React.ElementType;
}) {
  return (
    <Card className="bg-white/5 border-white/10 text-white">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-white/50 mb-1">{label}</p>
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
            <p className="text-xs text-white/40 mt-0.5">{sub}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
            <Icon className={cn("w-4.5 h-4.5", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DomainBar({ domain }: { domain: typeof DOMAIN_DATA[0] }) {
  const pct = (domain.avg / 10) * 100;
  const targetPct = (domain.target / 10) * 100;
  const gap = domain.target - domain.avg;
  const gapColor = gap > 2 ? "text-red-400" : gap > 1 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/70 font-medium">{domain.label}</span>
        <div className="flex items-center gap-3">
          <span className={cn("font-semibold", gapColor)}>Gap: {gap.toFixed(1)}</span>
          <span className="text-white font-bold">{domain.avg.toFixed(1)}<span className="text-white/40 font-normal">/10</span></span>
        </div>
      </div>
      <div className="relative h-2 bg-white/10 rounded-full overflow-visible">
        {/* Score bar */}
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: domain.color }}
        />
        {/* Target marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/50 rounded-full"
          style={{ left: `${targetPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-white/30">
        <span>Current: {domain.avg.toFixed(1)}</span>
        <span>Target: {domain.target.toFixed(1)}</span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DemoPreviewPage() {
  const [activeSection, setActiveSection] = useState<"overview" | "domains" | "people" | "learning">("overview");

  const sections = [
    { id: "overview" as const,  label: "Strategic Overview" },
    { id: "domains" as const,   label: "Domain Breakdown" },
    { id: "people" as const,    label: "People Intelligence" },
    { id: "learning" as const,  label: "Learning Progress" },
  ];

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white">
      <DemoNav />

      {/* Hero banner */}
      <div className="bg-gradient-to-r from-[#00FF88]/10 via-transparent to-transparent border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold text-white">
              This is a demo view — <span className="text-[#00FF88]">47 HR professionals</span> at {DEMO_ORG.name} ({DEMO_ORG.sector})
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              All names, scores, and data are synthetic. This is what your CPO dashboard looks like with a fully assessed HR function.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-[#00FF88]" /> {DEMO_ORG.assessmentCoverage}% assessed</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-white/30" /> {DEMO_ORG.hrTeamSize} HR professionals</span>
            <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-white/30" /> {DEMO_ORG.sector}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Section nav */}
        <div className="flex gap-1 border-b border-white/10">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeSection === s.id
                  ? "border-[#00FF88] text-[#00FF88]"
                  : "border-transparent text-white/40 hover:text-white/70"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeSection === "overview" && (
          <div className="space-y-6">
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KPICard label="Function Average" value="6.4/10" sub="↑ 0.3 since last quarter" color="text-[#00FF88]" icon={TrendingUp} />
              <KPICard label="Assessment Coverage" value="89%" sub="42 of 47 assessed" color="text-blue-400" icon={CheckCircle2} />
              <KPICard label="Priority Gaps" value="3" sub="Domains below target" color="text-amber-400" icon={AlertTriangle} />
              <KPICard label="Readiness Level" value="Developing" sub="Moving toward Advanced" color="text-white" icon={Activity} />
            </div>

            {/* Readiness distribution */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-white">Readiness Distribution</CardTitle>
                  <p className="text-xs text-white/40">How your 47 HR professionals are distributed across capability levels</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {READINESS_DISTRIBUTION.map(r => (
                    <div key={r.level} className="flex items-center gap-3">
                      <span className="text-xs text-white/60 w-24 flex-shrink-0">{r.level}</span>
                      <div className="flex-1 h-5 bg-white/5 rounded-md overflow-hidden">
                        <div
                          className="h-full rounded-md flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${r.pct}%`, backgroundColor: r.color + "33", border: `1px solid ${r.color}44` }}
                        >
                          <span className="text-xs font-semibold" style={{ color: r.color }}>{r.count}</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/30 w-8 text-right">{r.pct}%</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Priority gaps */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-white">Strategic Priorities</CardTitle>
                  <p className="text-xs text-white/40">Highest-impact capability gaps to close</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {PRIORITY_GAPS.map((g, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{g.domain}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-full",
                            g.urgency === "high" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"
                          )}>{g.urgency === "high" ? "High priority" : "Medium"}</span>
                          <span className="text-xs text-white/40">{g.affectedCount} people</span>
                        </div>
                      </div>
                      <p className="text-xs text-white/50 leading-relaxed">{g.insight}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Function breakdown */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-white">Function Breakdown</CardTitle>
                <p className="text-xs text-white/40">Average AI capability score by HR function</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-white/40 font-medium py-2 pr-4">Function</th>
                        <th className="text-right text-white/40 font-medium py-2 px-4">Team size</th>
                        <th className="text-right text-white/40 font-medium py-2 px-4">Avg score</th>
                        <th className="text-right text-white/40 font-medium py-2 pl-4">Coverage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FUNCTION_BREAKDOWN.map(f => (
                        <tr key={f.name} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                          <td className="py-3 pr-4 text-white font-medium">{f.name}</td>
                          <td className="py-3 px-4 text-right text-white/60">{f.count}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={cn("font-bold",
                              f.avg >= 7 ? "text-[#00FF88]" : f.avg >= 6 ? "text-amber-400" : "text-red-400"
                            )}>{f.avg.toFixed(1)}</span>
                            <span className="text-white/30">/10</span>
                          </td>
                          <td className="py-3 pl-4 text-right">
                            <span className={cn("font-medium",
                              f.coverage >= 90 ? "text-[#00FF88]" : f.coverage >= 80 ? "text-amber-400" : "text-red-400"
                            )}>{f.coverage}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── DOMAINS ── */}
        {activeSection === "domains" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-white">Domain Scores vs Targets</CardTitle>
                  <p className="text-xs text-white/40">White marker = your target. Coloured bar = current average.</p>
                </CardHeader>
                <CardContent className="space-y-5">
                  {DOMAIN_DATA.map(d => <DomainBar key={d.key} domain={d} />)}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-white">Domain Health Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "On track (gap ≤ 1.0)", domains: DOMAIN_DATA.filter(d => d.target - d.avg <= 1.0), color: "text-[#00FF88]", bg: "bg-[#00FF88]/10" },
                      { label: "Developing (gap 1.0–2.0)", domains: DOMAIN_DATA.filter(d => { const g = d.target - d.avg; return g > 1.0 && g <= 2.0; }), color: "text-amber-400", bg: "bg-amber-400/10" },
                      { label: "Priority gap (gap > 2.0)", domains: DOMAIN_DATA.filter(d => d.target - d.avg > 2.0), color: "text-red-400", bg: "bg-red-400/10" },
                    ].map(row => (
                      <div key={row.label} className={cn("rounded-xl p-3", row.bg)}>
                        <p className={cn("text-xs font-semibold mb-1.5", row.color)}>{row.label}</p>
                        {row.domains.length === 0 ? (
                          <p className="text-xs text-white/30">None</p>
                        ) : (
                          <div className="space-y-0.5">
                            {row.domains.map(d => (
                              <p key={d.key} className="text-xs text-white/60">{d.label}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-white">Quarter-on-Quarter Movement</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {DOMAIN_DATA.map(d => (
                      <div key={d.key} className="flex items-center justify-between text-xs">
                        <span className="text-white/60 truncate flex-1 mr-3">{d.label.split(" ").slice(0, 3).join(" ")}</span>
                        <span className={cn("font-semibold flex-shrink-0",
                          d.trend > 0 ? "text-[#00FF88]" : d.trend < 0 ? "text-red-400" : "text-white/40"
                        )}>
                          {d.trend > 0 ? "↑" : d.trend < 0 ? "↓" : "→"} {Math.abs(d.trend).toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ── PEOPLE ── */}
        {activeSection === "people" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-white">Top Performers</CardTitle>
                  <p className="text-xs text-white/40">Highest overall AI capability scores in your function</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {TOP_PERFORMERS.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                        i === 0 ? "bg-[#00FF88]/20 text-[#00FF88]" :
                        i === 1 ? "bg-blue-400/20 text-blue-400" :
                        "bg-white/10 text-white/50"
                      )}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{p.name}</p>
                        <p className="text-xs text-white/40">{p.role} · Strongest: {p.domain}</p>
                      </div>
                      <span className="text-sm font-bold text-[#00FF88] flex-shrink-0">{p.score.toFixed(1)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-white">Score Distribution</CardTitle>
                  <p className="text-xs text-white/40">How your team's scores are distributed across the 0–10 scale</p>
                </CardHeader>
                <CardContent>
                  {/* Histogram bars */}
                  <div className="space-y-2">
                    {[
                      { range: "8.0–10.0", count: 6,  label: "High performers" },
                      { range: "7.0–7.9",  count: 11, label: "Above average" },
                      { range: "6.0–6.9",  count: 14, label: "Average" },
                      { range: "5.0–5.9",  count: 10, label: "Below average" },
                      { range: "< 5.0",    count: 1,  label: "Needs support" },
                    ].map(row => (
                      <div key={row.range} className="flex items-center gap-3 text-xs">
                        <span className="text-white/40 w-20 flex-shrink-0">{row.range}</span>
                        <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden">
                          <div
                            className="h-full bg-[#00FF88]/30 border border-[#00FF88]/20 rounded flex items-center justify-end pr-2"
                            style={{ width: `${(row.count / 14) * 100}%` }}
                          >
                            <span className="text-[#00FF88] font-semibold text-xs">{row.count}</span>
                          </div>
                        </div>
                        <span className="text-white/30 w-24 flex-shrink-0">{row.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
                    <span>Median: 6.4</span>
                    <span>Std dev: 1.2</span>
                    <span>Range: 4.1–8.9</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Attention needed */}
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Attention Needed
                </CardTitle>
                <p className="text-xs text-white/40">5 team members have not yet started their assessment. 3 members scored below 5.0 in Workforce AI Readiness.</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 flex-wrap">
                  <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs h-7">
                    Send reminder to unassessed members
                  </Button>
                  <Button size="sm" variant="outline" className="border-white/20 text-white/60 hover:bg-white/5 text-xs h-7">
                    View low-score cohort
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── LEARNING ── */}
        {activeSection === "learning" && (
          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-white">Learning Plan Progress</CardTitle>
                <p className="text-xs text-white/40">Completion rates for automatically assigned learning modules across your function</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {LEARNING_PROGRESS.map(m => (
                  <div key={m.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/70 font-medium">{m.name}</span>
                      <span className="text-white/40">{m.completions}/{m.enrolled} completed</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all",
                          m.pct >= 70 ? "bg-[#00FF88]" : m.pct >= 50 ? "bg-amber-400" : "bg-red-400"
                        )}
                        style={{ width: `${m.pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-white/30">
                      <span>{m.pct}% complete</span>
                      <span>{m.enrolled - m.completions} in progress</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-white/5 border-white/10 text-center">
                <CardContent className="p-5">
                  <p className="text-2xl font-bold text-[#00FF88]">94</p>
                  <p className="text-xs text-white/40 mt-1">Total module completions</p>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10 text-center">
                <CardContent className="p-5">
                  <p className="text-2xl font-bold text-blue-400">55%</p>
                  <p className="text-xs text-white/40 mt-1">Avg completion rate</p>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10 text-center">
                <CardContent className="p-5">
                  <p className="text-2xl font-bold text-amber-400">3.2h</p>
                  <p className="text-xs text-white/40 mt-1">Avg time per module</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="border border-[#00FF88]/20 bg-[#00FF88]/5 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00FF88]/20 flex items-center justify-center mx-auto">
            <Zap className="w-6 h-6 text-[#00FF88]" />
          </div>
          <h2 className="text-xl font-bold text-white">See this for your HR function</h2>
          <p className="text-sm text-white/50 max-w-lg mx-auto">
            AiQ gives every CPO and HR leader this level of capability intelligence — built on a rigorous six-domain framework, personalised development, and AI-powered scenario assessments.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/beta">
              <Button className="bg-[#00FF88] text-[#0A0F1E] hover:bg-[#00FF88]/90 font-semibold">
                Apply for beta access <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/5">
                View pricing
              </Button>
            </Link>
          </div>
          <p className="text-xs text-white/30">First cohort: 10 organisations · Free during beta · No credit card required</p>
        </div>
      </div>
    </div>
  );
}
