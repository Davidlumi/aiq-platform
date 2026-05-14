/**
 * Content Review Dashboard — /admin/content-review
 * Implements the CONTENT_REVIEW.md policy as a live admin interface.
 *
 * Four tabs:
 *   1. Cadence      — review schedule with status badges
 *   2. Review Log   — append-only audit trail of library version bumps
 *   3. Triggered    — regulatory / customer / operational triggered reviews
 *   4. Source Health — stale source detection
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarCheck2,
  ClipboardList,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CadenceStatusBadge({ status }: { status: string }) {
  if (status === "ok") return <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Up to date</Badge>;
  if (status === "due_soon") return <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30">Due soon</Badge>;
  if (status === "overdue") return <Badge className="bg-red-500/20 text-red-300 border border-red-500/30">Overdue</Badge>;
  if (status === "never_reviewed") return <Badge className="bg-slate-500/20 text-foreground/70 border border-slate-500/30">Never reviewed</Badge>;
  return <Badge className="bg-slate-500/20 text-foreground/70 border border-slate-500/30">{status}</Badge>;
}

function TriggeredStatusBadge({ status }: { status: string }) {
  if (status === "open") return <Badge className="bg-red-500/20 text-red-300 border border-red-500/30">Open</Badge>;
  if (status === "in_review") return <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30">In review</Badge>;
  if (status === "resolved") return <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Resolved</Badge>;
  if (status === "deferred") return <Badge className="bg-slate-500/20 text-foreground/70 border border-slate-500/30">Deferred</Badge>;
  return <Badge>{status}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "critical") return <Badge className="bg-red-600/30 text-red-300 border border-red-500/40">Critical</Badge>;
  if (priority === "high") return <Badge className="bg-orange-500/20 text-orange-300 border border-orange-500/30">High</Badge>;
  if (priority === "medium") return <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30">Medium</Badge>;
  return <Badge className="bg-slate-500/20 text-foreground/70 border border-slate-500/30">Low</Badge>;
}

function CategoryIcon({ category }: { category: string }) {
  if (category === "regulatory") return <ShieldAlert className="w-4 h-4 text-red-400" />;
  if (category === "customer") return <Users className="w-4 h-4 text-blue-400" />;
  return <Wrench className="w-4 h-4 text-amber-400" />;
}

function BumpTypeBadge({ type }: { type: string }) {
  if (type === "major") return <Badge className="bg-red-500/20 text-red-300 border border-red-500/30">Major</Badge>;
  if (type === "minor") return <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">Minor</Badge>;
  return <Badge className="bg-slate-500/20 text-foreground/70 border border-slate-500/30">Patch</Badge>;
}

function TriggerTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    quarterly_review: "Quarterly",
    annual_review: "Annual",
    regulatory_trigger: "Regulatory",
    customer_trigger: "Customer",
    operational_trigger: "Operational",
    manual: "Manual",
  };
  const colours: Record<string, string> = {
    quarterly_review: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    annual_review: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    regulatory_trigger: "bg-red-500/20 text-red-300 border-red-500/30",
    customer_trigger: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    operational_trigger: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    manual: "bg-slate-500/20 text-foreground/70 border-slate-500/30",
  };
  return (
    <Badge className={`border ${colours[type] ?? "bg-slate-500/20 text-foreground/70 border-slate-500/30"}`}>
      {labels[type] ?? type}
    </Badge>
  );
}

function StalenessStatusBadge({ status }: { status: string }) {
  if (status === "stale") return <Badge className="bg-red-500/20 text-red-300 border border-red-500/30">Stale</Badge>;
  if (status === "aging") return <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30">Aging</Badge>;
  return <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Fresh</Badge>;
}

// ─── Cadence Tab ─────────────────────────────────────────────────────────────

function CadenceTab() {
  const { data: cadence, isLoading } = trpc.contentReview.getCadenceStatus.useQuery();

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading cadence status…</div>;

  const overdue = (cadence ?? []).filter(c => c.status === "overdue").length;
  const dueSoon = (cadence ?? []).filter(c => c.status === "due_soon").length;

  return (
    <div className="space-y-6">
      {(overdue > 0 || dueSoon > 0) && (
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${overdue > 0 ? "bg-red-900/20 border-red-500/30" : "bg-amber-900/20 border-amber-500/30"}`}>
          <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${overdue > 0 ? "text-red-400" : "text-amber-400"}`} />
          <div>
            <p className={`text-sm font-medium ${overdue > 0 ? "text-red-300" : "text-amber-300"}`}>
              {overdue > 0 ? `${overdue} review(s) overdue` : `${dueSoon} review(s) due soon`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Schedule a review cycle to bring the content library up to date.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Content Type</th>
              <th className="px-4 py-3 text-left">Cadence</th>
              <th className="px-4 py-3 text-left">Last Reviewed</th>
              <th className="px-4 py-3 text-left">Next Due</th>
              <th className="px-4 py-3 text-left">Owner</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {(cadence ?? []).map(row => (
              <tr key={row.contentType} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-foreground/90 font-medium">{row.contentType}</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{row.description}</p>
                </td>
                <td className="px-4 py-3 text-foreground/70">{row.cadence}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.lastReviewedDate ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.nextDueDate ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.owner}</td>
                <td className="px-4 py-3">
                  <CadenceStatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-card/50 border border-border rounded-lg p-4">
        <p className="text-xs text-muted-foreground/70 leading-relaxed">
          <span className="text-muted-foreground font-medium">Review policy:</span> Initiatives, Risk Rules, and Sources are reviewed quarterly (every 90 days).
          Sector Benchmarks and the Full Library Audit are reviewed annually (every 365 days).
          Test Fixtures are validated on every library version bump.
          Sources not reviewed in 18+ months are flagged as stale in the Source Health tab.
        </p>
      </div>
    </div>
  );
}

// ─── Review Log Tab ───────────────────────────────────────────────────────────

function ReviewLogTab() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { data: log, isLoading, refetch } = trpc.contentReview.listReviewLog.useQuery({ limit: 50 });
  const addMutation = trpc.contentReview.addReviewEntry.useMutation({
    onSuccess: () => {
      toast.success("Review entry added — the review log has been updated.");
      setShowAddDialog(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    version: "",
    bumpType: "patch" as "patch" | "minor" | "major",
    triggerType: "manual" as "quarterly_review" | "annual_review" | "regulatory_trigger" | "customer_trigger" | "operational_trigger" | "manual",
    triggerDetail: "",
    author: "David",
    reviewer: "",
    changesText: "",
    knownIssues: "",
  });

  const handleAdd = () => {
    if (!form.version || !form.author) return;
    addMutation.mutate({
      version: form.version,
      bumpType: form.bumpType,
      triggerType: form.triggerType,
      triggerDetail: form.triggerDetail || undefined,
      author: form.author,
      reviewer: form.reviewer || undefined,
      changes: form.changesText.split("\n").map(s => s.trim()).filter(Boolean),
      knownIssues: form.knownIssues || undefined,
    });
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading review log…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {(log ?? []).length} entr{(log ?? []).length === 1 ? "y" : "ies"} — append-only audit trail of all library version bumps
        </p>
        <Button
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Log Review
        </Button>
      </div>

      {(log ?? []).length === 0 && (
        <div className="py-12 text-center text-muted-foreground/70">No review log entries yet.</div>
      )}

      <div className="space-y-3">
        {(log ?? []).map(entry => (
          <Card key={entry.id} className="bg-card border-border">
            <CardContent className="p-0">
              <button
                className="w-full text-left p-4 flex items-start gap-4"
                onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-foreground font-semibold font-mono">v{entry.version}</span>
                    <BumpTypeBadge type={entry.bumpType} />
                    <TriggerTypeBadge type={entry.triggerType} />
                    <span className="text-xs text-muted-foreground/70">
                      {new Date(entry.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  {entry.triggerDetail && (
                    <p className="text-sm text-muted-foreground mt-1">{entry.triggerDetail}</p>
                  )}
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Author: <span className="text-muted-foreground">{entry.author}</span>
                    {entry.reviewer && <> · Reviewer: <span className="text-muted-foreground">{entry.reviewer}</span></>}
                    {entry.changes.length > 0 && <> · {entry.changes.length} change{entry.changes.length !== 1 ? "s" : ""}</>}
                  </p>
                </div>
                {expanded === entry.id
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-1" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-1" />}
              </button>

              {expanded === entry.id && (
                <div className="border-t border-border p-4 space-y-4">
                  {entry.changes.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Changes</p>
                      <ul className="space-y-1">
                        {entry.changes.map((c, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {entry.newSources.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">New Sources</p>
                      <div className="space-y-1">
                        {entry.newSources.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-foreground/70">
                            <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{s.citation}</span>
                            <Badge className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">{s.confidence}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.testFixtures.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Test Fixtures</p>
                      <div className="space-y-1">
                        {entry.testFixtures.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {f.passed
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                            <span className="text-foreground/70">{f.fixture}</span>
                            {f.notes && <span className="text-xs text-muted-foreground/70">— {f.notes}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.knownIssues && (
                    <div className="bg-amber-900/20 border border-amber-500/30 rounded p-3">
                      <p className="text-xs font-medium text-amber-400 mb-1">Known Issues</p>
                      <p className="text-sm text-amber-200">{entry.knownIssues}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Review Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Log Library Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Version *</label>
                <Input
                  value={form.version}
                  onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                  placeholder="e.g. 1.4.0"
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Bump Type</label>
                <Select value={form.bumpType} onValueChange={v => setForm(f => ({ ...f, bumpType: v as typeof form.bumpType }))}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    <SelectItem value="patch">Patch</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Trigger Type</label>
              <Select value={form.triggerType} onValueChange={v => setForm(f => ({ ...f, triggerType: v as typeof form.triggerType }))}>
                <SelectTrigger className="bg-muted border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-muted border-border">
                  <SelectItem value="quarterly_review">Quarterly Review</SelectItem>
                  <SelectItem value="annual_review">Annual Review</SelectItem>
                  <SelectItem value="regulatory_trigger">Regulatory Trigger</SelectItem>
                  <SelectItem value="customer_trigger">Customer Trigger</SelectItem>
                  <SelectItem value="operational_trigger">Operational Trigger</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Trigger Detail</label>
              <Input
                value={form.triggerDetail}
                onChange={e => setForm(f => ({ ...f, triggerDetail: e.target.value }))}
                placeholder="e.g. Q3 2026 quarterly review"
                className="bg-muted border-border text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Author *</label>
                <Input
                  value={form.author}
                  onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Reviewer</label>
                <Input
                  value={form.reviewer}
                  onChange={e => setForm(f => ({ ...f, reviewer: e.target.value }))}
                  placeholder="Optional"
                  className="bg-muted border-border text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Changes (one per line)</label>
              <Textarea
                value={form.changesText}
                onChange={e => setForm(f => ({ ...f, changesText: e.target.value }))}
                placeholder="Added 3 new initiatives&#10;Updated cost ranges…"
                rows={4}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Known Issues</label>
              <Textarea
                value={form.knownIssues}
                onChange={e => setForm(f => ({ ...f, knownIssues: e.target.value }))}
                placeholder="Any known issues with this version…"
                rows={2}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="border-border text-foreground/70">
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={addMutation.isPending || !form.version || !form.author}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {addMutation.isPending ? "Saving…" : "Log Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Triggered Reviews Tab ────────────────────────────────────────────────────

function TriggeredTab() {
  const [statusFilter, setStatusFilter] = useState<"open" | "in_review" | "resolved" | "deferred" | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<"regulatory" | "customer" | "operational" | "all">("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const { data: reviews, isLoading, refetch } = trpc.contentReview.listTriggeredReviews.useQuery({
    status: statusFilter,
    category: categoryFilter,
    limit: 50,
  });

  const addMutation = trpc.contentReview.addTriggeredReview.useMutation({
    onSuccess: () => {
      toast.success("Triggered review added.");
      setShowAddDialog(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.contentReview.updateTriggeredReview.useMutation({
    onSuccess: () => {
      toast.success("Review updated.");
      setResolveId(null);
      setResolveNotes("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const [addForm, setAddForm] = useState({
    triggerCategory: "regulatory" as "regulatory" | "customer" | "operational",
    triggerType: "",
    triggerDetail: "",
    affectedContent: "",
    plannedReviewDate: "",
    priority: "medium" as "low" | "medium" | "high" | "critical",
  });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading triggered reviews…</div>;

  const TRIGGER_TYPE_EXAMPLES: Record<string, string[]> = {
    regulatory: ["ICO guidance update", "EU AI Act amendment", "Employment law change", "DPA enforcement action"],
    customer: ["Design partner request", "Client escalation", "User feedback cluster", "Advisory board input"],
    operational: ["Risk rule never fires", "Initiative cost variance >25%", "Source 404 error", "Test fixture failure"],
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="bg-muted border-border text-foreground w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-muted border-border">
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_review">In review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="deferred">Deferred</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v as typeof categoryFilter)}>
            <SelectTrigger className="bg-muted border-border text-foreground w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-muted border-border">
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="regulatory">Regulatory</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="operational">Operational</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="bg-red-600 hover:bg-red-500 text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Log Triggered Review
        </Button>
      </div>

      {(reviews ?? []).length === 0 && (
        <div className="py-12 text-center text-muted-foreground/70">No triggered reviews match the current filter.</div>
      )}

      <div className="space-y-3">
        {(reviews ?? []).map(r => (
          <Card key={r.id} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CategoryIcon category={r.triggerCategory} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-foreground/90 font-medium">{r.triggerType}</span>
                    <TriggeredStatusBadge status={r.status} />
                    <PriorityBadge priority={r.priority} />
                    <span className="text-xs text-muted-foreground/70 capitalize">{r.triggerCategory}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{r.triggerDetail}</p>
                  {r.affectedContent && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      <span className="text-muted-foreground">Affected:</span> {r.affectedContent}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground/70">
                    <span>Logged {new Date(r.createdAt).toLocaleDateString("en-GB")}</span>
                    {r.plannedReviewDate && <span>Planned: {r.plannedReviewDate}</span>}
                    {r.resolvedAt && <span>Resolved: {new Date(r.resolvedAt).toLocaleDateString("en-GB")}</span>}
                  </div>
                  {r.resolutionNotes && (
                    <p className="text-xs text-emerald-400 mt-1">Resolution: {r.resolutionNotes}</p>
                  )}
                </div>
                {(r.status === "open" || r.status === "in_review") && (
                  <div className="flex items-center gap-2 shrink-0">
                    {r.status === "open" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-500/40 text-amber-300 hover:bg-amber-900/20 text-xs"
                        onClick={() => updateMutation.mutate({ id: r.id, status: "in_review" })}
                      >
                        Start Review
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/20 text-xs"
                      onClick={() => setResolveId(r.id)}
                    >
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Triggered Review Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Log Triggered Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category *</label>
                <Select value={addForm.triggerCategory} onValueChange={v => setAddForm(f => ({ ...f, triggerCategory: v as typeof f.triggerCategory }))}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    <SelectItem value="regulatory">Regulatory</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                <Select value={addForm.priority} onValueChange={v => setAddForm(f => ({ ...f, priority: v as typeof f.priority }))}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Trigger Type *</label>
              <Input
                value={addForm.triggerType}
                onChange={e => setAddForm(f => ({ ...f, triggerType: e.target.value }))}
                placeholder={TRIGGER_TYPE_EXAMPLES[addForm.triggerCategory]?.[0] ?? ""}
                className="bg-muted border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Examples: {TRIGGER_TYPE_EXAMPLES[addForm.triggerCategory]?.join(", ")}
              </p>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Detail *</label>
              <Textarea
                value={addForm.triggerDetail}
                onChange={e => setAddForm(f => ({ ...f, triggerDetail: e.target.value }))}
                placeholder="Describe the triggering event and why a review is needed…"
                rows={3}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Affected Content</label>
              <Input
                value={addForm.affectedContent}
                onChange={e => setAddForm(f => ({ ...f, affectedContent: e.target.value }))}
                placeholder="e.g. init_ai_recruitment, risk_bias_detection"
                className="bg-muted border-border text-foreground"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Planned Review Date</label>
              <Input
                type="date"
                value={addForm.plannedReviewDate}
                onChange={e => setAddForm(f => ({ ...f, plannedReviewDate: e.target.value }))}
                className="bg-muted border-border text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="border-border text-foreground/70">
              Cancel
            </Button>
            <Button
              onClick={() => addMutation.mutate(addForm)}
              disabled={addMutation.isPending || !addForm.triggerType || !addForm.triggerDetail}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {addMutation.isPending ? "Saving…" : "Log Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveId} onOpenChange={() => { setResolveId(null); setResolveNotes(""); }}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Resolve Triggered Review</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="text-xs text-muted-foreground mb-1 block">Resolution Notes</label>
            <Textarea
              value={resolveNotes}
              onChange={e => setResolveNotes(e.target.value)}
              placeholder="Describe how this was resolved…"
              rows={3}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResolveId(null); setResolveNotes(""); }} className="border-border text-foreground/70">
              Cancel
            </Button>
            <Button
              onClick={() => resolveId && updateMutation.mutate({ id: resolveId, status: "resolved", resolutionNotes: resolveNotes })}
              disabled={updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {updateMutation.isPending ? "Saving…" : "Mark Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Source Health Tab ────────────────────────────────────────────────────────

function SourceHealthTab() {
  const [filter, setFilter] = useState<"all" | "stale" | "aging" | "fresh">("all");
  const { data: sources, isLoading } = trpc.contentReview.getSourceHealthReport.useQuery();

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading source health…</div>;

  const filtered = (sources ?? []).filter(s => filter === "all" || s.stalenessStatus === filter);
  const staleCount = (sources ?? []).filter(s => s.stalenessStatus === "stale").length;
  const agingCount = (sources ?? []).filter(s => s.stalenessStatus === "aging").length;
  const freshCount = (sources ?? []).filter(s => s.stalenessStatus === "fresh").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Stale (18+ months)", count: staleCount, colour: "text-red-400", bg: "bg-red-900/20 border-red-500/30", filter: "stale" as const },
          { label: "Aging (12–18 months)", count: agingCount, colour: "text-amber-400", bg: "bg-amber-900/20 border-amber-500/30", filter: "aging" as const },
          { label: "Fresh (<12 months)", count: freshCount, colour: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-500/30", filter: "fresh" as const },
        ].map(stat => (
          <button
            key={stat.filter}
            onClick={() => setFilter(f => f === stat.filter ? "all" : stat.filter)}
            className={`text-left p-4 rounded-lg border transition-all ${stat.bg} ${filter === stat.filter ? "ring-1 ring-white/20" : ""}`}
          >
            <p className={`text-2xl font-bold ${stat.colour}`}>{stat.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Confidence</th>
              <th className="px-4 py-3 text-left">Last Reviewed</th>
              <th className="px-4 py-3 text-left">Age</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map(s => (
              <tr key={s.sourceId} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-foreground/90 leading-snug text-xs">{s.citation}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{s.sourceId}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded border capitalize ${
                    s.sourceType === "primary" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                    s.sourceType === "secondary" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" :
                    s.sourceType === "vendor" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                    "bg-slate-500/20 text-foreground/70 border-slate-500/30"
                  }`}>
                    {s.sourceType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs capitalize ${
                    s.confidence === "high" ? "text-emerald-400" :
                    s.confidence === "medium" ? "text-amber-400" :
                    "text-red-400"
                  }`}>{s.confidence}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {s.lastReviewedDate ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {s.monthsAgo !== null ? `${s.monthsAgo}mo` : "—"}
                </td>
                <td className="px-4 py-3">
                  <StalenessStatusBadge status={s.stalenessStatus} />
                </td>
                <td className="px-4 py-3">
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-card/50 border border-border rounded-lg p-4">
        <p className="text-xs text-muted-foreground/70 leading-relaxed">
          <span className="text-muted-foreground font-medium">Staleness policy:</span> Sources not reviewed in 18+ months are flagged as <span className="text-red-400">Stale</span>.
          Sources between 12–18 months are flagged as <span className="text-amber-400">Aging</span> and should be prioritised for the next quarterly review.
          Source staleness is also surfaced in the Strategy QA Check when generating AI strategies.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContentReviewPage() {
  const { data: stats, isLoading: statsLoading } = trpc.contentReview.getSummaryStats.useQuery();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-blue-400" />
                Content Review Dashboard
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Governance and audit trail for the AiQ content library — per CONTENT_REVIEW.md policy
              </p>
            </div>
            {!statsLoading && stats && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground/70">Library version</p>
                <p className="text-sm font-mono font-bold text-blue-400">v{stats.libraryVersion}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats row */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: "Last Review",
                value: stats.lastReviewDate ?? "Never",
                sub: stats.lastReviewVersion ? `v${stats.lastReviewVersion}` : "",
                icon: CalendarCheck2,
                colour: "text-blue-400",
              },
              {
                label: "Review Log Entries",
                value: String(stats.totalReviewLogEntries),
                sub: "all time",
                icon: ClipboardList,
                colour: "text-violet-400",
              },
              {
                label: "Open Triggered Reviews",
                value: String(stats.openTriggeredReviews),
                sub: stats.criticalTriggeredReviews > 0 ? `${stats.criticalTriggeredReviews} critical` : "none critical",
                icon: AlertTriangle,
                colour: stats.openTriggeredReviews > 0 ? "text-red-400" : "text-emerald-400",
              },
              {
                label: "Stale Sources",
                value: String(stats.staleSourceCount),
                sub: `of ${stats.totalSourceCount} total`,
                icon: BookOpen,
                colour: stats.staleSourceCount > 0 ? "text-amber-400" : "text-emerald-400",
              },
            ].map(stat => (
              <Card key={stat.label} className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <stat.icon className={`w-5 h-5 shrink-0 ${stat.colour}`} />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    {stat.sub && <p className="text-xs text-muted-foreground">{stat.sub}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Tabs defaultValue="cadence">
          <TabsList className="bg-muted border border-border mb-6">
            <TabsTrigger value="cadence" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <CalendarCheck2 className="w-4 h-4 mr-2" />Cadence
            </TabsTrigger>
            <TabsTrigger value="review-log" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">
              <ClipboardList className="w-4 h-4 mr-2" />Review Log
            </TabsTrigger>
            <TabsTrigger value="triggered" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              <AlertTriangle className="w-4 h-4 mr-2" />Triggered Reviews
            </TabsTrigger>
            <TabsTrigger value="source-health" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <BookOpen className="w-4 h-4 mr-2" />Source Health
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cadence">
            <CadenceTab />
          </TabsContent>
          <TabsContent value="review-log">
            <ReviewLogTab />
          </TabsContent>
          <TabsContent value="triggered">
            <TriggeredTab />
          </TabsContent>
          <TabsContent value="source-health">
            <SourceHealthTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
