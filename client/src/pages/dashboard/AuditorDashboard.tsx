import { toast } from "sonner";
/**
 * Auditor Dashboard - AiQ Platform
 *
 * Evidence surface and audit intelligence:
 * - Evidence count KPIs (audit events, incidents, sessions)
 * - Incident type breakdown bar chart
 * - Policy incident timeline
 * - Full audit log with action/entity/timestamp
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatSkeleton, CardSkeleton, ChartSkeleton } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import {
  FileText, AlertTriangle, CheckCircle, Search,
  Activity, ClipboardList, Shield, Download, RefreshCw,
  Clock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

const INCIDENT_COLORS = ["#EF4444", "#F59E0B", "#F97316", "#4477AA", "var(--primary)", "#66CCEE", "#BBBBBB"];

export default function AuditorDashboard() {
  const { data, isLoading } = trpc.dashboard.auditor.useQuery();
  const [logSearch, setLogSearch] = useState("");
  const [incidentSearch, setIncidentSearch] = useState("");

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" /><Skeleton className="h-64" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const counts = data?.evidenceCounts;
  const incidents = data?.policyIncidents ?? [];
  const logs = data?.recentLogs ?? [];
  const incidentsByType = data?.incidentsByType ?? {};

  const incidentTypeData = Object.entries(incidentsByType)
    .map(([type, count], i) => ({ type: type.replace(/_/g, " "), count, color: INCIDENT_COLORS[i % INCIDENT_COLORS.length] }))
    .sort((a, b) => b.count - a.count);

  const filteredIncidents = incidents.filter(inc =>
    !incidentSearch || (inc.policyRuleId ?? "").toLowerCase().includes(incidentSearch.toLowerCase()) ||
    (inc.result ?? "").toLowerCase().includes(incidentSearch.toLowerCase())
  );

  const filteredLogs = logs.filter(log =>
    !logSearch || (log.action ?? "").toLowerCase().includes(logSearch.toLowerCase()) ||
    (log.targetType ?? "").toLowerCase().includes(logSearch.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Intelligence</h1>
          <p className="text-muted-foreground mt-1 text-sm">Evidence surface, policy incidents, and audit trail</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={() => window.location.reload()}>
            <RefreshCw className="w-3 h-3" />Refresh
          </Button>
          <Button size="sm" variant="outline" className="gap-2 text-xs opacity-50" disabled title="Export is not yet available">
            <Download className="w-3 h-3" />Export
          </Button>
        </div>
      </div>

      {/* Evidence KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Audit Events",       value: counts?.auditEvents ?? 0,       icon: Activity,      color: "#4477AA" },
          { label: "Policy Incidents",   value: counts?.policyIncidents ?? 0,   icon: AlertTriangle, color: "#EF4444" },
          { label: "Completed Sessions", value: counts?.completedSessions ?? 0, icon: ClipboardList, color: "var(--primary)" },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="border-border">
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15` }}>
                    <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{kpi.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Incident type breakdown + Summary */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#DC2626]" />Incidents by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incidentTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={incidentTypeData} layout="vertical"
                  margin={{ top: 0, right: 16, left: 90, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <YAxis type="category" dataKey="type" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={88} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v}`, "Count"]} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {incidentTypeData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <CheckCircle className="w-8 h-8 text-[#047857] mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No policy incidents recorded</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#4477AA]" />Evidence Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Total audit trail entries", value: counts?.auditEvents ?? 0, color: "#4477AA" },
                { label: "Policy violations triggered", value: counts?.policyIncidents ?? 0, color: "#EF4444" },
                { label: "Assessment sessions completed", value: counts?.completedSessions ?? 0, color: "var(--primary)" },
                { label: "Incident types observed", value: Object.keys(incidentsByType).length, color: "#F97316" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-bold" style={{ color: item.color }}>{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Policy incident timeline */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#DC2626]" />Policy Incidents ({filteredIncidents.length})
            </CardTitle>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Filter incidents..." className="pl-8 h-8 text-xs"
                value={incidentSearch} onChange={e => setIncidentSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Policy", "Result", "User ID", "Session ID", "Date"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground pb-2 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.slice(0, 20).map(inc => (
                  <tr key={inc.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-xs font-medium text-foreground">{inc.policyRuleId ?? "-"}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#DC2626]/10 text-[#DC2626] font-semibold capitalize">
                        {inc.result?.replace(/_/g, " ") ?? "-"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{inc.userId?.slice(0, 8) ?? "-"}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{inc.contextId?.slice(0, 8) ?? "-"}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(inc.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                    </td>
                  </tr>
                ))}
                {filteredIncidents.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">No incidents found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#4477AA]" />Audit Log ({filteredLogs.length})
            </CardTitle>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Filter log..." className="pl-8 h-8 text-xs"
                value={logSearch} onChange={e => setLogSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Action", "Entity Type", "Entity ID", "Actor", "Timestamp"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground pb-2 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.slice(0, 30).map(log => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="text-xs font-semibold text-foreground capitalize">{log.action?.replace(/_/g, " ") ?? "-"}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground capitalize">{log.targetType?.replace(/_/g, " ") ?? "-"}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{log.targetId?.slice(0, 8) ?? "-"}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{log.actorUserId?.slice(0, 8) ?? "-"}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">No log entries found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
