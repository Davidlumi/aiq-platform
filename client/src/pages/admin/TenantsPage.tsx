import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, Plus, Search, Loader2, CheckCircle2, Globe } from "lucide-react";

export default function TenantsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: "", slug: "", plan: "starter" });

  const utils = trpc.useUtils();

  // Use tenant.current to show current tenant info
  const { data: currentTenant, isLoading } = trpc.tenant.current.useQuery();

  const isSuperAdmin = user?.roles?.includes("platform_super_admin");

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="aiq-h1 text-foreground">Tenant Management</h1>
          <p className="aiq-caption text-muted-foreground mt-1">
            {isSuperAdmin
              ? "Manage all tenants on the AiQ platform"
              : "View and manage your organisation's tenant settings"}
          </p>
        </div>
        {isSuperAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-[var(--primary)] text-white gap-2">
                <Plus className="h-4 w-4" /> New Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-semibold">Create New Tenant</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="aiq-label text-muted-foreground">Organisation Name</Label>
                  <Input
                    value={newTenant.name}
                    onChange={e => setNewTenant(t => ({ ...t, name: e.target.value }))}
                    className="mt-1"
                    placeholder="Acme Corporation"
                  />
                </div>
                <div>
                  <Label className="aiq-label text-muted-foreground">Slug (URL identifier)</Label>
                  <Input
                    value={newTenant.slug}
                    onChange={e => setNewTenant(t => ({ ...t, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
                    className="mt-1 font-['DM_Mono']"
                    placeholder="acme-corp"
                  />
                </div>
                <p className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg p-3">
                  Tenant provisioning is handled by the platform team. Submit your request and an admin will create the tenant within 24 hours.
                </p>
                <Button
                  className="w-full bg-primary hover:bg-[var(--primary)] text-white"
                  onClick={() => {
                    toast.success("Request submitted - the platform team will provision your tenant shortly.");
                    setCreateOpen(false);
                    setNewTenant({ name: "", slug: "", plan: "starter" });
                  }}
                  disabled={!newTenant.name || !newTenant.slug}
                >
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Current Tenant Card */}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl aiq-shimmer-brand" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-40 rounded-md aiq-shimmer" />
              <div className="h-3 w-24 rounded-md aiq-shimmer" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-12 rounded-lg aiq-shimmer" style={{ animationDelay: `${i * 60}ms` }} />)}
          </div>
        </div>
      ) : currentTenant ? (
        <Card className="aiq-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-semibold text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Your Organisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
                {(currentTenant.name ?? "?")[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-xl text-foreground">{currentTenant.name}</h2>
                <p className="aiq-caption text-muted-foreground font-['DM_Mono']">/{currentTenant.slug}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {"Enterprise"}
                  </Badge>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                    currentTenant.status === "active"
                      ? "bg-[#047857]/8 text-[#047857] border-[#047857]/25"
                      : "bg-muted text-muted-foreground border-border"
                  }`}>
                    <CheckCircle2 className="h-3 w-3" />
                    {currentTenant.status ?? "active"}
                  </span>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Tenant ID", value: currentTenant.id, mono: true },
                { label: "Plan", value: "Enterprise" },
                { label: "Created", value: currentTenant.createdAt ? new Date(currentTenant.createdAt).toLocaleDateString() : "-" },
                { label: "Status", value: currentTenant.status ?? "Active" },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-lg bg-muted/50 border border-border">
                  <dt className="aiq-label text-muted-foreground text-xs">{item.label}</dt>
                  <dd className={`mt-0.5 text-foreground font-medium text-sm ${item.mono ? "font-['DM_Mono'] text-xs" : ""}`}>
                    {item.value}
                  </dd>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Tenant Settings */}
      <TenantSettingsCard />
    </div>
  );
}

function TenantSettingsCard() {
  const { data: settings } = trpc.tenant.settings.useQuery();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ credibilityThreshold: 70, revalidationDaysLow: 30, revalidationDaysMedium: 90, revalidationDaysHigh: 180 });

  const updateMutation = trpc.tenant.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings updated");
      utils.tenant.settings.invalidate();
      setEditing(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="aiq-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-semibold text-foreground flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Tenant Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {settings ? (
          <div className="space-y-4">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label className="aiq-label text-muted-foreground">Credibility Threshold (%)</Label>
                  <Input
                    type="number"
                    value={form.credibilityThreshold}
                    onChange={e => setForm(f => ({ ...f, credibilityThreshold: parseInt(e.target.value) || 70 }))}
                    className="mt-1 max-w-xs"
                  />
                </div>
                <div>
                  <Label className="aiq-label text-muted-foreground">Revalidation Days (Low)</Label>
                  <Input
                    type="number"
                    value={form.revalidationDaysLow}
                    onChange={e => setForm(f => ({ ...f, revalidationDaysLow: parseInt(e.target.value) || 30 }))}
                    className="mt-1 max-w-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-[var(--primary)] text-white"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ credibilityThreshold: form.credibilityThreshold })}
                  >
                    {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Save
                  </Button>
                  <Button size="sm" variant="outline" className="" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {([
                    { key: "credibilityThreshold", label: "Credibility Threshold" },
                    { key: "revalidationDaysLow", label: "Revalidation Days (Low Risk)" },
                    { key: "revalidationDaysMedium", label: "Revalidation Days (Medium Risk)" },
                    { key: "revalidationDaysHigh", label: "Revalidation Days (High Risk)" },
                    { key: "defaultRiskModelVersion", label: "Risk Model Version" },
                    { key: "defaultLearningModelVersion", label: "Learning Model Version" },
                  ] as const).map(({ key, label }) => (
                    <div key={key} className="p-3 rounded-lg bg-muted/50 border border-border">
                      <dt className="aiq-label text-muted-foreground text-xs">{label}</dt>
                      <dd className="mt-0.5 text-foreground font-medium text-sm">
                        {String((settings as any)[key] ?? "-")}
                      </dd>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className=""
                  onClick={() => {
                    setForm({ credibilityThreshold: (settings as any).credibilityThreshold ?? 70, revalidationDaysLow: (settings as any).revalidationDaysLow ?? 30, revalidationDaysMedium: (settings as any).revalidationDaysMedium ?? 90, revalidationDaysHigh: (settings as any).revalidationDaysHigh ?? 180 });
                    setEditing(true);
                  }}
                >
                  Edit Settings
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="aiq-caption text-muted-foreground">No settings configured</p>
        )}
      </CardContent>
    </Card>
  );
}
