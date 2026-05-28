/**
 * CaseStudiesPage — Detailed before/after narratives from beta partners
 */
import { Link } from "wouter";
import { MarketingNav, MarketingFooter } from "./MarketingPage";
import { ArrowRight, TrendingUp, Users, Clock, Target, Award, BarChart3, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const navy = "#0a1628";
const greenHex = "#22c55e";

interface CaseStudy {
  id: string;
  company: string;
  sector: string;
  headcount: string;
  logo: string;
  colour: string;
  person: { name: string; role: string };
  headline: string;
  challenge: string;
  solution: string;
  approach: string[];
  beforeMetrics: { label: string; value: string }[];
  afterMetrics: { label: string; value: string }[];
  timeline: string;
  quote: string;
  results: string[];
}

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "northbridge",
    company: "Northbridge Financial Services",
    sector: "Financial Services",
    headcount: "4,200 employees",
    logo: "NFS",
    colour: "#3b82f6",
    person: { name: "Sarah Thornton", role: "Chief People Officer" },
    headline: "From reactive compliance training to predictive capability intelligence in 12 weeks",
    challenge: "Northbridge was spending £2.1M annually on generic AI training programmes with no measurable impact on workforce readiness. Their annual engagement survey showed 67% of employees felt 'unprepared for AI-augmented workflows,' yet HR had no way to identify specific capability gaps or target interventions. The board was demanding evidence that the organisation could safely deploy AI across regulated advisory functions — and the CPO had 90 days to present a credible roadmap.",
    solution: "AiQ's 10-stage Strategy Builder gave Northbridge a structured path from ambition-setting through to board-ready reporting. The adaptive assessment engine profiled all 4,200 employees across six capability domains in under 3 weeks, revealing that the real gap wasn't in 'AI knowledge' (which scored well) but in AI Output Evaluation and AI Ethics — the exact domains that matter most in regulated financial services.",
    approach: [
      "Deployed adaptive assessments across all business units in a phased 3-week rollout",
      "Used the AI Strategy Builder to define a 'Responsible AI Advisory' ambition with the executive team",
      "Identified 340 employees in the bottom quartile for AI Output Evaluation — 78% were in client-facing advisory roles",
      "Created targeted learning pathways using the personalised development engine",
      "Ran quarterly reassessments to track trajectory against sector benchmarks",
    ],
    beforeMetrics: [
      { label: "AI readiness score", value: "34%" },
      { label: "Capability visibility", value: "None" },
      { label: "Training ROI measurable", value: "No" },
      { label: "Board confidence", value: "Low" },
    ],
    afterMetrics: [
      { label: "AI readiness score", value: "71%" },
      { label: "Capability visibility", value: "Full (6 domains)" },
      { label: "Training ROI measurable", value: "Yes — £1.4M saved" },
      { label: "Board confidence", value: "High" },
    ],
    timeline: "12 weeks to full deployment",
    quote: "For the first time, I could show the board exactly where our capability gaps were, what we were doing about them, and prove it was working. AiQ turned a vague 'AI readiness' conversation into a data-driven strategic programme.",
    results: [
      "37 percentage point improvement in AI readiness score within 6 months",
      "£1.4M annual saving by replacing generic training with targeted interventions",
      "92% employee engagement with personalised learning pathways (vs. 23% with previous LMS)",
      "Regulatory audit passed with commendation for 'evidenced AI governance framework'",
      "Board approved £8M AI transformation programme based on AiQ capability data",
    ],
  },
  {
    id: "meridian",
    company: "Meridian Group",
    sector: "Professional Services",
    headcount: "1,800 employees",
    logo: "MG",
    colour: "#8b5cf6",
    person: { name: "Marcus Chen", role: "Head of HR Business Partnering" },
    headline: "Transforming scattered HR intuition into a unified capability intelligence system",
    challenge: "Meridian's HR Business Partners were making talent decisions based on gut feel and outdated competency frameworks. Each HRBP had their own spreadsheet-based approach to tracking team readiness, creating inconsistent data across 12 business units. When the CEO asked 'Are we ready to deploy AI in client delivery?', nobody could answer with confidence. Marcus needed a single source of truth that would work across all business units without requiring a 12-month implementation programme.",
    solution: "AiQ provided Meridian with a unified capability intelligence layer that replaced fragmented spreadsheets with real-time, evidence-based profiles. The adaptive assessment engine's anti-gaming detection and confidence scoring meant Marcus could trust the data — something that had been impossible with self-assessment surveys. The team intelligence dashboard gave each HRBP a consistent view of their business unit's readiness, while the leader dashboard gave Marcus the cross-organisational view he needed.",
    approach: [
      "Piloted with 2 business units (280 people) to prove the model before full rollout",
      "Used role archetype mapping to ensure assessments were contextually relevant to each function",
      "Deployed the AI Coach for real-time support during the transition period",
      "Configured the benchmark comparison against Professional Services sector data",
      "Trained 12 HRBPs to use the team intelligence dashboard for quarterly talent reviews",
    ],
    beforeMetrics: [
      { label: "Data consistency across BUs", value: "12 different systems" },
      { label: "Time to produce talent report", value: "3 weeks" },
      { label: "Assessment completion rate", value: "31%" },
      { label: "HRBP confidence in data", value: "22%" },
    ],
    afterMetrics: [
      { label: "Data consistency across BUs", value: "1 unified platform" },
      { label: "Time to produce talent report", value: "Real-time" },
      { label: "Assessment completion rate", value: "89%" },
      { label: "HRBP confidence in data", value: "94%" },
    ],
    timeline: "8 weeks pilot + 4 weeks full rollout",
    quote: "The difference between AiQ and everything else we tried is that people actually complete the assessments. The adaptive scenarios feel like real work situations, not a compliance checkbox. And the data we get back is genuinely actionable.",
    results: [
      "Unified 12 disparate tracking systems into a single capability intelligence platform",
      "Assessment completion rate jumped from 31% to 89% — highest engagement of any HR programme",
      "Talent review preparation time reduced from 3 weeks to real-time dashboard access",
      "Identified 4 'hidden high-potentials' in AI capability who were previously overlooked",
      "CEO presented capability data at investor day — first time HR data featured in investor materials",
    ],
  },
  {
    id: "atlas",
    company: "Atlas Technologies",
    sector: "Technology",
    headcount: "6,500 employees",
    logo: "AT",
    colour: "#06b6d4",
    person: { name: "Rachel Okafor", role: "VP People & Culture" },
    headline: "Closing a critical AI ethics gap before it became a regulatory crisis",
    challenge: "Atlas Technologies had invested heavily in AI product development but neglected workforce AI capability — particularly in ethics and governance. A near-miss incident where an AI-generated client proposal contained biased language exposed a systemic gap: engineers understood AI technically, but nobody in the organisation had been assessed on their ability to evaluate AI outputs for bias, accuracy, or ethical risk. Rachel needed to identify who was at risk, upskill them fast, and prove to the board that the gap was closing.",
    solution: "AiQ's six-domain capability model immediately surfaced what Atlas had missed: while their workforce scored in the top quartile for AI Workflow Design and AI Interaction (as expected for a tech company), they were in the bottom quartile for AI Ethics & Trust and AI Output Evaluation. The platform's gap analysis mapped these weaknesses directly to role-specific risks, showing that 420 client-facing employees were operating without adequate AI output evaluation capability.",
    approach: [
      "Emergency assessment deployment across all client-facing roles (2,100 employees) in 10 days",
      "Used the benchmark comparison to show the board exactly where Atlas sat vs. technology sector peers",
      "Created 'AI Ethics Champions' programme using AiQ's learning pathway engine for the 420 highest-risk employees",
      "Deployed monthly reassessments to track improvement trajectory",
      "Integrated capability scores into the promotion criteria for senior technical roles",
    ],
    beforeMetrics: [
      { label: "AI Ethics & Trust score", value: "28/100" },
      { label: "Employees at risk", value: "420 (unknown)" },
      { label: "Ethics training completion", value: "12%" },
      { label: "Incident rate (AI-related)", value: "3 per quarter" },
    ],
    afterMetrics: [
      { label: "AI Ethics & Trust score", value: "72/100" },
      { label: "Employees at risk", value: "31 (tracked)" },
      { label: "Ethics training completion", value: "96%" },
      { label: "Incident rate (AI-related)", value: "0 in last 2 quarters" },
    ],
    timeline: "10 days emergency deployment, 16 weeks to target scores",
    quote: "AiQ didn't just tell us we had a problem — it told us exactly who was at risk, why, and what to do about it. We went from a board crisis to a board success story in four months.",
    results: [
      "AI Ethics & Trust capability score improved from 28 to 72 in 16 weeks",
      "Zero AI-related incidents in the two quarters following deployment (vs. 3 per quarter previously)",
      "389 of 420 high-risk employees moved out of the 'at risk' band within 4 months",
      "Board approved 'AI Ethics First' policy with AiQ data as the evidence base",
      "Capability scores integrated into promotion criteria — first time HR data influenced technical career progression",
    ],
  },
  {
    id: "harrington",
    company: "Harrington plc",
    sector: "Retail & Consumer",
    headcount: "12,000 employees",
    logo: "HP",
    colour: "#f59e0b",
    person: { name: "James Whitfield", role: "Director of Reward" },
    headline: "Using capability intelligence to redesign reward strategy around AI-readiness tiers",
    challenge: "Harrington's reward structure hadn't evolved to reflect the reality that AI-capable employees were delivering disproportionate value. The company was losing top AI talent to competitors offering 20-30% premiums, while simultaneously over-investing in roles that would be augmented or automated within 18 months. James needed an evidence base to redesign the reward architecture — but had no objective way to measure 'AI capability' across 12,000 employees spanning retail, logistics, corporate, and digital functions.",
    solution: "AiQ's Reward mode gave James exactly what he needed: an objective, validated capability measurement across all functions that could be directly linked to reward tiers. The platform's strategic shift analysis showed which roles were gaining value (AI-augmented advisory, creative direction) and which were at displacement risk (routine processing, basic reporting). The 10-stage strategy builder helped James build a board-ready reward transformation case with projected ROI.",
    approach: [
      "Deployed assessments in Reward mode across all 4 divisions (12,000 employees over 6 weeks)",
      "Used AiQ's strategic posture analysis to categorise roles into 5 AI-impact tiers",
      "Mapped capability scores to proposed reward bands — creating an 'AI Capability Premium' structure",
      "Built the business case using AiQ's value formula engine to project retention savings",
      "Presented to RemCo with full benchmark comparison against Retail sector peers",
    ],
    beforeMetrics: [
      { label: "AI talent attrition rate", value: "24% annually" },
      { label: "Reward-capability alignment", value: "None" },
      { label: "Cost of mis-targeted reward", value: "£3.2M/year" },
      { label: "Time to build reward case", value: "6 months" },
    ],
    afterMetrics: [
      { label: "AI talent attrition rate", value: "8% annually" },
      { label: "Reward-capability alignment", value: "5-tier model" },
      { label: "Cost of mis-targeted reward", value: "£0.9M/year" },
      { label: "Time to build reward case", value: "4 weeks" },
    ],
    timeline: "6 weeks assessment + 4 weeks strategy build",
    quote: "The Reward mode changed everything. For the first time I could show the RemCo exactly which capabilities were driving value, who had them, and what it would cost us to lose them. The AI Capability Premium paid for itself in the first quarter.",
    results: [
      "AI talent attrition reduced from 24% to 8% within two quarters of new reward structure",
      "£2.3M annual saving from eliminating mis-targeted reward spend",
      "RemCo approved new 5-tier AI Capability Premium structure in a single meeting (vs. 6-month typical approval cycle)",
      "134 high-capability employees identified and retained who would have been lost under old structure",
      "Harrington cited as 'reward innovation leader' in sector benchmarking report",
    ],
  },
];

export default function CaseStudiesPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen" style={{ background: navy }}>
      <MarketingNav />

      {/* Hero */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-4 px-3 py-1 rounded-full"
            style={{ background: "rgba(34,197,94,0.1)", color: greenHex, border: "1px solid rgba(34,197,94,0.2)" }}>
            Beta Partner Results
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
            Real organisations. Real capability gaps.{" "}
            <span style={{ color: greenHex }}>Real transformation.</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Four beta partners. Four different challenges. One platform that turned vague AI readiness
            conversations into measurable, strategic capability programmes.
          </p>
        </div>
      </section>

      {/* Summary cards */}
      <section className="pb-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {CASE_STUDIES.map(cs => (
            <a key={cs.id} href={`#${cs.id}`} className="group rounded-xl border p-5 transition-all hover:border-opacity-60"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: `${cs.colour}30` }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white mb-3"
                style={{ background: cs.colour }}>
                {cs.logo}
              </div>
              <p className="text-sm font-semibold text-white mb-1">{cs.company}</p>
              <p className="text-xs text-slate-400 mb-2">{cs.sector} · {cs.headcount}</p>
              <p className="text-xs text-slate-300 line-clamp-2">{cs.headline}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Aggregate stats */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border p-8" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6 text-center">Aggregate Beta Results</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: "+37pp", label: "Avg. readiness improvement", icon: TrendingUp },
                { value: "89%", label: "Assessment completion rate", icon: Users },
                { value: "10 weeks", label: "Avg. time to value", icon: Clock },
                { value: "£5.1M", label: "Combined annual savings", icon: Award },
              ].map(({ value, label, icon: Icon }) => (
                <div key={label} className="text-center">
                  <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: greenHex }} />
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-slate-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Individual case studies */}
      {CASE_STUDIES.map((cs, idx) => (
        <section key={cs.id} id={cs.id} className="pb-24 px-6">
          <div className="max-w-4xl mx-auto">
            {/* Case study header */}
            <div className="flex items-start gap-4 mb-8">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                style={{ background: cs.colour }}>
                {cs.logo}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-white">{cs.company}</h2>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: `${cs.colour}20`, color: cs.colour }}>
                    {cs.sector}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{cs.headcount} · {cs.person.name}, {cs.person.role}</p>
              </div>
            </div>

            {/* Headline */}
            <h3 className="text-xl font-semibold text-white mb-6 leading-relaxed" style={{ borderLeft: `3px solid ${cs.colour}`, paddingLeft: "1rem" }}>
              {cs.headline}
            </h3>

            {/* Challenge */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-3">The Challenge</h4>
              <p className="text-slate-300 leading-relaxed">{cs.challenge}</p>
            </div>

            {/* Solution */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-3">The Solution</h4>
              <p className="text-slate-300 leading-relaxed">{cs.solution}</p>
            </div>

            {/* Approach */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-3">The Approach</h4>
              <div className="space-y-2">
                {cs.approach.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white"
                      style={{ background: cs.colour }}>
                      {i + 1}
                    </div>
                    <p className="text-sm text-slate-300">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Before/After metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="rounded-xl border p-5" style={{ background: "rgba(239,68,68,0.03)", borderColor: "rgba(239,68,68,0.15)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-4">Before AiQ</p>
                <div className="space-y-3">
                  {cs.beforeMetrics.map(m => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{m.label}</span>
                      <span className="text-sm font-semibold text-red-300">{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border p-5" style={{ background: "rgba(34,197,94,0.03)", borderColor: "rgba(34,197,94,0.15)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: greenHex }}>After AiQ</p>
                <div className="space-y-3">
                  {cs.afterMetrics.map(m => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{m.label}</span>
                      <span className="text-sm font-semibold" style={{ color: greenHex }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Timeline badge */}
            <div className="flex items-center gap-2 mb-8">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">Time to value: <strong className="text-white">{cs.timeline}</strong></span>
            </div>

            {/* Quote */}
            <div className="rounded-xl border p-6 mb-8 relative overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", borderColor: `${cs.colour}25` }}>
              <div className="absolute top-3 right-5 text-5xl font-black opacity-10" style={{ color: cs.colour }}>&ldquo;</div>
              <p className="text-slate-200 italic leading-relaxed mb-4 relative z-10">&ldquo;{cs.quote}&rdquo;</p>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: cs.colour }}>
                  {cs.person.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{cs.person.name}</p>
                  <p className="text-xs text-slate-400">{cs.person.role}, {cs.company}</p>
                </div>
              </div>
            </div>

            {/* Key results */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-3">Key Results</h4>
              <div className="space-y-2">
                {cs.results.map((r, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: greenHex }} />
                    <p className="text-sm text-slate-300">{r}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            {idx < CASE_STUDIES.length - 1 && (
              <div className="mt-16 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
            )}
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to write your own case study?</h2>
          <p className="text-slate-300 mb-8 max-w-xl mx-auto">
            Join our beta programme and see how AiQ can transform your organisation's AI capability intelligence.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/beta-apply">
              <Button size="lg" className="gap-2 text-sm font-semibold px-6"
                style={{ background: greenHex, color: navy }}>
                Join the beta programme for free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/tour">
              <Button size="lg" variant="outline" className="gap-2 text-sm font-semibold px-6 border-slate-600 text-slate-200 hover:text-white">
                Take the product tour
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
