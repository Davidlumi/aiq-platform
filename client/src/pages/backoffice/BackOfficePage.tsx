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
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "dashboard" | "orgs" | "users";

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
    { label: "Total Organisations", value: stats?.totalOrgs ?? 0, sub: `${stats?.activeOrgs ?? 0} active, ${stats?.trialOrgs ?? 0} trial`, icon: Building2, color: "#3B4EFF" },
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
              className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-[#3B4EFF]/40 hover:bg-[#3B4EFF]/4 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#3B4EFF]/8 flex items-center justify-center shrink-0">
                <a.icon className="w-4 h-4 text-[#3B4EFF]" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-[#3B4EFF] transition-colors">{a.label}</p>
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
            className="bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white"
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
            className="bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white"
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
  const utils = trpc.useUtils();

  const { data: orgs, isLoading, refetch } = trpc.backoffice.listOrgs.useQuery({ search: search || undefined });

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
          className="bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white gap-2"
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditOrg(org)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
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
            className="bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white"
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
            className="bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white"
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
            className="bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white"
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
          className="bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white gap-2"
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
                      <span className="text-xs font-medium text-[#3B4EFF] bg-[#3B4EFF]/8 px-2 py-0.5 rounded-full">
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
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "orgs",      label: "Organisations", icon: Building2 },
    { id: "users",     label: "Users", icon: Users },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#3B4EFF]/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-[#3B4EFF]" />
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
                ? "border-[#3B4EFF] text-[#3B4EFF]"
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
    </div>
  );
}
