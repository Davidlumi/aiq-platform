import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, Shield, TrendingUp, Settings, FileText } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const { data, isLoading } = trpc.dashboard.admin.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Administration</h1>
          <p className="text-muted-foreground mt-1">System-wide overview and management</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users">
            <Button variant="outline" size="sm" className="gap-2">
              <Users className="w-4 h-4" />
              Manage Users
            </Button>
          </Link>
          <Link href="/reports">
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="w-4 h-4" />
              Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: data?.totalUsers ?? 0, icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: "Tenants", value: data?.totalTenants ?? 0, icon: Building2, color: "text-purple-600 bg-purple-50" },
          { label: "Active Sessions", value: data?.activeSessions ?? 0, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
          { label: "Policy Incidents", value: data?.policyIncidents ?? 0, icon: Shield, color: "text-red-600 bg-red-50" },
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

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "User Management", path: "/admin/users", icon: Users, desc: "Manage users and roles" },
          { label: "Tenant Management", path: "/admin/tenants", icon: Building2, desc: "Configure tenants" },
          { label: "Policy Rules", path: "/policy", icon: Shield, desc: "Manage policy engine" },
          { label: "Audit Log", path: "/audit", icon: FileText, desc: "View all audit events" },
          { label: "Reports", path: "/reports", icon: TrendingUp, desc: "Generate and export reports" },
          { label: "Profile", path: "/profile", icon: Settings, desc: "Account settings" },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path}>
              <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                  <Icon className="w-4 h-4 text-accent" />
                </div>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Platform Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data?.recentActivity?.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50">
                <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{log.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.targetType} · {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {(!data?.recentActivity || data.recentActivity.length === 0) && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
