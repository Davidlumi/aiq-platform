/**
 * AiQ Pricing Page — v7.0 (Commercial Layer)
 * Individual (free / pro monthly / pro annual) + Team (3-band volume pricing).
 * Live seat calculator with real-time repricing.
 */
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, XCircle, ArrowRight, Sparkles, Users,
  ChevronDown, ChevronUp, Shield, Clock, RefreshCw,
} from "lucide-react";
import { MarketingNav, MarketingFooter } from "./MarketingPage";
import { trpc } from "@/lib/trpc";
import { useAuth } from "../../_core/hooks/useAuth";
import { getLoginUrl } from "../../const";

const navy  = "#0F172A";
const slate = "#1E293B";
const coral = "#FF6B6B";
const teal  = "#0EA5E9";
const green = "#22C55E";
const amber = "#F59E0B";
const chalk = "#F8FAFC";
const muted = "#94A3B8";
const border = "rgba(255,255,255,0.08)";

const FREE_FEATURES = [
  { label: "Full 15-minute scenario-based assessment", ok: true },
  { label: "Headline capability score (0–10)", ok: true },
  { label: "Per-domain scores across all 6 domains", ok: true },
  { label: "Full diagnostic narrative per domain", ok: true },
  { label: "Comparison to HR professional average", ok: true },
  { label: "Retake once per month", ok: true },
  { label: "Personalised learning plan (view only)", ok: true },
  { label: "Click into learning modules", ok: false },
  { label: "AiQ Coach access", ok: false },
  { label: "Knowledge base (articles, guides, frameworks)", ok: false },
  { label: "Progress tracking over time", ok: false },
  { label: "Downloadable capability report (PDF)", ok: false },
];

const PRO_FEATURES = [
  { label: "Full 15-minute scenario-based assessment", ok: true },
  { label: "Headline capability score (0–10)", ok: true },
  { label: "Per-domain scores across all 6 domains", ok: true },
  { label: "Full diagnostic narrative per domain", ok: true },
  { label: "Comparison to HR professional average", ok: true },
  { label: "Retake once per month", ok: true },
  { label: "Personalised learning plan (view only)", ok: true },
  { label: "Click into learning modules", ok: true },
  { label: "AiQ Coach access", ok: true },
  { label: "Knowledge base (articles, guides, frameworks)", ok: true },
  { label: "Progress tracking over time", ok: true },
  { label: "Downloadable capability report (PDF)", ok: true },
];

const TEAM_FEATURES = [
  "Everything in Individual Pro",
  "Centralised billing for the whole team",
  "Seat management dashboard (add / remove members)",
  "Team invite by email",
  "Volume pricing — whole team reprices when you cross a band",
  "Privacy-first: billing admin sees zero capability data",
  "Each member gets their own private dashboard",
  "Dedicated onboarding support (10+ seats)",
];

const TEAM_BANDS = [
  { label: "3–9 seats",   perSeat: 42, min: 3,  max: 9  },
  { label: "10–24 seats", perSeat: 38, min: 10, max: 24 },
  { label: "25+ seats",   perSeat: 34, min: 25, max: 500 },
];

function getBand(seats: number) {
  return TEAM_BANDS.find(b => seats >= b.min && seats <= b.max) ?? TEAM_BANDS[0];
}

const FAQS = [
  { q: "Can I cancel anytime?", a: "Yes. Cancel from your billing page at any time. Your access continues until the end of the current billing period. Your data is kept so you can restart without losing history." },
  { q: "What happens to my data if I cancel?", a: "Your capability scores and learning history are retained so you can pick up where you left off. If you want your data permanently deleted, you can request that separately from your account settings — we process deletion requests within 30 days." },
  { q: "How does team repricing work?", a: "When your seat count crosses a band boundary (e.g. from 9 to 10 seats), the per-seat price for the WHOLE team drops to the new band rate. You never pay more per seat as you grow." },
  { q: "Can the billing admin see my capability scores?", a: "No. This is a structural privacy guarantee. The billing admin can see who has a seat and their invite status — nothing else. Capability data belongs to the individual learner only." },
  { q: "Is there a free trial for team plans?", a: "Contact us for a demo and trial arrangement for teams of 10+. Smaller teams can start with individual Pro plans and switch to a team plan when ready." },
  { q: "What are the norm benchmarks based on?", a: "Benchmarks are currently synthetic reference data based on expert-defined capability profiles. Real empirical norms will replace them once we have 200+ completions per role family (Q3 2026)." },
];

function FeatureRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-start gap-2 text-sm py-1">
      {ok
        ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: green }} />
        : <XCircle size={16} className="mt-0.5 shrink-0" style={{ color: "#475569" }} />}
      <span style={{ color: ok ? chalk : muted }}>{label}</span>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-xl overflow-hidden cursor-pointer" style={{ borderColor: border, background: slate }} onClick={() => setOpen(o => !o)}>
      <div className="flex items-center justify-between px-5 py-4 gap-3">
        <span className="font-medium text-sm" style={{ color: chalk }}>{q}</span>
        {open ? <ChevronUp size={16} style={{ color: muted }} /> : <ChevronDown size={16} style={{ color: muted }} />}
      </div>
      {open && <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: muted }}>{a}</div>}
    </div>
  );
}

export default function PricingPage() {
  const { user } = useAuth();
  const [annual, setAnnual] = useState(false);
  const [seats, setSeats] = useState(5);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const band = getBand(seats);
  const monthlyTotal = seats * band.perSeat;
  const annualTotal  = monthlyTotal * 12;

  const createCheckout = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      toast.info("Redirecting to checkout…");
      if (data.url) window.open(data.url, "_blank");
      setCheckoutLoading(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setCheckoutLoading(null);
    },
  });

  function handleSubscribe(priceKey: "individualMonthly" | "individualAnnual") {
    if (!user) { window.location.href = getLoginUrl(); return; }
    setCheckoutLoading(priceKey);
    createCheckout.mutate({ priceKey, origin: window.location.origin });
  }

  return (
    <div style={{ background: navy, minHeight: "100vh", color: chalk }}>
      <MarketingNav />

      {/* Hero */}
      <section className="pt-24 pb-16 text-center px-4">
        <Badge className="mb-4 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(255,107,107,0.15)", color: coral, border: "none" }}>
          Simple, transparent pricing
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: chalk }}>Invest in your AI capability</h1>
        <p className="text-lg max-w-xl mx-auto mb-8" style={{ color: muted }}>Start free. Upgrade when you're ready. Cancel anytime.</p>
        <div className="inline-flex items-center gap-3 mb-2">
          <button onClick={() => setAnnual(false)} className="text-sm font-medium px-3 py-1 rounded-full transition-colors" style={{ background: !annual ? coral : "transparent", color: !annual ? "#fff" : muted }}>Monthly</button>
          <button onClick={() => setAnnual(true)} className="text-sm font-medium px-3 py-1 rounded-full transition-colors" style={{ background: annual ? coral : "transparent", color: annual ? "#fff" : muted }}>Annual</button>
        </div>
        {annual && <p className="text-xs" style={{ color: green }}>Save 20% with annual billing — £480/year vs £600</p>}
      </section>

      {/* Pricing cards */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-6">

          {/* Free */}
          <div className="rounded-2xl border p-6 flex flex-col" style={{ background: slate, borderColor: border }}>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: muted }}>Free</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold" style={{ color: chalk }}>£0</span>
                <span className="text-sm pb-1" style={{ color: muted }}>/month</span>
              </div>
              <p className="text-xs" style={{ color: muted }}>No card required</p>
            </div>
            <div className="flex-1 space-y-0.5 mb-6">{FREE_FEATURES.map(f => <FeatureRow key={f.label} {...f} />)}</div>
            <Link href="/assessment"><Button variant="outline" className="w-full" style={{ borderColor: border, color: chalk }}>Start free</Button></Link>
          </div>

          {/* Individual Pro */}
          <div className="rounded-2xl border-2 p-6 flex flex-col relative" style={{ background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)", borderColor: coral }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full" style={{ background: coral, color: "#fff" }}>Most popular</div>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: coral }}>Individual Pro</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold" style={{ color: chalk }}>£{annual ? 40 : 50}</span>
                <span className="text-sm pb-1" style={{ color: muted }}>/month</span>
              </div>
              {annual ? <p className="text-xs" style={{ color: green }}>Billed £480/year — save £120</p> : <p className="text-xs" style={{ color: muted }}>Billed monthly</p>}
            </div>
            <div className="flex-1 space-y-0.5 mb-6">{PRO_FEATURES.map(f => <FeatureRow key={f.label} {...f} />)}</div>
            <Button className="w-full font-semibold" style={{ background: coral, color: "#fff" }} disabled={checkoutLoading !== null} onClick={() => handleSubscribe(annual ? "individualAnnual" : "individualMonthly")}>
              {checkoutLoading ? "Redirecting…" : <><span>Get started</span><ArrowRight size={16} className="ml-2" /></>}
            </Button>
          </div>

          {/* Team */}
          <div className="rounded-2xl border p-6 flex flex-col" style={{ background: slate, borderColor: border }}>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: teal }}>Team</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold" style={{ color: chalk }}>£{band.perSeat}</span>
                <span className="text-sm pb-1" style={{ color: muted }}>/seat/mo</span>
              </div>
              <p className="text-xs" style={{ color: muted }}>Minimum 3 seats · {band.label}</p>
            </div>
            <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: teal }}>Seat calculator</p>
              <div className="flex items-center gap-3 mb-3">
                <input type="range" min={3} max={50} value={seats} onChange={e => setSeats(Number(e.target.value))} className="flex-1 accent-sky-400" />
                <span className="text-sm font-bold w-8 text-right" style={{ color: chalk }}>{seats}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: muted }}>Monthly total</span>
                <span className="font-bold" style={{ color: chalk }}>£{monthlyTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span style={{ color: muted }}>Annual total</span>
                <span style={{ color: green }}>£{annualTotal.toLocaleString()}</span>
              </div>
              {seats >= 10 && seats < 25 && <p className="text-xs mt-2" style={{ color: amber }}>At 25 seats the whole team drops to £34/seat</p>}
              {seats >= 25 && <p className="text-xs mt-2" style={{ color: green }}>Best rate — £34/seat</p>}
            </div>
            <div className="flex-1 space-y-1.5 mb-6">
              {TEAM_FEATURES.map(f => (
                <div key={f} className="flex items-start gap-2 text-xs">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: teal }} />
                  <span style={{ color: chalk }}>{f}</span>
                </div>
              ))}
            </div>
            <Button className="w-full font-semibold" style={{ background: teal, color: "#fff" }} onClick={() => toast.info("Team plans launching soon — we'll notify you when ready.")}>
              <Users size={16} className="mr-2" />Get team access
            </Button>
          </div>
        </div>
      </section>

      {/* Volume pricing table */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-2" style={{ color: chalk }}>Team volume pricing</h2>
        <p className="text-center text-sm mb-8" style={{ color: muted }}>When your seat count crosses a band boundary, the whole team reprices automatically.</p>
        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: border }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: slate }}>
                <th className="text-left px-5 py-3 font-semibold" style={{ color: muted }}>Seats</th>
                <th className="text-right px-5 py-3 font-semibold" style={{ color: muted }}>Per seat/month</th>
                <th className="text-right px-5 py-3 font-semibold" style={{ color: muted }}>Saving vs individual</th>
              </tr>
            </thead>
            <tbody>
              {TEAM_BANDS.map((b, i) => (
                <tr key={b.label} style={{ background: i % 2 === 0 ? "rgba(30,41,59,0.5)" : "transparent", borderTop: `1px solid ${border}` }}>
                  <td className="px-5 py-3 font-medium" style={{ color: chalk }}>{b.label}</td>
                  <td className="px-5 py-3 text-right font-bold" style={{ color: teal }}>£{b.perSeat}</td>
                  <td className="px-5 py-3 text-right" style={{ color: green }}>{Math.round((1 - b.perSeat / 50) * 100)}% off</td>
                </tr>
              ))}
              <tr style={{ background: slate, borderTop: `1px solid ${border}` }}>
                <td className="px-5 py-3 font-medium" style={{ color: muted }}>26+ seats</td>
                <td className="px-5 py-3 text-right" style={{ color: muted }}>Contact us</td>
                <td className="px-5 py-3 text-right" style={{ color: muted }}>Custom</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Trust signals */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Shield, title: "Privacy-first", desc: "Billing admins see zero capability data. Your scores are yours alone." },
            { icon: RefreshCw, title: "Cancel anytime", desc: "No lock-in. Cancel from your billing page. Data kept for restart." },
            { icon: Clock, title: "30-day deletion", desc: "Request full data deletion separately. Processed within 30 days." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl p-5 border" style={{ background: slate, borderColor: border }}>
              <Icon size={20} className="mb-3" style={{ color: coral }} />
              <p className="font-semibold text-sm mb-1" style={{ color: chalk }}>{title}</p>
              <p className="text-xs leading-relaxed" style={{ color: muted }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8" style={{ color: chalk }}>Frequently asked questions</h2>
        <div className="space-y-3">{FAQS.map(faq => <FaqItem key={faq.q} {...faq} />)}</div>
      </section>

      {/* CTA */}
      <section className="text-center px-4 pb-24">
        <div className="max-w-2xl mx-auto rounded-2xl p-10" style={{ background: "linear-gradient(135deg, rgba(255,107,107,0.15) 0%, rgba(14,165,233,0.1) 100%)", border: "1px solid rgba(255,107,107,0.3)" }}>
          <Sparkles size={32} className="mx-auto mb-4" style={{ color: coral }} />
          <h2 className="text-3xl font-bold mb-3" style={{ color: chalk }}>Ready to know where you stand?</h2>
          <p className="mb-6" style={{ color: muted }}>Take the free assessment. Upgrade when you're ready.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/assessment"><Button size="lg" style={{ background: coral, color: "#fff" }}>Start free assessment</Button></Link>
            <Button size="lg" variant="outline" style={{ borderColor: border, color: chalk }} onClick={() => handleSubscribe(annual ? "individualAnnual" : "individualMonthly")}>Upgrade to Pro</Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
