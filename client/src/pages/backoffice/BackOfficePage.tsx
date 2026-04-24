/**
 * Back-Office Admin Panel — super_admin only
 * Accessible at /backoffice
 * Tabs: Dashboard | Organisations | Users
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Building2,
  Users,
  LayoutDashboard,
  Search,
  Plus,
  Pencil,
  KeyRound,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  Globe,
  UserCheck,
  Activity,
  AlertCircle,
  X,
  Check,
  Eye,
  EyeOff,
  FlaskConical,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  ExternalLink,
  Loader2,
  MessageSquare,
  ChevronUp,
  Brain,
  Timer,
  BarChart3,
  Filter,
  Shield,
  AlertTriangle,
  Sliders,
  Flag,
  ListChecks,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "dashboard" | "orgs" | "users" | "beta" | "reasoning" | "gaming" | "llm_queue" | "session_flags";

// ─── Beta Applications Tab ────────────────────────────────────────────────────
const APPLICATION_STATUSES = ["pending", "approved", "rejected", "waitlisted"] as const;
type ApplicationStatus = typeof APPLICATION_STATUSES[number];

function AppStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    pending:    { label: "Pending",    className: "bg-amber-50 text-amber-700 border-amber-200",       icon: Clock },
    approved:   { label: "Approved",   className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    rejected:   { label: "Rejected",   className: "bg-red-50 text-red-700 border-red-200",             icon: XCircle },
    waitlisted: { label: "Waitlisted", className: "bg-blue-50 text-blue-700 border-blue-200",          icon: Clock },
  };
  const c = config[status] ?? { label: status, className: "bg-gray-100 text-gray-600 border-gray-200", icon: Clock };
  const Icon = c.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border", c.className)}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

function BetaApplicationsTab() {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState<{ id: number; notes: string } | null>(null);
  const utils = trpc.useUtils();

  const { data: applications, isLoading } = trpc.waitlist.list.useQuery({
    status: statusFilter,
    limit: 200,
    offset: 0,
  });

  const { data: stats } = trpc.waitlist.stats.useQuery();

  const updateMutation = trpc.waitlist.update.useMutation({
    onSuccess: () => {
      utils.waitlist.list.invalidate();
      utils.waitlist.stats.invalidate();
      toast.success("Application updated");
      setEditNotes(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleStatusChange = (id: number, status: ApplicationStatus) => {
    updateMutation.mutate({ id, status });
  };

  const handleSaveNotes = (id: number) => {
    if (!editNotes) return;
    updateMutation.mutate({ id, notes: editNotes.notes });
  };

  const statCards = [
    { label: "Total",      value: (stats as any)?.total ?? 0,      color: "text-slate-700" },
    { label: "Pending",    value: (stats as any)?.pending ?? 0,    color: "text-amber-600" },
    { label: "Approved",   value: (stats as any)?.approved ?? 0,   color: "text-emerald-600" },
    { label: "Waitlisted", value: (stats as any)?.waitlisted ?? 0, color: "text-blue-600" },
    { label: "Rejected",   value: (stats as any)?.rejected ?? 0,   color: "text-red-600" },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-4 text-center">
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">Filter:</span>
        {(["all", ...APPLICATION_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-full border transition-colors",
              statusFilter === s
                ? "bg-[#10B981] text-white border-[#10B981]"
                : "bg-background text-muted-foreground border-border hover:border-[#10B981] hover:text-[#10B981]"
            )}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !applications?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No applications{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""} yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {applications.map((app) => (
            <div key={app.id} className="border border-border rounded-xl overflow-hidden">
              {/* Row */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground text-sm">
                      {app.contactFirstName} {app.contactLastName}
                    </span>
                    <span className="text-muted-foreground text-xs">&middot;</span>
                    <span className="text-muted-foreground text-sm">{app.companyName}</span>
                    <AppStatusBadge status={app.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>{app.contactEmail}</span>
                    <span>&middot;</span>
                    <span>{app.sector}</span>
                    <span>&middot;</span>
                    <span>{app.hrTeamSize} HR staff</span>
                    <span>&middot;</span>
                    <span>{new Date(app.createdAt * 1000).toLocaleDateString()}</span>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0",
                    expandedId === app.id && "rotate-180"
                  )}
                />
              </div>

              {/* Expanded detail */}
              {expandedId === app.id && (
                <div className="border-t border-border bg-muted/20 p-5 space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    {/* Contact */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Name:</span> {app.contactFirstName} {app.contactLastName}</p>
                        <p><span className="text-muted-foreground">Title:</span> {app.contactTitle}</p>
                        <p><span className="text-muted-foreground">Email:</span>{" "}
                          <a href={`mailto:${app.contactEmail}`} className="text-[#10B981] hover:underline">{app.contactEmail}</a>
                        </p>
                        {app.linkedinUrl && (
                          <p>
                            <span className="text-muted-foreground">LinkedIn:</span>{" "}
                            <a href={app.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-[#10B981] hover:underline inline-flex items-center gap-1">
                              View profile <ExternalLink className="w-3 h-3" />
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Organisation */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Organisation</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Company:</span> {app.companyName}</p>
                        <p><span className="text-muted-foreground">Sector:</span> {app.sector}</p>
                        <p><span className="text-muted-foreground">Size:</span> {app.companySize} employees</p>
                        <p><span className="text-muted-foreground">HR team:</span> <strong>{app.hrTeamSize}</strong> professionals</p>
                      </div>
                    </div>
                  </div>

                  {/* Use case */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Current AI usage</h4>
                    <p className="text-sm text-foreground leading-relaxed">{app.useCase}</p>
                    {app.currentAiTools && (
                      <p className="text-sm text-muted-foreground mt-1"><span className="font-medium">Tools:</span> {app.currentAiTools}</p>
                    )}
                  </div>

                  {/* Motivation */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Motivation</h4>
                    <p className="text-sm text-foreground leading-relaxed">{app.motivation}</p>
                  </div>

                  {/* Notes */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Admin notes</h4>
                    {editNotes?.id === app.id ? (
                      <div className="space-y-2">
                        <textarea
                          className="w-full border border-border rounded-lg p-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
                          rows={3}
                          value={editNotes.notes}
                          onChange={(e) => setEditNotes({ id: app.id, notes: e.target.value })}
                          placeholder="Add internal notes..."
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveNotes(app.id)}
                            disabled={updateMutation.isPending}
                            className="bg-[#10B981] hover:bg-[#2d3fd9] text-white h-8 text-xs"
                          >
                            {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save notes"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditNotes(null)} className="h-8 text-xs">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => setEditNotes({ id: app.id, notes: app.notes ?? "" })}
                      >
                        {app.notes ? app.notes : <span className="italic">No notes &mdash; click to add</span>}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
                    <span className="text-xs text-muted-foreground mr-1">Change status:</span>
                    {APPLICATION_STATUSES.filter((s) => s !== app.status).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant="outline"
                        disabled={updateMutation.isPending}
                        onClick={() => handleStatusChange(app.id, s)}
                        className={cn(
                          "h-7 text-xs border",
                          s === "approved"   && "border-emerald-300 text-emerald-700 hover:bg-emerald-50",
                          s === "rejected"   && "border-red-300 text-red-700 hover:bg-red-50",
                          s === "waitlisted" && "border-blue-300 text-blue-700 hover:bg-blue-50",
                          s === "pending"    && "border-amber-300 text-amber-700 hover:bg-amber-50",
                        )}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Status badge helpers ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    active:      { label: "Active",      className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    trial:       { label: "Trial",       className: "bg-blue-50 text-blue-700 border-blue-200" },
    suspended:   { label: "Suspended",   className: "bg-amber-50 text-amber-700 border-amber-200" },
    archived:    { label: "Archived",    className: "bg-gray-100 text-gray-500 border-gray-200" },
    pending:     { label: "Pending",     className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    deactivated: { label: "Deactivated", className: "bg-red-50 text-red-700 border-red-200" },
  };
  const c = config[status] ?? { label: status, className: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", c.className)}>
      {c.label}
    </span>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab() {
  const { data: stats, isLoading } = trpc.backoffice.stats.useQuery();

  const statCards = [
    { label: "Total Organisations", value: stats?.totalOrgs ?? 0, sub: `${stats?.activeOrgs ?? 0} active, ${stats?.trialOrgs ?? 0} trial`, icon: Building2, color: "#10B981" },
    { label: "Total Users", value: stats?.totalUsers ?? 0, sub: `${stats?.activeUsers ?? 0} active`, icon: Users, color: "#10B981" },
    { label: "New Users (30d)", value: stats?.newUsersLast30Days ?? 0, sub: "registered in last 30 days", icon: TrendingUp, color: "#F59E0B" },
    { label: "Platform Health", value: "OK", sub: "all systems operational", icon: Activity, color: "#6366F1" },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${s.color}15` }}
                >
                  <s.icon className="w-4.5 h-4.5" style={{ color: s.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground font-sora">{s.value}</p>
              <p className="text-xs font-medium text-foreground mt-0.5">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Create Organisation", desc: "Set up a new client org", icon: Building2, tab: "orgs" },
            { label: "Add User", desc: "Create a user in any org", icon: Users, tab: "users" },
            { label: "View All Users", desc: "Browse and manage users", icon: UserCheck, tab: "users" },
          ].map((a) => (
            <button
              key={a.label}
              className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-[#10B981]/40 hover:bg-[#10B981]/4 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/8 flex items-center justify-center shrink-0">
                <a.icon className="w-4 h-4 text-[#10B981]" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-[#10B981] transition-colors">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Create Org Dialog ────────────────────────────────────────────────────────
function CreateOrgDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState<"active" | "trial">("trial");

  const createMutation = trpc.backoffice.createOrg.useMutation({
    onSuccess: () => {
      toast.success("Organisation created");
      onCreated();
      onClose();
      setName(""); setSlug(""); setDomain(""); setStatus("trial");
    },
    onError: (e) => toast.error(e.message),
  });

  // Auto-generate slug from name
  useEffect(() => {
    setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }, [name]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-sora">Create Organisation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Organisation Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Corporation" />
          </div>
          <div className="space-y-1.5">
            <Label>Org Code (slug) *</Label>
            <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="e.g. acme" />
            <p className="text-xs text-muted-foreground">Used for login. Lowercase letters, numbers, hyphens only.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Primary Domain</Label>
            <Input value={domain} onChange={e => setDomain(e.target.value)} placeholder="e.g. acme.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "active" | "trial")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate({ name, slug, primaryDomain: domain || undefined, status })}
            disabled={!name || !slug || createMutation.isPending}
            className="bg-[#10B981] hover:bg-[#10B981]/90 text-white"
          >
            {createMutation.isPending ? "Creating…" : "Create Organisation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Org Dialog ──────────────────────────────────────────────────────────
function EditOrgDialog({ org, onClose, onSaved }: { org: any; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(org.name ?? "");
  const [domain, setDomain] = useState(org.primaryDomain ?? "");
  const [status, setStatus] = useState(org.status ?? "active");

  const updateMutation = trpc.backoffice.updateOrg.useMutation({
    onSuccess: () => { toast.success("Organisation updated"); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-sora">Edit Organisation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Organisation Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Primary Domain</Label>
            <Input value={domain} onChange={e => setDomain(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => updateMutation.mutate({ tenantId: org.id, name, primaryDomain: domain || undefined, status })}
            disabled={updateMutation.isPending}
            className="bg-[#10B981] hover:bg-[#10B981]/90 text-white"
          >
            {updateMutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Orgs Tab ─────────────────────────────────────────────────────────────────
function OrgsTab() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editOrg, setEditOrg] = useState<any>(null);
  const [deleteOrgTarget, setDeleteOrgTarget] = useState<any>(null);
  const utils = trpc.useUtils();

  const { data: orgs, isLoading, refetch } = trpc.backoffice.listOrgs.useQuery({ search: search || undefined });

  const deleteCompanyMutation = trpc.backoffice.deleteCompany.useMutation({
    onSuccess: () => {
      toast.success("Organisation permanently deleted");
      setDeleteOrgTarget(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search organisations…"
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          New Organisation
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Organisation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Org Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Domain</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Users</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(orgs ?? []).map((org) => (
                <tr key={org.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{org.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{org.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{org.primaryDomain ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{org.userCount}</td>
                  <td className="px-4 py-3"><StatusBadge status={org.status ?? "active"} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditOrg(org)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        title="Edit organisation"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteOrgTarget(org)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        title="Delete organisation permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(orgs ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No organisations found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <CreateOrgDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={refetch} />
      {editOrg && <EditOrgDialog org={editOrg} onClose={() => setEditOrg(null)} onSaved={refetch} />}

      {deleteOrgTarget && (
        <AlertDialog open onOpenChange={(open) => { if (!open) setDeleteOrgTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-sora flex items-center gap-2 text-destructive">
                <Trash2 className="w-4 h-4" />
                Delete Organisation
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>You are about to permanently delete <strong className="text-foreground">{deleteOrgTarget.name}</strong> and all its data.</p>
                  <p className="text-destructive font-medium">This will irreversibly remove all users, assessment sessions, scores, and intelligence profiles in this organisation.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteCompanyMutation.mutate({ tenantId: deleteOrgTarget.id })}
                disabled={deleteCompanyMutation.isPending}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {deleteCompanyMutation.isPending ? "Deleting…" : "Delete Permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ─── Create User Dialog ───────────────────────────────────────────────────────
function CreateUserDialog({ open, onClose, onCreated, orgs }: { open: boolean; onClose: () => void; onCreated: () => void; orgs: any[] }) {
  const [tenantId, setTenantId] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [roleKey, setRoleKey] = useState("learner");
  const [jobFunction, setJobFunction] = useState("");

  const { data: roles } = trpc.backoffice.listRoles.useQuery();

  const createMutation = trpc.backoffice.createUser.useMutation({
    onSuccess: () => {
      toast.success("User created successfully");
      onCreated();
      onClose();
      setEmail(""); setFirstName(""); setLastName(""); setPassword(""); setTenantId(""); setRoleKey("learner"); setJobFunction("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-sora">Create User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Organisation *</Label>
            <select
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="" disabled>Select organisation…</option>
              {orgs.map(o => (
                <option key={o.id} value={o.id}>{o.name} ({o.slug})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Password *</Label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Role *</Label>
            <Select value={roleKey} onValueChange={setRoleKey}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(roles ?? []).filter(r => r.key !== "super_admin").map(r => (
                  <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Job Function <span className="text-muted-foreground">(optional)</span></Label>
            <Input value={jobFunction} onChange={e => setJobFunction(e.target.value)} placeholder="e.g. HR Business Partner" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate({ tenantId, email, firstName, lastName, password, roleKey, jobFunction: jobFunction || undefined })}
            disabled={!tenantId || !email || !firstName || !lastName || !password || createMutation.isPending}
            className="bg-[#10B981] hover:bg-[#10B981]/90 text-white"
          >
            {createMutation.isPending ? "Creating…" : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reset Password Dialog ────────────────────────────────────────────────────
function ResetPasswordDialog({ user, onClose }: { user: any; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const resetMutation = trpc.backoffice.resetPassword.useMutation({
    onSuccess: () => { toast.success(`Password reset for ${user.email}`); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-sora">Reset Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">Setting new password for <strong>{user.email}</strong></p>
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => resetMutation.mutate({ userId: user.id, newPassword: password })}
            disabled={password.length < 8 || resetMutation.isPending}
            className="bg-[#10B981] hover:bg-[#10B981]/90 text-white"
          >
            {resetMutation.isPending ? "Resetting…" : "Reset Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit User Dialog ─────────────────────────────────────────────────────────
function EditUserDialog({ user, onClose, onSaved, orgs }: { user: any; onClose: () => void; onSaved: () => void; orgs: any[] }) {
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [status, setStatus] = useState(user.status ?? "active");
  const [jobFunction, setJobFunction] = useState(user.jobFunction ?? "");
  const [roleKey, setRoleKey] = useState(user.roles?.[0] ?? "learner");

  const { data: roles } = trpc.backoffice.listRoles.useQuery();

  const updateMutation = trpc.backoffice.updateUser.useMutation({
    onSuccess: () => { toast.success("User updated"); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const assignRoleMutation = trpc.backoffice.assignRole.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const handleSave = async () => {
    await updateMutation.mutateAsync({ userId: user.id, firstName, lastName, status, jobFunction: jobFunction || undefined });
    if (roleKey !== user.roles?.[0]) {
      await assignRoleMutation.mutateAsync({ userId: user.id, tenantId: user.tenantId, roleKey, replace: true });
    }
    onSaved();
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-sora">Edit User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 font-mono">{user.email}</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={roleKey} onValueChange={setRoleKey}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(roles ?? []).filter(r => r.key !== "super_admin").map(r => (
                  <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Job Function</Label>
            <Input value={jobFunction} onChange={e => setJobFunction(e.target.value)} placeholder="e.g. HR Business Partner" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || assignRoleMutation.isPending}
            className="bg-[#10B981] hover:bg-[#10B981]/90 text-white"
          >
            {updateMutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab({ orgs }: { orgs: any[] }) {
  const [search, setSearch] = useState("");
  const [filterTenant, setFilterTenant] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [resetUser, setResetUser] = useState<any>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<any>(null);

  const deleteUserMutation = trpc.backoffice.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("User permanently deleted");
      setDeleteUserTarget(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const { data, isLoading, refetch } = trpc.backoffice.listUsers.useQuery({
    tenantId: filterTenant !== "all" ? filterTenant : undefined,
    search: search || undefined,
  });

  const users = data?.users ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users…"
            className="pl-9"
          />
        </div>
        <Select value={filterTenant} onValueChange={setFilterTenant}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All organisations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organisations</SelectItem>
            {orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          New User
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Organisation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Sign In</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate">{u.tenantName}</td>
                  <td className="px-4 py-3">
                    {u.roles.length > 0 ? (
                      <span className="text-xs font-medium text-[#10B981] bg-[#10B981]/8 px-2 py-0.5 rounded-full">
                        {u.roles[0].replace(/_/g, " ")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditUser(u)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        title="Edit user"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setResetUser(u)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        title="Reset password"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteUserTarget(u)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        title="Delete user permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {(data?.total ?? 0) > (data?.pageSize ?? 50) && (
            <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
              Showing {users.length} of {data?.total} users
            </div>
          )}
        </div>
      )}

      <CreateUserDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={refetch} orgs={orgs} />
      {editUser && <EditUserDialog user={editUser} onClose={() => setEditUser(null)} onSaved={refetch} orgs={orgs} />}
      {resetUser && <ResetPasswordDialog user={resetUser} onClose={() => setResetUser(null)} />}

      {deleteUserTarget && (
        <AlertDialog open onOpenChange={(open) => { if (!open) setDeleteUserTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-sora flex items-center gap-2 text-destructive">
                <Trash2 className="w-4 h-4" />
                Delete User
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>You are about to permanently delete <strong className="text-foreground">{deleteUserTarget.firstName} {deleteUserTarget.lastName}</strong> ({deleteUserTarget.email}).</p>
                  <p className="text-destructive font-medium">All assessment sessions, scores, learning plans, and intelligence profiles for this user will be permanently removed. This cannot be undone.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteUserMutation.mutate({ userId: deleteUserTarget.id })}
                disabled={deleteUserMutation.isPending}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {deleteUserMutation.isPending ? "Deleting…" : "Delete Permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ─── Reasoning Review Tab ────────────────────────────────────────────────────
const CAPABILITY_LABELS: Record<string, string> = {
  ai_interaction:      "AI Interaction",
  ai_output_evaluation:"AI Output Evaluation",
  ai_ethics_trust:     "AI Ethics & Trust",
  ai_change_leadership:"AI Change Leadership",
  workflow_integration: "Workflow Integration",
  data_interpretation: "Data & Insight",
  unknown:            "Unknown",
};

const OUTCOME_CONFIG: Record<string, { label: string; className: string }> = {
  strong:      { label: "Strong",      className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  adequate:    { label: "Adequate",    className: "bg-blue-50 text-blue-700 border-blue-200" },
  partial:     { label: "Partial",     className: "bg-amber-50 text-amber-700 border-amber-200" },
  failure:     { label: "Failure",     className: "bg-red-50 text-red-700 border-red-200" },
  abstain:     { label: "Abstain",     className: "bg-gray-100 text-gray-600 border-gray-200" },
  unknown:     { label: "Unknown",     className: "bg-gray-100 text-gray-500 border-gray-200" },
};

const INTERACTION_LABELS: Record<string, string> = {
  prompt_refinement:      "Prompt Refinement",
  pressure_test:          "Pressure Test",
  scenario_critique:     "Scenario Critique",
  ethical_dilemma:        "Ethical Dilemma",
  tool_selection:        "Tool Selection",
  process_design:        "Process Design",
  data_interpretation:   "Data Interpretation",
  ethical_reasoning:     "Ethical Reasoning",
  output_validation:     "Output Validation",
  workflow_optimisation: "Workflow Optimisation",
  knowledge_check:       "Knowledge Check",
};

function ReasoningTab() {
  const [capabilityFilter, setCapabilityFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data, isLoading } = trpc.backoffice.listReasoningAnswers.useQuery({
    capability: capabilityFilter === "all" ? undefined : capabilityFilter,
    page,
    pageSize: PAGE_SIZE,
  });

  const records = data?.records ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Filtered client-side by outcome (to avoid extra round-trips)
  const filtered = outcomeFilter === "all"
    ? records
    : records.filter(r => r.outcomeClass === outcomeFilter);

  const capabilities = Object.keys(CAPABILITY_LABELS);
  const outcomes = ["strong", "adequate", "partial", "failure", "abstain"];

  function formatMs(ms: number) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function confidenceLabel(score: number | null) {
    if (score === null) return "—";
    const pct = Math.round(score * 100);
    if (pct <= 25) return "Guessing";
    if (pct <= 50) return "Unsure";
    if (pct <= 75) return "Fairly sure";
    return "Certain";
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground font-sora">Reasoning Review</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total} answer{total !== 1 ? "s" : ""} with captured reasoning text
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {/* Capability filter */}
          <Select value={capabilityFilter} onValueChange={(v) => { setCapabilityFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-48">
              <SelectValue placeholder="All capabilities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All capabilities</SelectItem>
              {capabilities.filter(c => c !== "unknown").map(c => (
                <SelectItem key={c} value={c}>{CAPABILITY_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Outcome filter */}
          <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue placeholder="All outcomes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outcomes</SelectItem>
              {outcomes.map(o => (
                <SelectItem key={o} value={o}>{OUTCOME_CONFIG[o]?.label ?? o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No reasoning captured yet</p>
          <p className="text-xs mt-1">Reasoning text is collected for evaluation, ethics, critique, and change leadership items during assessments.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const isExpanded = expandedId === r.answerId;
            const outcomeConf = OUTCOME_CONFIG[r.outcomeClass] ?? OUTCOME_CONFIG.unknown;
            const capLabel = CAPABILITY_LABELS[r.capability] ?? r.capability;
            const interLabel = INTERACTION_LABELS[r.interactionType] ?? r.interactionType;
            return (
              <div key={r.answerId} className="border border-border rounded-xl overflow-hidden">
                {/* Summary row */}
                <div
                  className="flex items-start gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : r.answerId)}
                >
                  {/* Left: user + org */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">{r.userName}</span>
                      <span className="text-muted-foreground text-xs">&middot;</span>
                      <span className="text-xs text-muted-foreground">{r.tenantName}</span>
                      <span className={cn("inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border", outcomeConf.className)}>
                        {outcomeConf.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        {capLabel}
                      </span>
                      <span>&middot;</span>
                      <span>{interLabel}</span>
                      <span>&middot;</span>
                      <span className="flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {formatMs(r.timeToAnswerMs)}
                      </span>
                      <span>&middot;</span>
                      <span>{new Date(r.submittedAt).toLocaleDateString()}</span>
                    </div>
                    {/* Reasoning preview */}
                    {!isExpanded && r.reasoningText && (
                      <p className="mt-2 text-xs text-muted-foreground italic line-clamp-2">
                        &ldquo;{r.reasoningText}&rdquo;
                      </p>
                    )}
                  </div>
                  {/* Right: confidence + chevron */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-medium text-foreground">{confidenceLabel(r.confidenceScore)}</p>
                      <p className="text-xs text-muted-foreground">confidence</p>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 p-5 space-y-5">
                    {/* Scenario */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Scenario</h4>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{r.itemPrompt}</p>
                    </div>

                    {/* Participant's reasoning */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Participant Reasoning</h4>
                      <div className="bg-background rounded-lg border border-border p-4">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{r.reasoningText}</p>
                      </div>
                    </div>

                    {/* Metadata grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-background rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground mb-1">Selected option</p>
                        <p className="text-sm font-medium text-foreground">{String(r.selectedValue ?? "—").toUpperCase()}</p>
                      </div>
                      <div className="bg-background rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground mb-1">Outcome</p>
                        <p className={cn("text-sm font-medium", outcomeConf.className.split(" ")[1])}>{outcomeConf.label}</p>
                      </div>
                      <div className="bg-background rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                        <p className="text-sm font-medium text-foreground">{confidenceLabel(r.confidenceScore)}</p>
                      </div>
                      <div className="bg-background rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground mb-1">Time to answer</p>
                        <p className="text-sm font-medium text-foreground">{formatMs(r.timeToAnswerMs)}</p>
                      </div>
                    </div>

                    {/* Signal deltas */}
                    {r.signalDeltas && Object.keys(r.signalDeltas).length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                          <BarChart3 className="w-3.5 h-3.5" />
                          Signal Deltas
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(r.signalDeltas).map(([signal, delta]) => (
                            <span
                              key={signal}
                              className={cn(
                                "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border",
                                delta > 0
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              )}
                            >
                              {signal.replace(/_/g, " ")}: {delta > 0 ? "+" : ""}{delta.toFixed(2)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Session link */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Session:</span> {r.sessionId.slice(0, 16)}…
                        {" "}&middot;{" "}
                        <span className={cn(
                          "font-medium",
                          r.sessionState === "completed" ? "text-emerald-600" : "text-amber-600"
                        )}>
                          {r.sessionState}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.userEmail}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WS2.2: Anti-Gaming Thresholds Tab ──────────────────────────────────────
function AntiGamingTab() {
  const utils = trpc.useUtils();
  const { data: thresholds, isLoading } = trpc.backoffice.listAntiGamingThresholds.useQuery();
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const upsert = trpc.backoffice.upsertAntiGamingThreshold.useMutation({
    onSuccess: () => { utils.backoffice.listAntiGamingThresholds.invalidate(); setEditing(null); toast.success("Threshold saved"); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.backoffice.deleteAntiGamingThreshold.useMutation({
    onSuccess: () => { utils.backoffice.listAntiGamingThresholds.invalidate(); toast.success("Threshold deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const FIELDS = [
    { key: "alwaysSafeChoiceRate",   label: "Always-safe choice rate" },
    { key: "alwaysEscalateRate",     label: "Always-escalate rate" },
    { key: "alwaysCautiousRate",     label: "Always-cautious rate" },
    { key: "optionPositionBiasRate", label: "Option-position bias rate" },
    { key: "strongAnswerMaxRate",    label: "Strong-answer max rate" },
    { key: "outcomeConditionalRate", label: "Outcome-conditional rate" },
  ] as const;

  const openEdit = (row: any) => {
    setEditing(row);
    const f: Record<string, string> = { roleKey: row.roleKey };
    FIELDS.forEach(({ key }) => { f[key] = String(row[key] ?? ""); });
    setForm(f);
  };
  const openNew = () => {
    setEditing({ id: null });
    const f: Record<string, string> = { roleKey: "" };
    FIELDS.forEach(({ key }) => { f[key] = "0.70"; });
    setForm(f);
  };
  const handleSave = () => {
    upsert.mutate({
      roleKey: form.roleKey,
      alwaysSafeChoiceRate: parseFloat(form.alwaysSafeChoiceRate),
      alwaysEscalateRate: parseFloat(form.alwaysEscalateRate),
      alwaysCautiousRate: parseFloat(form.alwaysCautiousRate),
      optionPositionBiasRate: parseFloat(form.optionPositionBiasRate),
      strongAnswerMaxRate: parseFloat(form.strongAnswerMaxRate),
      outcomeConditionalRate: parseFloat(form.outcomeConditionalRate),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Anti-Gaming Thresholds</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Per-role detection thresholds. Rows override the engine defaults for that role key.</p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add override
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !thresholds?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <Sliders className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No role-specific overrides. Engine defaults apply to all roles.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Role key</th>
                {FIELDS.map(f => <th key={f.key} className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">{f.label}</th>)}
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {thresholds.map((row: any) => (
                <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{row.roleKey}</td>
                  {FIELDS.map(f => (
                    <td key={f.key} className="px-3 py-3 text-right tabular-nums text-xs">
                      {(parseFloat(row[f.key]) * 100).toFixed(0)}%
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => del.mutate({ id: row.id })}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Create Dialog */}
      {editing !== null && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing.id ? "Edit threshold" : "Add role override"}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Role key</Label>
                <Input className="mt-1" value={form.roleKey} onChange={e => setForm(p => ({ ...p, roleKey: e.target.value }))} placeholder="e.g. hr_business_partner" disabled={!!editing.id} />
              </div>
              {FIELDS.map(f => (
                <div key={f.key}>
                  <Label className="text-xs">{f.label} (0-1)</Label>
                  <Input className="mt-1" type="number" step="0.01" min="0" max="1" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={upsert.isPending}>{upsert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── WS3: LLM Item Review Queue Tab ──────────────────────────────────────────
function LlmReviewQueueTab() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "auto_approved" | "all">("pending");
  const { data: items, isLoading } = trpc.backoffice.listLlmReviewQueue.useQuery({ status: statusFilter, limit: 100 });
  const updateStatus = trpc.backoffice.updateLlmReviewStatus.useMutation({
    onSuccess: () => { utils.backoffice.listLlmReviewQueue.invalidate(); toast.success("Status updated"); },
    onError: (e) => toast.error(e.message),
  });
  const STATUSES = ["pending", "approved", "rejected", "auto_approved", "all"] as const;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">LLM Item Review Queue</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Items flagged by the LLM quality gate for human review.</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn("px-3 py-1 text-xs font-medium rounded-full border transition-colors",
              statusFilter === s ? "bg-[#10B981] text-white border-[#10B981]" : "bg-background text-muted-foreground border-border hover:border-[#10B981] hover:text-[#10B981]"
            )}>
            {s === "all" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !items?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No items in queue{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => (
            <div key={item.id} className="border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-muted-foreground">{item.itemId}</p>
                  <p className="text-sm text-foreground mt-1 leading-relaxed">{item.failureReason}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => updateStatus.mutate({ id: item.id, status: "approved" })}>
                        <Check className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => updateStatus.mutate({ id: item.id, status: "rejected" })}>
                        <X className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </>
                  )}
                  {item.status !== "pending" && (
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border",
                      item.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      item.status === "rejected" ? "bg-red-50 text-red-700 border-red-200" :
                      "bg-blue-50 text-blue-700 border-blue-200"
                    )}>{item.status.replace("_", " ")}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── WS4.3: Session Review Flags Tab ─────────────────────────────────────────
function SessionFlagsTab() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<"pending" | "reviewed" | "all">("pending");
  const { data: flags, isLoading } = trpc.backoffice.listSessionReviewFlags.useQuery({ status: statusFilter, limit: 100 });
  const resolve = trpc.backoffice.resolveSessionReviewFlag.useMutation({
    onSuccess: () => { utils.backoffice.listSessionReviewFlags.invalidate(); toast.success("Flag resolved"); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Session Review Flags</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Sessions flagged by participants or the anti-gaming engine for human review.</p>
      </div>
      <div className="flex items-center gap-2">
        {(["pending", "reviewed", "all"] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn("px-3 py-1 text-xs font-medium rounded-full border transition-colors",
              statusFilter === s ? "bg-[#10B981] text-white border-[#10B981]" : "bg-background text-muted-foreground border-border hover:border-[#10B981] hover:text-[#10B981]"
            )}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !flags?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <Flag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No flagged sessions{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {flags.map((flag: any) => (
            <div key={flag.id} className="border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-muted-foreground">Session: {flag.sessionId}</p>
                  <p className="text-sm text-foreground mt-1">{flag.flagReason ?? flag.reason ?? "No reason provided"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(flag.createdAt).toLocaleString()}</p>
                </div>
                {flag.status === "pending" && (
                  <Button size="sm" variant="outline" className="gap-1 flex-shrink-0"
                    onClick={() => resolve.mutate({ id: flag.id })}>
                    <Check className="w-3.5 h-3.5" /> Resolve
                  </Button>
                )}
                {flag.status !== "pending" && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">Reviewed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Back-Office Page ────────────────────────────────────────────────────
export default function BackOfficePage() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("dashboard");

  const { data: orgs } = trpc.backoffice.listOrgs.useQuery();

  // Guard: must be super_admin
  if (!authLoading && (!user || !user.roles?.includes("super_admin"))) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-bold text-foreground font-sora">Access Denied</h2>
        <p className="text-muted-foreground text-sm">This area requires super admin privileges.</p>
        <Button onClick={() => navigate("/dashboard")} variant="outline">Back to Dashboard</Button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Dashboard",    icon: LayoutDashboard },
    { id: "orgs",      label: "Organisations", icon: Building2 },
    { id: "users",     label: "Users",         icon: Users },
    { id: "beta",      label: "Beta Applications", icon: FlaskConical },
    { id: "reasoning",     label: "Reasoning Review",   icon: MessageSquare },
    { id: "gaming",        label: "Anti-Gaming",         icon: Shield },
    { id: "llm_queue",    label: "LLM Review Queue",    icon: ListChecks },
    { id: "session_flags", label: "Session Flags",       icon: Flag },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-[#10B981]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground font-sora">Back Office</h1>
          <p className="text-xs text-muted-foreground">Platform administration — super admin only</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-[#10B981] text-[#10B981]"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "dashboard" && <DashboardTab />}
      {tab === "orgs"      && <OrgsTab />}
      {tab === "users"     && <UsersTab orgs={orgs ?? []} />}
      {tab === "beta"      && <BetaApplicationsTab />}
      {tab === "reasoning"     && <ReasoningTab />}
      {tab === "gaming"          && <AntiGamingTab />}
      {tab === "llm_queue"       && <LlmReviewQueueTab />}
      {tab === "session_flags"   && <SessionFlagsTab />}
    </div>
  );
}
