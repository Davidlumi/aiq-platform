/**
 * Manager Hub — v1.3 Block E
 * E1: Manager onboarding
 * E2: Manager dashboard with function-specific content
 * E3: "What This Means For Me" briefs
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserCog, BookOpen, Sparkles, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

const MANAGER_FUNCTIONS = [
  "L&D",
  "Talent Acquisition",
  "HRBP",
  "Reward & Benefits",
  "HR Operations",
  "People Analytics",
  "Organisational Development",
  "Employee Relations",
  "Workforce Planning",
  "HR Technology",
  "Other",
];

const PHASE_COLORS: Record<string, string> = {
  foundation: "dark:bg-violet-900/30 bg-violet-100/80 dark:border-violet-700/40 border-violet-300 dark:text-violet-300 text-violet-700",
  build: "dark:bg-blue-900/30 bg-blue-100/80 dark:border-blue-700/40 border-blue-300 dark:text-blue-300 text-blue-700",
  scale: "dark:bg-emerald-900/30 bg-emerald-100/80 dark:border-emerald-700/40 border-emerald-300 dark:text-emerald-300 text-emerald-700",
  optimise: "dark:bg-amber-900/30 bg-amber-100/80 dark:border-amber-700/40 border-amber-300 dark:text-amber-300 text-amber-700",
};

// ── E1: Onboarding wizard ─────────────────────────────────────────────────────
function ManagerOnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [managerFunction, setManagerFunction] = useState("");
  const completeMutation = trpc.operationalMaturity.completeManagerOnboarding.useMutation({
    onSuccess: () => {
      toast.success("Onboarding complete! Your personalised content is ready.");
      onComplete();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <div className="text-center">
        <UserCog className="w-12 h-12 mx-auto text-violet-600 mb-4" />
        <h2 className="text-xl font-semibold">Welcome to Manager Hub</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Tell us your HR function so we can personalise your AI strategy content.
        </p>
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Your HR function</Label>
            <Select value={managerFunction} onValueChange={setManagerFunction}>
              <SelectTrigger>
                <SelectValue placeholder="Select your function…" />
              </SelectTrigger>
              <SelectContent>
                {MANAGER_FUNCTIONS.map(fn => (
                  <SelectItem key={fn} value={fn}>{fn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={() => completeMutation.mutate({ managerFunction })}
            disabled={!managerFunction || completeMutation.isPending}
          >
            {completeMutation.isPending ? "Setting up…" : "Get started"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── E3: Brief viewer dialog ───────────────────────────────────────────────────
function BriefDialog({
  managerFunction,
  strategyContextId,
}: {
  managerFunction: string;
  strategyContextId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [forceRegen, setForceRegen] = useState(false);

  const briefMutation = trpc.operationalMaturity.generateManagerBrief.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const handleOpen = () => {
    setOpen(true);
    if (!briefMutation.data || forceRegen) {
      briefMutation.mutate({
        managerFunction,
        strategyContextId,
        forceRegenerate: forceRegen,
      });
      setForceRegen(false);
    }
  };

  return (
    <>
      <Button size="sm" onClick={handleOpen}>
        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
        My AI Brief
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600" />
              What This Means For Me — {managerFunction}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {briefMutation.isPending ? (
              <div className="flex items-center gap-3 py-8 justify-center">
                <RefreshCw className="w-5 h-5 animate-spin text-violet-600" />
                <span className="text-sm text-muted-foreground">Generating your personalised brief…</span>
              </div>
            ) : briefMutation.data ? (
              <div className="prose prose-sm max-w-none">
                <Streamdown>{briefMutation.data.briefMarkdown}</Streamdown>
                {briefMutation.data.cached && (
                  <p className="text-xs text-muted-foreground mt-4 border-t pt-3">
                    Cached brief — generated within the last 7 days.
                    <button
                      className="ml-2 text-violet-600 hover:underline"
                      onClick={() => { setForceRegen(true); briefMutation.mutate({ managerFunction, strategyContextId, forceRegenerate: true }); }}
                    >
                      Regenerate
                    </button>
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ManagerHubPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const dashboardQ = trpc.operationalMaturity.getManagerDashboard.useQuery();
  const briefsQ = trpc.operationalMaturity.listManagerBriefs.useQuery();

  const dashboard = dashboardQ.data;

  // E1: Show onboarding if not completed
  if (dashboardQ.isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!dashboard?.onboardingCompleted) {
    return (
      <ManagerOnboardingWizard
        onComplete={() => {
          utils.operationalMaturity.getManagerDashboard.invalidate();
        }}
      />
    );
  }

  const managerFunction = dashboard.managerFunction ?? "General";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Manager Hub</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI strategy content personalised for <span className="font-medium text-foreground">{managerFunction}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <BriefDialog
            managerFunction={managerFunction}
            strategyContextId={dashboard.orgContextId ?? undefined}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              trpc.operationalMaturity.completeManagerOnboarding.useMutation();
            }}
          >
            <UserCog className="w-3.5 h-3.5 mr-1.5" />
            Change Function
          </Button>
        </div>
      </div>

      <Tabs defaultValue="initiatives">
        <TabsList className="h-8">
          <TabsTrigger value="initiatives" className="text-xs h-7">
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            Relevant Initiatives ({dashboard.relevantInitiativeCount})
          </TabsTrigger>
          <TabsTrigger value="briefs" className="text-xs h-7">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Saved Briefs ({briefsQ.data?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* E2: Relevant initiatives */}
        <TabsContent value="initiatives" className="mt-4">
          {dashboard.relevantInitiatives.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No initiatives found for your function.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {dashboard.relevantInitiatives.map((init: any) => (
                <Card key={init.id} className="border shadow-none hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-semibold leading-tight">{init.displayName}</h3>
                      <Badge variant="outline" className={`text-xs shrink-0 ${PHASE_COLORS[init.phase] ?? ""}`}>
                        {init.phase}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{init.shortDescription}</p>
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">{init.category}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {dashboard.relevantInitiativeCount > 6 && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Showing 6 of {dashboard.relevantInitiativeCount} relevant initiatives
            </p>
          )}
        </TabsContent>

        {/* E3: Saved briefs */}
        <TabsContent value="briefs" className="mt-4">
          {briefsQ.isLoading ? (
            <div className="text-sm text-muted-foreground p-4">Loading briefs…</div>
          ) : !briefsQ.data?.length ? (
            <div className="text-center py-8">
              <Sparkles className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No briefs generated yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Click "My AI Brief" to generate a personalised brief.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {briefsQ.data.map(brief => (
                <Card key={brief.id} className="border shadow-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">{brief.managerFunction} — AI Strategy Brief</CardTitle>
                        <CardDescription className="text-xs">
                          Generated {new Date(brief.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          {" · "}Library v{brief.libraryVersion}
                        </CardDescription>
                      </div>
                      <CheckCircle2 className="w-4 h-4 dark:text-emerald-400 text-emerald-600 shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none text-xs">
                      <Streamdown>{`${brief.briefMarkdown.slice(0, 400)}…`}</Streamdown>
                    </div>
                    <Dialog>
                      <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs">
                        Read full brief
                      </Button>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
