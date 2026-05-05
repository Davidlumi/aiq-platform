/**
 * Company Assessment Landing Page
 * Single-strategy enforcer: redirects to existing assessment if one exists,
 * otherwise shows the onboarding wizard.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Building2, BarChart3, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CompanyAssessmentLandingPage() {
  const [, navigate] = useLocation();
  const { data: existing, isLoading } = trpc.companyAssessment.getMyAssessment.useQuery();

  // Auto-redirect once we know the state
  useEffect(() => {
    if (isLoading || existing === undefined) return;
    if (existing) {
      if (existing.status === "completed") {
        navigate(`/company-assessment/${existing.id}/results`, { replace: true });
      } else {
        navigate(`/company-assessment/${existing.id}`, { replace: true });
      }
    }
    // If null → stay on this page to show the "start" UI
  }, [isLoading, existing, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No existing assessment — show a clean entry point to the onboarding wizard
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">AI Strategy</p>
        <h1 className="text-2xl font-bold text-foreground">Company Assessment</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Benchmark your organisation's AI maturity across seven dimensions — strategy, governance,
          data, technology, workforce capability, HR function readiness, and culture. The assessment
          takes approximately 20–30 minutes and produces a detailed maturity report with prioritised
          recommendations.
        </p>
      </div>

      {/* Dimension overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: "AI Strategy & Leadership Vision",       icon: "🎯" },
          { label: "AI Governance, Ethics & Risk",          icon: "🛡️" },
          { label: "Data Foundations & Infrastructure",     icon: "🗄️" },
          { label: "Technology Ecosystem & Integration",    icon: "⚙️" },
          { label: "Workforce AI Capability & Culture",     icon: "👥" },
          { label: "HR Function AI Adoption",               icon: "📊" },
          { label: "Organisational Change Readiness",       icon: "🔄" },
        ].map(d => (
          <div key={d.label} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
            <span className="text-lg">{d.icon}</span>
            <span className="text-sm text-foreground">{d.label}</span>
          </div>
        ))}
      </div>

      {/* What you get */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">What you receive</p>
        {[
          "Overall AI maturity score with sector benchmark comparison",
          "Dimension-level scores with research-backed context",
          "Prioritised recommendations tailored to your maturity level",
          "Board-ready narrative summary",
        ].map(item => (
          <div key={item} className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span className="text-sm text-foreground">{item}</span>
          </div>
        ))}
      </div>

      <Button
        size="lg"
        className="gap-2"
        onClick={() => navigate("/company-assessment/new")}
      >
        <Building2 className="w-4 h-4" />
        Begin Company Assessment
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
