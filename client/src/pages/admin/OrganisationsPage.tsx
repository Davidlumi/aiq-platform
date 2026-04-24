/**
 * Organisations Management — C2.2a
 * Allows admins to create and manage multiple organisations within a tenant,
 * configure their profiles (sector, AI adoption stage, risk appetite),
 * and set capability threshold overrides (S10.3).
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Building2, Plus, Settings2, Shield, TrendingUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Org = {
  id: string;
  name: string;
  slug: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Org Card ─────────────────────────────────────────────────────────────────

function OrgCard({ org, onSelect }: { org: Org; onSelect: (id: string) => void }) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => onSelect(org.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{org.name}</p>
              <p className="text-xs text-muted-foreground">/{org.slug}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            Active
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Create Org Dialog ────────────────────────────────────────────────────────

function CreateOrgDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const create = trpc.organisation.create.useMutation({
    onSuccess: () => {
      toast.success("Organisation created");
      setOpen(false);
      setName("");
      setSlug("");
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleNameChange = (v: string) => {
    setName(v);
    setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Organisation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organisation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              placeholder="Acme Corp"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input
              placeholder="acme-corp"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, and hyphens only.
            </p>
          </div>
          <Button
            className="w-full"
            disabled={!name || !slug || create.isPending}
            onClick={() => create.mutate({ name, slug })}
          >
            {create.isPending ? "Creating…" : "Create Organisation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Org Detail Panel ─────────────────────────────────────────────────────────

function OrgDetailPanel({ orgId, onBack }: { orgId: string; onBack: () => void }) {
  const { data, isLoading, refetch } = trpc.organisation.get.useQuery({ id: orgId });

  const updateProfile = trpc.organisation.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const upsertThreshold = trpc.organisation.upsertThreshold.useMutation({
    onSuccess: () => {
      toast.success("Threshold updated");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const [thresholdCapability, setThresholdCapability] = useState("");
  const [thresholdValue, setThresholdValue] = useState("65");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (!data) return null;

  const profile = data.profile;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <div>
          <h2 className="font-semibold text-lg">{data.name}</h2>
          <p className="text-xs text-muted-foreground">/{data.slug}</p>
        </div>
      </div>

      {/* Organisation Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Organisation Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Sector</Label>
              <Select
                value={profile?.sector ?? ""}
                onValueChange={(v) =>
                  updateProfile.mutate({ organisationId: orgId, sector: v })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent>
                  {["financial_services", "healthcare", "technology", "retail", "public_sector", "professional_services", "manufacturing", "other"].map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">AI Adoption Stage</Label>
              <Select
                value={profile?.aiAdoptionStage ?? "exploring"}
                onValueChange={(v) =>
                  updateProfile.mutate({
                    organisationId: orgId,
                    aiAdoptionStage: v as "exploring" | "piloting" | "scaling" | "embedded",
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exploring" className="text-xs">Exploring</SelectItem>
                  <SelectItem value="piloting" className="text-xs">Piloting</SelectItem>
                  <SelectItem value="scaling" className="text-xs">Scaling</SelectItem>
                  <SelectItem value="embedded" className="text-xs">Embedded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Risk Appetite</Label>
              <Select
                value={profile?.riskAppetite ?? "moderate"}
                onValueChange={(v) =>
                  updateProfile.mutate({
                    organisationId: orgId,
                    riskAppetite: v as "conservative" | "moderate" | "progressive",
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative" className="text-xs">Conservative</SelectItem>
                  <SelectItem value="moderate" className="text-xs">Moderate</SelectItem>
                  <SelectItem value="progressive" className="text-xs">Progressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Governance Regime</Label>
              <Input
                className="h-8 text-xs"
                placeholder="e.g. ISO 42001"
                defaultValue={profile?.governanceRegime ?? ""}
                onBlur={(e) =>
                  updateProfile.mutate({
                    organisationId: orgId,
                    governanceRegime: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capability Thresholds */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Capability Threshold Overrides
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.thresholds.length > 0 ? (
            <div className="space-y-2">
              {data.thresholds.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                  <span className="font-medium">{t.capability}</span>
                  <Badge variant="outline" className="text-xs">
                    Min {t.minimumSafeThreshold}%
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No threshold overrides. Default thresholds from the scoring config apply.
            </p>
          )}
          <Separator />
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                className="h-8 text-xs"
                placeholder="capability key (e.g. ai_interaction)"
                value={thresholdCapability}
                onChange={(e) => setThresholdCapability(e.target.value)}
              />
            </div>
            <div className="w-20">
              <Input
                className="h-8 text-xs"
                type="number"
                min={0}
                max={100}
                placeholder="65"
                value={thresholdValue}
                onChange={(e) => setThresholdValue(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="h-8"
              disabled={!thresholdCapability || upsertThreshold.isPending}
              onClick={() => {
                upsertThreshold.mutate({
                  organisationId: orgId,
                  capability: thresholdCapability,
                  minimumSafeThreshold: parseInt(thresholdValue),
                });
                setThresholdCapability("");
                setThresholdValue("65");
              }}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Set
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrganisationsPage() {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const { data: orgs, isLoading, refetch } = trpc.organisation.list.useQuery();

  if (selectedOrgId) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <OrgDetailPanel orgId={selectedOrgId} onBack={() => setSelectedOrgId(null)} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Organisations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage organisations, their AI context, and capability threshold overrides.
          </p>
        </div>
        <CreateOrgDialog onCreated={refetch} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          Loading…
        </div>
      ) : !orgs || orgs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Building2 className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No organisations yet.</p>
            <CreateOrgDialog onCreated={refetch} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {orgs.map((org) => (
            <OrgCard key={org.id} org={org} onSelect={setSelectedOrgId} />
          ))}
        </div>
      )}
    </div>
  );
}
