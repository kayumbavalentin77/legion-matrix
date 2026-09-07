import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(128),
});

/** Roles that may be granted through the user-management screen. */
const MANAGEABLE_ROLES = ["s1", "s2", "s3"] as const;
const manageableRole = z.enum(MANAGEABLE_ROLES);

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(60)
  .regex(/^[a-zA-Z0-9._-]+$/, "Username may only contain letters, numbers, dot, dash or underscore");

const createSchema = z.object({
  full_name: z.string().trim().max(120).optional().nullable(),
  username: usernameSchema,
  email: z.string().trim().email().max(255).optional().nullable(),
  password: strongPassword,
  phone: z.string().trim().max(40).optional().nullable(),
  role: manageableRole,
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

/** Placeholder mailbox used when the Super Admin creates an account by username only. */
function derivedEmail(username: string) {
  return `${username.toLowerCase()}@mms.local`;
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

    const userId = session.session.user.id;

    const { data: status } = await supabaseAdmin
      .from("profiles")
      .select("status")
      .eq("id", userId)
      .maybeSingle();

    if ((status?.status ?? "Active") !== "Active") {
      await supabaseAdmin.from("audit_logs").insert({
        user_id: userId,
        user_name: data.username,
        action: "Login blocked",
        module: "Authentication",
        description: "Sign-in attempt on a deactivated account",
      });
      return { ok: false as const, error: "This account is deactivated. Contact the Super Admin." };
    }

    await supabaseAdmin
      .from("profiles")
      .update({ last_login: new Date().toISOString() })
      .eq("id", userId);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
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

/**
 * Server-side authorisation gate. Reads the role with the service client so the
 * check cannot be influenced by the caller, using only the verified user id.
 */
async function assertSuperAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: Super Admin access required.");
  return supabaseAdmin;
}

async function usernameTaken(
  admin: Awaited<ReturnType<typeof assertSuperAdmin>>,
  username: string,
  ignoreId?: string,
) {
  let q = admin.from("profiles").select("id").ilike("username", username);
  if (ignoreId) q = q.neq("id", ignoreId);
  const { data } = await q.maybeSingle();
  return Boolean(data);
}

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertSuperAdmin(context.userId);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      admin.from("profiles").select("*").order("created_at", { ascending: false }),
      admin.from("user_roles").select("user_id, role"),
    ]);
    const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role as string]));
    return (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "viewer" }));
  });

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertSuperAdmin(context.userId);

    if (await usernameTaken(admin, data.username)) {
      throw new Error("That username is already taken.");
    }

    const email = data.email?.trim() || derivedEmail(data.username);

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name ?? data.username, username: data.username },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create the account.");

    await admin
      .from("profiles")
      .update({
        full_name: data.full_name || data.username,
        username: data.username,
        phone: data.phone ?? null,
        email,
        status: "Active",
      })
      .eq("id", created.user.id);

    await admin.from("user_roles").delete().eq("user_id", created.user.id);
    await admin.from("user_roles").insert({ user_id: created.user.id, role: data.role });

    await admin.from("audit_logs").insert({
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
        full_name: z.string().trim().max(120).optional().nullable(),
        username: usernameSchema,
        phone: z.string().trim().max(40).optional().nullable(),
        department: z.string().trim().max(120).optional().nullable(),
        status: z.enum(["Active", "Inactive"]),
        role: manageableRole,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await assertSuperAdmin(context.userId);

    const { data: existing } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.id)
      .maybeSingle();
    if (existing?.role === "super_admin") {
      throw new Error("Super Admin accounts cannot be modified here.");
    }
    if (await usernameTaken(admin, data.username, data.id)) {
      throw new Error("That username is already taken.");
    }

    await admin
      .from("profiles")
      .update({
        full_name: data.full_name || data.username,
        username: data.username,
        phone: data.phone ?? null,
        department: data.department ?? null,
        status: data.status,
      })
      .eq("id", data.id);

    await admin.from("user_roles").delete().eq("user_id", data.id);
    await admin.from("user_roles").insert({ user_id: data.id, role: data.role });

    await admin.auth.admin.updateUserById(data.id, {
      ban_duration: data.status === "Inactive" ? "876000h" : "none",
    });

    await admin.from("audit_logs").insert({
      user_id: context.userId,
      user_name: "Super Admin",
      action: "Updated",
      module: "User Management",
      record_ref: data.id,
      description: `Updated account ${data.username}`,
    });

    return { ok: true as const };
  });

export const setAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["Active", "Inactive"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await assertSuperAdmin(context.userId);
    if (data.id === context.userId) throw new Error("You cannot deactivate your own account.");

    await admin.from("profiles").update({ status: data.status }).eq("id", data.id);
    await admin.auth.admin.updateUserById(data.id, {
      ban_duration: data.status === "Inactive" ? "876000h" : "none",
    });

    await admin.from("audit_logs").insert({
      user_id: context.userId,
      user_name: "Super Admin",
      action: data.status === "Active" ? "Activated" : "Deactivated",
      module: "User Management",
      record_ref: data.id,
      description: `Account marked ${data.status}`,
    });

    return { ok: true as const };
  });

export const resetAccountPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), password: strongPassword }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await assertSuperAdmin(context.userId);
    const { error } = await admin.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) throw new Error(error.message);

    await admin.from("audit_logs").insert({
      user_id: context.userId,
      user_name: "Super Admin",
      action: "Password reset",
      module: "User Management",
      record_ref: data.id,
      description: "Password reset by Super Admin",
    });

    return { ok: true as const };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertSuperAdmin(context.userId);
    if (data.id === context.userId) throw new Error("You cannot delete your own account.");

    const { data: existing } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.id)
      .maybeSingle();
    if (existing?.role === "super_admin") {
      throw new Error("Super Admin accounts cannot be deleted here.");
    }

    const { error } = await admin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);

    await admin.from("audit_logs").insert({
      user_id: context.userId,
      user_name: "Super Admin",
      action: "Deleted",
      module: "User Management",
      record_ref: data.id,
      description: "Deleted a user account",
    });
    return { ok: true as const };
  });
