/**
 * BenchmarkComparison — Industry benchmark comparison panel
 * Shows tenant capability scores vs anonymised industry percentiles (P25/P50/P75)
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, BarChart3, Globe, Info } from "lucide-react";

const PERCENTILE_LABELS: Record<string, { label: string; colour: string; icon: typeof TrendingUp }> = {
  top_quartile: { label: "Top Quartile", colour: "#22c55e", icon: TrendingUp },
  above_median: { label: "Above Median", colour: "#3b82f6", icon: TrendingUp },
  below_median: { label: "Below Median", colour: "#f59e0b", icon: TrendingDown },
  bottom_quartile: { label: "Bottom Quartile", colour: "#ef4444", icon: TrendingDown },
};

function PercentileBadge({ position }: { position: string | null }) {
  if (!position) return <Badge variant="outline" className="text-xs">No data</Badge>;
  const cfg = PERCENTILE_LABELS[position];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${cfg.colour}18`, color: cfg.colour }}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function DomainBenchmarkBar({ domain }: {
  domain: {
    domainName: string;
    colour: string;
    tenantScore: number | null;
    benchmarkP25: number | null;
    benchmarkP50: number | null;
    benchmarkP75: number | null;
    percentilePosition: string | null;
    assessedCount: number;
  };
}) {
  const { domainName, colour, tenantScore, benchmarkP25, benchmarkP50, benchmarkP75, percentilePosition } = domain;
  const maxScore = 100;

  return (
    <div className="py-3 border-b border-border last:border-b-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: colour }} />
          <span className="text-sm font-medium text-foreground">{domainName}</span>
        </div>
        <div className="flex items-center gap-3">
          {tenantScore !== null && (
            <span className="text-sm font-bold tabular-nums" style={{ color: colour }}>
              {tenantScore.toFixed(0)}
            </span>
          )}
          <PercentileBadge position={percentilePosition} />
        </div>
      </div>
      {/* Visual bar with benchmark markers */}
      <div className="relative h-6 bg-muted/50 rounded-md overflow-hidden">
        {/* P25-P75 range band */}
        {benchmarkP25 !== null && benchmarkP75 !== null && (
          <div
            className="absolute top-0 bottom-0 opacity-20 rounded"
            style={{
              left: `${(benchmarkP25 / maxScore) * 100}%`,
              width: `${((benchmarkP75 - benchmarkP25) / maxScore) * 100}%`,
              background: "var(--muted-foreground)",
            }}
          />
        )}
        {/* P50 median line */}
        {benchmarkP50 !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5"
            style={{
              left: `${(benchmarkP50 / maxScore) * 100}%`,
              background: "var(--muted-foreground)",
              opacity: 0.6,
            }}
          />
        )}
        {/* Tenant score bar */}
        {tenantScore !== null && (
          <div
            className="absolute top-1 bottom-1 rounded-sm transition-all duration-700"
            style={{
              width: `${(tenantScore / maxScore) * 100}%`,
              background: colour,
              opacity: 0.85,
            }}
          />
        )}
        {/* P25 marker */}
        {benchmarkP25 !== null && (
          <div className="absolute top-0 bottom-0 flex items-center" style={{ left: `${(benchmarkP25 / maxScore) * 100}%` }}>
            <div className="w-px h-full bg-muted-foreground/40" />
          </div>
        )}
        {/* P75 marker */}
        {benchmarkP75 !== null && (
          <div className="absolute top-0 bottom-0 flex items-center" style={{ left: `${(benchmarkP75 / maxScore) * 100}%` }}>
            <div className="w-px h-full bg-muted-foreground/40" />
          </div>
        )}
      </div>
      {/* Labels */}
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">
          {benchmarkP25 !== null ? `P25: ${benchmarkP25.toFixed(0)}` : ""}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {benchmarkP50 !== null ? `Median: ${benchmarkP50.toFixed(0)}` : ""}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {benchmarkP75 !== null ? `P75: ${benchmarkP75.toFixed(0)}` : ""}
        </span>
      </div>
    </div>
  );
}

export default function BenchmarkComparison() {
  const [selectedSector, setSelectedSector] = useState<string | undefined>(undefined);
  const { data, isLoading } = trpc.dashboardV2.leader.benchmarkComparison.useQuery(
    selectedSector ? { sectorOverride: selectedSector } : undefined
  );

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 animate-pulse">
        <div className="h-5 w-48 bg-muted rounded mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const domainsWithScores = data.domainComparison.filter(d => d.tenantScore !== null);
  const aboveMedianCount = domainsWithScores.filter(d => d.percentilePosition === "top_quartile" || d.percentilePosition === "above_median").length;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Industry Benchmark Comparison</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Your function scores vs. anonymised {data.sectorName} sector percentiles
          </p>
        </div>
        {/* Sector selector */}
        <Select
          value={selectedSector ?? data.sector}
          onValueChange={(v) => setSelectedSector(v)}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <Globe className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {data.availableSectors.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overall summary */}
      <div className="grid grid-cols-3 gap-3 mb-5 p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Your function</p>
          <p className="text-lg font-bold text-foreground">
            {data.tenantOverallScore !== null ? data.tenantOverallScore.toFixed(0) : "—"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Sector median</p>
          <p className="text-lg font-bold text-muted-foreground">
            {data.overallBenchmark ? data.overallBenchmark.p50.toFixed(0) : "—"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Position</p>
          <div className="mt-0.5">
            <PercentileBadge position={data.overallPercentile} />
          </div>
        </div>
      </div>

      {/* Strengths summary */}
      {domainsWithScores.length > 0 && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
          <Info className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            {aboveMedianCount === 6
              ? "All domains are at or above sector median — strong competitive position."
              : aboveMedianCount >= 4
              ? `${aboveMedianCount} of 6 domains above sector median — solid foundation with targeted gaps.`
              : aboveMedianCount >= 2
              ? `${aboveMedianCount} of 6 domains above median — focused investment needed in lagging areas.`
              : `${aboveMedianCount} of 6 domains above median — significant development opportunity vs. sector peers.`}
          </p>
        </div>
      )}

      {/* Domain bars */}
      <div>
        {data.domainComparison.map(d => (
          <DomainBenchmarkBar key={d.domain} domain={d} />
        ))}
      </div>

      {/* Footer legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-2 rounded-sm bg-primary opacity-85" />
          <span className="text-[10px] text-muted-foreground">Your score</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-2 rounded-sm bg-muted-foreground/20" />
          <span className="text-[10px] text-muted-foreground">P25–P75 range</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-px h-3 bg-muted-foreground/60" />
          <span className="text-[10px] text-muted-foreground">Median</span>
        </div>
        <span className="text-[10px] text-muted-foreground ml-auto">
          Based on {data.assessedCount} of {data.totalHeadcount} assessed
        </span>
      </div>
    </div>
  );
}
