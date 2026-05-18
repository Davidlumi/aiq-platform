/**
 * StrategyLayout — thin layout wrapper for all strategy pages.
 *
 * Renders the persistent StrategyTopNav above the page content.
 * Used by ProtectedRouteWithStrategyNav in App.tsx to wrap every strategy route.
 */
import StrategyTopNav from "./StrategyTopNav";

export default function StrategyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-0 flex-1">
      <StrategyTopNav />
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}
