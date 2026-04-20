/**
 * Assessment Content CMS — AiQ Enterprise Platform
 *
 * Full scenario browser for the 211-item content system:
 * - Browse all assessment scenarios across 13 workflow domains
 * - Filter by domain, risk level, difficulty, capability, status
 * - View full scenario detail with options and signal scoring
 * - Publish / archive / draft scenarios
 * - Domain stats and coverage overview
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Target,
  Shield,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Domain config ─────────────────────────────────────────────────────────────

const DOMAINS = [
  "Candidate Screening & Evaluation",
  "Recruitment & Hiring",
  "Performance Management",
  "Employee Relations — Grievance, Disciplinary & Investigations",
  "DEI-Related Decision-Making",
  "HR Operations & Automation",
  "Learning & Development",
  "Talent Reviews & Succession Planning",
  "HR Policy Interpretation",
  "Organisational Change & Restructuring",
  "People Analytics & Insights",
  "Employee Communications",
  "Compensation & Reward Decisions",
];

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

const CAPABILITY_LABELS: Record<string, string> = {
  execution:           "AI Execution",
  judgement:           "AI Judgement",
  governance:          "AI Risk & Governance",
  appropriateness:     "AI Appropriateness",
  workflow:            "AI Workflow Application",
  data_interpretation: "AI Data & Insight",
};

const CAPABILITY_COLOURS: Record<string, string> = {
  execution:           "#4477AA",
  judgement:           "#AA3377",
  governance:          "#228833",
  appropriateness:     "#EE6677",
  workflow:            "#CCBB44",
  data_interpretation: "#66CCEE",
};

const RISK_COLOURS: Record<string, string> = {
  Low:      "#228833",
  Medium:   "#CCBB44",
  High:     "#EE6677",
  Critical: "#CC0000",
};

const STATUS_CONFIG: Record<string, { label: string; colour: string; icon: React.ElementType }> = {
  published: { label: "Published", colour: "#228833", icon: CheckCircle2 },
  draft:     { label: "Draft",     colour: "#EE8866", icon: Clock },
  archived:  { label: "Archived",  colour: "#9CA3AF", icon: Archive },
};

// ─── Scenario Detail Dialog ────────────────────────────────────────────────────

function ScenarioDetailDialog({
  itemId,
  open,
  onClose,
}: {
  itemId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading } = trpc.assessment.adminGetItem.useQuery(
    { itemId: itemId! },
    { enabled: !!itemId && open }
  );

  if (!open) return null;

  const item = data?.item;
  const options = data?.options ?? [];
  const meta = item
    ? ((typeof item.metadataJson === "object" ? item.metadataJson : {}) as Record<string, unknown>)
    : {};

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {(meta.title as string) ?? "Scenario Detail"}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}
          </div>
        ) : item ? (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap gap-2">
              {(meta.domain !== undefined && meta.domain !== null && meta.domain !== '') && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    color: DOMAIN_COLOURS[meta.domain as string] ?? "#9CA3AF",
                    backgroundColor: `${DOMAIN_COLOURS[meta.domain as string] ?? "#9CA3AF"}20`,
                  }}
                >
                  {String(meta.domain)}
                </span>
              )}
              {!!meta.capability_key && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    color: CAPABILITY_COLOURS[meta.capability_key as string] ?? "#9CA3AF",
                    backgroundColor: `${CAPABILITY_COLOURS[meta.capability_key as string] ?? "#9CA3AF"}20`,
                  }}
                >
                  {CAPABILITY_LABELS[meta.capability_key as string] ?? String(meta.capability_key)}
                </span>
              )}
              {!!meta.risk_level && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    color: RISK_COLOURS[meta.risk_level as string] ?? "#9CA3AF",
                    backgroundColor: `${RISK_COLOURS[meta.risk_level as string] ?? "#9CA3AF"}20`,
                  }}
                >
                  {String(meta.risk_level)} Risk
                </span>
              )}
              <Badge variant="outline" className="text-xs">
                Difficulty {item.difficulty}/3
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {(meta.interaction_type as string)?.replace(/_/g, " ") ?? "SJT"}
              </Badge>
              {meta.governance_sensitive === true && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                  <Shield className="w-3 h-3 mr-1" />
                  Governance Sensitive
                </Badge>
              )}
            </div>

            {Boolean(meta.scenario != null && (meta.scenario as boolean | string) !== false) && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Scenario</p>
                <p className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
                  {String(meta.scenario ?? '')}
                </p>
              </div>
            )}

            {!!meta.constraint && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Constraint</p>
                <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                  {String(meta.constraint ?? '')}
                </p>
              </div>
            )}

            {true && <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Question</p>
              <p className="text-sm font-medium text-foreground">
                  {String(meta.question ?? 'What do you do?')}
              </p>
            </div>}

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Options & Signal Scoring</p>
              <div className="space-y-2">
                {options.map((opt) => {
                  const deltas = (typeof opt.signalDeltasJson === "object" ? opt.signalDeltasJson : {}) as Record<string, number>;
                  const totalDelta = Object.values(deltas).reduce((s, v) => s + v, 0);
                  const isPositive = totalDelta > 0;
                  return (
                    <div
                      key={opt.id}
                      className={cn(
                        "rounded-lg p-3 border text-sm",
                        isPositive
                          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10"
                          : totalDelta < 0
                          ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10"
                          : "border-border bg-muted/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <span className="font-semibold text-foreground mr-2">{String(opt.label ?? '')}.</span>
                          <span className="text-foreground">{String(opt.value ?? '')}  </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={cn(
                              "text-xs font-bold px-1.5 py-0.5 rounded",
                              isPositive ? "text-green-700 bg-green-100" : totalDelta < 0 ? "text-red-700 bg-red-100" : "text-gray-600 bg-gray-100"
                            )}
                          >
                            {isPositive ? "+" : ""}{totalDelta.toFixed(1)}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {opt.outcomeClass?.replace(/_/g, " ") ?? "neutral"}
                          </Badge>
                        </div>
                      </div>
                      {Object.keys(deltas).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {Object.entries(deltas).map(([signal, delta]) => (
                            <span
                              key={signal}
                              className={cn(
                                "text-xs px-1.5 py-0.5 rounded",
                                delta > 0 ? "text-green-600 bg-green-50" : delta < 0 ? "text-red-600 bg-red-50" : "text-gray-500 bg-gray-50"
                              )}
                            >
                              {signal}: {delta > 0 ? "+" : ""}{delta}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {Array.isArray(meta.failure_modes) && (meta.failure_modes as string[]).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Failure Modes Tagged</p>
                <div className="flex flex-wrap gap-1">
                  {(meta.failure_modes as string[]).map((fm) => (
                    <Badge key={fm} variant="outline" className="text-xs text-red-600 border-red-200">
                      {fm.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {!!meta.scoring_anchors && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Scoring Anchors</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(meta.scoring_anchors as Record<string, string>).map(([k, v]) => (
                    <div key={k} className="bg-muted/30 rounded p-2">
                      <p className="font-semibold capitalize">{k.replace(/_/g, " ")}</p>
                      <p className="text-muted-foreground mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-xs border-t border-border pt-3">
              <div>
                <p className="text-muted-foreground">Interaction ID</p>
                <p className="font-mono font-medium">{(meta.interaction_id as string) ?? item.id.slice(0, 12)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Blueprint</p>
                <p className="font-mono font-medium">{item.blueprintId?.slice(0, 16)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Version</p>
                <p className="font-mono font-medium">{(meta.version as string) ?? "v1.0"}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Item not found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Scenario Row ──────────────────────────────────────────────────────────────

function ScenarioRow({
  item,
  onView,
  onStatusChange,
}: {
  item: any;
  onView: () => void;
  onStatusChange: (status: "published" | "draft" | "archived") => void;
}) {
  const meta = (typeof item.metadataJson === "object" ? item.metadataJson : {}) as Record<string, unknown>;
  const domain = (meta.domain as string) ?? "";
  const capKey = (meta.capability_key as string) ?? "execution";
  const riskLevel = (meta.risk_level as string) ?? "Medium";
  const title = (meta.title as string) ?? item.prompt?.slice(0, 60) ?? "Untitled";
  const scenario = (meta.scenario as string) ?? "";
  const interactionType = (meta.interaction_type as string) ?? "situational_judgement";
  const domainColour = DOMAIN_COLOURS[domain] ?? "#9CA3AF";
  const capColour = CAPABILITY_COLOURS[capKey] ?? "#9CA3AF";
  const riskColour = RISK_COLOURS[riskLevel] ?? "#9CA3AF";
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = statusCfg.icon;

  return (
    <Card className="hover:bg-muted/10 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-1.5 self-stretch rounded-full flex-shrink-0"
            style={{ backgroundColor: riskColour }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{title}</p>
                {scenario && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {scenario}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {domain && (
                    <span
                      className="text-xs font-medium px-1.5 py-0.5 rounded"
                      style={{ color: domainColour, backgroundColor: `${domainColour}18` }}
                    >
                      {domain.length > 30 ? domain.slice(0, 28) + "…" : domain}
                    </span>
                  )}
                  <span
                    className="text-xs font-medium px-1.5 py-0.5 rounded"
                    style={{ color: capColour, backgroundColor: `${capColour}18` }}
                  >
                    {CAPABILITY_LABELS[capKey] ?? capKey}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    D{item.difficulty}/3
                  </Badge>
                  <span
                    className="text-xs font-medium px-1.5 py-0.5 rounded"
                    style={{ color: riskColour, backgroundColor: `${riskColour}18` }}
                  >
                    {riskLevel}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {interactionType.replace(/_/g, " ")}
                  </span>
                  {meta.governance_sensitive === true && (
                    <Shield className="w-3 h-3 text-amber-500" />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ color: statusCfg.colour, backgroundColor: `${statusCfg.colour}18` }}
                >
                  <StatusIcon className="w-3 h-3" />
                  {statusCfg.label}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  onClick={onView}
                >
                  <Eye className="w-3 h-3" />
                  View
                </Button>
                {item.status === "published" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 text-muted-foreground"
                    onClick={() => onStatusChange("archived")}
                  >
                    <Archive className="w-3 h-3" />
                    Archive
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 text-[#228833]"
                    onClick={() => onStatusChange("published")}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Publish
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const BLUEPRINTS = [
  { id: "bp-aiq-v9-standard", label: "V9.2 Standard (50 canonical)" },
  { id: "bp-aiq-content-v1",  label: "Content System v1 (211 scenarios)" },
];

export default function AssessmentContentPage() {
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("published");
  const [blueprintFilter, setBlueprintFilter] = useState("bp-aiq-content-v1");
  const [page, setPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const PAGE_SIZE = 25;

  const { data, isLoading, refetch } = trpc.assessment.adminItems.useQuery({
    blueprintId: blueprintFilter !== "all" ? blueprintFilter : undefined,
    domain: domainFilter !== "all" ? domainFilter : undefined,
    riskLevel: riskFilter !== "all" ? riskFilter : undefined,
    difficulty: difficultyFilter !== "all" ? parseInt(difficultyFilter) : undefined,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const updateStatus = trpc.assessment.adminUpdateItemStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      refetch();
    },
    onError: () => toast.error("Failed to update status"),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const hasFilters = search || domainFilter !== "all" || riskFilter !== "all" ||
    difficultyFilter !== "all" || statusFilter !== "published";

  // Domain coverage stats (from all items in the selected blueprint)
  const { data: allData } = trpc.assessment.adminItems.useQuery({
    blueprintId: blueprintFilter !== "all" ? blueprintFilter : undefined,
    pageSize: 1000,
    page: 1,
  });
  const allItems = allData?.items ?? [];
  const domainCounts = DOMAINS.reduce((acc, d) => {
    acc[d] = allItems.filter((i: any) => {
      const meta = (typeof i.metadataJson === "object" ? i.metadataJson : {}) as Record<string, unknown>;
      return meta.domain === d;
    }).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assessment Content</h1>
          <p className="text-muted-foreground mt-1">
            Scenario library — {allItems.length} scenarios across {DOMAINS.length} workflow domains
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={blueprintFilter} onValueChange={(v) => { setBlueprintFilter(v); setPage(1); }}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select blueprint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All blueprints</SelectItem>
              {BLUEPRINTS.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Domain Coverage</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {DOMAINS.map(d => {
            const count = domainCounts[d] ?? 0;
            const colour = DOMAIN_COLOURS[d] ?? "#9CA3AF";
            const shortName = d.length > 28 ? d.slice(0, 26) + "…" : d;
            return (
              <button
                key={d}
                onClick={() => { setDomainFilter(d === domainFilter ? "all" : d); setPage(1); }}
                className={cn(
                  "text-left p-3 rounded-lg border transition-all text-xs",
                  domainFilter === d
                    ? "border-2 shadow-sm"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/20"
                )}
                style={domainFilter === d ? { borderColor: colour, backgroundColor: `${colour}10` } : {}}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-base" style={{ color: colour }}>{count}</span>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colour }} />
                </div>
                <p className="text-muted-foreground leading-tight">{shortName}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Scenarios", value: allItems.length, colour: "#3B4EFF", icon: FileText },
          { label: "Published", value: allItems.filter((i: any) => i.status === "published").length, colour: "#228833", icon: CheckCircle2 },
          { label: "High Risk", value: allItems.filter((i: any) => {
            const m = (typeof i.metadataJson === "object" ? i.metadataJson : {}) as Record<string, unknown>;
            return m.risk_level === "High" || m.risk_level === "Critical";
          }).length, colour: "#EE6677", icon: AlertTriangle },
          { label: "Governance Sensitive", value: allItems.filter((i: any) => {
            const m = (typeof i.metadataJson === "object" ? i.metadataJson : {}) as Record<string, unknown>;
            return m.governance_sensitive === true;
          }).length, colour: "#CCBB44", icon: Shield },
        ].map(stat => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.colour}18` }}>
                <stat.icon className="w-4 h-4" style={{ color: stat.colour }} />
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: stat.colour }}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search scenarios…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={(v) => { setRiskFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Risk level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risk levels</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={(v) => { setDifficultyFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="1">Level 1</SelectItem>
            <SelectItem value="2">Level 2</SelectItem>
            <SelectItem value="3">Level 3</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch(""); setDomainFilter("all"); setRiskFilter("all");
              setDifficultyFilter("all"); setStatusFilter("published"); setPage(1);
            }}
            className="text-muted-foreground gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {total} scenario{total !== 1 ? "s" : ""}
          {hasFilters ? " (filtered)" : ""}
          {total > 0 ? ` · Page ${page} of ${totalPages}` : ""}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No scenarios found</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => (
            <ScenarioRow
              key={item.id}
              item={item}
              onView={() => setSelectedItemId(item.id)}
              onStatusChange={(status) =>
                updateStatus.mutate({ itemId: item.id, status })
              }
            />
          ))}
        </div>
      )}

      <ScenarioDetailDialog
        itemId={selectedItemId}
        open={!!selectedItemId}
        onClose={() => setSelectedItemId(null)}
      />
    </div>
  );
}
