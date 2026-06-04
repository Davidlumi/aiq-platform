/**
 * Initiative Discovery — Back-Office Page
 *
 * Staff-only (super_admin) interface for:
 * - Viewing discovery stats and library health
 * - Triggering new discovery scans
 * - Reviewing candidate initiatives (accept/reject/edit)
 * - Adding accepted candidates to the canonical initiative library
 */
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useGate } from "@/contexts/GateContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Pencil,
  Plus,
  ArrowLeft,
  Library,
  Radar,
  BarChart3,
  Copy,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ──────────────────────────────────────────────────────────────

const INITIATIVE_CATEGORIES = [
  "talent_acquisition",
  "onboarding",
  "learning_development",
  "internal_mobility",
  "performance_management",
  "employee_experience",
  "retention",
  "hr_operations",
  "workforce_planning",
  "compensation_reward",
  "manager_effectiveness",
  "governance",
  "frontline_workforce",
  "ai_capability",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  talent_acquisition: "Talent Acquisition",
  onboarding: "Onboarding",
  learning_development: "Learning & Development",
  internal_mobility: "Internal Mobility",
  performance_management: "Performance Management",
  employee_experience: "Employee Experience",
  retention: "Retention",
  hr_operations: "HR Operations",
  workforce_planning: "Workforce Planning",
  compensation_reward: "Compensation & Reward",
  manager_effectiveness: "Manager Effectiveness",
  governance: "Governance",
  frontline_workforce: "Frontline Workforce",
  ai_capability: "AI Capability",
};

const SCOPE_LABELS: Record<string, string> = {
  cpo: "CPO / Strategy",
  reward: "Reward Leader",
  both: "Cross-cutting",
};

const DEDUP_STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  unique: { label: "Unique", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25", icon: CheckCircle2 },
  duplicate: { label: "Duplicate", className: "bg-red-500/10 text-red-400 border-red-500/25", icon: XCircle },
  near_overlap: { label: "Near Overlap", className: "bg-amber-500/10 text-amber-400 border-amber-500/25", icon: AlertTriangle },
};

const CANDIDATE_STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-400 border-amber-500/25", icon: Clock },
  accepted: { label: "Accepted", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-400 border-red-500/25", icon: XCircle },
  edited: { label: "Edited", className: "bg-blue-500/10 text-blue-400 border-blue-500/25", icon: Pencil },
};

// ─── Helper Components ──────────────────────────────────────────────────────

function DedupBadge({ status }: { status: string }) {
  const config = DEDUP_STATUS_CONFIG[status] ?? DEDUP_STATUS_CONFIG.unique;
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border", config.className)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function CandidateStatusBadge({ status }: { status: string }) {
  const config = CANDIDATE_STATUS_CONFIG[status] ?? CANDIDATE_STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border", config.className)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function ScanStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    running: { label: "Running", className: "bg-blue-500/10 text-blue-400 border-blue-500/25" },
    completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" },
    failed: { label: "Failed", className: "bg-red-500/10 text-red-400 border-red-500/25" },
  };
  const c = config[status] ?? { label: status, className: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border", c.className)}>
      {c.label}
    </span>
  );
}

// ─── Stats Dashboard ────────────────────────────────────────────────────────

function StatsSection() {
  const { data: stats, isLoading } = trpc.initiativeDiscovery.stats.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Library Size", value: stats?.librarySize ?? 0, icon: Library, color: "text-primary" },
    { label: "Total Scans", value: stats?.totalScans ?? 0, icon: Radar, color: "text-blue-400" },
    { label: "Pending Review", value: stats?.candidates?.pending ?? 0, icon: Clock, color: "text-amber-400" },
    { label: "Accepted", value: stats?.candidates?.accepted ?? 0, icon: CheckCircle2, color: "text-emerald-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                <card.icon className={cn("w-5 h-5", card.color)} />
              </div>
              <div>
                <p className={cn("text-2xl font-bold", card.color)}>{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Scan History ───────────────────────────────────────────────────────────

function ScanHistorySection() {
  const utils = trpc.useUtils();
  const { data: scans, isLoading } = trpc.initiativeDiscovery.listScans.useQuery({ limit: 20 });

  const triggerMutation = trpc.initiativeDiscovery.triggerScan.useMutation({
    onSuccess: (data) => {
      toast.success(`Discovery scan started (ID: ${data.scanId.slice(0, 8)}...)`);
      utils.initiativeDiscovery.listScans.invalidate();
      utils.initiativeDiscovery.stats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Scan History</h3>
        <Button
          size="sm"
          onClick={() => triggerMutation.mutate()}
          disabled={triggerMutation.isPending}
          className="bg-primary hover:bg-primary/90 text-white h-8 text-xs gap-1.5"
        >
          {triggerMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          Run Discovery Scan
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : !scans?.length ? (
        <Card className="border-border bg-card">
          <CardContent className="p-8 text-center">
            <Radar className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No scans yet. Run your first discovery scan to find new HR initiatives.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Scan ID</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Queries</TableHead>
                <TableHead className="text-xs">Candidates</TableHead>
                <TableHead className="text-xs">Started</TableHead>
                <TableHead className="text-xs">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scans.map((scan) => (
                <TableRow key={scan.id}>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {scan.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <ScanStatusBadge status={scan.status} />
                  </TableCell>
                  <TableCell className="text-xs">{scan.queriesRun}</TableCell>
                  <TableCell className="text-xs">{scan.candidatesFound}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(scan.startedAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {scan.completedAt
                      ? `${Math.round((scan.completedAt - scan.startedAt) / 1000)}s`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Candidate Review Queue ─────────────────────────────────────────────────

function CandidateQueueSection() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [showAddToLibrary, setShowAddToLibrary] = useState<any | null>(null);

  const utils = trpc.useUtils();
  const { data: candidates, isLoading } = trpc.initiativeDiscovery.listCandidates.useQuery({
    status: statusFilter as any,
    limit: 100,
  });

  const assessMutation = trpc.initiativeDiscovery.assessCandidate.useMutation({
    onSuccess: (data) => {
      toast.success(`Candidate ${data.decision}`);
      utils.initiativeDiscovery.listCandidates.invalidate();
      utils.initiativeDiscovery.stats.invalidate();
      setSelectedCandidate(null);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Candidate Queue</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => utils.initiativeDiscovery.listCandidates.invalidate()}
          className="h-8 text-xs gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {["pending", "accepted", "rejected", "edited"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
              statusFilter === s
                ? "bg-primary text-white border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
            )}
          >
            {CANDIDATE_STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Candidates table */}
      {isLoading ? (
        <Skeleton className="h-60 rounded-xl" />
      ) : !candidates?.length ? (
        <Card className="border-border bg-card">
          <CardContent className="p-8 text-center">
            <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No {statusFilter} candidates found.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onReview={() => setSelectedCandidate(candidate)}
              onAddToLibrary={() => setShowAddToLibrary(candidate)}
            />
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedCandidate && (
        <ReviewModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onAssess={(decision, note, edits) => {
            assessMutation.mutate({
              candidateId: selectedCandidate.id,
              decision,
              note,
              ...edits,
            });
          }}
          isPending={assessMutation.isPending}
        />
      )}

      {/* Add to Library Modal */}
      {showAddToLibrary && (
        <AddToLibraryModal
          candidate={showAddToLibrary}
          onClose={() => setShowAddToLibrary(null)}
        />
      )}
    </div>
  );
}

// ─── Candidate Card ─────────────────────────────────────────────────────────

function CandidateCard({
  candidate,
  onReview,
  onAddToLibrary,
}: {
  candidate: any;
  onReview: () => void;
  onAddToLibrary: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Summary row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground text-sm">{candidate.name}</span>
            <CandidateStatusBadge status={candidate.status} />
            <DedupBadge status={candidate.dedupStatus} />
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {candidate.description}
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              {CATEGORY_LABELS[candidate.suggestedCategory] ?? candidate.suggestedCategory}
            </span>
            <span>·</span>
            <span>{SCOPE_LABELS[candidate.suggestedScope] ?? candidate.suggestedScope}</span>
            <span>·</span>
            <span>{new Date(candidate.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {candidate.status === "pending" && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onReview(); }}
              className="h-7 text-xs"
            >
              Review
            </Button>
          )}
          {(candidate.status === "accepted" || candidate.status === "edited") && !candidate.addedInitiativeId && (
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); onAddToLibrary(); }}
              className="h-7 text-xs bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add to Library
            </Button>
          )}
          {candidate.addedInitiativeId && (
            <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/25">
              Added: {candidate.addedInitiativeId}
            </Badge>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border bg-muted/10 p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description</h4>
              <p className="text-sm text-foreground leading-relaxed">{candidate.description}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Problem / Value</h4>
              <p className="text-sm text-foreground leading-relaxed">{candidate.problemValue}</p>
            </div>
          </div>

          {candidate.nearestExistingId && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <p className="text-xs text-amber-400">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Near match: <strong>{candidate.nearestExistingLabel}</strong> ({candidate.nearestExistingId})
              </p>
            </div>
          )}

          {candidate.sourceUrls && candidate.sourceUrls.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sources</h4>
              <div className="flex flex-wrap gap-2">
                {(candidate.sourceUrls as string[]).map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {new URL(url).hostname}
                  </a>
                ))}
              </div>
            </div>
          )}

          {candidate.assessmentNote && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Assessment Note</h4>
              <p className="text-sm text-foreground">{candidate.assessmentNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Review Modal ───────────────────────────────────────────────────────────

function ReviewModal({
  candidate,
  onClose,
  onAssess,
  isPending,
}: {
  candidate: any;
  onClose: () => void;
  onAssess: (decision: "accepted" | "rejected" | "edited", note?: string, edits?: any) => void;
  isPending: boolean;
}) {
  const [note, setNote] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editedName, setEditedName] = useState(candidate.name);
  const [editedDescription, setEditedDescription] = useState(candidate.description);
  const [editedScope, setEditedScope] = useState(candidate.suggestedScope);
  const [editedCategory, setEditedCategory] = useState(candidate.suggestedCategory);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Review Candidate</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Assess this initiative candidate for inclusion in the library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Dedup warning */}
          {candidate.dedupStatus !== "unique" && (
            <div className={cn(
              "p-3 rounded-lg border",
              candidate.dedupStatus === "duplicate"
                ? "bg-red-500/5 border-red-500/20"
                : "bg-amber-500/5 border-amber-500/20"
            )}>
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {candidate.dedupStatus === "duplicate" ? "Likely Duplicate" : "Near Overlap Detected"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Nearest existing: <strong>{candidate.nearestExistingLabel}</strong> ({candidate.nearestExistingId})
              </p>
            </div>
          )}

          {/* Candidate details */}
          <div className="space-y-3">
            {editMode ? (
              <>
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Scope</Label>
                    <Select value={editedScope} onValueChange={setEditedScope}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpo">CPO / Strategy</SelectItem>
                        <SelectItem value="reward">Reward Leader</SelectItem>
                        <SelectItem value="both">Cross-cutting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select value={editedCategory} onValueChange={setEditedCategory}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INITIATIVE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {CATEGORY_LABELS[cat]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="text-sm font-medium text-foreground mt-0.5">{candidate.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm text-foreground mt-0.5">{candidate.description}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Problem / Value</Label>
                  <p className="text-sm text-foreground mt-0.5">{candidate.problemValue}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Scope</Label>
                    <p className="text-sm text-foreground mt-0.5">{SCOPE_LABELS[candidate.suggestedScope]}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <p className="text-sm text-foreground mt-0.5">{CATEGORY_LABELS[candidate.suggestedCategory] ?? candidate.suggestedCategory}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sources */}
          {candidate.sourceUrls && candidate.sourceUrls.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Sources</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {(candidate.sourceUrls as string[]).map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {(() => { try { return new URL(url).hostname; } catch { return url.slice(0, 30); } })()}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Assessment note */}
          <div>
            <Label className="text-xs">Assessment Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about your decision..."
              className="mt-1"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditMode(!editMode)}
            className="mr-auto h-8 text-xs"
          >
            <Pencil className="w-3 h-3 mr-1" />
            {editMode ? "Cancel Edit" : "Edit Fields"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onAssess("rejected", note || undefined)}
            disabled={isPending}
            className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <XCircle className="w-3 h-3 mr-1" />
            Reject
          </Button>

          <Button
            size="sm"
            onClick={() => {
              if (editMode) {
                onAssess("edited", note || undefined, {
                  editedName,
                  editedDescription,
                  editedScope,
                  editedCategory,
                });
              } else {
                onAssess("accepted", note || undefined);
              }
            }}
            disabled={isPending}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3 h-3 mr-1" />
            )}
            {editMode ? "Accept with Edits" : "Accept"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add to Library Modal ───────────────────────────────────────────────────

function AddToLibraryModal({
  candidate,
  onClose,
}: {
  candidate: any;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const { tenantMode } = useGate();
  const [formData, setFormData] = useState({
    initiativeId: "",
    label: candidate.name || "",
    description: candidate.description || "",
    category: candidate.suggestedCategory || "talent_acquisition",
    functionScope: candidate.suggestedScope || tenantMode || "cpo",
    phase: 1,
    timeToValueMonths: { min: 3, max: 6 },
    y1CostRange: { low: 50, high: 200 },
    valueFormulaKey: "",
    prerequisites: [] as string[],
    vendorLandscape: [] as string[],
    coDeployments: [] as string[],
    phaseRationale: "",
    caseStudyAnchor: "",
  });
  const [prerequisiteInput, setPrerequisiteInput] = useState("");
  const [vendorInput, setVendorInput] = useState("");
  const [coDeployInput, setCoDeployInput] = useState("");
  const [result, setResult] = useState<any>(null);

  const addMutation = trpc.initiativeDiscovery.addToLibrary.useMutation({
    onSuccess: (data) => {
      setResult(data);
      utils.initiativeDiscovery.listCandidates.invalidate();
      utils.initiativeDiscovery.stats.invalidate();
      toast.success("Initiative added to library!");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!formData.initiativeId) {
      toast.error("Initiative ID is required");
      return;
    }
    if (!formData.valueFormulaKey) {
      toast.error("Value formula key is required");
      return;
    }
    addMutation.mutate({
      candidateId: candidate.id,
      ...formData,
      phase: formData.phase as 1 | 2 | 3,
    });
  };

  const handleCopyJson = () => {
    if (result?.initiativeDefinition) {
      navigator.clipboard.writeText(JSON.stringify(result.initiativeDefinition, null, 2));
      toast.success("Initiative JSON copied to clipboard");
    }
  };

  // If we have a result, show the JSON output
  if (result) {
    return (
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Initiative Added
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Copy the JSON below and add it to <code className="text-xs bg-muted px-1 py-0.5 rounded">shared/initiativeLibrary.ts</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="relative">
              <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-[50vh]">
                {JSON.stringify(result.initiativeDefinition, null, 2)}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyJson}
                className="absolute top-2 right-2 h-7 text-xs gap-1"
              >
                <Copy className="w-3 h-3" />
                Copy
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} className="h-8 text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Add to Initiative Library</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Define the full initiative specification for the canonical library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Initiative ID */}
          <div>
            <Label className="text-xs">Initiative ID <span className="text-red-400">*</span></Label>
            <Input
              value={formData.initiativeId}
              onChange={(e) => setFormData({ ...formData, initiativeId: e.target.value })}
              placeholder="e.g., ta_new_initiative_name"
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">Must be lowercase, start with a letter, use underscores only.</p>
          </div>

          {/* Label */}
          <div>
            <Label className="text-xs">Label <span className="text-red-400">*</span></Label>
            <Input
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs">Description <span className="text-red-400">*</span></Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Category + Scope */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category <span className="text-red-400">*</span></Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INITIATIVE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Function Scope <span className="text-red-400">*</span></Label>
              <Select
                value={formData.functionScope}
                onValueChange={(v) => setFormData({ ...formData, functionScope: v as "cpo" | "reward" | "both" })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpo">CPO / Strategy</SelectItem>
                  <SelectItem value="reward">Reward Leader</SelectItem>
                  <SelectItem value="both">Cross-cutting</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Phase + Value Formula */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Phase <span className="text-red-400">*</span></Label>
              <Select
                value={String(formData.phase)}
                onValueChange={(v) => setFormData({ ...formData, phase: Number(v) })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Phase 1 — Foundation</SelectItem>
                  <SelectItem value="2">Phase 2 — Build</SelectItem>
                  <SelectItem value="3">Phase 3 — Scale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Value Formula Key <span className="text-red-400">*</span></Label>
              <Input
                value={formData.valueFormulaKey}
                onChange={(e) => setFormData({ ...formData, valueFormulaKey: e.target.value })}
                placeholder="e.g., ta_high_volume_hiring"
                className="mt-1 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Must exist in VALUE_FORMULA_REGISTRY.</p>
            </div>
          </div>

          {/* Time to Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Time to Value (min months)</Label>
              <Input
                type="number"
                value={formData.timeToValueMonths.min}
                onChange={(e) => setFormData({
                  ...formData,
                  timeToValueMonths: { ...formData.timeToValueMonths, min: Number(e.target.value) },
                })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Time to Value (max months)</Label>
              <Input
                type="number"
                value={formData.timeToValueMonths.max}
                onChange={(e) => setFormData({
                  ...formData,
                  timeToValueMonths: { ...formData.timeToValueMonths, max: Number(e.target.value) },
                })}
                className="mt-1"
              />
            </div>
          </div>

          {/* Y1 Cost Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Y1 Cost Low (£K)</Label>
              <Input
                type="number"
                value={formData.y1CostRange.low}
                onChange={(e) => setFormData({
                  ...formData,
                  y1CostRange: { ...formData.y1CostRange, low: Number(e.target.value) },
                })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Y1 Cost High (£K)</Label>
              <Input
                type="number"
                value={formData.y1CostRange.high}
                onChange={(e) => setFormData({
                  ...formData,
                  y1CostRange: { ...formData.y1CostRange, high: Number(e.target.value) },
                })}
                className="mt-1"
              />
            </div>
          </div>

          {/* Prerequisites */}
          <div>
            <Label className="text-xs">Prerequisites</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={prerequisiteInput}
                onChange={(e) => setPrerequisiteInput(e.target.value)}
                placeholder="Add a prerequisite..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && prerequisiteInput.trim()) {
                    e.preventDefault();
                    setFormData({ ...formData, prerequisites: [...formData.prerequisites, prerequisiteInput.trim()] });
                    setPrerequisiteInput("");
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (prerequisiteInput.trim()) {
                    setFormData({ ...formData, prerequisites: [...formData.prerequisites, prerequisiteInput.trim()] });
                    setPrerequisiteInput("");
                  }
                }}
                className="h-9"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            {formData.prerequisites.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.prerequisites.map((p, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-destructive/10"
                    onClick={() => setFormData({
                      ...formData,
                      prerequisites: formData.prerequisites.filter((_, idx) => idx !== i),
                    })}
                  >
                    {p} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Vendor Landscape */}
          <div>
            <Label className="text-xs">Vendor Landscape</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={vendorInput}
                onChange={(e) => setVendorInput(e.target.value)}
                placeholder="Add a vendor..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && vendorInput.trim()) {
                    e.preventDefault();
                    setFormData({ ...formData, vendorLandscape: [...formData.vendorLandscape, vendorInput.trim()] });
                    setVendorInput("");
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (vendorInput.trim()) {
                    setFormData({ ...formData, vendorLandscape: [...formData.vendorLandscape, vendorInput.trim()] });
                    setVendorInput("");
                  }
                }}
                className="h-9"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            {formData.vendorLandscape.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.vendorLandscape.map((v, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-destructive/10"
                    onClick={() => setFormData({
                      ...formData,
                      vendorLandscape: formData.vendorLandscape.filter((_, idx) => idx !== i),
                    })}
                  >
                    {v} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Co-deployments */}
          <div>
            <Label className="text-xs">Co-deployments</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={coDeployInput}
                onChange={(e) => setCoDeployInput(e.target.value)}
                placeholder="Initiative ID..."
                className="flex-1 font-mono text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && coDeployInput.trim()) {
                    e.preventDefault();
                    setFormData({ ...formData, coDeployments: [...formData.coDeployments, coDeployInput.trim()] });
                    setCoDeployInput("");
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (coDeployInput.trim()) {
                    setFormData({ ...formData, coDeployments: [...formData.coDeployments, coDeployInput.trim()] });
                    setCoDeployInput("");
                  }
                }}
                className="h-9"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            {formData.coDeployments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.coDeployments.map((c, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs font-mono cursor-pointer hover:bg-destructive/10"
                    onClick={() => setFormData({
                      ...formData,
                      coDeployments: formData.coDeployments.filter((_, idx) => idx !== i),
                    })}
                  >
                    {c} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Phase Rationale */}
          <div>
            <Label className="text-xs">Phase Rationale</Label>
            <Textarea
              value={formData.phaseRationale}
              onChange={(e) => setFormData({ ...formData, phaseRationale: e.target.value })}
              placeholder="One-sentence rationale for why this initiative is in its phase..."
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Case Study Anchor */}
          <div>
            <Label className="text-xs">Case Study Anchor</Label>
            <Textarea
              value={formData.caseStudyAnchor}
              onChange={(e) => setFormData({ ...formData, caseStudyAnchor: e.target.value })}
              placeholder="Anonymised case study reference..."
              className="mt-1"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={addMutation.isPending}
            className="h-8 text-xs bg-primary hover:bg-primary/90 text-white"
          >
            {addMutation.isPending ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Plus className="w-3 h-3 mr-1" />
            )}
            Add to Library
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function InitiativeDiscoveryPage() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  // Guard: must be platform super-user
  if (!authLoading && (!user || !user.isPlatformSuperuser)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground text-sm">This area requires super admin privileges.</p>
        <Button onClick={() => navigate("/dashboard")} variant="outline">Back to Dashboard</Button>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/backoffice")}
          className="h-8 text-xs gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back Office
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Radar className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Initiative Discovery</h1>
          <p className="text-xs text-muted-foreground">
            Discover, review, and add new HR AI initiatives to the canonical library
          </p>
        </div>
      </div>

      {/* Stats */}
      <StatsSection />

      {/* Scan History */}
      <ScanHistorySection />

      {/* Candidate Queue */}
      <CandidateQueueSection />
    </div>
  );
}
