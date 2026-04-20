import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { FileText, Download, Plus, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const REPORT_TYPES = [
  { value: "learner_report", label: "Learner Report", desc: "Individual capability and progress summary" },
  { value: "manager_team_report", label: "Manager Team Report", desc: "Team readiness and risk overview" },
  { value: "org_readiness_report", label: "Org Readiness Report", desc: "Organisation-wide capability distribution" },
  { value: "audit_evidence_pack", label: "Audit Evidence Pack", desc: "Full audit trail and policy compliance evidence" },
];

const FORMAT_OPTIONS = [
  { value: "json", label: "JSON" },
  { value: "csv", label: "CSV" },
  { value: "pdf", label: "PDF" },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState<string>("learner_report");
  const [format, setFormat] = useState<string>("json");

  const { data, isLoading, refetch } = trpc.report.list.useQuery({ page: 1, pageSize: 20 });

  const requestMutation = trpc.report.request.useMutation({
    onSuccess: (result) => {
      toast.success("Report generated successfully!");
      refetch();
    },
    onError: err => toast.error(err.message),
  });

  const jobs = data?.jobs ?? [];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate and download capability, compliance, and audit reports
        </p>
      </div>

      {/* Generate report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate New Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {REPORT_TYPES.find(t => t.value === reportType)?.desc}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Export Format</label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_OPTIONS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={() =>
              requestMutation.mutate({
                reportType: reportType as any,
                format: format as any,
                parameters: {},
              })
            }
            disabled={requestMutation.isPending}
            className="bg-accent hover:bg-accent/90 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            {requestMutation.isPending ? "Generating…" : "Generate Report"}
          </Button>
        </CardContent>
      </Card>

      {/* Report history */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Report History</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No reports generated yet</p>
          </div>
        ) : (
          jobs.map((job: any) => {
            const manifest = job.manifestJson ? (typeof job.manifestJson === "string" ? JSON.parse(job.manifestJson) : job.manifestJson) : null;
            const params = job.parametersJson ? (typeof job.parametersJson === "string" ? JSON.parse(job.parametersJson) : job.parametersJson) : {};
            return (
              <Card key={job.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {job.status === "completed" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-foreground capitalize">
                          {job.reportType.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(job.createdAt).toLocaleString()}
                          {manifest?.expiresAt && ` · Expires ${new Date(manifest.expiresAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs uppercase">
                        {params.format ?? "json"}
                      </Badge>
                      {job.status === "completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs h-7"
                          onClick={() => {
                            // In production, this would download via signed URL
                            toast.info("Download feature: In production this uses a signed URL with expiry. Report data is available in the JSON response.");
                          }}
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
