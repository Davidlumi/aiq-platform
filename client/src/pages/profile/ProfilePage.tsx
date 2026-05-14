import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Shield, Lock, Loader2, CheckCircle2, Clock, BarChart3, BookOpen, ClipboardList, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { ProfileHeaderSkeleton, CardSkeleton } from "@/components/ui/loading";

const ROLE_LABELS: Record<string, string> = {
  platform_super_admin: "Platform Super Admin",
  tenant_admin: "Tenant Admin",
  hr_leader: "HR Leader",
  manager: "Manager",
  learner: "Learner",
  auditor: "Auditor",
};

const CAP_COLORS: Record<string, string> = {
  EXEC: "#4477AA", JUDG: "#b91c1c", LIT: "#047857",
  RISK: "#DC2626", STEW: "#EE8866", COLLAB: "#66CCEE",
};


function passwordStrength(pw: string): { label: string; color: string; width: string } {
  if (!pw) return { label: "", color: "", width: "0%" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak", color: "#DC2626", width: "20%" };
  if (score <= 2) return { label: "Fair", color: "#D97706", width: "40%" };
  if (score <= 3) return { label: "Good", color: "#4477AA", width: "60%" };
  if (score <= 4) return { label: "Strong", color: "var(--primary)", width: "80%" };
  return { label: "Excellent", color: "var(--primary)", width: "100%" };
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [nameForm, setNameForm] = useState({ firstName: "", lastName: "" });
  const [editingName, setEditingName] = useState(false);

  const { data: authMe } = trpc.auth.me.useQuery();
  const { data: profile, isLoading } = trpc.users.get.useQuery(
    { userId: authMe?.id ?? "" },
    { enabled: !!authMe?.id }
  );
  const utils = trpc.useUtils();

  const updateNameMutation = { mutate: (_: any) => {}, isPending: false } as any;

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const handlePasswordChange = () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: pwForm.currentPassword,
      newPassword: pwForm.newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <ProfileHeaderSkeleton />
        <CardSkeleton rows={3} />
        <CardSkeleton rows={4} />
      </div>
    );
  }

  const roles: string[] = profile?.roles ?? user?.roles ?? [];
  const initials = profile
    ? `${(profile.firstName ?? "")[0] ?? ""}${(profile.lastName ?? "")[0] ?? ""}`.toUpperCase() || "?"
    : "?";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="aiq-h1 text-foreground">My Profile</h1>
        <p className="aiq-caption text-muted-foreground mt-1">Manage your account details and security settings</p>
      </div>

      {/* Identity Card */}
      <Card className="aiq-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-semibold text-foreground flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-card flex items-center justify-center text-white font-bold text-xl">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">
                {profile?.firstName} {profile?.lastName}
              </p>
              <p className="aiq-caption text-muted-foreground">{profile?.email}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {roles.map((r) => (
                  <Badge key={r} variant="secondary" className="text-xs">
                    {ROLE_LABELS[r] ?? r}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {editingName ? (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="aiq-label text-muted-foreground">First Name</Label>
                  <Input
                    value={nameForm.firstName}
                    onChange={e => setNameForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder={profile?.firstName ?? ""}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="aiq-label text-muted-foreground">Last Name</Label>
                  <Input
                    value={nameForm.lastName}
                    onChange={e => setNameForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder={profile?.lastName ?? ""}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white"
                  disabled={updateNameMutation.isPending}
                  onClick={() => updateNameMutation.mutate({ firstName: nameForm.firstName, lastName: nameForm.lastName })}
                >
                  {updateNameMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Save
                </Button>
                <Button size="sm" variant="outline" className="" onClick={() => setEditingName(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className=""
              onClick={() => {
                setNameForm({ firstName: profile?.firstName ?? "", lastName: profile?.lastName ?? "" });
                setEditingName(true);
              }}
            >
              Edit Name
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Capability Snapshot */}
      {false && (
        <Card className="aiq-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Capability Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries({} as Record<string, number>).map(([cap, score]) => (
                <div key={cap} className="p-3 rounded-lg border border-border bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: CAP_COLORS[cap] ?? "#6B7280" }}
                    />
                    <span className="aiq-label text-muted-foreground">{cap}</span>
                  </div>
                  <p className="font-bold text-xl" style={{ color: CAP_COLORS[cap] ?? "#6B7280" }}>
                    {score}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security */}
      <Card className="aiq-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-semibold text-foreground flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="aiq-label text-muted-foreground">Current Password</Label>
            <Input
              type="password"
              value={pwForm.currentPassword}
              onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
              className="mt-1"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <Label className="aiq-label text-muted-foreground">New Password</Label>
            <Input
              type="password"
              value={pwForm.newPassword}
              onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
              className="mt-1"
              placeholder="Minimum 8 characters"
            />
            {pwForm.newPassword && (() => {
              const s = passwordStrength(pwForm.newPassword);
              return (
                <div className="mt-1.5 space-y-1">
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: s.width, backgroundColor: s.color }} />
                  </div>
                  <p className="text-xs font-medium" style={{ color: s.color }}>{s.label}</p>
                </div>
              );
            })()}
          </div>
          <div>
            <Label className="aiq-label text-muted-foreground">Confirm New Password</Label>
            <Input
              type="password"
              value={pwForm.confirmPassword}
              onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
              className="mt-1"
              placeholder="Repeat new password"
            />
          </div>
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            disabled={!pwForm.currentPassword || !pwForm.newPassword || changePasswordMutation.isPending}
            onClick={handlePasswordChange}
          >
            {changePasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      <Card className="aiq-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Your AiQ Journey
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link href="/dashboard">
            <div className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Capability Profile</p>
                  <p className="text-xs text-muted-foreground">View your AI readiness scores</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
          <Link href="/learning">
            <div className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#4477AA]/10 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-[#4477AA]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Learning Plan</p>
                  <p className="text-xs text-muted-foreground">Continue your personalised modules</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
          <Link href="/assessment">
            <div className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#b91c1c]/10 flex items-center justify-center">
                  <ClipboardList className="h-4 w-4 text-[#b91c1c]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Assessment</p>
                  <p className="text-xs text-muted-foreground">Take or retake your capability assessment</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="aiq-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              { label: "User ID", value: profile?.id, mono: true },
              { label: "Tenant", value: profile?.tenantId ?? "-" },
              { label: "Member Since", value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "-" },
              { label: "Last Sign In", value: profile?.lastSignedIn ? new Date(profile.lastSignedIn).toLocaleString() : "-" },
            ].map(item => (
              <div key={item.label} className="p-3 rounded-lg bg-muted/50 border border-border">
                <dt className="aiq-label text-muted-foreground">{item.label}</dt>
                <dd className={`mt-0.5 text-foreground font-medium ${item.mono ? "font-['DM_Mono'] text-xs" : ""}`}>
                  {item.value ?? "-"}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
