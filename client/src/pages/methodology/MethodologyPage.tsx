/**
 * Assessment Methodology Disclosure Page
 *
 * Public-facing page explaining how the AiQ adaptive assessment works.
 * Designed for C-suite, HR leaders, and procurement teams who need to
 * understand the credibility and rigour of the assessment methodology.
 *
 * Credibility improvements:
 * CR-1: Full SJT methodology disclosure with academic references
 * CR-2: Capability domain explanations
 * CR-3: Quality assurance and anti-gaming disclosure
 * CR-4: Limitations and roadmap transparency
 */
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Shield,
  Brain,
  Target,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  BarChart2,
  Lock,
  Eye,
  Layers,
  FileText,
  ExternalLink,
  Info,
  ArrowRight,
} from "lucide-react";
import { MarketingNav, MarketingFooter } from "../marketing/MarketingPage";

const BRAND = {
  midnight: "#0d1821",
  teal: "#0F6E56",
  sage: "var(--primary)",
  chalk: "#f7f8fa",
};

const CAPABILITY_DOMAINS = [
  {
    key: "ai_interaction",
    name: "AI Interaction",
    colour: "#4477AA",
    foundation: true,
    description:
      "Measures practical competence with AI tools - how effectively someone constructs prompts, iterates on outputs, provides context and constraints, and selects the right tool for each task. This is the foundational skill that underpins all other AI capability domains.",
    example: "Refining a vague prompt like 'write me an email about restructuring' into a specific request with context, tone, audience, and format requirements that produces a usable first draft.",
  },
  {
    key: "ai_output_evaluation",
    name: "AI Output Evaluation",
    colour: "#047857",
    foundation: true,
    description:
      "Measures the ability to critically assess AI outputs before acting on them - detecting errors, hallucinations, and logical flaws; judging fitness for purpose; calibrating confidence accurately; and verifying claims against authoritative sources.",
    example: "Spotting that an AI-drafted redundancy letter uses legally incorrect notice periods and cites a statutory instrument that doesn't exist, despite the output appearing professional and well-structured.",
  },
  {
    key: "ai_workflow_design",
    name: "AI Workflow Design",
    colour: "#0D9488",
    foundation: false,
    description:
      "Measures competence in analysing existing processes to identify where AI adds value, designing human-AI handoff points with clear accountability, building oversight into AI-augmented workflows, and achieving efficiency gains without introducing risk.",
    example: "Mapping an 8-step onboarding process and identifying that AI can automate document generation and scheduling, but that the welcome conversation and probation goal-setting must remain human-led.",
  },
  {
    key: "workforce_ai_readiness",
    name: "Workforce AI Readiness",
    colour: "var(--primary)",
    foundation: false,
    description:
      "Measures the ability to diagnose AI capability gaps in teams and organisations, design targeted interventions, advise leaders on readiness, and rigorously measure capability development progress over time.",
    example: "Diagnosing that a team's low AI adoption isn't a training problem but a trust problem, and designing an intervention that starts with transparent AI demonstrations rather than mandatory e-learning.",
  },
  {
    key: "ai_ethics_trust",
    name: "AI Ethics & Trust",
    colour: "#b91c1c",
    foundation: false,
    description:
      "Measures ethical reasoning about AI in the workplace - identifying dilemmas, maintaining positions under pressure, considering stakeholder impact, preserving employee trust during AI-driven changes, and communicating decisions transparently.",
    example: "Pushing back when a CEO demands immediate deployment of keystroke monitoring 'for productivity data', articulating the employee trust, legal, and ethical risks clearly and constructively.",
  },
  {
    key: "ai_change_leadership",
    name: "AI Change Leadership",
    colour: "#99882A",
    foundation: false,
    description:
      "Measures the ability to lead AI transformation - handling resistance constructively, calibrating the pace of change to organisational readiness, distinguishing legitimate concerns from unfounded resistance, and articulating a compelling vision for AI adoption.",
    example: "Recognising that a team's resistance to an AI screening tool stems from legitimate concerns about bias in their specific candidate pool, not from general technophobia, and adjusting the rollout accordingly.",
  },
];

const QUALITY_GATES = [
  {
    title: "Structural Validation",
    icon: Layers,
    description: "Every item must have exactly 4 response options, exactly 1 strong option, at least 1 failure option, minimum scenario length, and at least 2 signal deltas per option.",
  },
  {
    title: "Signal Integrity",
    icon: Target,
    description: "Strong options must have net-positive deltas for the target capability; failure options must have net-negative deltas. This prevents items where the 'right' answer actually penalises the intended capability.",
  },
  {
    title: "Anti-Tell Detection",
    icon: Eye,
    description: "The strong option must not be the shortest (a common test-taking tell). No two options may have more than 85% word overlap.",
  },
  {
    title: "Bias & Safety Screening",
    icon: Shield,
    description: "Items are scanned for personally identifiable information, vendor names, discriminatory language, and trivially obvious failure phrases.",
  },
];

const REFERENCES = [
  {
    id: 1,
    text: "Hejri, S.M. et al. (2023). Validity of Constructed-Response Situational Judgment Tests. BMC Medical Education.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9879421/",
  },
  {
    id: 2,
    text: "Whetzel, D.L., Sullivan, T.S., & McCloy, R.A. (2019). Situational Judgment Tests: An Overview of Development Practices and Psychometric Characteristics. Personnel Assessment and Decisions.",
    url: "https://www.humrro.org/corpsite/blog/evidence-and-experience-based-best-practices-situational-judgment-tests/",
  },
  {
    id: 3,
    text: "Christian, M.S. et al. (2010). Situational Judgment Tests: Constructs Assessed and a Meta-Analysis of Their Criterion-Related Validities. Personnel Psychology.",
    url: "https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1744-6570.2009.01163.x",
  },
  {
    id: 4,
    text: "ISO/IEC 42001:2023. Information Technology - Artificial Intelligence - Management System. Clause 7.2: Competence.",
    url: "https://www.iso.org/standard/42001",
  },
  {
    id: 5,
    text: "EU AI Act, Article 4: AI Literacy. Regulation (EU) 2024/1689.",
    url: "https://artificialintelligenceact.eu/article/4/",
  },
  {
    id: 6,
    text: "CIPD (2026). AI Skills Planning: Practical Guidance for People Professionals.",
    url: "https://www.cipd.org/en/knowledge/guides/ai-skills-planning/",
  },
  {
    id: 7,
    text: "The Alan Turing Institute (2025). AI Skills for Business Competency Framework. DSIT/Innovate UK BridgeAI.",
    url: "https://www.turing.ac.uk/skills/collaborate/ai-skills-business-framework",
  },
];

export default function MethodologyPage() {
  const navy = "#0F172A";
  const green = "var(--primary)";
  return (
    <div className="min-h-screen" style={{ background: navy }}>
      <MarketingNav />

      {/* Hero */}
      <section style={{ background: navy }} className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{ background: "rgba(34,197,94,0.12)", color: green, border: "1px solid rgba(34,197,94,0.25)" }}>
            <Shield className="w-3.5 h-3.5" />
            Methodology Disclosure
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6" style={{ letterSpacing: "-0.02em" }}>
            How AiQ measures AI capability.
          </h1>
          <p className="text-xl text-foreground/70 leading-relaxed max-w-2xl mb-4">
            Built for HR functions delivering AI transformation. Designed to survive General Counsel scrutiny.
          </p>
          <p className="text-muted-foreground leading-relaxed max-w-2xl">
            This page provides a transparent explanation of the assessment methodology used by AiQ -
            what we measure, how we measure it, the quality assurance processes that protect the
            integrity of results, and the known limitations of the current system.
          </p>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-12" style={{ color: "white" }}>
        {/* -- Section 1: What We Measure --------------------------------- */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0F6E56]/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-[#0F6E56]" />
            </div>
            <h2 className="text-xl font-bold text-foreground">What We Measure</h2>
          </div>

          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              AiQ does not measure AI knowledge. It does not test whether someone can define
              &ldquo;machine learning&rdquo; or list the features of a particular AI tool. Instead,
              it measures <strong className="text-foreground">applied AI capability</strong> - the
              ability to make sound professional decisions when AI tools are involved in HR workflows.
            </p>
            <p>
              This distinction matters. An HR professional might score highly on an AI knowledge quiz
              yet still blindly accept a biased AI screening recommendation, fail to escalate a data
              protection breach involving an AI tool, or over-rely on AI-generated analysis without
              checking its assumptions. AiQ is designed to detect exactly these behavioural patterns.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-foreground mt-8">Six Capability Domains</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The assessment operationalises AI capability across six domains, each targeting a distinct
            facet of practical AI capability in the modern workplace.
          </p>

          <div className="grid gap-4">
            {CAPABILITY_DOMAINS.map(cap => (
              <Card key={cap.key} className="border-border overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="w-1.5 shrink-0" style={{ backgroundColor: cap.colour }} />
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cap.colour }}
                        />
                        <h4 className="text-sm font-semibold text-foreground">{cap.name}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{cap.description}</p>
                      <div className="rounded-md bg-muted/50 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Example: </span>
                          {cap.example}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* -- Section 2: How We Measure It ------------------------------- */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0F6E56]/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-[#0F6E56]" />
            </div>
            <h2 className="text-xl font-bold text-foreground">How We Measure It</h2>
          </div>

          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              AiQ uses a <strong className="text-foreground">Situational Judgement Test (SJT)</strong> design
              - a well-established psychometric methodology with over 30 years of research evidence.
              SJTs present realistic workplace scenarios and ask the respondent to evaluate a set of
              response options, each representing a different level of professional capability.
            </p>
            <p>
              A meta-analysis of SJT validity found a pooled criterion-related validity estimate of
              <strong className="text-foreground"> 0.32 (p &lt; 0.0001)</strong> [1], and SJTs have been
              shown to have smaller group differences than cognitive ability tests [2], making them
              both valid and fair assessment instruments.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-foreground mt-6">Adaptive Personalisation</h3>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              What distinguishes AiQ from a standard SJT is the dynamic generation of assessment items.
              Rather than drawing from a fixed item bank, AiQ uses a large language model to generate
              scenario-based questions in real time, personalised to the individual&rsquo;s role, sector,
              seniority, and AI experience level.
            </p>
            <p>
              This means no two assessments are identical, which significantly reduces the risk of item
              exposure and answer sharing. Each scenario is grounded in the specific professional context
              of the person being assessed.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-foreground mt-6">Three-Phase Adaptive Structure</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { phase: "Baseline", range: "0-30%", desc: "Broad calibration across all six capability domains", colour: "#4477AA" },
              { phase: "Adaptive", range: "30-75%", desc: "Deep probing of identified weaknesses - targets the lowest-scoring capabilities", colour: "#EE8866" },
              { phase: "Validation", range: "75-100%", desc: "Confirms or challenges earlier responses with higher-difficulty items", colour: "#047857" },
            ].map(p => (
              <Card key={p.phase} className="border-border">
                <CardContent className="p-4 text-center space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: p.colour }}>
                    {p.phase}
                  </div>
                  <div className="text-lg font-bold text-foreground">{p.range}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <h3 className="text-lg font-semibold text-foreground mt-6">Fifteen Interaction Types</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The assessment uses at least 5 of 15 available question formats to ensure measurement
            diversity and reduce method bias. These include prompt refinement, chatbot dialogue, agent oversight,
            output critique, error detection, workflow mapping, process redesign, capability diagnosis,
            intervention design, ethical dilemma, pressure test, stakeholder advisory, change narrative,
            resistance handling, and confidence calibration.
          </p>
        </section>

        {/* -- Section 3: Quality Assurance -------------------------------- */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0F6E56]/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-[#0F6E56]" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Quality Assurance</h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Every dynamically generated assessment item passes through a multi-layer quality gate
            before being presented to the user. If an item fails validation, the system retries
            up to 3 times with explicit feedback. If all retries fail, a pre-validated fallback
            item is used.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {QUALITY_GATES.map(gate => {
              const Icon = gate.icon;
              return (
                <Card key={gate.title} className="border-border">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[#0F6E56]" />
                      <h4 className="text-sm font-semibold text-foreground">{gate.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{gate.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <h3 className="text-lg font-semibold text-foreground mt-6">Anti-Gaming Protection</h3>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              The assessment includes dedicated integrity mechanisms. <strong className="text-foreground">Anti-gaming
              injections</strong> detect patterns such as social desirability bias, speed-running, and
              response pattern anomalies. When gaming behaviour is detected, the engine injects
              specifically designed items to test whether the pattern is genuine or strategic.
            </p>
            <p>
              <strong className="text-foreground">Contradiction probes</strong> test consistency by presenting
              the same underlying capability challenge in a completely different surface context. If
              someone demonstrates strong ethical reasoning in one scenario but weak ethical reasoning
              in another, the contradiction is flagged and factored into the confidence profile.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-foreground mt-6">Evidence Sufficiency Gates</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The system will not classify an individual unless minimum evidence thresholds are met:
            at least 20 items answered, at least 3 signals per capability domain, at least 5 distinct
            interaction types used, and at least 25% of items at high-risk level. If these thresholds
            are not met, the assessment reports <strong className="text-foreground">insufficient evidence</strong> rather
            than producing an unreliable classification.
          </p>
        </section>

        {/* -- Section 4: Scoring ----------------------------------------- */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0F6E56]/10 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-[#0F6E56]" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Scoring & Classification</h2>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Each response generates <strong className="text-foreground">signal deltas</strong> - positive
              values indicate capability demonstrated, negative values indicate risk or weakness. These
              signals are aggregated per capability domain, producing scores on a 0-100 scale.
            </p>
            <p>
              Individuals are classified into one of six readiness levels. Scores are accompanied by
              <strong className="text-foreground"> confidence intervals</strong> that communicate the
              precision of each measurement - wider intervals indicate less certainty, typically due
              to fewer evidence signals in that domain.
            </p>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-semibold text-foreground">Classification</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-foreground">Score Range</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-foreground">Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { cls: "Leading", range: "80-100", desc: "Exceptional AI capability; can lead and mentor others", color: "#047857" },
                  { cls: "Advanced", range: "70-79", desc: "Strong capability; works effectively with AI across complex scenarios", color: "#047857" },
                  { cls: "Proficient", range: "60-69", desc: "Competent; handles routine AI-augmented work well", color: "#4477AA" },
                  { cls: "Developing", range: "50-59", desc: "Emerging capability; needs targeted development in specific areas", color: "#EE8866" },
                  { cls: "Provisional", range: "40-49", desc: "Significant gaps; requires structured learning before independent AI use", color: "#DC2626" },
                  { cls: "At Risk", range: "0-39", desc: "Critical gaps; may pose risk if working unsupervised with AI", color: "#b91c1c" },
                ].map(row => (
                  <tr key={row.cls} className="border-t border-border/50">
                    <td className="px-4 py-2.5">
                      <span className="font-semibold" style={{ color: row.color }}>{row.cls}</span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.range}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* -- Section 5: Standards Alignment ------------------------------ */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0F6E56]/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#0F6E56]" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Standards Alignment</h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            The AiQ assessment methodology is designed to align with recognised industry standards
            for AI competence assessment and workforce capability measurement.
          </p>

          <div className="grid gap-3">
            {[
              {
                standard: "ISO/IEC 42001:2023",
                clause: "Clause 7.2 - Competence",
                alignment: "AiQ provides documented evidence of AI competence assessment, addressing the requirement to determine and evidence the competence of persons whose work affects AI performance. This alignment is self-assessed and has not been audited or certified by an accredited body.",
              },
              {
                standard: "EU AI Act",
                clause: "Article 4 - AI Literacy",
                alignment: "Article 4 requires organisations to 'ensure, to their best extent, a sufficient level of AI literacy of their staff.' AiQ provides the assessment mechanism to measure and evidence this - going beyond literacy to measure applied capability. This alignment is self-assessed and has not been audited or endorsed by any regulatory body.",
              },
              {
                standard: "CIPD AI Skills Planning",
                clause: "Five Principles for Practice",
                alignment: "AiQ's design is informed by CIPD's AI Skills Planning guidance for people professionals (2026). The six measured domains reflect the applied capability areas identified in that guidance. This alignment is self-assessed and has not been audited or endorsed by CIPD.",
              },
              {
                standard: "Alan Turing Institute",
                clause: "AI Skills for Business Framework",
                alignment: "The Turing framework defines four personas (AI Citizens, Workers, Professionals, Leaders) with competencies across knowledge, skills, and behaviours. AiQ's role archetype system provides a more granular, HR-specific operationalisation.",
              },
            ].map(s => (
              <Card key={s.standard} className="border-border">
                <CardContent className="p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-[#0F6E56]" />
                    <span className="text-sm font-semibold text-foreground">{s.standard}</span>
                    <span className="text-xs text-muted-foreground">- {s.clause}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.alignment}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* -- Section 6: Limitations & Transparency ---------------------- */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#D97706]/12 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-[#99882A]" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Limitations & Transparency</h2>
          </div>

          {/* Developmental-use-only statement */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-xs text-amber-200/80 leading-relaxed">
            <span className="mt-0.5 shrink-0 text-amber-400" aria-hidden="true">⚠</span>
            <p>
              <strong className="text-amber-300 font-semibold">For individual development purposes only.</strong>{" "}
              This assessment is designed to support personal learning and professional development. It has not been independently validated for use in recruitment, promotion, redundancy, or any other employment decision. Scores must not be used as the sole or primary basis for any consequential HR decision. Results should be treated as indicative and developmental, not as definitive capability measures.
            </p>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            We believe credibility is built through honest disclosure. The following limitations
            are known and are being actively addressed through our validation roadmap.
          </p>

          <div className="space-y-3">
            {[
              {
                title: "Synthetic Norm Data",
                severity: "High",
                detail: "Benchmark comparisons (role averages, percentiles) are currently based on synthetic reference distributions, not real HR professional data. This is standard for a newly launched assessment but will be replaced with empirical norms as the user base grows (target: n ≥ 200 per role archetype).",
                timeline: "6-12 months",
              },
              {
                title: "Expert-Authored Role Weights",
                severity: "Medium",
                detail: "Capability weights for each role archetype are based on structured job analysis reasoning. These will be formally validated through a Delphi panel study with 10-12 senior HR professionals per archetype.",
                timeline: "3-6 months",
              },
              {
                title: "No Test-Retest Reliability Data",
                severity: "Medium",
                detail: "Formal test-retest reliability has not yet been measured. The assessment includes reliability safeguards (evidence sufficiency gates, confidence profiling) but empirical reliability evidence is pending.",
                timeline: "6-9 months",
              },
              {
                title: "No Adverse Impact Analysis",
                severity: "Medium",
                detail: "While the SJT methodology has documented advantages for group fairness, formal adverse impact analysis has not been conducted with AiQ-specific data. Optional demographic data collection will enable this analysis.",
                timeline: "6-12 months",
              },
            ].map(lim => (
              <Card key={lim.title} className="border-border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#99882A]" />
                      <span className="text-sm font-semibold text-foreground">{lim.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        lim.severity === "High"
                          ? "bg-[#DC2626]/12 text-[#CC3344]"
                          : "bg-[#D97706]/12 text-[#99882A]"
                      }`}>
                        {lim.severity}
                      </span>
                      <span className="text-xs text-muted-foreground">{lim.timeline}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{lim.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* -- Section 7: References -------------------------------------- */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0F6E56]/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-[#0F6E56]" />
            </div>
            <h2 className="text-xl font-bold text-foreground">References</h2>
          </div>

          <div className="space-y-2">
            {REFERENCES.map(ref => (
              <div key={ref.id} className="flex gap-3 text-xs text-muted-foreground">
                <span className="text-foreground font-semibold shrink-0">[{ref.id}]</span>
                <div>
                  <span>{ref.text}</span>
                  {ref.url && (
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 ml-1 text-[#0F6E56] hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* -- Footer note ------------------------------------------------------- */}
        <div className="border-t pt-8 pb-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="rounded-lg px-5 py-4 flex items-start gap-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground leading-relaxed">
                This methodology disclosure is current as of April 2026. It will be updated as
                the validation programme progresses and empirical evidence is collected.
              </p>
              <p className="text-xs text-muted-foreground/70">
                Assessment model version: adaptive-v2 · Scoring engine: V9.2
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* CTA */}
      <section className="py-20 px-6" style={{ background: "#1E293B" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
            The methodology document goes deeper.
          </h2>
          <p className="text-foreground/70 leading-relaxed mb-10 max-w-xl mx-auto">
            The full methodology document covers item bank design, signal taxonomy, scoring architecture,
            audit log design, and the data processing implications. It is the document your General Counsel
            will want to read.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/beta">
              <Button size="lg" className="font-semibold px-10" style={{ background: green, color: "white" }}>
                Join the beta programme for free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="mailto:hello@hraiq.co.uk">
              <Button size="lg" variant="outline" className="text-white border-foreground/20 hover:bg-foreground/10 px-8">
                Request methodology document
              </Button>
            </a>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}