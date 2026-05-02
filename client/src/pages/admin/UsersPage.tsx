import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Users, Plus, Search, Loader2, CheckCircle2, Clock, Ban, UserCheck, MoreHorizontal, Eye, UserCog, ArrowUpDown, Upload, Download, FileText } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  platform_super_admin: "Super Admin",
  tenant_admin: "Tenant Admin",
  hr_leader: "HR Leader",
  manager: "Manager",
  learner: "Learner",
  auditor: "Auditor",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-[#047857]/8 text-[#047857] border-[#047857]/25",
  pending: "bg-[#D97706]/8 text-[#99882A] border-[#D97706]/25",
  suspended: "bg-[#DC2626]/8 text-[#CC3344] border-[#DC2626]/25",
  deactivated: "bg-muted text-muted-foreground border-border",
};


const AVATAR_COLORS = [
  "#4477AA", "#DC2626", "#047857", "#D97706", "#66CCEE",
  "#b91c1c", "#EE8866", "var(--primary)", "#6366F1", "#EC4899",
];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function UsersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<"name" | "status" | "joined">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<Array<{ email: string; firstName: string; lastName: string; roleKey: string }>>([]);
  const [csvError, setCsvError] = useState("");
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; tempPassword: string } | null>(null);
  const [changeRoleTarget, setChangeRoleTarget] = useState<{ id: string; name: string; currentRole: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [newUser, setNewUser] = useState({
    email: "", firstName: "", lastName: "", password: "", roleKey: "learner"
  });

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.users.list.useQuery({
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    pageSize: 20,
  });

  const { data: availableRoles } = trpc.users.availableRoles.useQuery();

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("User created successfully");
      utils.users.list.invalidate();
      setCreateOpen(false);
      setNewUser({ email: "", firstName: "", lastName: "", password: "", roleKey: "learner" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const changeRoleMutation = trpc.users.changeRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully");
      utils.users.list.invalidate();
      setChangeRoleTarget(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkInviteMutation = trpc.users.bulkInvite.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.created} users created, ${result.skipped} skipped`);
      utils.users.list.invalidate();
      setImportResult({ created: result.created, skipped: result.skipped, tempPassword: result.tempPassword });
      setCsvPreview([]);
      setCsvText("");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const { refetch: refetchExport } = trpc.users.exportCsv.useQuery(undefined, { enabled: false });
  function handleExportCsv() {
    refetchExport().then(({ data }) => {
      if (!data) return;
      const header = "email,firstName,lastName,status,createdAt";
      const rows = (data as any[]).map((r: any) => `${r.email},${r.firstName},${r.lastName},${r.status},${new Date(r.createdAt).toISOString().split("T")[0]}`);
      const csv = [header, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "aiq-users.csv"; a.click();
      URL.revokeObjectURL(url);
    });
  }
  function parseCsvText(text: string) {
    setCsvError("");
    const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) { setCsvPreview([]); return; }
    const dataLines = lines[0].toLowerCase().includes("email") ? lines.slice(1) : lines;
    const parsed: Array<{ email: string; firstName: string; lastName: string; roleKey: string }> = [];
    for (const line of dataLines) {
      const parts = line.split(",").map((p: string) => p.trim().replace(/^"|"$/g, ""));
      if (parts.length < 3) { setCsvError(`Invalid row: "${line}" — expected email,firstName,lastName[,role]`); setCsvPreview([]); return; }
      const [email, firstName, lastName, roleKey = "hr_professional"] = parts;
      if (!email.includes("@")) { setCsvError(`Invalid email: ${email}`); setCsvPreview([]); return; }
      parsed.push({ email, firstName, lastName, roleKey });
    }
    setCsvPreview(parsed);
  }
  const updateStatusMutation = trpc.users.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("User status updated");
      utils.users.list.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSort = (field: "name" | "status" | "joined") => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };
  const users_list_raw = data?.users ?? [];
  const users_list = [...users_list_raw].sort((a: any, b: any) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortField === "name") return dir * (`${a.firstName} ${a.lastName}`).localeCompare(`${b.firstName} ${b.lastName}`);
    if (sortField === "status") return dir * (a.status ?? "").localeCompare(b.status ?? "");
    if (sortField === "joined") return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return 0;
  });
  const total = users_list.length;
  const totalPages = 1; // single page for now

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="aiq-h1 text-foreground">User Management</h1>
          <p className="aiq-caption text-muted-foreground mt-1">
            Manage users, roles, and access within your tenant
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCsv}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Dialog open={csvImportOpen} onOpenChange={(o) => { setCsvImportOpen(o); if (!o) { setCsvPreview([]); setCsvText(""); setCsvError(""); setImportResult(null); } }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-3.5 w-3.5" /> Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-semibold">Bulk Import Users from CSV</DialogTitle>
              </DialogHeader>
              {importResult ? (
                <div className="space-y-4 py-2">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{importResult.created} users created, {importResult.skipped} skipped</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Temporary password for all new accounts:</p>
                      <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded mt-1 inline-block">{importResult.tempPassword}</code>
                      <p className="text-xs text-amber-500 mt-1">Share this with your team and ask them to change it on first login.</p>
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => { setImportResult(null); setCsvImportOpen(false); }}>Done</Button>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Expected CSV format:</p>
                    <code className="text-xs font-mono text-foreground">email,firstName,lastName,role</code>
                    <p className="text-xs text-muted-foreground mt-1">Role options: hr_professional, hr_leader, manager, learner (default: hr_professional)</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Paste CSV data</Label>
                    <textarea
                      className="w-full mt-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      rows={8}
                      placeholder={"alice@company.com,Alice,Smith,hr_professional\nbob@company.com,Bob,Jones,manager"}
                      value={csvText}
                      onChange={e => { setCsvText(e.target.value); parseCsvText(e.target.value); }}
                    />
                    {csvError && <p className="text-xs text-red-500 mt-1">{csvError}</p>}
                  </div>
                  {csvPreview.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{csvPreview.length} users ready to import:</p>
                      <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                        {csvPreview.slice(0, 10).map((r, i) => (
                          <div key={i} className="flex items-center gap-3 px-3 py-2">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-foreground flex-1">{r.firstName} {r.lastName}</span>
                            <span className="text-xs text-muted-foreground">{r.email}</span>
                            <span className="text-xs text-muted-foreground">{r.roleKey}</span>
                          </div>
                        ))}
                        {csvPreview.length > 10 && <div className="px-3 py-2 text-xs text-muted-foreground">+{csvPreview.length - 10} more…</div>}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setCsvImportOpen(false)}>Cancel</Button>
                    <Button
                      className="flex-1 gap-2"
                      disabled={csvPreview.length === 0 || !!csvError || bulkInviteMutation.isPending}
                      onClick={() => bulkInviteMutation.mutate({ rows: csvPreview })}
                    >
                      {bulkInviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Import {csvPreview.length > 0 ? csvPreview.length : ""} Users
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-[var(--primary)] text-white gap-2">
              <Plus className="h-4 w-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-semibold">Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="aiq-label text-muted-foreground">First Name</Label>
                  <Input
                    value={newUser.firstName}
                    onChange={e => setNewUser(u => ({ ...u, firstName: e.target.value }))}
                    className="mt-1"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <Label className="aiq-label text-muted-foreground">Last Name</Label>
                  <Input
                    value={newUser.lastName}
                    onChange={e => setNewUser(u => ({ ...u, lastName: e.target.value }))}
                    className="mt-1"
                    placeholder="Smith"
                  />
                </div>
              </div>
              <div>
                <Label className="aiq-label text-muted-foreground">Email</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                  className="mt-1"
                  placeholder="jane@company.com"
                />
              </div>
              <div>
                <Label className="aiq-label text-muted-foreground">Temporary Password</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                  className="mt-1"
                  placeholder="Min 8 characters"
                />
              </div>
              <div>
                <Label className="aiq-label text-muted-foreground">Role</Label>
                <Select value={newUser.roleKey} onValueChange={v => setNewUser(u => ({ ...u, roleKey: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue defaultValue={newUser.roleKey} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles
                      ? availableRoles.map((r: { id: string; key: string; label: string }) => (
                          <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                        ))
                      : ["learner", "manager", "hr_leader", "tenant_admin", "auditor"].map(r => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r] ?? r}</SelectItem>
                        ))
                    }

                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-primary hover:bg-[var(--primary)] text-white"
                disabled={!newUser.email || !newUser.firstName || !newUser.password || createMutation.isPending}
                onClick={() => createMutation.mutate({ email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName, password: newUser.password, roleKey: newUser.roleKey })}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create User
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="deactivated">Deactivated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: total, icon: <Users className="h-4 w-4 text-primary" /> },
          { label: "Active", value: (data?.users ?? []).filter((u: any) => u.status === "active").length, icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
          { label: "Pending", value: (data?.users ?? []).filter((u: any) => u.status === "pending").length, icon: <Clock className="h-4 w-4 text-yellow-500" /> },
          { label: "Suspended", value: (data?.users ?? []).filter((u: any) => u.status === "suspended").length, icon: <Ban className="h-4 w-4 text-[#CC3344]" /> },
        ].map(s => (
          <Card key={s.label} className="aiq-card">
            <CardContent className="p-3 flex items-center gap-2">
              {s.icon}
              <div>
                <p className="aiq-caption text-muted-foreground text-xs">{s.label}</p>
                <p className="font-bold text-lg text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Table */}
      <Card className="aiq-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Users ({total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton columns={6} rows={8} />
          ) : !users_list.length ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="aiq-body text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 px-4 aiq-label text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("name")}>
                      <span className="flex items-center gap-1">User <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="text-left py-3 px-4 aiq-label text-muted-foreground">Roles</th>
                    <th className="text-left py-3 px-4 aiq-label text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("status")}>
                      <span className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="text-left py-3 px-4 aiq-label text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("joined")}>
                      <span className="flex items-center gap-1">Joined <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="text-left py-3 px-4 aiq-label text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users_list.map((u: any) => (
                    <tr key={u.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: avatarColor(`${u.firstName}${u.lastName}`) }}>
                            {(u.firstName?.[0] ?? "")[0]}{(u.lastName?.[0] ?? "")[0]}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(u.roles ?? []).map((r: string) => (
                            <Badge key={r} variant="secondary" className="text-xs">
                              {ROLE_LABELS[r] ?? r}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[u.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs font-['DM_Mono']">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedRole((u.roles ?? [])[0] ?? "learner");
                                setChangeRoleTarget({ id: u.id, name: `${u.firstName} ${u.lastName}`, currentRole: (u.roles ?? [])[0] ?? "learner" });
                              }}
                              className="text-xs gap-2"
                            >
                              <UserCog className="w-3.5 h-3.5" />Change Role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {u.status === "active" && (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ userId: u.id, status: "suspended" })}
                                disabled={updateStatusMutation.isPending}
                                className="text-xs gap-2 text-[#CC3344] focus:text-[#CC3344]"
                              >
                                <Ban className="w-3.5 h-3.5" />Suspend
                              </DropdownMenuItem>
                            )}
                            {u.status === "suspended" && (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ userId: u.id, status: "active" })}
                                disabled={updateStatusMutation.isPending}
                                className="text-xs gap-2 text-green-600 focus:text-green-600"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />Reactivate
                              </DropdownMenuItem>
                            )}
                            {u.status === "pending" && (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ userId: u.id, status: "active" })}
                                disabled={updateStatusMutation.isPending}
                                className="text-xs gap-2 text-blue-600 focus:text-blue-600"
                              >
                                <UserCheck className="w-3.5 h-3.5" />Activate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="aiq-caption text-muted-foreground">
                Page {page} of {totalPages} · {total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className=""
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className=""
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Role Dialog */}
      <Dialog open={!!changeRoleTarget} onOpenChange={open => !open && setChangeRoleTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-semibold">Change Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Update role for <strong>{changeRoleTarget?.name}</strong>
            </p>
            <div>
              <Label className="aiq-label text-muted-foreground">New Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles
                    ? availableRoles.map((r: { id: string; key: string; label: string }) => (
                        <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                      ))
                    : ["learner", "manager", "hr_leader", "tenant_admin", "auditor"].map(r => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r] ?? r}</SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-primary hover:bg-[var(--primary)] text-white"
              disabled={!selectedRole || selectedRole === changeRoleTarget?.currentRole || changeRoleMutation.isPending}
              onClick={() => changeRoleTarget && changeRoleMutation.mutate({ userId: changeRoleTarget.id, roleKey: selectedRole })}
            >
              {changeRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Role
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
