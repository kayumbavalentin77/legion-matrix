import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Secure Sign In | Military Management System" },
      { name: "description", content: "Sign in to the Military Personnel & Resource Management System." },
      { property: "og:title", content: "Secure Sign In | Military Management System" },
      { property: "og:description", content: "Authorised access only. Personnel, equipment and logistics management." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(128),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid credentials");
      return;
    }
    setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      setLoading(false);
      if (error) {
        setError("Authentication failed. Check your credentials and try again.");
        return;
      }
      navigate({ to: "/dashboard", replace: true });
    } else {
      const { data, error } = await supabase.auth.signUp({
        ...parsed.data,
        options: { emailRedirectTo: window.location.origin },
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setNotice("Account created. Check your email to confirm your address before signing in.");
    }
  };

  const resetPassword = async () => {
    if (!email) {
      setError("Enter your email address first, then select Forgot password.");
      return;
    }
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setNotice("If the address exists, a password reset link has been sent.");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-sidebar px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          color: "white",
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-sm font-bold uppercase tracking-[0.28em] text-sidebar-foreground">
            Military Management System
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-sidebar-foreground/50">
            Authorised personnel only
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="email">Username / Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  maxLength={255}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5"
                  placeholder="officer@example.mil"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    maxLength={128}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} />
                  Remember me
                </label>
                <button type="button" onClick={resetPassword} className="text-sm text-primary hover:underline">
                  Forgot password?
                </button>
              </div>

              {error ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                  {notice}
                </p>
              ) : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {mode === "login" ? "Secure login" : "Create account"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {mode === "login" ? "No account yet?" : "Already registered?"}{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                >
                  {mode === "login" ? "Register" : "Sign in"}
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-sidebar-foreground/40">
          The first registered account receives Super Admin access. Later accounts start as Viewer.
        </p>
      </div>
    </div>
  );
}
