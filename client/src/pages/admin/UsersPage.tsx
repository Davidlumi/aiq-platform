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
import { Users, Plus, Search, Loader2, CheckCircle2, Clock, Ban, UserCheck, MoreHorizontal, Eye, UserCog, ArrowUpDown } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  platform_super_admin: "Super Admin",
  tenant_admin: "Tenant Admin",
  hr_leader: "HR Leader",
  manager: "Manager",
  learner: "Learner",
  auditor: "Auditor",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  deactivated: "bg-gray-100 text-gray-500 border-gray-200",
};


const AVATAR_COLORS = [
  "#4477AA", "#EE6677", "#228833", "#CCBB44", "#66CCEE",
  "#AA3377", "#EE8866", "#10B981", "#6366F1", "#EC4899",
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
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="aiq-h1 text-foreground">User Management</h1>
          <p className="aiq-caption text-muted-foreground mt-1">
            Manage users, roles, and access within your tenant
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#10B981] hover:bg-[#059669] text-white gap-2 font-['Sora']">
              <Plus className="h-4 w-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-['Sora'] font-semibold">Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="aiq-label text-muted-foreground">First Name</Label>
                  <Input
                    value={newUser.firstName}
                    onChange={e => setNewUser(u => ({ ...u, firstName: e.target.value }))}
                    className="mt-1 font-['Sora']"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <Label className="aiq-label text-muted-foreground">Last Name</Label>
                  <Input
                    value={newUser.lastName}
                    onChange={e => setNewUser(u => ({ ...u, lastName: e.target.value }))}
                    className="mt-1 font-['Sora']"
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
                  className="mt-1 font-['Sora']"
                  placeholder="jane@company.com"
                />
              </div>
              <div>
                <Label className="aiq-label text-muted-foreground">Temporary Password</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                  className="mt-1 font-['Sora']"
                  placeholder="Min 8 characters"
                />
              </div>
              <div>
                <Label className="aiq-label text-muted-foreground">Role</Label>
                <Select value={newUser.roleKey} onValueChange={v => setNewUser(u => ({ ...u, roleKey: v }))}>
                  <SelectTrigger className="mt-1 font-['Sora']">
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
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-['Sora']"
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email..."
            className="pl-9 font-['Sora']"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40 font-['Sora']">
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
          { label: "Total Users", value: total, icon: <Users className="h-4 w-4 text-[#10B981]" /> },
          { label: "Active", value: (data?.users ?? []).filter((u: any) => u.status === "active").length, icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
          { label: "Pending", value: (data?.users ?? []).filter((u: any) => u.status === "pending").length, icon: <Clock className="h-4 w-4 text-yellow-500" /> },
          { label: "Suspended", value: (data?.users ?? []).filter((u: any) => u.status === "suspended").length, icon: <Ban className="h-4 w-4 text-red-500" /> },
        ].map(s => (
          <Card key={s.label} className="aiq-card">
            <CardContent className="p-3 flex items-center gap-2">
              {s.icon}
              <div>
                <p className="aiq-caption text-muted-foreground text-xs">{s.label}</p>
                <p className="font-['Sora'] font-bold text-lg text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Table */}
      <Card className="aiq-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-['Sora'] font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-[#10B981]" />
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
              <table className="w-full text-sm font-['Sora']">
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
                    <tr key={u.id} className="border-b border-[#F3F4F6] hover:bg-muted/50 transition-colors">
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
                            <DropdownMenuItem onClick={() => toast.info("View profile — coming soon")} className="text-xs gap-2">
                              <Eye className="w-3.5 h-3.5" />View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info("Change role — coming soon")} className="text-xs gap-2">
                              <UserCog className="w-3.5 h-3.5" />Change Role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {u.status === "active" && (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ userId: u.id, status: "suspended" })}
                                disabled={updateStatusMutation.isPending}
                                className="text-xs gap-2 text-red-600 focus:text-red-600"
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
                  className="font-['Sora']"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-['Sora']"
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
    </div>
  );
}
