import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, AlertTriangle, Award, Target } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { cn } from "@/lib/utils";

const STATE_COLORS: Record<string, string> = {
  proficient: "#10b981",
  developing: "#f59e0b",
  needs_support: "#ef4444",
  active_learner: "#3b82f6",
  noData: "#94a3b8",
};

export default function ManagerDashboard() {
  const { data, isLoading } = trpc.dashboard.manager.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const dist = data?.distribution;
  const team = data?.team ?? [];

  const pieData = dist
    ? [
        { name: "Proficient", value: dist.proficient, key: "proficient" },
        { name: "Developing", value: dist.developing, key: "developing" },
        { name: "Needs Support", value: dist.needsSupport, key: "needs_support" },
        { name: "No Data", value: dist.noData, key: "noData" },
      ].filter(d => d.value > 0)
    : [];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Team Readiness View</h1>
        <p className="text-muted-foreground mt-1">Monitor your team's capability and risk profile</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Team Members", value: dist?.total ?? 0, icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: "Proficient", value: dist?.proficient ?? 0, icon: Award, color: "text-emerald-600 bg-emerald-50" },
          { label: "High Risk", value: dist?.highRisk ?? 0, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
          { label: "Low Credibility", value: dist?.lowCredibility ?? 0, icon: Target, color: "text-amber-600 bg-amber-50" },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", card.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Readiness distribution chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Readiness Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={STATE_COLORS[entry.key] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No assessment data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk hotspots */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Risk Hotspots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {team
                .filter((u: any) => u.risk?.band === "high" || u.credibility?.band === "low")
                .map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex gap-1">
                      {u.risk?.band === "high" && (
                        <Badge variant="destructive" className="text-xs">High Risk</Badge>
                      )}
                      {u.credibility?.band === "low" && (
                        <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-200">Low Credibility</Badge>
                      )}
                    </div>
                  </div>
                ))}
              {team.filter((u: any) => u.risk?.band === "high" || u.credibility?.band === "low").length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No risk hotspots identified
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Name</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">State</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Credibility</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Risk</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Compliance</th>
                </tr>
              </thead>
              <tbody>
                {team.map((u: any) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-2.5 px-3">
                      <div>
                        <p className="font-medium text-foreground">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-xs capitalize text-muted-foreground">
                        {u.state?.primaryState?.replace(/_/g, " ") ?? "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {u.credibility?.band ? (
                        <Badge
                          className={cn(
                            "text-xs",
                            u.credibility.band === "high" ? "bg-emerald-100 text-emerald-800" :
                            u.credibility.band === "medium" ? "bg-amber-100 text-amber-800" :
                            "bg-red-100 text-red-800"
                          )}
                        >
                          {u.credibility.band}
                        </Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      {u.risk?.band ? (
                        <Badge
                          className={cn(
                            "text-xs",
                            u.risk.band === "low" ? "bg-emerald-100 text-emerald-800" :
                            u.risk.band === "medium" ? "bg-amber-100 text-amber-800" :
                            "bg-red-100 text-red-800"
                          )}
                        >
                          {u.risk.band}
                        </Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={cn(
                        "text-xs capitalize",
                        u.state?.complianceState === "compliant" ? "text-emerald-600" :
                        u.state?.complianceState === "at_risk" ? "text-amber-600" :
                        "text-red-600"
                      )}>
                        {u.state?.complianceState?.replace(/_/g, " ") ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
