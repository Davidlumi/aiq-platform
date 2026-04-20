import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Shield, Lock, Loader2, CheckCircle2, Clock } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  platform_super_admin: "Platform Super Admin",
  tenant_admin: "Tenant Admin",
  hr_leader: "HR Leader",
  manager: "Manager",
  learner: "Learner",
  auditor: "Auditor",
};

const CAP_COLORS: Record<string, string> = {
  EXEC: "#4477AA", JUDG: "#AA3377", LIT: "#228833",
  RISK: "#EE6677", STEW: "#EE8866", COLLAB: "#66CCEE",
};

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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#10B981]" />
      </div>
    );
  }

  const roles: string[] = profile?.roles ?? user?.roles ?? [];
  const initials = profile
    ? `${(profile.firstName ?? "")[0] ?? ""}${(profile.lastName ?? "")[0] ?? ""}`.toUpperCase() || "?"
    : "?";

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="aiq-h1 text-[#0E1726]">My Profile</h1>
        <p className="aiq-caption text-[#6B7280] mt-1">Manage your account details and security settings</p>
      </div>

      {/* Identity Card */}
      <Card className="aiq-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-['Sora'] font-semibold text-[#0E1726] flex items-center gap-2">
            <User className="h-5 w-5 text-[#10B981]" />
            Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#1E293B] flex items-center justify-center text-white font-['Sora'] font-bold text-xl">
              {initials}
            </div>
            <div>
              <p className="font-['Sora'] font-semibold text-[#0E1726] text-lg">
                {profile?.firstName} {profile?.lastName}
              </p>
              <p className="aiq-caption text-[#6B7280]">{profile?.email}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {roles.map((r) => (
                  <Badge key={r} variant="secondary" className="text-xs font-['Sora']">
                    {ROLE_LABELS[r] ?? r}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {editingName ? (
            <div className="space-y-3 pt-2 border-t border-[#E5E7EB]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="aiq-label text-[#6B7280]">First Name</Label>
                  <Input
                    value={nameForm.firstName}
                    onChange={e => setNameForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder={profile?.firstName ?? ""}
                    className="mt-1 font-['Sora']"
                  />
                </div>
                <div>
                  <Label className="aiq-label text-[#6B7280]">Last Name</Label>
                  <Input
                    value={nameForm.lastName}
                    onChange={e => setNameForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder={profile?.lastName ?? ""}
                    className="mt-1 font-['Sora']"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-[#10B981] hover:bg-[#059669] text-white font-['Sora']"
                  disabled={updateNameMutation.isPending}
                  onClick={() => updateNameMutation.mutate({ firstName: nameForm.firstName, lastName: nameForm.lastName })}
                >
                  {updateNameMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Save
                </Button>
                <Button size="sm" variant="outline" className="font-['Sora']" onClick={() => setEditingName(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="font-['Sora']"
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
            <CardTitle className="font-['Sora'] font-semibold text-[#0E1726] flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
              Capability Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries({} as Record<string, number>).map(([cap, score]) => (
                <div key={cap} className="p-3 rounded-lg border border-[#E5E7EB] bg-[#F7F8FA]">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: CAP_COLORS[cap] ?? "#6B7280" }}
                    />
                    <span className="aiq-label text-[#6B7280]">{cap}</span>
                  </div>
                  <p className="font-['Sora'] font-bold text-xl" style={{ color: CAP_COLORS[cap] ?? "#6B7280" }}>
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
          <CardTitle className="font-['Sora'] font-semibold text-[#0E1726] flex items-center gap-2">
            <Lock className="h-5 w-5 text-[#10B981]" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="aiq-label text-[#6B7280]">Current Password</Label>
            <Input
              type="password"
              value={pwForm.currentPassword}
              onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
              className="mt-1 font-['Sora']"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <Label className="aiq-label text-[#6B7280]">New Password</Label>
            <Input
              type="password"
              value={pwForm.newPassword}
              onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
              className="mt-1 font-['Sora']"
              placeholder="Minimum 8 characters"
            />
          </div>
          <div>
            <Label className="aiq-label text-[#6B7280]">Confirm New Password</Label>
            <Input
              type="password"
              value={pwForm.confirmPassword}
              onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
              className="mt-1 font-['Sora']"
              placeholder="Repeat new password"
            />
          </div>
          <Button
            className="bg-[#10B981] hover:bg-[#059669] text-white font-['Sora']"
            disabled={!pwForm.currentPassword || !pwForm.newPassword || changePasswordMutation.isPending}
            onClick={handlePasswordChange}
          >
            {changePasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="aiq-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-['Sora'] font-semibold text-[#0E1726] flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#10B981]" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-['Sora']">
            {[
              { label: "User ID", value: profile?.id, mono: true },
              { label: "Tenant", value: profile?.tenantId ?? "—" },
              { label: "Member Since", value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—" },
              { label: "Last Sign In", value: profile?.lastSignedIn ? new Date(profile.lastSignedIn).toLocaleString() : "—" },
            ].map(item => (
              <div key={item.label} className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E5E7EB]">
                <dt className="aiq-label text-[#9CA3AF]">{item.label}</dt>
                <dd className={`mt-0.5 text-[#0E1726] font-medium ${item.mono ? "font-['DM_Mono'] text-xs" : ""}`}>
                  {item.value ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
