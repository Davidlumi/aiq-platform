/**
 * BetaApplicationsPage
 * Standalone page for reviewing and managing beta programme applications.
 * Accessible to tenant_admin and hr_leader roles (not just super_admin).
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  FlaskConical,
  CheckCircle2,
  Clock,
  XCircle,
  Layers,
  Building2,
  Mail,
  Users,
  Briefcase,
  Globe,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending:    { label: "Pending",    className: "bg-amber-50 text-amber-700 border-amber-200",   icon: Clock },
  approved:   { label: "Approved",   className: "bg-green-50 text-green-700 border-green-200",   icon: CheckCircle2 },
  rejected:   { label: "Rejected",   className: "bg-red-50 text-red-700 border-red-200",         icon: XCircle },
  waitlisted: { label: "Waitlisted", className: "bg-blue-50 text-blue-700 border-blue-200",      icon: Layers },
};

type Application = {
  id: number;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactTitle: string;
  companyName: string;
  sector: string;
  companySize: string;
  hrTeamSize: number;
  useCase: string;
  motivation?: string | null;
  currentAiTools?: string | null;
  linkedinUrl?: string | null;
  status: string;
  notes?: string | null;
  createdAt: number;
};

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", cfg.className)}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

function ApplicationCard({
  app,
  onUpdate,
}: {
  app: Application;
  onUpdate: (id: number, status: string, notes?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(app.status);
  const [notes, setNotes] = useState(app.notes ?? "");

  return (
    <Card className="border border-border bg-card hover:shadow-sm transition-shadow">
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground text-sm">
                {app.contactFirstName} {app.contactLastName}
              </h3>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-xs text-muted-foreground">{app.contactTitle}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground">{app.companyName}</span>
              <span className="text-xs text-muted-foreground">· {app.sector}</span>
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                {app.hrTeamSize} HR professionals
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Globe className="w-3 h-3" />
                {app.companySize} employees
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="w-3 h-3" />
                {app.contactEmail}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusBadge status={app.status} />
            <span className="text-xs text-muted-foreground">{formatDate(app.createdAt)}</span>
          </div>
        </div>

        {/* Use case preview */}
        <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> Use Case
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {expanded ? app.useCase : `${app.useCase.substring(0, 180)}${app.useCase.length > 180 ? "…" : ""}`}
          </p>
          {app.useCase.length > 180 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline mt-1"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 space-y-3">
            {app.motivation && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">Motivation</p>
                <p className="text-sm text-foreground leading-relaxed">{app.motivation}</p>
              </div>
            )}
            {app.currentAiTools && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">Current AI Tools</p>
                <p className="text-sm text-foreground">{app.currentAiTools}</p>
              </div>
            )}
            {app.linkedinUrl && (
              <a
                href={app.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                LinkedIn Profile
              </a>
            )}
            {app.notes && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs font-medium text-primary mb-1">Internal Notes</p>
                <p className="text-sm text-foreground">{app.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? "Collapse" : "View full application"}
          </button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditOpen(true)}
            className="text-xs h-7"
          >
            Update Status
          </Button>
        </div>
      </CardContent>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Application — {app.companyName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Internal Notes</Label>
              <Textarea
                className="mt-1.5 text-sm"
                rows={4}
                placeholder="Add notes about this application…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                onUpdate(app.id, newStatus, notes || undefined);
                setEditOpen(false);
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function BetaApplicationsPage() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: stats } = trpc.waitlist.stats.useQuery();
  const { data: applications, isLoading, refetch } = trpc.waitlist.list.useQuery({
    status: statusFilter as any,
    limit: 100,
    offset: 0,
  });

  const updateMutation = trpc.waitlist.update.useMutation({
    onSuccess: () => {
      utils.waitlist.list.invalidate();
      utils.waitlist.stats.invalidate();
      toast.success("Application updated", { description: "Status and notes saved." });
    },
    onError: (err) => {
      toast.error("Update failed", { description: err.message });
    },
  });

  function handleUpdate(id: number, status: string, notes?: string) {
    updateMutation.mutate({ id, status: status as any, notes });
  }

  const statCards = [
    { label: "Total",      value: (stats as any)?.total     ?? 0, color: "text-foreground" },
    { label: "Pending",    value: (stats as any)?.pending    ?? 0, color: "text-amber-600" },
    { label: "Approved",   value: (stats as any)?.approved   ?? 0, color: "text-green-600" },
    { label: "Waitlisted", value: (stats as any)?.waitlisted ?? 0, color: "text-blue-600" },
    { label: "Rejected",   value: (stats as any)?.rejected   ?? 0, color: "text-red-500" },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Beta Applications</h1>
          <p className="text-xs text-muted-foreground">Companies that have applied for the AiQ beta programme</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => refetch()}
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="border border-border">
            <CardContent className="p-4 text-center">
              <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filter by status:</span>
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "approved", "waitlisted", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              )}
            >
              {s === "all" ? "All" : STATUS_CONFIG[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Applications list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : !applications?.length ? (
        <Card className="border border-dashed border-border">
          <CardContent className="p-12 text-center">
            <FlaskConical className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {statusFilter === "all"
                ? "No beta applications yet."
                : `No applications with status "${STATUS_CONFIG[statusFilter]?.label ?? statusFilter}".`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(applications as Application[]).map((app) => (
            <ApplicationCard key={app.id} app={app} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
