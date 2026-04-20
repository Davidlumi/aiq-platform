import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Zap, CheckCircle2 } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const resetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: (data: any) => {
      setSubmitted(true);
      if (data._devToken) setDevToken(data._devToken);
    },
  });

  const onSubmit = (data: FormData) => {
    resetMutation.mutate({ email: data.email });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--sidebar)] via-primary to-[var(--sidebar)] flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-white">AiQ</h1>
              <p className="text-white/60 text-sm">Capability Intelligence Platform</p>
            </div>
          </div>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Reset your password</CardTitle>
            <CardDescription>
              Enter your email and we'll send you a reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-4 space-y-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  If an account exists for that email, a reset link has been sent.
                </p>
                {devToken && (
                  <div className="p-3 bg-muted rounded-lg text-left">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Dev mode — reset token:</p>
                    <code className="text-xs break-all text-foreground">{devToken}</code>
                    <Link href={`/reset-password?token=${devToken}`}>
                      <Button size="sm" variant="outline" className="mt-2 w-full text-xs">
                        Use this token
                      </Button>
                    </Link>
                  </div>
                )}
                <Link href="/login">
                  <Button variant="outline" className="w-full">Back to Sign In</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="you@company.com" {...register("email")} />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent/90 text-white"
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                <div className="text-center">
                  <Link href="/login">
                    <span className="text-sm text-accent hover:underline cursor-pointer">
                      Back to Sign In
                    </span>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
