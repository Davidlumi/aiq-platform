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
import { Lock } from "lucide-react";
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

/**
 * ProGatePage — renders a full upgrade prompt instead of the page content.
 * Use at the top of a page component when the whole page is PRO-only.
 */
export function ProGatePage({ featureName, description }: ProGatePageProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#10B981]/10 flex items-center justify-center mb-5">
        <Lock className="w-7 h-7 text-[#10B981]" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">{featureName}</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {description ??
          `${featureName} is available on the AiQ PRO plan. Upgrade to unlock this feature and everything else in the PRO tier.`}
      </p>
      <button
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#0d9e6e] text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
      >
        <Lock className="w-4 h-4" />
        Upgrade to PRO
      </button>
      <p className="text-xs text-muted-foreground mt-3">
        Your assessment and results dashboard are always free.
      </p>

      <UpgradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        featureName={featureName}
      />
    </div>
  );
}
