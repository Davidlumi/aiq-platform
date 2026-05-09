/**
 * Content Requests & QA — v1.3 Block B
 * B1: Submit content improvement requests
 * B2: QA check tooling
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquarePlus, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const REQUEST_TYPES = [
  { value: "new_initiative", label: "New initiative" },
  { value: "update_initiative", label: "Update existing initiative" },
  { value: "new_source", label: "New source / evidence" },
  { value: "update_source", label: "Update existing source" },
  { value: "new_risk_rule", label: "New risk rule" },
  { value: "other", label: "Other" },
];

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-slate-800/60 text-slate-300" },
  medium: { label: "Medium", color: "bg-blue-900/40 text-blue-300" },
  high: { label: "High", color: "bg-red-900/40 text-red-300" },
};

const STATUS_CONFIG = {
  open: { label: "Open", color: "bg-amber-900/40 text-amber-300" },
  under_review: { label: "Under Review", color: "bg-blue-900/40 text-blue-300" },
  accepted: { label: "Accepted", color: "bg-emerald-900/40 text-emerald-300" },
  declined: { label: "Declined", color: "bg-red-900/40 text-red-300" },
  done: { label: "Done", color: "bg-slate-800/60 text-slate-300" },
};

const QA_STATUS_CONFIG = {
  pass: { label: "Pass", icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, color: "text-emerald-400" },
  warn: { label: "Warning", icon: <AlertTriangle className="w-4 h-4 text-amber-400" />, color: "text-amber-400" },
  fail: { label: "Fail", icon: <XCircle className="w-4 h-4 text-red-400" />, color: "text-red-400" },
};

function SubmitRequestForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requestType, setRequestType] = useState<string>("other");
  const [priority, setPriority] = useState<string>("medium");

  const submitMutation = trpc.operationalMaturity.submitContentRequest.useMutation({
    onSuccess: () => {
      toast.success("Request submitted — thank you for your feedback!");
      setTitle("");
      setDescription("");
      setRequestType("other");
      setPriority("medium");
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Suggest a content improvement</CardTitle>
        <CardDescription className="text-xs">
          Help us keep the initiative library accurate and up to date.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Request type</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Title</Label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Brief title for your request…"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Description</Label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the improvement, including any evidence or sources you can share…"
            className="text-xs h-28 resize-none"
          />
        </div>
        <Button
          size="sm"
          className="w-full"
          onClick={() => submitMutation.mutate({
            title,
            description,
            requestType: requestType as any,
            priority: priority as any,
          })}
          disabled={!title || !description || submitMutation.isPending}
        >
          {submitMutation.isPending ? "Submitting…" : "Submit request"}
        </Button>
      </CardContent>
    </Card>
  );
}

function QACheckPanel() {
  const [strategyId, setStrategyId] = useState("");
  const { user } = useAuth();

  const strategiesQ = trpc.strategy.listStrategies.useQuery(
    { tenantId: user?.tenantId ?? "" },
    { enabled: !!user?.tenantId }
  );

  const strategyDetailQ = trpc.strategy.getStrategy.useQuery(
    { strategyId },
    { enabled: !!strategyId }
  );

  const qaQ = trpc.operationalMaturity.runStrategyQACheck.useQuery(
    { initiativeIds: strategyDetailQ.data?.initiatives.map(i => i.initiativeId) ?? [] },
    { enabled: !!strategyDetailQ.data?.initiatives.length }
  );

  const overallCfg = qaQ.data ? QA_STATUS_CONFIG[qaQ.data.overallStatus as keyof typeof QA_STATUS_CONFIG] : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Strategy QA Check</CardTitle>
          <CardDescription className="text-xs">
            Run automated quality checks against your selected strategy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Select strategy</Label>
            <Select value={strategyId} onValueChange={setStrategyId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Choose a strategy…" />
              </SelectTrigger>
              <SelectContent>
                {strategiesQ.data?.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {qaQ.isLoading && strategyId && (
        <div className="text-sm text-muted-foreground p-4">Running QA checks…</div>
      )}

      {qaQ.data && (
        <div className="space-y-3">
          {/* Summary */}
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${qaQ.data.overallStatus === "pass" ? "bg-emerald-900/20 border-emerald-700/40" : qaQ.data.overallStatus === "warn" ? "bg-amber-900/20 border-amber-700/40" : "bg-red-900/20 border-red-700/40"}`}>
            {overallCfg?.icon}
            <div>
              <div className={`text-sm font-semibold ${overallCfg?.color}`}>
                Overall: {overallCfg?.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {qaQ.data.summary.passCount} passed · {qaQ.data.summary.warnCount} warnings · {qaQ.data.summary.failCount} failed
              </div>
            </div>
          </div>

          {/* Individual checks */}
          <div className="space-y-2">
            {qaQ.data.checks.map(check => {
                const cfg = QA_STATUS_CONFIG[check.status as keyof typeof QA_STATUS_CONFIG];
              return (
                <div key={check.checkId} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <div className="mt-0.5 shrink-0">{cfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${cfg.color}`}>{check.label}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContentRequestsPage() {
  const utils = trpc.useUtils();
  const requestsQ = trpc.operationalMaturity.listContentRequests.useQuery({ status: "all" });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Content Feedback & QA</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Suggest improvements to the initiative library and run quality checks on your strategy
        </p>
      </div>

      <Tabs defaultValue="submit">
        <TabsList className="h-8">
          <TabsTrigger value="submit" className="text-xs h-7">
            <MessageSquarePlus className="w-3.5 h-3.5 mr-1.5" />Submit Request
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs h-7">
            My Requests ({requestsQ.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="qa" className="text-xs h-7">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />QA Check
          </TabsTrigger>
        </TabsList>

        {/* B1: Submit */}
        <TabsContent value="submit" className="mt-4">
          <SubmitRequestForm onSuccess={() => utils.operationalMaturity.listContentRequests.invalidate()} />
        </TabsContent>

        {/* B1: History */}
        <TabsContent value="history" className="mt-4">
          {requestsQ.isLoading ? (
            <div className="text-sm text-muted-foreground p-4">Loading requests…</div>
          ) : !requestsQ.data?.length ? (
            <div className="text-center py-8">
              <MessageSquarePlus className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No requests submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requestsQ.data.map(req => {
                const statusCfg = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.open;
                const priorityCfg = PRIORITY_CONFIG[req.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;
                return (
                  <Card key={req.id} className="border shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{req.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{req.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(req.createdAt).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Badge variant="outline" className={`text-xs ${priorityCfg.color}`}>{priorityCfg.label}</Badge>
                          <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* B2: QA */}
        <TabsContent value="qa" className="mt-4">
          <QACheckPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
