/**
 * AiQ — The Product page — v3.0
 */
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "./MarketingPage";
import {
  ArrowRight, Users, BarChart3, Target, Shield, FileText,
  XCircle, CheckCircle2, ChevronRight,
} from "lucide-react";

const navy  = "#0F172A";
const slate = "#1E293B";
const chalk = "#F8FAFC";
const green = "var(--primary)";
const borderL = "#E2E8F0";
const borderD = "rgba(255,255,255,0.08)";

export default function ProductPage() {
  return (
    <div className="min-h-screen" style={{ background: navy }}>
      <MarketingNav />

      {/* Hero */}
      <section style={{ background: navy }} className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{ background: "rgba(34,197,94,0.12)", color: green, border: "1px solid rgba(34,197,94,0.25)" }}>
            The product
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6" style={{ letterSpacing: "-0.02em" }}>
            Three views. One platform.{" "}
            <span style={{ color: green }}>All answering the same question.</span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
            AiQ is a single platform with three distinct views — for the individual, for the manager, and for you.
            Each view is designed for a different question. All three are live, connected, and updating continuously.
          </p>
        </div>
      </section>

      {/* Individual view */}
      <section style={{ background: chalk }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#4477AA18" }}>
                  <Users className="w-5 h-5" style={{ color: "#4477AA" }} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#4477AA" }}>Individual view</p>
                  <h2 className="font-bold text-xl" style={{ color: navy }}>What every HR person sees</h2>
                </div>
              </div>
              <p className="text-slate-600 leading-relaxed mb-6">
                Every HR person in your function has their own view. It shows them where they are now,
                what their specific gaps are, how they compare against anonymous peers in the same role,
                and what they're working on next.
              </p>
              <p className="text-slate-600 leading-relaxed mb-8">
                Their development plan is personalised to them — not selected from a catalogue, generated
                for their specific diagnosed gaps, role context, and seniority. Their reassessment shows
                them whether the work is paying off.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  "Their current AI capability score across six domains",
                  "Their specific diagnosed gaps with plain-language explanations",
                  "Anonymous percentile context against role peers",
                  "Their personalised development plan — sequenced, bounded, and calibrated to their role",
                  "Their reassessment results showing whether the gap closed",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#4477AA" }} />
                    <p className="text-slate-600 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border p-6" style={{ background: "white", borderColor: borderL }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: "#4477AA" }}>Individual dashboard</p>
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: navy }}>Overall AI Readiness</span>
                  <span className="text-2xl font-black" style={{ color: navy }}>7.2 <span className="text-sm font-normal text-slate-400">/ 10</span></span>
                </div>
                <div className="h-2 rounded-full" style={{ background: "#E2E8F0" }}>
                  <div className="h-full rounded-full" style={{ width: "72%", background: green }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-400">Foundation</span>
                  <span className="text-xs font-medium" style={{ color: green }}>72nd percentile for Senior HRBP</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 mb-5">
                {[
                  { domain: "AI Interaction", score: 8.1, pct: 81 },
                  { domain: "AI Output Evaluation", score: 6.4, pct: 64 },
                  { domain: "AI Workflow Design", score: 7.8, pct: 78 },
                  { domain: "Workforce AI Readiness", score: 6.9, pct: 69 },
                  { domain: "AI Ethics & Trust", score: 7.5, pct: 75 },
                  { domain: "AI Change Leadership", score: 6.8, pct: 68 },
                ].map(({ domain, score, pct }) => (
                  <div key={domain}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-slate-600">{domain}</span>
                      <span className="text-xs font-semibold" style={{ color: navy }}>{score}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "#E2E8F0" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: green, opacity: 0.7 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg p-4 border-l-4" style={{ background: "#FFF7ED", borderColor: "#F97316" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "#9A3412" }}>Priority gap: AI Output Evaluation</p>
                <p className="text-xs text-slate-600 leading-relaxed">Strong on bias detection, weaker on hallucination recognition. Matters for Project Aurora.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Manager view */}
      <section style={{ background: navy }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div className="order-2 lg:order-1 rounded-2xl border p-6" style={{ background: "rgba(255,255,255,0.04)", borderColor: borderD }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: "#047857" }}>Manager dashboard</p>
              <div className="flex flex-col gap-3">
                {[
                  { name: "Sarah Chen", role: "Senior HRBP", score: 7.2, status: "Progressing", color: "#047857" },
                  { name: "James Okafor", role: "Reward Specialist", score: 5.8, status: "Developing", color: "#D97706" },
                  { name: "Priya Patel", role: "L&D Manager", score: 8.4, status: "AI-Ready", color: green },
                  { name: "Tom Bradley", role: "HR Business Partner", score: 4.9, status: "Foundation gap", color: "#DC2626" },
                ].map(({ name, role, score, status, color }) => (
                  <div key={name} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div>
                      <p className="text-white text-sm font-semibold">{name}</p>
                      <p className="text-slate-400 text-xs">{role}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white font-bold">{score}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${color}20`, color }}>{status}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-lg p-4 border" style={{ borderColor: borderD, background: "rgba(255,255,255,0.02)" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: green }}>1:1 prompt — Tom Bradley</p>
                <p className="text-xs text-slate-400 leading-relaxed">Foundation gap in AI Output Evaluation. Discuss the hallucination recognition module before Project Aurora kickoff.</p>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#04785718" }}>
                  <BarChart3 className="w-5 h-5" style={{ color: "#047857" }} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#047857" }}>Manager view</p>
                  <h2 className="font-bold text-xl text-white">What every line manager sees</h2>
                </div>
              </div>
              <p className="text-slate-300 leading-relaxed mb-6">
                Every line manager sees their team's capability state — who's where, who's progressing,
                who's stalled, and what's worth discussing in next week's 1:1s.
              </p>
              <p className="text-slate-400 leading-relaxed mb-8">
                Not a heatmap. A briefing. Specific conversation prompts surface the development context
                that matters — the gap that's relevant to the project they're about to kick off, the
                module that's sitting incomplete, the reassessment that's showing the gap isn't closing.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  "Team capability heatmap across all six domains",
                  "Individual progress tracking — who's developing, who's stalled",
                  "1:1 conversation prompts calibrated to each person's current development context",
                  "Team-level gap against business AI initiative requirements",
                  "Drill-down to individual reports with full audit logging",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#047857" }} />
                    <p className="text-slate-400 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Leader view */}
      <section style={{ background: chalk }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${green}18` }}>
                  <Target className="w-5 h-5" style={{ color: green }} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: green }}>Leader view</p>
                  <h2 className="font-bold text-xl" style={{ color: navy }}>What you see</h2>
                </div>
              </div>
              <p className="text-slate-600 leading-relaxed mb-6">
                The function-level view is built for the CPO. It shows where your function is against
                where it needs to be, updated continuously, with the strategic intelligence your CEO
                is asking for.
              </p>
              <p className="text-slate-600 leading-relaxed mb-8">
                You configure your business's AI initiatives — the specific projects, timelines, and
                capability requirements. AiQ translates these into HR capability targets and shows
                you the gap, the rate of closure, and the projected closure date for each commitment.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  "Function-level readiness against your business AI roadmap",
                  "Per-initiative gap analysis with trajectory and projected closure date",
                  "Development investment efficiency — which interventions are producing measurable change",
                  "Regulatory exposure brief — capability gaps that affect specific regulatory commitments",
                  "Drill-down to any manager's team or any individual, with audit logging",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: green }} />
                    <p className="text-slate-600 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border p-6" style={{ background: "white", borderColor: borderL }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: green }}>Strategic intelligence view</p>
              <div className="mb-5">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold" style={{ color: navy }}>Project Aurora readiness</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#FEF9C3", color: "#854D0E" }}>At risk</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: "#E2E8F0" }}>
                  <div className="h-full rounded-full" style={{ width: "67%", background: "#D97706" }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-400">67% of target</span>
                  <span className="text-xs text-slate-400">Target: Q3 2027</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 mb-5">
                {[
                  { label: "Current pace closure", value: "Q2 2027", good: true },
                  { label: "Risk concentration", value: "Senior HRBPs — Workflow Design", good: false },
                  { label: "Stalled individuals", value: "3 of 24 assessed", good: false },
                  { label: "Development ROI", value: "0.8 pts per module completed", good: true },
                ].map(({ label, value, good }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b" style={{ borderColor: borderL }}>
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className="text-xs font-semibold" style={{ color: good ? green : "#DC2626" }}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg p-4 border-l-4" style={{ background: "#F0FDF4", borderColor: green }}>
                <p className="text-xs font-semibold mb-1" style={{ color: navy }}>Board finding</p>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "At current pace, Project Aurora capability requirement will be met by Q2 2027 — one quarter early.
                  Remaining risk is concentrated in workflow design among Senior HRBPs."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Exports */}
      <section style={{ background: slate }} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-12">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6" style={{ color: green }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: green }}>Exports</p>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
              Board-ready artefacts when you need them.
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Every dashboard zone produces shareable export artefacts designed for board and executive committee use.
              Not screenshots of your dashboard — designed documents that translate function-level intelligence into
              briefing material your audience can read in five minutes and forward without explanation.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[
              { title: "Function readiness summary", body: "Current state against business AI roadmap, with trajectory" },
              { title: "Regulatory exposure brief", body: "Capability gaps that affect specific regulatory commitments" },
              { title: "Strategic mismatch report", body: "Where capability is misaligned with business AI strategy and the implications" },
              { title: "Investment efficiency review", body: "Which development investment is producing measurable change and which isn't" },
            ].map(({ title, body }) => (
              <div key={title} className="rounded-xl p-6 border" style={{ background: "rgba(255,255,255,0.04)", borderColor: borderD }}>
                <Shield className="w-5 h-5 mb-3" style={{ color: green }} />
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-sm">Each export is footer-stamped with version and date, methodology disclosures included, designed to survive scrutiny by anyone who reads it.</p>
        </div>
      </section>

      {/* What AiQ does not do */}
      <section style={{ background: chalk }} className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: navy, letterSpacing: "-0.02em" }}>
              Honest about the boundary.
            </h2>
            <p className="text-slate-600 leading-relaxed">
              AiQ measures HR people's AI capability and closes the gaps it identifies. It deliberately does not do
              several things that adjacent products do, and we think being explicit about this is part of what makes
              the product trustworthy.
            </p>
          </div>
          <div className="flex flex-col gap-5">
            {[
              { text: "AiQ does not assess AI capability across non-HR roles. It is built for HR functions specifically. The methodology and platform architecture would translate to other professional groups but that's a different product, not a feature." },
              { text: "AiQ does not replace your performance management system or your existing learning platforms. It is the layer above them — the diagnostic intelligence that informs which development is worth investing in." },
              { text: "AiQ does not predict who will succeed or who should be promoted. The methodology refuses to make predictive claims about individuals; it measures current capability and supports development." },
              { text: "AiQ does not produce comparative rankings of named individuals within an organisation. The architecture forbids this. Anonymous percentile context against role peers is available; named-individual league tables are not." },
              { text: "AiQ does not currently support multi-jurisdiction regulatory contexts. UK regulatory translation is built; international expansion is on the roadmap." },
            ].map(({ text }, i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-xl border" style={{ background: "white", borderColor: borderL }}>
                <XCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#DC2626" }} />
                <p className="text-slate-600 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: navy }} className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>See it for yourself.</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Beta partners get full platform access plus direct access to the team building it.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed mb-10">
            The conversation starts with understanding your specific situation — whether AiQ is right for you depends
            on your function size, your business AI commitments, and your appetite for working with a product that's still maturing.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/beta">
              <Button size="lg" className="font-semibold px-10" style={{ background: green, color: "white" }}>
                Apply for beta access <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/methodology">
              <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 px-8">
                Talk to us first <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
