import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";

import { RwandaFlag } from "@/components/rwanda-flag";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { loginWithUsername } from "@/lib/account.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Secure Sign In | Military Management System" },
      { name: "description", content: "Sign in to the Military Management System with your service username." },
      { property: "og:title", content: "Secure Sign In | Military Management System" },
      { property: "og:description", content: "Authorised access only. Personnel, operations, intelligence and logistics." },
    ],
  }),
  component: AuthPage,
});

const REMEMBER_KEY = "mms.remember.username";

function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) setUsername(saved);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!username.trim() || password.length < 1) {
      setError("Enter your username and password.");
      return;
    }
    setLoading(true);
    try {
      const result = await loginWithUsername({
        data: { username: username.trim(), password },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });
      if (sessionError) {
        setError("Could not start your session. Please try again.");
        return;
      }
      if (remember) localStorage.setItem(REMEMBER_KEY, username.trim());
      else localStorage.removeItem(REMEMBER_KEY);
      navigate({ to: "/dashboard", replace: true });
    } catch {
      setError("Authentication service unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!username.includes("@")) {
      setError("Enter your registered email address to receive a reset link.");
      return;
    }
    setError(null);
    await supabase.auth.resetPasswordForEmail(username.trim(), {
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
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <Shield className="h-7 w-7" />
            </div>
            <RwandaFlag className="h-10 w-14" />
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
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  maxLength={255}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1.5"
                  placeholder="admin"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
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
                <p
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
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
                Secure login
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-sidebar-foreground/40">
          Accounts are issued by the Super Admin. Contact your system administrator for access.
        </p>
      </div>
    </div>
  );
}
