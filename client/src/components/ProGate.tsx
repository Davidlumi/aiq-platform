/**
 * ProGate — inline locked overlay for PRO-only content.
 *
 * Usage (wrapping a card or section):
 *   <ProGate featureName="Learning Modules">
 *     <ModuleCard ... />
 *   </ProGate>
 *
 * When the user is PRO the children render normally.
 * When the user is free, children render with a lock overlay and clicking
 * anywhere on the overlay opens the UpgradeModal.
 *
 * For full-page gating, use <ProGatePage featureName="..." />.
 */
import { useState } from "react";
import { Lock, Zap, BookOpen, MessageSquare, BookMarked, Download, CheckCircle2 } from "lucide-react";
import { useIsPro } from "@/hooks/useIsPro";
import { UpgradeModal } from "./UpgradeModal";
import { cn } from "@/lib/utils";

// ─── Inline overlay ───────────────────────────────────────────────────────────

interface ProGateProps {
  children: React.ReactNode;
  featureName?: string;
  /** Extra class on the wrapper div */
  className?: string;
}

export function ProGate({ children, featureName, className }: ProGateProps) {
  const isPro = useIsPro();
  const [modalOpen, setModalOpen] = useState(false);

  if (isPro) return <>{children}</>;

  return (
    <>
      <div
        className={cn("relative group cursor-pointer select-none", className)}
        onClick={() => setModalOpen(true)}
        role="button"
        tabIndex={0}
        aria-label={`Upgrade to PRO to access ${featureName ?? "this feature"}`}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setModalOpen(true); }}
      >
        {/* Blurred children */}
        <div className="pointer-events-none blur-[2px] opacity-60 select-none">
          {children}
        </div>

        {/* Lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center rounded-inherit">
          <div className="flex flex-col items-center gap-1.5 bg-background/90 border border-border rounded-lg px-3 py-2 shadow-sm group-hover:border-[#10B981]/50 transition-colors">
            <Lock className="w-4 h-4 text-[#10B981]" />
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide">PRO</span>
          </div>
        </div>
      </div>

      <UpgradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        featureName={featureName}
      />
    </>
  );
}

// ─── Full-page gate ───────────────────────────────────────────────────────────

interface ProGatePageProps {
  featureName: string;
  description?: string;
}

const FEATURE_ICONS: Record<string, typeof Lock> = {
  "AiQ Coach": MessageSquare,
  "Learning Modules": BookOpen,
  "Modules Library": BookOpen,
  "Knowledge Base": BookMarked,
  "Downloads": Download,
};

const PRO_BULLETS = [
  { icon: BookOpen,      label: "Personalised learning modules",  desc: "Micro-lessons, scenarios & simulations" },
  { icon: MessageSquare, label: "AiQ Coach",                      desc: "AI-powered coaching conversations" },
  { icon: BookMarked,    label: "Knowledge base",                 desc: "Articles, guides & frameworks" },
  { icon: Download,      label: "PDF downloads",                  desc: "Reports, plans & certificates" },
];

/**
 * ProGatePage — renders a full upgrade prompt instead of the page content.
 * Use at the top of a page component when the whole page is PRO-only.
 */
export function ProGatePage({ featureName, description }: ProGatePageProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const FeatureIcon = FEATURE_ICONS[featureName] ?? Lock;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 py-12">
      {/* Card */}
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-lg border border-border">
        {/* Dark header band — matches platform brand */}
        <div className="bg-gradient-to-br from-[#0E1726] to-[#1a2a40] px-8 pt-8 pb-7 text-center relative">
          {/* Ambient glow */}
          <div className="absolute inset-0 bg-[#10B981]/5 pointer-events-none" />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/25 flex items-center justify-center mx-auto mb-4">
              <FeatureIcon className="w-6 h-6 text-[#10B981]" />
            </div>
            <div className="inline-flex items-center gap-1.5 bg-[#10B981]/15 border border-[#10B981]/25 rounded-full px-3 py-1 mb-3">
              <Lock className="w-3 h-3 text-[#10B981]" />
              <span className="text-[11px] font-bold text-[#10B981] uppercase tracking-wider">PRO Feature</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{featureName}</h2>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs mx-auto">
              {description ??
                `${featureName} is available on AiQ PRO. Upgrade to unlock this and everything else in the PRO tier.`}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="bg-background px-8 py-6 space-y-5">
          {/* What's included */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Everything in PRO</p>
            {PRO_BULLETS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground ml-1.5">{desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => setModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#0d9e6e] active:bg-[#0a8a5e] text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Zap className="w-4 h-4" />
            Upgrade to AiQ PRO
          </button>

          <p className="text-[11px] text-muted-foreground text-center">
            Your assessment and results dashboard are always free.
          </p>
        </div>
      </div>

      <UpgradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        featureName={featureName}
      />
    </div>
  );
}
