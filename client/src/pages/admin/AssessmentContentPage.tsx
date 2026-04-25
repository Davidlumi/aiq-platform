/**
 * Assessment Content CMS — AiQ Enterprise Platform
 *
 * Full scenario browser for the content system:
 * - Browse all assessment scenarios across 13 workflow domains
 * - Filter by domain, risk level, difficulty, capability, status, tags
 * - View full scenario detail with options, scoring anchors, version history
 * - Publish / archive / draft scenarios
 * - Domain stats and coverage overview
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton, TableSkeleton } from "@/components/ui/loading";
import { toast } from "sonner";
import {
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  Archive,
  CheckCircle2,
  Clock,
  RefreshCw,
  Target,
  Shield,
  Layers,
  Filter,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DOMAIN_COLOURS: Record<string, string> = {
  "Candidate Screening & Evaluation":    "#4477AA",
  "Recruitment & Hiring":                "#AA3377",
  "Performance Management":              "#228833",
  "Employee Relations — Grievance, Disciplinary & Investigations": "#EE6677",
  "DEI-Related Decision-Making":         "#CCBB44",
  "HR Operations & Automation":          "#66CCEE",
  "Learning & Development":              "#BB5566",
  "Talent Reviews & Succession Planning":"#44BB99",
  "HR Policy Interpretation":            "#BBCC33",
  "Organisational Change & Restructuring":"#EE8866",
  "People Analytics & Insights":         "#99DDFF",
  "Employee Communications":             "#CC99CC",
  "Compensation & Reward Decisions":     "#FFAABB",
};

const RISK_CONFIG: Record<string, { label: string; colour: string }> = {
  Low:      { label: "Low",      colour: "#228833" },
  Medium:   { label: "Medium",   colour: "#CCBB44" },
  High:     { label: "High",     colour: "#EE8866" },
  Critical: { label: "Critical", colour: "#EE6677" },
};

const STATUS_CONFIG: Record<string, { label: string; colour: string; icon: React.ElementType }> = {
  published:    { label: "Published",    colour: "#228833", icon: CheckCircle2 },
  draft:        { label: "Draft",        colour: "#EE8866", icon: Clock },
  archived:     { label: "Archived",     colour: "#9CA3AF", icon: Archive },
  under_review: { label: "Under Review", colour: "#4477AA", icon: Eye },
};

function ScenarioDetailDialog({
  scenarioId,
  onClose,
  onStatusChange,
}: {
  scenarioId: string;
  onClose: () => void;
  onStatusChange: () => void;
}) {
  const { data, isLoading } = trpc.content.scenarios.get.useQuery({ id: scenarioId });
  const { data: versionsData } = trpc.content.scenarios.versions.useQuery({ scenarioId });
  const updateStatus = trpc.content.scenarios.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); onStatusChange(); },
    onError: () => toast.error("Failed to update status"),
  });

  const item = (data as any)?.scenario;
  const options = ((data as any)?.options ?? []) as any[];
  const anchors = ((data as any)?.anchors ?? []) as any[];
  const versions = (versionsData ?? []) as any[];

  if (isLoading) {
    return (
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Loading...</DialogTitle></DialogHeader>
        <CardSkeleton rows={4} />
      </DialogContent>
    );
  }

  if (!item) {
    return (
      <DialogContent>
        <DialogHeader><DialogTitle>Scenario not found</DialogTitle></DialogHeader>
      </DialogContent>
    );
  }

  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = statusCfg.icon;
  const riskCfg = RISK_CONFIG[item.riskLevel ?? "Medium"] ?? RISK_CONFIG.Medium;
  const domainColour = DOMAIN_COLOURS[item.domain] ?? "#4477AA";

  return (
    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold pr-8">{item.title}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-wrap gap-2 mt-1">
        <Badge style={{ background: domainColour + "22", color: domainColour, border: `1px solid ${domainColour}44` }}>
          {item.domain}
        </Badge>
        <Badge style={{ background: riskCfg.colour + "22", color: riskCfg.colour, border: `1px solid ${riskCfg.colour}44` }}>
          {riskCfg.label} Risk
        </Badge>
        <Badge style={{ background: statusCfg.colour + "22", color: statusCfg.colour, border: `1px solid ${statusCfg.colour}44` }}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusCfg.label}
        </Badge>
        {!!item.ethicsSensitive && (
          <Badge style={{ background: "#EE667722", color: "#EE6677", border: "1px solid #EE667744" }}>
            <Shield className="h-3 w-3 mr-1" />Governance
          </Badge>
        )}
        <Badge variant="outline">Difficulty {item.difficulty}/5</Badge>
        <Badge variant="outline">v{item.version}</Badge>
      </div>

      <Tabs defaultValue="scenario" className="mt-4">
        <TabsList>
          <TabsTrigger value="scenario">Scenario</TabsTrigger>
          <TabsTrigger value="options">Options ({options.length})</TabsTrigger>
          <TabsTrigger value="anchors">Anchors ({anchors.length})</TabsTrigger>
          <TabsTrigger value="versions">History ({versions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="scenario" className="space-y-4 mt-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Scenario</p>
            <p className="text-sm text-foreground leading-relaxed">{item.scenario}</p>
          </div>
          {item.constraint && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Constraint</p>
              <p className="text-sm text-foreground leading-relaxed">{String(item.constraint)}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Question</p>
            <p className="text-sm font-medium text-foreground leading-relaxed">{item.question}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Capability</p>
              <p className="text-foreground">{item.capabilityKey}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Interaction Type</p>
              <p className="text-foreground capitalize">{item.interactionType?.replace(/_/g, " ")}</p>
            </div>
            {item.workflowKey && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Workflow</p>
                <p className="text-foreground">{item.workflowKey}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Ambiguity</p>
              <p className="text-foreground capitalize">{item.ambiguityLevel}</p>
            </div>
          </div>
          {item.tagsJson && (item.tagsJson as string[]).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {(item.tagsJson as string[]).map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="options" className="space-y-3 mt-4">
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">No options defined.</p>
          ) : (
            options.map((opt: any, idx: number) => (
              <div key={opt.id} className={cn(
                "rounded-lg border p-3 space-y-1",
                opt.isOptimal ? "border-green-500/40 bg-green-500/5" : "border-border"
              )}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-muted-foreground">{String.fromCharCode(65 + idx)}.</span>
                  <p className="text-sm flex-1 text-foreground">{opt.label}</p>
                  {opt.isOptimal && (
                    <Badge className="text-xs shrink-0" style={{ background: "#22883322", color: "#228833", border: "1px solid #22883344" }}>
                      Optimal
                    </Badge>
                  )}
                </div>
                {opt.rationaleText && (
                  <p className="text-xs text-muted-foreground ml-4">{opt.rationaleText}</p>
                )}
                {opt.signalDeltasJson && Object.keys(opt.signalDeltasJson as object).length > 0 && (
                  <div className="ml-4 flex flex-wrap gap-1">
                    {Object.entries(opt.signalDeltasJson as Record<string, number>).map(([k, v]) => (
                      <span key={k} className={cn(
                        "text-xs px-1.5 py-0.5 rounded font-mono",
                        v > 0 ? "bg-[#228833]/10 text-[#228833]" : "bg-[#EE6677]/80/10 text-[#CC3344]"
                      )}>
                        {k}: {v > 0 ? "+" : ""}{v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="anchors" className="space-y-3 mt-4">
          {anchors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scoring anchors defined.</p>
          ) : (
            anchors.map((anchor: any) => (
              <div key={anchor.id} className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{anchor.anchorLabel}</span>
                  {anchor.scoreRange && (
                    <Badge variant="outline" className="text-xs font-mono">{anchor.scoreRange}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{anchor.description}</p>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="versions" className="space-y-2 mt-4">
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No version history.</p>
          ) : (
            versions.map((v: any) => (
              <div key={v.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-accent">v{v.version}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{v.changeType}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {v.changeSummary && (
                    <p className="text-xs text-muted-foreground mt-1">{v.changeSummary}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-2 pt-4 border-t border-border">
        <Button size="sm" variant="outline"
          disabled={item.status === "published" || updateStatus.isPending}
          onClick={() => updateStatus.mutate({ id: item.id, status: "published", changeSummary: "Published via CMS" })}
          className="text-[#228833] border-green-500/40 hover:bg-[#228833]/10"
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Publish
        </Button>
        <Button size="sm" variant="outline"
          disabled={item.status === "draft" || updateStatus.isPending}
          onClick={() => updateStatus.mutate({ id: item.id, status: "draft", changeSummary: "Moved to draft" })}
        >
          <Clock className="h-3.5 w-3.5 mr-1" />Draft
        </Button>
        <Button size="sm" variant="outline"
          disabled={item.status === "archived" || updateStatus.isPending}
          onClick={() => updateStatus.mutate({ id: item.id, status: "archived", changeSummary: "Archived via CMS" })}
          className="text-muted-foreground"
        >
          <Archive className="h-3.5 w-3.5 mr-1" />Archive
        </Button>
      </div>
    </DialogContent>
  );
}

function StatsBar() {
  const { data } = trpc.content.scenarios.stats.useQuery();
  if (!data) return null;
  const stats = data as any;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Total Scenarios",  value: stats.total ?? 0,                                                                                       icon: FileText,     colour: "#4477AA" },
        { label: "Published",        value: (stats.byStatus?.published ?? stats.byStatus?.Published ?? 0),   icon: CheckCircle2, colour: "#228833" },
        { label: "Ethics Cases",     value: stats.govSensitiveCount ?? 0,                                    icon: Shield,       colour: "#EE6677" },
        { label: "Workflow Domains", value: Object.keys(stats.byDomain ?? {}).length,                        icon: Layers,       colour: "#AA3377" },
      ].map(({ label, value, icon: Icon, colour }) => (
        <Card key={label} className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: colour + "22" }}>
              <Icon className="h-4 w-4" style={{ color: colour }} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AssessmentContentPage() {
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("published");
  const [govFilter, setGovFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const PAGE_SIZE = 25;

  const { data: workflowsData } = trpc.content.workflows.list.useQuery();
  const workflows = (workflowsData ?? []) as any[];

  const queryInput = useMemo(() => ({
    domain: domainFilter !== "all" ? domainFilter : undefined,
    riskLevel: riskFilter !== "all" ? riskFilter : undefined,
    difficulty: difficultyFilter !== "all" ? parseInt(difficultyFilter) : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    ethicsSensitive: govFilter === "yes" ? true : govFilter === "no" ? false : undefined,
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
  }), [domainFilter, riskFilter, difficultyFilter, statusFilter, govFilter, search, page]);

  const { data, isLoading, refetch } = trpc.content.scenarios.list.useQuery(queryInput);

  const items = ((data as any)?.items ?? []) as any[];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const hasFilters = !!(search || domainFilter !== "all" || riskFilter !== "all" ||
    difficultyFilter !== "all" || statusFilter !== "published" || govFilter !== "all");

  function clearFilters() {
    setSearch(""); setDomainFilter("all"); setRiskFilter("all");
    setDifficultyFilter("all"); setStatusFilter("published"); setGovFilter("all"); setPage(1);
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assessment Content</h1>
          <p className="text-muted-foreground mt-1">Scenario library across 13 workflow domains</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1.5" />Refresh
        </Button>
      </div>

      <StatsBar />

      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search scenarios..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-accent/10 border-accent")}>
              <Filter className="h-4 w-4 mr-1.5" />Filters
              {hasFilters && <span className="ml-1.5 w-2 h-2 rounded-full bg-accent inline-block" />}
            </Button>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />Clear
              </Button>
            )}
          </div>
          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-border">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                </SelectContent>
              </Select>
              <Select value={domainFilter} onValueChange={(v) => { setDomainFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Domain" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Domains</SelectItem>
                  {workflows.map((w: any) => (
                    <SelectItem key={w.key} value={w.domain}>{w.domain}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={(v) => { setRiskFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Risk Level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={difficultyFilter} onValueChange={(v) => { setDifficultyFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  {[1,2,3,4,5].map(d => <SelectItem key={d} value={String(d)}>Level {d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={govFilter} onValueChange={(v) => { setGovFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Governance" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Governance Sensitive</SelectItem>
                  <SelectItem value="no">Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{isLoading ? "Loading..." : `${total} scenario${total !== 1 ? "s" : ""}`}{hasFilters && " (filtered)"}</span>
          {totalPages > 1 && <span>Page {page} of {totalPages}</span>}
        </div>

        {isLoading ? (
          <TableSkeleton columns={5} rows={8} />
        ) : items.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No scenarios match your filters.</p>
              {hasFilters && <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>Clear filters</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((item: any) => {
              const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.draft;
              const StatusIcon = statusCfg.icon;
              const riskCfg = RISK_CONFIG[item.riskLevel ?? "Medium"] ?? RISK_CONFIG.Medium;
              const domainColour = DOMAIN_COLOURS[item.domain] ?? "#4477AA";
              return (
                <Card key={item.id} className="border-border hover:border-accent/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedId(item.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: domainColour }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.domain}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className="text-xs" style={{ background: riskCfg.colour + "22", color: riskCfg.colour, border: `1px solid ${riskCfg.colour}44` }}>
                              {riskCfg.label}
                            </Badge>
                            <Badge className="text-xs" style={{ background: statusCfg.colour + "22", color: statusCfg.colour, border: `1px solid ${statusCfg.colour}44` }}>
                              <StatusIcon className="h-3 w-3 mr-1" />{statusCfg.label}
                            </Badge>
                            {!!item.ethicsSensitive && <Shield className="h-3.5 w-3.5 text-[#CC3344] shrink-0" />}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>Difficulty {item.difficulty}/5</span>
                          <span>·</span>
                          <span className="capitalize">{item.interactionType?.replace(/_/g, " ")}</span>
                          <span>·</span>
                          <span>v{item.version}</span>
                          {item.capabilityKey && <><span>·</span><span>{item.capabilityKey}</span></>}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />Prev
            </Button>
            <span className="text-sm text-muted-foreground px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        {selectedId && (
          <ScenarioDetailDialog
            scenarioId={selectedId}
            onClose={() => setSelectedId(null)}
            onStatusChange={() => { refetch(); }}
          />
        )}
      </Dialog>
    </div>
  );
}
