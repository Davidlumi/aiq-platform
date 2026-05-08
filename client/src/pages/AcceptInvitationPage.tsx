import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";

export default function AcceptInvitationPage() {
  const [, navigate] = useLocation();

  // Extract token from query string
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [done, setDone]           = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Validate the token
  const { data: tokenData, isLoading: tokenLoading } = trpc.users.validateInvitationToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const acceptMutation = trpc.users.acceptInvitation.useMutation({
    onSuccess: () => setDone(true),
    onError: (err) => setFormError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (password !== confirm) { setFormError("Passwords do not match."); return; }
    if (password.length < 8)  { setFormError("Password must be at least 8 characters."); return; }
    acceptMutation.mutate({ token, firstName, lastName, password });
  }

  // Redirect to login after success
  useEffect(() => {
    if (done) {
      const t = setTimeout(() => navigate("/login"), 3000);
      return () => clearTimeout(t);
    }
  }, [done, navigate]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <PageShell>
        <StatusCard icon={<XCircle className="w-10 h-10 text-destructive" />}
          title="Invalid link"
          message="This invitation link is missing a token. Please check the link in your email and try again." />
      </PageShell>
    );
  }

  if (tokenLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!tokenData?.valid) {
    const reason = (tokenData as any)?.reason;
    return (
      <PageShell>
        <StatusCard
          icon={<XCircle className="w-10 h-10 text-destructive" />}
          title={reason === "expired" ? "Invitation expired" : "Invalid invitation"}
          message={
            reason === "expired"
              ? "This invitation link has expired. Please ask your administrator to send a new one."
              : "This invitation link is invalid or has already been used. Please ask your administrator to send a new one."
          }
        />
      </PageShell>
    );
  }

  if (done) {
    return (
      <PageShell>
        <StatusCard
          icon={<CheckCircle2 className="w-10 h-10 text-green-500" />}
          title="Account created"
          message={`Welcome to AiQ! Your account has been set up for ${tokenData.email}. Redirecting you to sign in…`}
        />
      </PageShell>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <PageShell>
      <Card className="w-full max-w-md border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-extrabold tracking-tight">
              A<span className="text-green-500">i</span>Q
            </span>
          </div>
          <CardTitle className="text-xl">Accept your invitation</CardTitle>
          <CardDescription>
            You have been invited to join <strong>{tokenData.orgName}</strong> on AiQ.
            Set up your account below.
          </CardDescription>
          <p className="text-xs text-muted-foreground pt-1">
            Signing in as <span className="font-medium text-foreground">{tokenData.email}</span>
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>
            {formError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{formError}</p>
            )}
            <Button type="submit" className="w-full" disabled={acceptMutation.isPending}>
              {acceptMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create account
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      {children}
    </div>
  );
}

function StatusCard({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <Card className="w-full max-w-md border-border text-center">
      <CardContent className="pt-10 pb-10 flex flex-col items-center gap-4">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
      </CardContent>
    </Card>
  );
}
