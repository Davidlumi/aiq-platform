import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  AlertTriangle,
  BarChart2,
  FileText,
  Globe,
  ExternalLink,
  Search,
  ChevronRight,
  Shield,
  Cpu,
  Users,
  TrendingUp,
  Info,
  CheckCircle2,
  Clock,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

const PHASE_COLOURS: Record<string, string> = {
  foundation: "dark:bg-blue-500/20 bg-blue-100 dark:text-blue-300 text-blue-700 dark:border-blue-500/30 border-blue-300",
  build: "dark:bg-emerald-500/20 bg-emerald-100 dark:text-emerald-300 text-emerald-700 dark:border-emerald-500/30 border-emerald-300",
  scale: "dark:bg-violet-500/20 bg-violet-100 dark:text-violet-300 text-violet-700 dark:border-violet-500/30 border-violet-300",
  optimise: "dark:bg-amber-500/20 bg-amber-100 dark:text-amber-300 text-amber-700 dark:border-amber-500/30 border-amber-300",
};

const SEVERITY_COLOURS: Record<string, string> = {
  low: "dark:bg-slate-500/20 bg-slate-100 text-foreground/70 dark:border-slate-500/30 border-slate-300",
  medium: "dark:bg-amber-500/20 bg-amber-100 dark:text-amber-300 text-amber-700 dark:border-amber-500/30 border-amber-300",
  high: "dark:bg-red-500/20 bg-red-100 dark:text-red-300 text-red-700 dark:border-red-500/30 border-red-300",
  very_high: "dark:bg-red-700/30 bg-red-100/80 dark:text-red-200 text-red-700 dark:border-red-600/40 border-red-300",
};

const CONFIDENCE_COLOURS: Record<string, string> = {
  high: "dark:text-emerald-400 text-emerald-600",
  medium: "dark:text-amber-400 text-amber-600",
  low: "text-muted-foreground",
};

const REGULATORY_COLOURS: Record<string, string> = {
  none: "text-muted-foreground/70",
  low: "dark:text-emerald-400 text-emerald-600",
  medium: "dark:text-amber-400 text-amber-600",
  high: "dark:text-red-400 text-red-600",
  very_high: "dark:text-red-300 text-red-700",
};

function PhaseTag({ phase }: { phase: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${PHASE_COLOURS[phase] ?? "dark:bg-slate-500/20 bg-slate-100 text-foreground/70 dark:border-slate-500/30 border-slate-300"}`}>
      {phase}
    </span>
  );
}

function SeverityTag({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${SEVERITY_COLOURS[severity] ?? "dark:bg-slate-500/20 bg-slate-100 text-foreground/70 dark:border-slate-500/30 border-slate-300"}`}>
      {severity.replace("_", " ")}
    </span>
  );
}

// ── Initiative Detail Modal ───────────────────────────────────────────────────

function InitiativeModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = trpc.contentLibrary.getInitiative.useQuery({ initiative_id: id });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border text-foreground max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg">
            {isLoading ? "Loading…" : data?.display_name}
          </DialogTitle>
        </DialogHeader>
        {isLoading && <div className="py-8 text-center text-muted-foreground">Loading…</div>}
        {data && (
          <div className="space-y-5">
            {/* Phase + Confidence */}
            <div className="flex items-center gap-3 flex-wrap">
              <PhaseTag phase={data.typical_phase} />
              <span className={`text-xs font-medium ${CONFIDENCE_COLOURS[data.confidence]}`}>
                ● {data.confidence} confidence
              </span>
              <span className="text-xs text-muted-foreground/70">Reviewed {data.last_reviewed} · {data.reviewer}</span>
            </div>

            {/* Description */}
            <p className="text-sm text-foreground/70 leading-relaxed">{data.short_description}</p>

            {/* Regulatory exposure */}
            <div className="rounded-lg border border-border p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Regulatory Exposure</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground/70 text-xs">EU AI Act</p>
                  <p className={`font-medium capitalize ${REGULATORY_COLOURS[data.regulatory_exposure.eu_ai_act]}`}>
                    {data.regulatory_exposure.eu_ai_act}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground/70 text-xs">GDPR</p>
                  <p className={`font-medium capitalize ${REGULATORY_COLOURS[data.regulatory_exposure.gdpr]}`}>
                    {data.regulatory_exposure.gdpr}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground/70 text-xs">Employment Law</p>
                  <p className={`font-medium capitalize ${REGULATORY_COLOURS[data.regulatory_exposure.employment_law]}`}>
                    {data.regulatory_exposure.employment_law}
                  </p>
                </div>
              </div>
            </div>

            {/* Cost */}
            {data.cost?.base_range_gbp && (
              <div className="rounded-lg border border-border p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cost Range (Base)</p>
                <p className="text-sm text-foreground font-medium">
                  £{data.cost.base_range_gbp[0].toLocaleString()} – £{data.cost.base_range_gbp[1].toLocaleString()}
                </p>
                {data.cost.caveat && (
                  <p className="text-xs text-muted-foreground italic">{data.cost.caveat}</p>
                )}
              </div>
            )}

            {/* Risks */}
            {data.typical_risks?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Typical Risks</p>
                {data.typical_risks.map((r: any, i: number) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <SeverityTag severity={r.severity} />
                      <span className="text-xs text-muted-foreground">{r.risk_id}</span>
                    </div>
                    <p className="text-sm text-foreground/70">{r.statement}</p>
                    <p className="text-xs text-muted-foreground/70">Mitigation: {r.mitigation}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Sources */}
            {data.resolved_sources?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sources</p>
                {data.resolved_sources.map((s: any) => (
                  <div key={s.source_id} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <BookOpen className="w-3 h-3 mt-0.5 shrink-0 dark:text-blue-400 text-blue-600" />
                    <span>
                      {s.citation}
                      {s.url && (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="ml-1 dark:text-blue-400 text-blue-600 hover:dark:text-blue-300 text-blue-700">
                          <ExternalLink className="inline w-3 h-3" />
                        </a>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Risk Rule Detail Modal ────────────────────────────────────────────────────

function RiskRuleModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = trpc.contentLibrary.getRiskRule.useQuery({ rule_id: id });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border text-foreground max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg">
            {isLoading ? "Loading…" : data?.display_name}
          </DialogTitle>
        </DialogHeader>
        {isLoading && <div className="py-8 text-center text-muted-foreground">Loading…</div>}
        {data && (
          <div className="space-y-5">
            <SeverityTag severity={data.severity} />

            <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 space-y-2">
              <p className="text-xs font-semibold dark:text-red-400 text-red-600 uppercase tracking-wider">Risk Statement</p>
              <p className="text-sm text-foreground/70 leading-relaxed">{data.risk_statement}</p>
            </div>

            <div className="rounded-lg border border-border p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trigger Condition</p>
              <p className="text-sm text-muted-foreground leading-relaxed font-mono text-xs">{data.trigger_condition}</p>
            </div>

            <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-4 space-y-2">
              <p className="text-xs font-semibold dark:text-emerald-400 text-emerald-600 uppercase tracking-wider">Recommended Action</p>
              <p className="text-sm text-foreground/70 leading-relaxed">{data.recommended_action}</p>
            </div>

            {data.resolved_sources?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sources</p>
                {data.resolved_sources.map((s: any) => (
                  <div key={s.source_id} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <BookOpen className="w-3 h-3 mt-0.5 shrink-0 dark:text-blue-400 text-blue-600" />
                    <span>
                      {s.citation}
                      {s.url && (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="ml-1 dark:text-blue-400 text-blue-600 hover:dark:text-blue-300 text-blue-700">
                          <ExternalLink className="inline w-3 h-3" />
                        </a>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ContentLibraryPage() {
  const [search, setSearch] = useState("");
  const [selectedInitiative, setSelectedInitiative] = useState<string | null>(null);
  const [selectedRiskRule, setSelectedRiskRule] = useState<string | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<string>("all");

  const { data: meta } = trpc.contentLibrary.meta.useQuery();
  const { data: initiatives, isLoading: loadingInit } = trpc.contentLibrary.listInitiatives.useQuery({ phase: "all" });
  const { data: riskRules, isLoading: loadingRisk } = trpc.contentLibrary.listRiskRules.useQuery();
  const { data: benchmarks, isLoading: loadingBench } = trpc.contentLibrary.listSectorBenchmarks.useQuery();
  const { data: sources, isLoading: loadingSrc } = trpc.contentLibrary.listSources.useQuery();

  const filteredInitiatives = (initiatives ?? []).filter(i => {
    const matchSearch = !search || i.display_name.toLowerCase().includes(search.toLowerCase()) ||
      i.short_description?.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase());
    const matchPhase = phaseFilter === "all" || i.typical_phase === phaseFilter;
    return matchSearch && matchPhase;
  });

  const filteredRiskRules = (riskRules ?? []).filter(r =>
    !search || r.display_name.toLowerCase().includes(search.toLowerCase()) ||
    r.risk_statement.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Content Library</h1>
            {meta && (
              <p className="text-xs text-muted-foreground mt-0.5">
                v{meta.version} · built {new Date(meta.built_at).toLocaleDateString()} · {meta.git_sha}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search library…"
                className="pl-9 bg-muted border-border text-foreground placeholder:text-muted-foreground/70 w-64"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats row */}
        {meta && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Initiatives", value: meta.content_counts.initiatives, icon: Cpu, colour: "dark:text-blue-400 text-blue-600" },
              { label: "Risk Rules", value: meta.content_counts.risk_rules, icon: AlertTriangle, colour: "dark:text-red-400 text-red-600" },
              { label: "Sector Benchmarks", value: meta.content_counts.sector_benchmarks, icon: BarChart2, colour: "dark:text-violet-400 text-violet-600" },
              { label: "Templates", value: meta.content_counts.templates, icon: FileText, colour: "dark:text-amber-400 text-amber-600" },
              { label: "Sources", value: meta.content_counts.sources, icon: BookOpen, colour: "dark:text-emerald-400 text-emerald-600" },
            ].map(stat => (
              <Card key={stat.label} className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <stat.icon className={`w-5 h-5 ${stat.colour}`} />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Tabs defaultValue="initiatives">
          <TabsList className="bg-muted border border-border mb-6">
            <TabsTrigger value="initiatives" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Cpu className="w-4 h-4 mr-2" />Initiatives
            </TabsTrigger>
            <TabsTrigger value="risk-rules" className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
              <AlertTriangle className="w-4 h-4 mr-2" />Risk Rules
            </TabsTrigger>
            <TabsTrigger value="benchmarks" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart2 className="w-4 h-4 mr-2" />Sector Benchmarks
            </TabsTrigger>
            <TabsTrigger value="sources" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="w-4 h-4 mr-2" />Sources
            </TabsTrigger>
          </TabsList>

          {/* ── Initiatives ── */}
          <TabsContent value="initiatives">
            {/* Phase filter */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {["all", "foundation", "build", "scale", "optimise"].map(p => (
                <button
                  key={p}
                  onClick={() => setPhaseFilter(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
                    phaseFilter === p
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-muted border-border text-muted-foreground hover:border-border/80"
                  }`}
                >
                  {p}
                </button>
              ))}
              <span className="text-xs text-muted-foreground/70 ml-2">{filteredInitiatives.length} shown</span>
            </div>

            {loadingInit ? (
              <div className="py-12 text-center text-muted-foreground">Loading initiatives…</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredInitiatives.map(i => (
                  <Card
                    key={i.initiative_id}
                    className="bg-card border-border hover:border-border/80 cursor-pointer transition-all group"
                    onClick={() => setSelectedInitiative(i.initiative_id)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                          {i.display_name}
                        </p>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5 group-hover:text-blue-400 transition-colors" />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <PhaseTag phase={i.typical_phase} />
                        <span className="text-xs text-muted-foreground/70 capitalize">{i.category.replace(/_/g, " ")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {i.short_description}
                      </p>
                      {/* Regulatory flags */}
                      <div className="flex items-center gap-3 text-xs">
                        {i.regulatory_exposure.eu_ai_act !== "none" && i.regulatory_exposure.eu_ai_act !== "low" && (
                          <span className={`flex items-center gap-1 ${REGULATORY_COLOURS[i.regulatory_exposure.eu_ai_act]}`}>
                            <Shield className="w-3 h-3" /> EU AI Act: {i.regulatory_exposure.eu_ai_act}
                          </span>
                        )}
                        {i.cost_range && (
                          <span className="text-muted-foreground/70">
                            £{(i.cost_range[0] / 1000).toFixed(0)}k–£{(i.cost_range[1] / 1000).toFixed(0)}k
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Risk Rules ── */}
          <TabsContent value="risk-rules">
            {loadingRisk ? (
              <div className="py-12 text-center text-muted-foreground">Loading risk rules…</div>
            ) : (
              <div className="space-y-3">
                {filteredRiskRules.map(r => (
                  <Card
                    key={r.rule_id}
                    className="bg-card border-border hover:border-border/80 cursor-pointer transition-all group"
                    onClick={() => setSelectedRiskRule(r.rule_id)}
                  >
                    <CardContent className="p-4 flex items-start gap-4">
                      <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                        r.severity === "very_high" ? "dark:text-red-300 text-red-700" :
                        r.severity === "high" ? "dark:text-red-400 text-red-600" :
                        r.severity === "medium" ? "dark:text-amber-400 text-amber-600" : "text-muted-foreground"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-sm font-semibold text-foreground group-hover:text-red-500 transition-colors">
                            {r.display_name}
                          </p>
                          <SeverityTag severity={r.severity} />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{r.risk_statement}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-1 group-hover:text-red-400 transition-colors" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Sector Benchmarks ── */}
          <TabsContent value="benchmarks">
            {loadingBench ? (
              <div className="py-12 text-center text-muted-foreground">Loading benchmarks…</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(benchmarks ?? []).map(b => (
                  <Card key={b.sector_id} className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-foreground flex items-center gap-2">
                        <Globe className="w-4 h-4 dark:text-violet-400 text-violet-600" />
                        {b.display_name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                          { label: "P25", value: b.overall_individual_benchmark.p25 },
                          { label: "Median", value: b.overall_individual_benchmark.p50 },
                          { label: "P75", value: b.overall_individual_benchmark.p75 },
                        ].map(stat => (
                          <div key={stat.label} className="rounded-lg bg-muted p-2">
                            <p className="text-lg font-bold text-foreground">{stat.value.toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                      {b.notes && (
                        <p className="text-xs text-muted-foreground/70 italic leading-relaxed">{b.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Reviewed {b.last_reviewed}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Sources ── */}
          <TabsContent value="sources">
            {loadingSrc ? (
              <div className="py-12 text-center text-muted-foreground">Loading sources…</div>
            ) : (
              <div className="space-y-2">
                {(sources ?? [])
                  .filter(s => !search || s.citation.toLowerCase().includes(search.toLowerCase()))
                  .map(s => (
                    <Card key={s.source_id} className="bg-card border-border">
                      <CardContent className="p-4 flex items-start gap-4">
                        <BookOpen className="w-4 h-4 shrink-0 mt-0.5 dark:text-emerald-400 text-emerald-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground/90 leading-snug">{s.citation}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded border capitalize ${
                              s.source_type === "primary" ? "dark:bg-emerald-500/20 bg-emerald-100 dark:text-emerald-300 text-emerald-700 dark:border-emerald-500/30 border-emerald-300" :
                              s.source_type === "secondary" ? "dark:bg-blue-500/20 bg-blue-100 dark:text-blue-300 text-blue-700 dark:border-blue-500/30 border-blue-300" :
                              s.source_type === "vendor" ? "dark:bg-amber-500/20 bg-amber-100 dark:text-amber-300 text-amber-700 dark:border-amber-500/30 border-amber-300" :
                              "dark:bg-slate-500/20 bg-slate-100 text-foreground/70 dark:border-slate-500/30 border-slate-300"
                            }`}>
                              {s.source_type}
                            </span>
                            <span className="text-xs text-muted-foreground/70">{s.publication_date?.slice(0, 4)}</span>
                            <span className="text-xs text-muted-foreground font-mono">{s.source_id}</span>
                          </div>
                        </div>
                        {s.url && (
                          <a href={s.url} target="_blank" rel="noopener noreferrer"
                            className="dark:text-blue-400 text-blue-600 hover:dark:text-blue-300 text-blue-700 shrink-0"
                            onClick={e => e.stopPropagation()}>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {selectedInitiative && (
        <InitiativeModal id={selectedInitiative} onClose={() => setSelectedInitiative(null)} />
      )}
      {selectedRiskRule && (
        <RiskRuleModal id={selectedRiskRule} onClose={() => setSelectedRiskRule(null)} />
      )}
    </div>
  );
}
