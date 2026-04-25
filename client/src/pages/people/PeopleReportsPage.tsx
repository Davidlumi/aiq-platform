/**
 * PeopleReportsPage — PR-05
 *
 * Searchable, filterable table of all org members (leaders) or direct reports (managers).
 * Each row links to the full individual report at /people/:userId.
 */

import { useState } from "react";
import { Link } from "wouter";
import {
  Users, Search, ChevronRight, AlertTriangle, CheckCircle2,
  Clock, UserX, Filter, ArrowUpDown, TrendingUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Readiness helpers ────────────────────────────────────────────────────────

type ReadinessState = "safe" | "at_risk" | "unsafe" | "not_assessed" | "unknown";

const READINESS_CONFIG: Record<ReadinessState, { label: string; colour: string; icon: React.ReactNode }> = {
  safe:         { label: "AI-Ready",     colour: "text-[#228833] bg-[#228833]/10 border-[#228833]/20", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  at_risk:      { label: "Developing",   colour: "text-[#CCBB44] bg-[#CCBB44]/10 border-[#CCBB44]/20", icon: <Clock className="w-3.5 h-3.5" /> },
  unsafe:       { label: "Foundation Gap", colour: "text-[#EE6677] bg-[#EE6677]/10 border-[#EE6677]/20", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  not_assessed: { label: "Not Assessed", colour: "text-muted-foreground bg-muted border-border", icon: <UserX className="w-3.5 h-3.5" /> },
  unknown:      { label: "Unknown",      colour: "text-muted-foreground bg-muted border-border", icon: <UserX className="w-3.5 h-3.5" /> },
};

function ReadinessBadge({ state }: { state: ReadinessState }) {
  const cfg = READINESS_CONFIG[state] ?? READINESS_CONFIG.unknown;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.colour}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const colour = pct >= 70 ? "#228833" : pct >= 50 ? "#CCBB44" : "#EE6677";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colour }} />
      </div>
      <span className="text-xs font-mono text-foreground">{Math.round(pct)}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PeopleReportsPage() {
  const [search, setSearch] = useState("");
  const [readinessFilter, setReadinessFilter] = useState<"all" | "safe" | "at_risk" | "unsafe" | "not_assessed">("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const { data, isLoading, error } = trpc.people.listMembers.useQuery({
    search: search || undefined,
    readinessFilter,
    page,
    pageSize: PAGE_SIZE,
  });

  const members = data?.members ?? [];
  const total = data?.total ?? 0;
  const isLeader = data?.isLeader ?? false;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Stats
  const assessed = members.filter(m => m.score).length;
  const aiReady  = members.filter(m => m.score?.readinessState === "safe").length;
  const atRisk   = members.filter(m => m.score?.readinessState === "at_risk").length;
  const gap      = members.filter(m => m.score?.readinessState === "unsafe").length;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <AlertTriangle className="w-10 h-10 text-[#EE6677]" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {isLeader ? "People Reports" : "Team Reports"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLeader
              ? "View individual AI readiness reports for all members of your organisation."
              : "View individual AI readiness reports for your direct reports."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 border border-border">
          <Users className="w-4 h-4" />
          <span className="font-medium">{total}</span>
          <span>{isLeader ? "org members" : "direct reports"}</span>
        </div>
      </div>

      {/* Stat tiles */}
      {!isLoading && members.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Assessed",      value: assessed, colour: "text-foreground" },
            { label: "AI-Ready",      value: aiReady,  colour: "text-[#228833]" },
            { label: "Developing",    value: atRisk,   colour: "text-[#CCBB44]" },
            { label: "Foundation Gap",value: gap,      colour: "text-[#EE6677]" },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.colour}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={readinessFilter} onValueChange={(v) => { setReadinessFilter(v as typeof readinessFilter); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All readiness" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All readiness</SelectItem>
            <SelectItem value="safe">AI-Ready</SelectItem>
            <SelectItem value="at_risk">Developing</SelectItem>
            <SelectItem value="unsafe">Foundation Gap</SelectItem>
            <SelectItem value="not_assessed">Not Assessed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 bg-muted/30 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span className="flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> Name</span>
          <span className="hidden sm:block">Role</span>
          <span>Readiness</span>
          <span className="hidden md:block">Score</span>
          <span>Report</span>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 items-center">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="w-32 h-3" />
                    <Skeleton className="w-24 h-2.5" />
                  </div>
                </div>
                <Skeleton className="hidden sm:block w-24 h-3" />
                <Skeleton className="w-20 h-5 rounded-full" />
                <Skeleton className="hidden md:block w-16 h-3" />
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && members.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Users className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              {search || readinessFilter !== "all" ? "No members match your filters." : "No members found."}
            </p>
            {(search || readinessFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setReadinessFilter("all"); }}>
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Rows */}
        {!isLoading && members.length > 0 && (
          <div className="divide-y divide-border">
            {members.map(member => {
              const state = (member.score?.readinessState ?? "not_assessed") as ReadinessState;
              const initials = `${member.firstName?.[0] ?? ""}${member.lastName?.[0] ?? ""}`.toUpperCase();
              return (
                <Link key={member.id} href={`/people/${member.id}`}>
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors cursor-pointer group">
                    {/* Name + email */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="hidden sm:block text-xs text-muted-foreground max-w-[140px] truncate">
                      {member.jobFunction ?? member.roleFamily ?? "—"}
                    </div>

                    {/* Readiness badge */}
                    <ReadinessBadge state={state} />

                    {/* Score bar */}
                    <div className="hidden md:block">
                      {member.score
                        ? <ScoreBar score={member.score.overallScore} />
                        : <span className="text-xs text-muted-foreground">—</span>
                      }
                    </div>

                    {/* View link */}
                    <div className="flex items-center justify-end">
                      <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground group-hover:border-primary group-hover:text-primary transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Trend hint */}
      {!isLoading && members.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border border-border">
          <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Click any row to view the full individual assessment report, capability breakdown, and learning plan.</span>
        </div>
      )}
    </div>
  );
}
