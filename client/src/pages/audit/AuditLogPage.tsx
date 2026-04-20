import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = trpc.audit.logs.useQuery({ page: 1, pageSize: 50 });

  const logs = (data?.logs ?? []).filter((log: any) =>
    !search ||
    log.action?.toLowerCase().includes(search.toLowerCase()) ||
    log.actorUserId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-muted-foreground mt-1">Read-only record of all platform actions and events</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search actions…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
          <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No audit records found</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {logs.map((log: any) => {
            const meta = log.metadataJson ? (typeof log.metadataJson === "string" ? JSON.parse(log.metadataJson) : log.metadataJson) : {};
            return (
              <Card key={log.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{log.action}</p>
                        <p className="text-xs text-muted-foreground">
                          User: {log.actorUserId ?? "system"}
                          {log.targetType && ` · ${log.targetType}: ${log.targetId}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {log.ipAddress && (
                        <Badge variant="outline" className="text-xs">{log.ipAddress}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
