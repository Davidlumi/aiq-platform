import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, Shield, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function AuditorDashboard() {
  const { data, isLoading } = trpc.dashboard.auditor.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Evidence Surface</h1>
          <p className="text-muted-foreground mt-1">Read-only view of all audit events and policy incidents</p>
        </div>
        <Link href="/reports">
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="w-4 h-4" />
            Export Evidence Pack
          </Button>
        </Link>
      </div>

      {/* Policy incidents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Policy Incidents ({data?.policyIncidents?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.policyIncidents && data.policyIncidents.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.policyIncidents.map((incident: any) => (
                <div key={incident.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{incident.contextType}</p>
                    <p className="text-xs text-muted-foreground">
                      User: {incident.userId} · {new Date(incident.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-xs">{incident.result}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No policy incidents recorded
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent audit log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent" />
              Recent Audit Events ({data?.recentLogs?.length ?? 0})
            </CardTitle>
            <Link href="/audit">
              <Button variant="ghost" size="sm" className="text-accent h-7 px-2 text-xs">View Full Log</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {data?.recentLogs?.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{log.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.targetType} · {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {(!data?.recentLogs || data.recentLogs.length === 0) && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No audit events recorded
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
