/**
 * VerifyEmailPage — handles the /verify-email?token=... link from the verification email
 * Calls trpc.auth.verifyEmail on mount, then redirects to /login on success.
 */
import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function VerifyEmailPage() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);
  }, []);

  const verifyMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => {
      setStatus("success");
      // Redirect to login after 2.5 seconds
      setTimeout(() => navigate("/login"), 2500);
    },
    onError: (err) => {
      setStatus("error");
      setErrorMessage(err.message ?? "Verification failed. Please request a new link.");
    },
  });

  useEffect(() => {
    if (token) {
      verifyMutation.mutate({ token, origin: window.location.origin });
    } else if (token === "") {
      setStatus("error");
      setErrorMessage("No verification token found. Please use the link from your email.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px] text-center space-y-6">
        {/* Logo */}
        <div className="mb-2">
          <span className="text-2xl font-bold tracking-tight text-foreground">
            A<span className="text-primary">i</span>Q
          </span>
        </div>

        {status === "loading" && (
          <>
            <div className="flex justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground mb-1">Verifying your email…</h1>
              <p className="text-sm text-muted-foreground">Just a moment.</p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground mb-1">Email verified</h1>
              <p className="text-sm text-muted-foreground">
                Your account is now active. Redirecting you to sign in…
              </p>
            </div>
            <Button className="w-full" onClick={() => navigate("/login")}>
              Sign in now
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground mb-1">Verification failed</h1>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => navigate("/register")}>
                Create a new account
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
                Sign in
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
