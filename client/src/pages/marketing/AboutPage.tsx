/**
 * AiQ - About page - v3.0
 */
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "./MarketingPage";
import { ArrowRight, ChevronRight } from "lucide-react";

const navy  = "#0F172A";
const slate = "#1E293B";
const chalk = "#F8FAFC";
const green = "var(--primary)";
const borderL = "#E2E8F0";
const borderD = "rgba(255,255,255,0.08)";

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: navy }}>
      <MarketingNav />

      {/* Hero */}
      <section style={{ background: navy }} className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{ background: "rgba(34,197,94,0.12)", color: green, border: "1px solid rgba(34,197,94,0.25)" }}>
            About AiQ
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6" style={{ letterSpacing: "-0.02em" }}>
            We built AiQ because the problem{" "}
            <span style={{ color: green }}>wasn't being taken seriously.</span>
          </h1>
          <p className="text-xl dark:text-slate-300 text-slate-700 leading-relaxed max-w-2xl">
            HR functions are being asked to lead AI transformation. Most of them don't know where they stand.
            The tools that exist to help them don't meet the standard the problem requires.
          </p>
        </div>
      </section>

      {/* Origin */}
      <section style={{ background: chalk }} className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7">
              <h2 className="text-3xl font-bold mb-6" style={{ color: navy, letterSpacing: "-0.02em" }}>
                Where this came from.
              </h2>
              <div className="flex flex-col gap-5 text-slate-600 leading-relaxed">
                <p>
                  AiQ was built by a team with deep roots in HR practice, psychometrics, and AI systems design.
                  The founding insight was simple: the measurement problem in HR AI capability was being treated
                  as a training problem. Organisations were deploying learning content without any diagnostic
                  foundation - no way to know whether the content was addressing the actual gaps, no way to
                  measure whether it was working.
                </p>
                <p>
                  The result was predictable. Completion rates were high. Capability change was unmeasurable.
                  When boards asked whether their HR function was ready to lead AI transformation, the honest
                  answer was: we don't know.
                </p>
                <p>
                  We built AiQ to make that question answerable. Not with a survey. Not with a self-assessment.
                  With a measurement system that meets the standard of the claim - adaptive, scenario-based,
                  role-calibrated, and connected to the specific business AI commitments your function is
                  expected to support.
                </p>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-2xl p-8 border" style={{ background: "white", borderColor: borderL }}>
                <h3 className="font-bold text-lg mb-6" style={{ color: navy }}>The problem we're solving</h3>
                <div className="flex flex-col gap-5">
                  {[
                    {
                      q: "What boards are asking",
                      a: "Is our HR function capable of leading AI transformation?",
                    },
                    {
                      q: "What HR leaders are being told",
                      a: "We've completed the AI training programme. 94% completion rate.",
                    },
                    {
                      q: "What that actually means",
                      a: "We don't know. Completion is not capability.",
                    },
                    {
                      q: "What AiQ provides",
                      a: "A defensible answer: here is where your function is, here is where it needs to be, here is the gap, here is the trajectory.",
                    },
                  ].map(({ q, a }) => (
                    <div key={q} className="border-b pb-4 last:border-0 last:pb-0" style={{ borderColor: borderL }}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: green }}>{q}</p>
                      <p className="text-slate-700 text-sm leading-relaxed">{a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What we believe */}
      <section style={{ background: slate }} className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
            What we believe.
          </h2>
          <p className="dark:text-slate-300 text-slate-700 leading-relaxed mb-12 max-w-2xl">
            These aren't values statements. They're the design principles that explain why AiQ is built the way it is.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "Measurement precedes development",
                body: "You cannot close a gap you haven't diagnosed. Every development intervention in AiQ is preceded by a measurement that identifies the specific gap it's designed to close.",
              },
              {
                title: "Specificity over scale",
                body: "A generic AI literacy score is not useful. A diagnosis that says 'your hallucination recognition breaks down in high-stakes workforce decisions' is useful. AiQ optimises for the latter.",
              },
              {
                title: "The loop must close",
                body: "Development that isn't followed by measurement isn't development - it's activity. AiQ is built around the reassessment loop. Capability change must be measurable.",
              },
              {
                title: "Trustworthy or not at all",
                body: "AiQ's methodology is documented, version-controlled, and open to scrutiny. The platform refuses to make claims it can't defend. We'd rather be honest about uncertainty than confident about nonsense.",
              },
              {
                title: "HR deserves better tools",
                body: "HR functions are being asked to lead the most consequential organisational change in a generation. The tools they've been given are not good enough. We're trying to fix that.",
              },
              {
                title: "Individual dignity is non-negotiable",
                body: "The architecture forbids named-individual rankings. Diagnostic findings are surfaced to support development, not to rank or sort people. This is a design constraint, not a policy.",
              },
            ].map(({ title, body }) => (
              <div key={title} className="rounded-xl p-6 border" style={{ background: "rgba(255,255,255,0.04)", borderColor: borderD }}>
                <h3 className="font-semibold text-white mb-3">{title}</h3>
                <p className="dark:text-slate-400 text-slate-600 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beta context */}
      <section style={{ background: chalk }} className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-bold mb-6" style={{ color: navy, letterSpacing: "-0.02em" }}>
                Where we are.
              </h2>
              <div className="flex flex-col gap-5 text-slate-600 leading-relaxed">
                <p>
                  AiQ is in private beta. The core platform is built - assessment engine, adaptive item selection,
                  diagnostic scoring, development plan generation, manager and leader views, strategic intelligence
                  layer, board-ready exports.
                </p>
                <p>
                  We are working with a small number of HR functions to validate the methodology in real conditions,
                  calibrate the platform against real capability distributions, and understand what the product needs
                  to do that we haven't built yet.
                </p>
                <p>
                  Beta partners get full platform access, direct access to the team, and the ability to shape what
                  AiQ becomes. They also accept that they're working with a product that's still maturing - some
                  things will change, some things won't work perfectly, and we'll be honest about both.
                </p>
              </div>
            </div>
            <div className="rounded-2xl p-8 border" style={{ background: "white", borderColor: borderL }}>
              <h3 className="font-bold text-lg mb-6" style={{ color: navy }}>What beta means in practice</h3>
              <div className="flex flex-col gap-4">
                {[
                  { label: "Full platform access", detail: "All features available from day one" },
                  { label: "Direct team access", detail: "Regular calls with the people building it" },
                  { label: "Methodology input", detail: "Your use cases shape the calibration" },
                  { label: "Honest about limitations", detail: "We'll tell you what doesn't work yet" },
                  { label: "No long-term commitment", detail: "Beta is beta - no lock-in" },
                  { label: "Early pricing", detail: "Beta pricing reflects the stage of the product" },
                ].map(({ label, detail }) => (
                  <div key={label} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0" style={{ borderColor: borderL }}>
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: green }} />
                    <div>
                      <p className="font-semibold text-sm" style={{ color: navy }}>{label}</p>
                      <p className="text-slate-500 text-xs">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Contact */}
      <section id="contact" style={{ background: navy }} className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
            The conversation starts with your situation.
          </h2>
          <p className="dark:text-slate-300 text-slate-700 leading-relaxed mb-10 max-w-xl mx-auto">
            Whether AiQ is right for you depends on your function size, your business AI commitments,
            and your appetite for working with a product that's still maturing. Let's find out together.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/beta">
              <Button size="lg" className="font-semibold px-10" style={{ background: green, color: "white" }}>
                Apply for beta access <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/methodology">
              <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10 px-8">
                Read the methodology <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
