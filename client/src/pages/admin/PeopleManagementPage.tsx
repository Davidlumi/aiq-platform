/**
 * PeopleManagementPage — Org Setup
 *
 * HR Leaders / Admins can:
 *   - View all people in the org with their function and manager
 *   - Inline-edit role_family (function) per person
 *   - Inline-edit manager per person
 *   - Open a "Manage Team" sheet for any manager to add/remove members
 */

import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { ROLE_FAMILY_KEYS, ROLE_FAMILY_LABELS } from "@shared/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Users, Search, Filter, UserCog, X, Plus, Loader2,
  ChevronLeft, ChevronRight, Building2, UserCheck,
} from "lucide-react";
import PersonProfileSheet from "@/components/PersonProfileSheet";

// ─── Constants ────────────────────────────────────────────────────────────────

const FUNCTION_OPTIONS = [
  { value: "all", label: "All functions" },
  ...ROLE_FAMILY_KEYS.map(k => ({ value: k, label: ROLE_FAMILY_LABELS[k] })),
];

const FUNCTION_COLOURS: Record<string, string> = {
  business_partnering:  "bg-blue-500/15 text-blue-300 border-blue-500/25",
  talent_acquisition:   "bg-violet-500/15 text-violet-300 border-violet-500/25",
  learning_development: "bg-teal-500/15 text-teal-300 border-teal-500/25",
  reward_analytics:     "bg-amber-500/15 text-amber-300 border-amber-500/25",
  er_specialists:       "bg-rose-500/15 text-rose-300 border-rose-500/25",
  operations_tech:      "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  hr_leadership:        "bg-green-500/15 text-green-300 border-green-500/25",
};

const AVATAR_COLOURS = [
  "#4477AA", "#DC2626", "#047857", "#D97706", "#66CCEE",
  "#b91c1c", "#EE8866", "var(--primary)", "#6366F1", "#EC4899",
];

function avatarColour(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLOURS[Math.abs(hash) % AVATAR_COLOURS.length];
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

// ─── ManageTeamSheet ──────────────────────────────────────────────────────────

function ManageTeamSheet({
  manager,
  onClose,
}: {
  manager: { id: string; name: string; email: string } | null;
  onClose: () => void;
}) {
  const [addEmail, setAddEmail] = useState("");
  const utils = trpc.useUtils();

  const { data: members = [], isLoading } = trpc.people.getTeamMembers.useQuery(
    { managerId: manager?.id ?? "" },
    { enabled: !!manager?.id },
  );

  const addMutation = trpc.people.addTeamMemberByEmail.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.memberName} added to team`);
      setAddEmail("");
      utils.people.getTeamMembers.invalidate({ managerId: manager!.id });
      utils.people.listForOrgSetup.invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Failed to add member"),
  });

  const removeMutation = trpc.people.removeTeamMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      utils.people.getTeamMembers.invalidate({ managerId: manager!.id });
      utils.people.listForOrgSetup.invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Failed to remove member"),
  });

  return (
    <Sheet open={!!manager} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md bg-card border-border flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="text-foreground flex items-center gap-2">
            <UserCog className="w-4 h-4 text-primary" />
            Manage Team
          </SheetTitle>
          <SheetDescription className="text-muted-foreground text-sm">
            {manager?.name} · {members.length} member{members.length !== 1 ? "s" : ""}
          </SheetDescription>
        </SheetHeader>

        {/* Add member form */}
        <div className="px-6 py-4 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Add member by email</p>
          <div className="flex gap-2">
            <Input
              placeholder="colleague@company.com"
              value={addEmail}
              onChange={e => setAddEmail(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && addEmail.trim()) addMutation.mutate({ managerId: manager!.id, memberEmail: addEmail.trim() }); }}
              className="flex-1 bg-background border-border text-foreground text-sm h-8"
            />
            <Button
              size="sm"
              className="h-8 px-3"
              disabled={!addEmail.trim() || addMutation.isPending}
              onClick={() => addMutation.mutate({ managerId: manager!.id, memberEmail: addEmail.trim() })}
            >
              {addMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {/* Members list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No team members yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Add someone using their email above.</p>
            </div>
          ) : (
            members.map(m => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50 group"
              >
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback
                    style={{ backgroundColor: avatarColour(m.name), color: "#fff" }}
                    className="text-xs font-semibold"
                  >
                    {m.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  {m.roleFamily && (
                    <span className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded border font-medium ${FUNCTION_COLOURS[m.roleFamily] ?? "bg-muted text-muted-foreground border-border"}`}>
                      {ROLE_FAMILY_LABELS[m.roleFamily as keyof typeof ROLE_FAMILY_LABELS] ?? m.roleFamily}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeMutation.mutate({ managerId: manager!.id, memberId: m.id })}
                  disabled={removeMutation.isPending}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  title="Remove from team"
                >
                  {removeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Inline Function Select ───────────────────────────────────────────────────

function FunctionSelect({
  userId,
  value,
  onSaved,
}: {
  userId: string;
  value: string | null;
  onSaved: (newValue: string | null) => void;
}) {
  const mutation = trpc.people.updateRoleFamily.useMutation({
    onSuccess: (_, vars) => {
      onSaved(vars.roleFamily);
    },
    onError: (err) => toast.error(err.message ?? "Failed to update function"),
  });

  return (
    <Select
      value={value ?? "__none__"}
      onValueChange={v => {
        const newVal = v === "__none__" ? null : v;
        mutation.mutate({ userId, roleFamily: newVal });
      }}
    >
      <SelectTrigger className="h-7 text-xs border-border bg-background/50 w-44 focus:ring-primary/30">
        <SelectValue placeholder="— unassigned —" />
      </SelectTrigger>
      <SelectContent className="bg-card border-border">
        <SelectItem value="__none__" className="text-xs text-muted-foreground">— unassigned —</SelectItem>
        {ROLE_FAMILY_KEYS.map(k => (
          <SelectItem key={k} value={k} className="text-xs">
            {ROLE_FAMILY_LABELS[k]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Inline Manager Select ────────────────────────────────────────────────────

function ManagerSelect({
  userId,
  value,
  managers,
  onSaved,
}: {
  userId: string;
  value: string | null;
  managers: { id: string; name: string }[];
  onSaved: (newManagerId: string | null, newManagerName: string | null) => void;
}) {
  const mutation = trpc.people.updateManager.useMutation({
    onSuccess: (_, vars) => {
      const mgr = managers.find(m => m.id === vars.managerId) ?? null;
      onSaved(vars.managerId, mgr?.name ?? null);
    },
    onError: (err) => toast.error(err.message ?? "Failed to update manager"),
  });

  return (
    <Select
      value={value ?? "__none__"}
      onValueChange={v => {
        const newVal = v === "__none__" ? null : v;
        mutation.mutate({ userId, managerId: newVal });
      }}
    >
      <SelectTrigger className="h-7 text-xs border-border bg-background/50 w-44 focus:ring-primary/30">
        <SelectValue placeholder="— no manager —" />
      </SelectTrigger>
      <SelectContent className="bg-card border-border max-h-60 overflow-y-auto">
        <SelectItem value="__none__" className="text-xs text-muted-foreground">— no manager —</SelectItem>
        {managers.map(m => (
          <SelectItem key={m.id} value={m.id} className="text-xs">
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PeopleManagementPage() {
  const [search, setSearch] = useState("");
  const [functionFilter, setFunctionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // Manage Team sheet state
  const [teamSheetManager, setTeamSheetManager] = useState<{ id: string; name: string; email: string } | null>(null);
  // Person profile sheet state
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Local overrides for optimistic inline edits
  const [localOverrides, setLocalOverrides] = useState<Record<string, { roleFamily?: string | null; managerId?: string | null; managerName?: string | null }>>({});

  const { data, isLoading, refetch } = trpc.people.listForOrgSetup.useQuery({
    search: search || undefined,
    functionFilter: functionFilter === "all" ? undefined : functionFilter,
    page,
    pageSize: PAGE_SIZE,
  });

  const { data: managers = [] } = trpc.people.listManagers.useQuery();

  const users = useMemo(() => {
    if (!data?.users) return [];
    return data.users.map(u => ({
      ...u,
      ...localOverrides[u.id],
    }));
  }, [data, localOverrides]);

  const setOverride = useCallback((userId: string, patch: { roleFamily?: string | null; managerId?: string | null; managerName?: string | null }) => {
    setLocalOverrides(prev => ({ ...prev, [userId]: { ...prev[userId], ...patch } }));
  }, []);

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const functionCounts = useMemo(() => {
    if (!data?.users) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    for (const u of data.users) {
      const key = u.roleFamily ?? "__none__";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [data]);

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              People & Org Setup
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Assign functions and managers to everyone in your organisation.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{total}</p>
            <p className="text-xs text-muted-foreground">total people</p>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          {ROLE_FAMILY_KEYS.map(k => {
            const count = functionCounts[k] ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={k}
                onClick={() => { setFunctionFilter(k); setPage(1); }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  functionFilter === k
                    ? (FUNCTION_COLOURS[k] ?? "bg-primary/15 text-primary border-primary/25") + " ring-1 ring-primary/30"
                    : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"
                }`}
              >
                <span>{ROLE_FAMILY_LABELS[k]}</span>
                <span className="opacity-70">{count}</span>
              </button>
            );
          })}
          {functionFilter !== "all" && (
            <button
              onClick={() => { setFunctionFilter("all"); setPage(1); }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-border text-muted-foreground hover:bg-muted/50 transition-all"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search name or email…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="pl-8 h-8 text-sm bg-background border-border"
                />
              </div>
              <Select value={functionFilter} onValueChange={v => { setFunctionFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-sm border-border bg-background w-48">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {FUNCTION_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="px-4 py-3 border-b border-border">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              {isLoading ? "Loading…" : `${total} people`}
              {functionFilter !== "all" && (
                <span className="text-xs text-muted-foreground font-normal">
                  · filtered to {ROLE_FAMILY_LABELS[functionFilter as keyof typeof ROLE_FAMILY_LABELS]}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No people found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background/30">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Person</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Platform Role</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Function</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Manager</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {users.map(u => {
                      const fullName = `${u.firstName} ${u.lastName}`.trim();
                      const isManager = u.roleKeys.includes("manager");
                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-background/40 transition-colors"
                        >
                          {/* Person — click name/avatar to open profile */}
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="flex items-center gap-3 text-left w-full group"
                              onClick={() => setSelectedPersonId(u.id)}
                            >
                              <Avatar className="w-8 h-8 shrink-0">
                                <AvatarFallback
                                  style={{ backgroundColor: avatarColour(fullName), color: "#fff" }}
                                  className="text-xs font-semibold"
                                >
                                  {initials(u.firstName, u.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">{fullName}</p>
                                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                              </div>
                            </button>
                          </td>
                          {/* Platform Role */}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {u.roleKeys.filter(r => !["platform_super_admin"].includes(r)).map(r => (
                                <Badge
                                  key={r}
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 border-border text-muted-foreground capitalize"
                                >
                                  {r.replace(/_/g, " ")}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          {/* Function inline select */}
                          <td className="px-4 py-3">
                            <FunctionSelect
                              userId={u.id}
                              value={u.roleFamily ?? null}
                              onSaved={(newVal) => setOverride(u.id, { roleFamily: newVal })}
                            />
                          </td>
                          {/* Manager inline select */}
                          <td className="px-4 py-3">
                            <ManagerSelect
                              userId={u.id}
                              value={u.managerId ?? null}
                              managers={managers}
                              onSaved={(mId, mName) => setOverride(u.id, { managerId: mId, managerName: mName })}
                            />
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            {isManager && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs gap-1 border-border"
                                    onClick={() => setTeamSheetManager({ id: u.id, name: fullName, email: u.email })}
                                  >
                                    <UserCheck className="w-3 h-3" />
                                    Manage team
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View and edit {fullName}'s direct reports</TooltipContent>
                              </Tooltip>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 border-border"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="flex items-center px-2 text-xs">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 border-border"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Manage Team Sheet */}
        <ManageTeamSheet
          manager={teamSheetManager}
          onClose={() => setTeamSheetManager(null)}
        />
        {/* Person Profile Sheet */}
        <PersonProfileSheet
          userId={selectedPersonId}
          onClose={() => setSelectedPersonId(null)}
        />
      </div>
    </TooltipProvider>
  );
}
