/**
 * PeakonHeatmap — Workday Peakon-style capability heatmap
 *
 * Smooth green-to-red gradient cells, decimal scores, clean grid,
 * segment hierarchy with expand/collapse, sticky segment column,
 * and integrated department filter.
 */
import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, SlidersHorizontal, X, Check, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Peakon-style colour scale ──────────────────────────────────────────────
// Smooth gradient from deep red (low) → amber (mid) → rich green (high)
// Scores are 0–100 mapped to these colour stops

function scoreToColor(score: number): { bg: string; text: string } {
  // Normalise to 0-1 range
  const t = Math.max(0, Math.min(100, score)) / 100;

  // Colour stops: 0=deep red, 0.4=amber, 0.55=yellow-green, 0.75=green, 1.0=deep green
  let r: number, g: number, b: number;

  if (t < 0.3) {
    // Deep red → warm red
    const p = t / 0.3;
    r = lerp(220, 239, p);
    g = lerp(53, 108, p);
    b = lerp(69, 96, p);
  } else if (t < 0.45) {
    // Warm red → amber/orange
    const p = (t - 0.3) / 0.15;
    r = lerp(239, 245, p);
    g = lerp(108, 166, p);
    b = lerp(96, 84, p);
  } else if (t < 0.55) {
    // Amber → yellow-green
    const p = (t - 0.45) / 0.1;
    r = lerp(245, 210, p);
    g = lerp(166, 200, p);
    b = lerp(84, 90, p);
  } else if (t < 0.7) {
    // Yellow-green → medium green
    const p = (t - 0.55) / 0.15;
    r = lerp(210, 130, p);
    g = lerp(200, 195, p);
    b = lerp(90, 100, p);
  } else {
    // Medium green → deep green
    const p = (t - 0.7) / 0.3;
    r = lerp(130, 67, p);
    g = lerp(195, 160, p);
    b = lerp(100, 71, p);
  }

  const bg = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  // White text for all coloured cells
  const text = "#FFFFFF";
  return { bg, text };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ─── Score formatting ───────────────────────────────────────────────────────
// Peakon shows scores as decimals (e.g. 6.5, 8.7) on a 1-10 scale
// Our data is 0-100, so we convert: score / 10 → 1 decimal place

function formatScore(score: number): string {
  return (score / 10).toFixed(1);
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface HeatmapDomain {
  domain: string;
  avgScore: number | null;
  headcount: number;
  target?: number | null;
  gap?: number | null;
}

interface HeatmapRow {
  roleFamily: string;
  roleFamilyName: string;
  domains: HeatmapDomain[];
}

interface DepartmentOption {
  value: string;
  label: string;
}

interface PeakonHeatmapProps {
  heatmap: HeatmapRow[];
  domainLabels: Record<string, string>;
  departmentOptions: DepartmentOption[];
  overallRow?: {
    label: string;
    headcount: number;
    domains: HeatmapDomain[];
  };
}

// ─── Cell Component ─────────────────────────────────────────────────────────

function HeatmapScoreCell({ score, headcount }: { score: number | null; headcount: number }) {
  if (score === null || headcount === 0) {
    return (
      <td className="border border-neutral-200 text-center p-0">
        <div className="h-11 flex items-center justify-center bg-neutral-50">
          <span className="text-[11px] text-neutral-300 font-medium">—</span>
        </div>
      </td>
    );
  }

  const { bg, text } = scoreToColor(score);
  const displayScore = formatScore(score);
  const readiness = score >= 75 ? "AI Ready" : score >= 60 ? "Strong Developing" : score >= 50 ? "Developing" : score >= 40 ? "Weak Developing" : score >= 30 ? "Not Yet Ready" : "Foundation Gap";

  return (
    <td className="border border-white/20 text-center p-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="h-11 flex items-center justify-center transition-all hover:brightness-110 cursor-default"
            style={{ backgroundColor: bg }}
          >
            <span
              className="text-sm font-semibold tabular-nums tracking-tight"
              style={{ color: text, textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
            >
              {displayScore}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs space-y-1 max-w-48">
          <p className="font-semibold">Score: {score}/100 ({displayScore}/10)</p>
          <p>{headcount} assessed</p>
          <p className="text-muted-foreground">{readiness}</p>
        </TooltipContent>
      </Tooltip>
    </td>
  );
}

// ─── Overall Score Cell (with headcount) ────────────────────────────────────

function OverallScoreCell({ score, headcount }: { score: number | null; headcount: number }) {
  if (score === null || headcount === 0) {
    return (
      <td className="border border-neutral-200 text-center p-0">
        <div className="h-11 flex items-center justify-center bg-neutral-50">
          <span className="text-[11px] text-neutral-300 font-medium">—</span>
        </div>
      </td>
    );
  }

  const { bg, text } = scoreToColor(score);
  const displayScore = formatScore(score);

  return (
    <td className="border border-neutral-200 text-center p-0">
      <div
        className="h-11 flex items-center justify-center"
        style={{ backgroundColor: bg }}
      >
        <span
          className="text-sm font-bold tabular-nums tracking-tight"
          style={{ color: text, textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
        >
          {displayScore}
        </span>
      </div>
    </td>
  );
}

// ─── Main Heatmap ───────────────────────────────────────────────────────────

export function PeakonHeatmap({ heatmap, domainLabels, departmentOptions, overallRow }: PeakonHeatmapProps) {
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleDept = useCallback((dept: string) => {
    setSelectedDepts(prev => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  }, []);

  const clearFilter = useCallback(() => setSelectedDepts(new Set()), []);
  const selectAll = useCallback(() => setSelectedDepts(new Set(departmentOptions.map(o => o.value))), [departmentOptions]);

  const toggleExpand = useCallback((rf: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rf)) next.delete(rf);
      else next.add(rf);
      return next;
    });
  }, []);

  const filteredHeatmap = useMemo(() => {
    if (selectedDepts.size === 0) return heatmap;
    return heatmap.filter(row => selectedDepts.has(row.roleFamily));
  }, [heatmap, selectedDepts]);

  const activeCount = selectedDepts.size;
  const domainKeys = Object.keys(domainLabels);

  // Compute overall row from visible data
  const computedOverall = useMemo(() => {
    if (overallRow) return overallRow;
    const domainTotals: Record<string, { total: number; count: number }> = {};
    for (const dk of domainKeys) domainTotals[dk] = { total: 0, count: 0 };
    let totalHeadcount = 0;

    for (const row of filteredHeatmap) {
      for (const cell of row.domains) {
        if (cell.avgScore !== null && cell.headcount > 0) {
          domainTotals[cell.domain].total += cell.avgScore * cell.headcount;
          domainTotals[cell.domain].count += cell.headcount;
        }
      }
      totalHeadcount += row.domains.reduce((s, d) => Math.max(s, d.headcount), 0);
    }

    return {
      label: activeCount > 0 ? `Selected (${activeCount})` : "All Departments",
      headcount: totalHeadcount,
      domains: domainKeys.map(dk => ({
        domain: dk,
        avgScore: domainTotals[dk].count > 0
          ? Math.round((domainTotals[dk].total / domainTotals[dk].count) * 10) / 10
          : null,
        headcount: domainTotals[dk].count,
      })),
    };
  }, [filteredHeatmap, domainKeys, overallRow, activeCount]);

  // Short domain labels for headers (like Peakon's truncated headers)
  const shortDomainLabel = (dk: string): string => {
    const label = domainLabels[dk] ?? dk;
    // Shorten to first 2-3 words
    const words = label.split(" ");
    if (words.length <= 2) return label;
    return words.slice(0, 2).join(" ") + "...";
  };

  return (
    <div className="space-y-3">
      {/* ── Filter toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 px-3 border-neutral-300">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {activeCount > 0 ? `${activeCount} selected` : "All segments"}
              {activeCount > 0 && (
                <span className="ml-1 bg-emerald-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                  {activeCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0">
            <div className="p-3 border-b border-neutral-100 bg-neutral-50/50">
              <p className="text-xs font-semibold text-foreground">Selected segments</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{activeCount > 0 ? `${activeCount} segments` : "All segments shown"}</p>
            </div>
            <div className="p-1.5 space-y-0.5 max-h-64 overflow-y-auto">
              {departmentOptions.map(opt => {
                const isChecked = selectedDepts.has(opt.value);
                const rowData = heatmap.find(r => r.roleFamily === opt.value);
                const headcount = rowData ? Math.max(...rowData.domains.map(d => d.headcount)) : 0;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(
                      "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md transition-colors text-left",
                      isChecked ? "bg-emerald-50 hover:bg-emerald-100" : "hover:bg-neutral-50",
                    )}
                    onClick={() => toggleDept(opt.value)}
                  >
                    <Checkbox checked={isChecked} tabIndex={-1} className="pointer-events-none" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-foreground block">{opt.label}</span>
                      {headcount > 0 && (
                        <span className="text-[10px] text-muted-foreground">{headcount} people</span>
                      )}
                    </div>
                    {isChecked && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="p-2 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <button type="button" className="text-[10px] text-emerald-700 hover:text-emerald-900 font-medium transition-colors" onClick={selectAll}>
                Select all
              </button>
              <button type="button" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors" onClick={clearFilter}>
                Clear all
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Active filter chips */}
        {activeCount > 0 && (
          <>
            {departmentOptions.filter(o => selectedDepts.has(o.value)).map(opt => (
              <Badge key={opt.value} variant="secondary" size="sm" className="gap-1 pl-2 pr-1 cursor-pointer hover:bg-neutral-200 transition-colors">
                {opt.label}
                <button type="button" className="rounded-full hover:bg-neutral-300 p-0.5 transition-colors" onClick={() => toggleDept(opt.value)}>
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            ))}
            <button type="button" className="text-[10px] text-muted-foreground hover:text-foreground underline transition-colors" onClick={clearFilter}>
              Reset
            </button>
          </>
        )}
      </div>

      {/* ── Heatmap Table ── */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200 shadow-sm">
        <table className="w-full border-collapse" style={{ minWidth: domainKeys.length * 100 + 240 }}>
          {/* Column headers */}
          <thead>
            <tr className="bg-neutral-50">
              <th className="sticky left-0 z-10 bg-neutral-50 text-left py-2.5 px-4 border-b border-r border-neutral-200 w-56 min-w-56">
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Segments</span>
              </th>
              {domainKeys.map(dk => (
                <th key={dk} className="text-center py-2.5 px-1 border-b border-neutral-200 min-w-[100px]">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center gap-0.5 cursor-help">
                        <span className="text-[10px] font-semibold text-neutral-600 leading-tight whitespace-nowrap">
                          {shortDomainLabel(dk)}
                        </span>
                        <span className="text-[9px] text-neutral-400 font-normal">Overall score</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">{domainLabels[dk]}</TooltipContent>
                  </Tooltip>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Overall / aggregate row */}
            <tr className="bg-white font-semibold">
              <td className="sticky left-0 z-10 bg-white py-0 px-4 border-b border-r border-neutral-200">
                <div className="flex items-center gap-2 py-2.5">
                  <div className="w-1.5 h-6 rounded-full bg-emerald-500" />
                  <div>
                    <span className="text-xs font-bold text-foreground block">{computedOverall.label}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {computedOverall.headcount}
                    </span>
                  </div>
                </div>
              </td>
              {computedOverall.domains.map(cell => (
                <OverallScoreCell key={cell.domain} score={cell.avgScore} headcount={cell.headcount} />
              ))}
            </tr>

            {/* Department rows */}
            {filteredHeatmap.length === 0 ? (
              <tr>
                <td colSpan={domainKeys.length + 1} className="py-12 text-center text-xs text-muted-foreground">
                  No segments match the current filter.
                </td>
              </tr>
            ) : (
              filteredHeatmap.map((row, idx) => {
                const isExpanded = expandedRows.has(row.roleFamily);
                const rowHeadcount = Math.max(...row.domains.map(d => d.headcount), 0);
                const hasData = row.domains.some(d => d.avgScore !== null && d.headcount > 0);

                return (
                  <tr
                    key={row.roleFamily}
                    className={cn(
                      "group transition-colors",
                      idx % 2 === 0 ? "bg-white" : "bg-neutral-50/50",
                      "hover:bg-blue-50/30",
                    )}
                  >
                    <td className={cn(
                      "sticky left-0 z-10 py-0 px-4 border-b border-r border-neutral-200",
                      idx % 2 === 0 ? "bg-white group-hover:bg-blue-50/30" : "bg-neutral-50/50 group-hover:bg-blue-50/30",
                    )}>
                      <div className="flex items-center gap-2 py-2.5">
                        <button
                          type="button"
                          className="w-5 h-5 rounded flex items-center justify-center hover:bg-neutral-200 transition-colors shrink-0"
                          onClick={() => toggleExpand(row.roleFamily)}
                        >
                          {isExpanded
                            ? <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                            : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                          }
                        </button>
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-foreground block truncate">{row.roleFamilyName}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {hasData ? `${rowHeadcount} people` : "No data"}
                          </span>
                        </div>
                      </div>
                    </td>
                    {row.domains.map(cell => (
                      <HeatmapScoreCell key={cell.domain} score={cell.avgScore} headcount={cell.headcount} />
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer: gradient legend ── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-medium">Score scale:</span>
          <div className="flex items-center gap-0">
            {[0, 20, 35, 50, 65, 80, 100].map((score, i) => (
              <div key={i} className="flex flex-col items-center">
                <div
                  className="w-6 h-3 first:rounded-l last:rounded-r"
                  style={{ backgroundColor: scoreToColor(score).bg }}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>0 (Low)</span>
            <span>→</span>
            <span>10 (High)</span>
          </div>
        </div>
        {activeCount > 0 && (
          <span className="text-[10px] text-muted-foreground">
            Showing {filteredHeatmap.length} of {heatmap.length} segments
          </span>
        )}
      </div>
    </div>
  );
}
