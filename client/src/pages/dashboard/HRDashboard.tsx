import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, Shield, TrendingUp, FileText } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function HRDashboard() {
  const { data, isLoading } = trpc.dashboard.hr.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const cap = data?.capabilityDistribution;
  const comp = data?.complianceDistribution;
  const cred = data?.credibilityDistribution;
  const risk = data?.riskDistribution;

  const capabilityData = cap ? [
    { name: "Proficient", value: cap.proficient, fill: "#10b981" },
    { name: "Developing", value: cap.developing, fill: "#f59e0b" },
    { name: "Needs Support", value: cap.needsSupport, fill: "#ef4444" },
    { name: "Active Learner", value: cap.activeLearner, fill: "#3b82f6" },
    { name: "No Data", value: cap.noData, fill: "#94a3b8" },
  ].filter(d => d.value > 0) : [];

  const complianceData = comp ? [
    { name: "Compliant", value: comp.compliant, fill: "#10b981" },
    { name: "At Risk", value: comp.atRisk, fill: "#f59e0b" },
    { name: "Breach", value: comp.breach, fill: "#ef4444" },
  ].filter(d => d.value > 0) : [];

  const riskData = risk ? [
    { name: "Low", value: risk.low },
    { name: "Medium", value: risk.medium },
    { name: "High", value: risk.high },
  ] : [];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Org Readiness Dashboard</h1>
          <p className="text-muted-foreground mt-1">Organisation-wide capability and compliance overview</p>
        </div>
        <Link href="/reports">
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="w-4 h-4" />
            Generate Report
          </Button>
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: data?.totalUsers ?? 0, icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: "Compliant", value: comp?.compliant ?? 0, icon: Shield, color: "text-emerald-600 bg-emerald-50" },
          { label: "At Risk / Breach", value: (comp?.atRisk ?? 0) + (comp?.breach ?? 0), icon: AlertTriangle, color: "text-red-600 bg-red-50" },
          { label: "High Risk Users", value: risk?.high ?? 0, icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
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
        {/* Capability distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capability Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {capabilityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={capabilityData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value">
                    {capabilityData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance Status</CardTitle>
          </CardHeader>
          <CardContent>
            {complianceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={complianceData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value">
                    {complianceData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risk distribution bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={riskData} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {riskData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.name === "Low" ? "#10b981" : entry.name === "Medium" ? "#f59e0b" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent policy incidents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Recent Policy Incidents
            </CardTitle>
            <Link href="/policy">
              <Button variant="ghost" size="sm" className="text-accent h-7 px-2 text-xs">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {data?.recentIncidents && data.recentIncidents.length > 0 ? (
            <div className="space-y-2">
              {data.recentIncidents.slice(0, 5).map((incident: any) => (
                <div key={incident.id} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                  <div>
                    <p className="text-sm font-medium text-foreground">{incident.contextType}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(incident.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-xs">{incident.result}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No policy incidents recorded
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
