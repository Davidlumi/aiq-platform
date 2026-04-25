/**
 * Audit Log Page — AiQ Enterprise Platform
 *
 * Canonical audit view from the build bible:
 * - Read-only record of all platform actions
 * - Expandable decision trace with metadata
 * - Event type filters (assessment, policy, simulation, admin, auth)
 * - Actor, target, IP, timestamp per entry
 * - Brand-compliant design
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Shield, ChevronDown, ChevronRight, Monitor, User,
  FileText, AlertTriangle, CheckCircle2, Clock, Activity, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Event type config ─────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<string, { label: string; colour: string; icon: React.ElementType }> = {
  assessment:     { label: "Assessment",  colour: "#4477AA", icon: FileText },
  policy:         { label: "Policy",      colour: "#EE6677", icon: Shield },
  simulation:     { label: "Simulation",  colour: "#AA3377", icon: Activity },
  admin:          { label: "Admin",       colour: "#EE8866", icon: Monitor },
  auth:           { label: "Auth",        colour: "#228833", icon: Lock },
  learning:       { label: "Learning",    colour: "#66CCEE", icon: CheckCircle2 },
  user:           { label: "User",        colour: "var(--primary)", icon: User },
};

function getEventCategory(action: string): string {
  if (!action) return "admin";
  const a = action.toLowerCase();
  if (a.includes("assessment") || a.includes("answer") || a.includes("session")) return "assessment";
  if (a.includes("policy") || a.includes("block") || a.includes("restrict")) return "policy";
  if (a.includes("simulation") || a.includes("choice")) return "simulation";
  if (a.includes("login") || a.includes("logout") || a.includes("auth")) return "auth";
  if (a.includes("learn") || a.includes("content") || a.includes("module")) return "learning";
  if (a.includes("user") || a.includes("profile") || a.includes("role")) return "user";
  return "admin";
}

// ── Audit Entry Row ───────────────────────────────────────────────────────────

function AuditEntryRow({ log }: { log: any }) {
  const [expanded, setExpanded] = useState(false);
  const category = getEventCategory(log.action);
  const config = EVENT_CONFIG[category] ?? EVENT_CONFIG.admin;
  const Icon = config.icon;
  const meta = log.metadataJson
    ? (typeof log.metadataJson === "string" ? JSON.parse(log.metadataJson) : log.metadataJson)
    : {};
  const hasDetail = Object.keys(meta).length > 0 || log.targetType;

  return (
    <Card className={cn("transition-colors", expanded && "bg-muted/20")}>
      <CardContent className="p-0">
        <button
          className="w-full text-left p-3 flex items-start gap-3"
          onClick={() => hasDetail && setExpanded(prev => !prev)}
        >
          {/* Category icon */}
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: `${config.colour}18`, color: config.colour }}
          >
            <Icon className="w-3.5 h-3.5" />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{log.action}</span>
              <Badge
                variant="outline"
                className="text-xs"
                style={{ borderColor: `${config.colour}40`, color: config.colour }}
              >
                {config.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
              {((log as any).actorName || log.actorUserId) && (
                <span className="flex items-center gap-1" title={log.actorUserId ?? undefined}>
                  <User className="w-3 h-3" />
                  {(log as any).actorName ?? log.actorUserId}
                </span>
              )}
              {log.targetType && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {log.targetType}: {log.targetId}
                </span>
              )}
              {log.ipAddress && (
                <span className="flex items-center gap-1">
                  <Monitor className="w-3 h-3" />
                  {log.ipAddress}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Expand indicator */}
          {hasDetail && (
            <div className="flex-shrink-0 text-muted-foreground">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          )}
        </button>

        {/* Expanded decision trace */}
        {expanded && hasDetail && (
          <div className="px-3 pb-3 ml-10 border-t border-border/50 pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Decision Trace</p>
            <div className="bg-muted/40 rounded-lg p-3 font-mono text-xs text-foreground overflow-x-auto">
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(meta, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { data, isLoading, error } = trpc.audit.logs.useQuery({ page: 1, pageSize: 200 });

  const logs = (data?.logs ?? []).filter((log: any) => {
    const matchSearch = !search ||
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      (log.actorUserId?.toLowerCase().includes(search.toLowerCase()) || (log as any).actorName?.toLowerCase().includes(search.toLowerCase())) ||
      log.targetType?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || getEventCategory(log.action) === categoryFilter;
    return matchSearch && matchCategory;
  });

  // Stats
  const allLogs = data?.logs ?? [];
  const categoryCounts = Object.keys(EVENT_CONFIG).reduce((acc, k) => {
    acc[k] = allLogs.filter((l: any) => getEventCategory(l.action) === k).length;
    return acc;
  }, {} as Record<string, number>);

  if (error?.data?.code === 'FORBIDDEN') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Shield className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Access Restricted</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            The audit log is only accessible to HR Leaders, Tenant Admins, and Auditors. Contact your administrator to request access.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-muted-foreground mt-1">
          Immutable record of all platform decisions, actions, and events. Click any entry to view the full decision trace.
        </p>
      </div>

      {/* Category stats */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {Object.entries(EVENT_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setCategoryFilter(prev => prev === key ? "all" : key)}
              className={cn(
                "p-2.5 rounded-lg border text-center transition-all",
                categoryFilter === key
                  ? "border-primary bg-[#EEF0FF]"
                  : "border-border hover:border-primary/30 bg-card"
              )}
            >
              <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: cfg.colour }} />
              <p className="text-xs font-semibold text-foreground">{categoryCounts[key] ?? 0}</p>
              <p className="text-xs text-muted-foreground">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search actions, users, targets…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {Object.entries(EVENT_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || categoryFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setCategoryFilter("all"); }}
            className="text-muted-foreground"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Log entries */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No audit records found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {search || categoryFilter !== "all" ? "Try adjusting your filters" : "No audit events recorded yet. Actions like assessments, logins, and policy evaluations will be logged here automatically."}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">{logs.length} record{logs.length !== 1 ? "s" : ""}</p>
          {logs.map((log: any) => (
            <AuditEntryRow key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
