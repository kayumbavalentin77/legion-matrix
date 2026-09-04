import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(128),
});

const userSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  username: z.string().trim().min(3).max(60).regex(/^[a-zA-Z0-9._-]+$/),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  phone: z.string().trim().max(40).optional().nullable(),
  role: z.enum(["super_admin", "s1", "s2", "s3", "viewer"]),
});

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/**
 * Signs in with a username (or email) and password entirely server-side, so
 * account email addresses are never exposed to anonymous callers.
 */
export const loginWithUsername = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let email = data.username.includes("@") ? data.username : null;

    if (!email) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .ilike("username", data.username)
        .maybeSingle();
      email = profile?.email ?? null;
    }

    if (!email) return { ok: false as const, error: "Invalid username or password." };

    const { data: session, error } = await publicClient().auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (error || !session.session) {
      return { ok: false as const, error: "Invalid username or password." };
    }

    await supabaseAdmin
      .from("profiles")
      .update({ last_login: new Date().toISOString() })
      .eq("id", session.session.user.id);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: session.session.user.id,
      user_name: data.username,
      action: "Login",
      module: "Authentication",
      description: "User signed in",
    });

    return {
      ok: true as const,
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
    };
  });

async function assertSuperAdmin(context: { supabase: ReturnType<typeof publicClient>; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (!data) throw new Error("Forbidden: Super Admin access required.");
}

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").order("full_name"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role as string]));
    return (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "viewer" }));
  });

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => userSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, username: data.username },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create the account.");

    await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name,
        username: data.username,
        phone: data.phone ?? null,
        email: data.email,
        status: "Active",
      })
      .eq("id", created.user.id);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      user_name: "Super Admin",
      action: "Created",
      module: "User Management",
      record_ref: created.user.id,
      description: `Created account ${data.username} (${data.role})`,
    });

    return { ok: true as const, id: created.user.id };
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        full_name: z.string().trim().min(1).max(120),
        username: z.string().trim().min(3).max(60).regex(/^[a-zA-Z0-9._-]+$/),
        phone: z.string().trim().max(40).optional().nullable(),
        department: z.string().trim().max(120).optional().nullable(),
        status: z.enum(["Active", "Suspended"]),
        role: z.enum(["super_admin", "s1", "s2", "s3", "viewer"]),
        password: z.string().max(128).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name,
        username: data.username,
        phone: data.phone ?? null,
        department: data.department ?? null,
        status: data.status,
      })
      .eq("id", data.id);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.id, role: data.role });

    if (data.password && data.password.length >= 8) {
      await supabaseAdmin.auth.admin.updateUserById(data.id, { password: data.password });
    }
    await supabaseAdmin.auth.admin.updateUserById(data.id, {
      ban_duration: data.status === "Suspended" ? "876000h" : "none",
    });

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      user_name: "Super Admin",
      action: "Updated",
      module: "User Management",
      record_ref: data.id,
      description: `Updated account ${data.username}`,
    });

    return { ok: true as const };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as never);
    if (data.id === context.userId) throw new Error("You cannot delete your own account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      user_name: "Super Admin",
      action: "Deleted",
      module: "User Management",
      record_ref: data.id,
      description: "Deleted a user account",
    });
    return { ok: true as const };
  });
