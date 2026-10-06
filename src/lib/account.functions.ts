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
const MANAGEABLE_ROLES = ["s1", "s2", "s3", "viewer", "administrator"] as const;
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
  email: z.string().trim().email().max(255),
  password: strongPassword,
  phone: z.string().trim().max(40).optional().nullable(),
  department: z.string().trim().max(120).optional().nullable(),
  status: z.enum(["Active", "Inactive"]).default("Active"),
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
 * Server-side authorisation gate: caller must hold super_admin or administrator.
 * Uses the service client keyed on the verified user id only.
 */
async function assertUserAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: roles }, { data: profile }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
    supabaseAdmin.from("profiles").select("username, full_name").eq("id", userId).maybeSingle(),
  ]);
  const list = (roles ?? []).map((r) => r.role as string);
  const isSuper = list.includes("super_admin");
  if (!isSuper && !list.includes("administrator")) {
    throw new Error("Forbidden: administrator access required.");
  }
  return {
    admin: supabaseAdmin,
    isSuper,
    actor: profile?.username || profile?.full_name || (isSuper ? "Super Admin" : "Administrator"),
  };
}

type Ctx = Awaited<ReturnType<typeof assertUserAdmin>>;

async function targetRole(ctx: Ctx, id: string) {
  const { data } = await ctx.admin.from("user_roles").select("role").eq("user_id", id);
  const list = (data ?? []).map((r) => r.role as string);
  if (list.includes("super_admin")) return "super_admin";
  if (list.includes("administrator")) return "administrator";
  return list[0] ?? "viewer";
}

/** Rules on which accounts / roles the caller may touch. */
function assertCanManage(ctx: Ctx, currentRole: string, nextRole?: string) {
  if (currentRole === "super_admin") throw new Error("Super Admin accounts cannot be modified here.");
  if (currentRole === "administrator" && !ctx.isSuper)
    throw new Error("Only a Super Admin can manage Administrator accounts.");
  if (nextRole === "administrator" && !ctx.isSuper)
    throw new Error("Only a Super Admin can grant the Administrator role.");
}

async function usernameTaken(ctx: Ctx, username: string, ignoreId?: string) {
  let q = ctx.admin.from("profiles").select("id").ilike("username", username);
  if (ignoreId) q = q.neq("id", ignoreId);
  const { data } = await q.limit(1);
  return (data ?? []).length > 0;
}

async function emailTaken(ctx: Ctx, email: string, ignoreId?: string) {
  let q = ctx.admin.from("profiles").select("id").ilike("email", email);
  if (ignoreId) q = q.neq("id", ignoreId);
  const { data } = await q.limit(1);
  return (data ?? []).length > 0;
}

async function audit(ctx: Ctx, userId: string, action: string, ref: string, description: string) {
  await ctx.admin.from("audit_logs").insert({
    user_id: userId,
    user_name: ctx.actor,
    action,
    module: "User Management",
    record_ref: ref,
    description,
  });
}

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await assertUserAdmin(context.userId);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      ctx.admin.from("profiles").select("*").order("created_at", { ascending: false }),
      ctx.admin.from("user_roles").select("user_id, role"),
    ]);
    const rank = (r: string) => (r === "super_admin" ? 3 : r === "administrator" ? 2 : r === "viewer" ? 0 : 1);
    const roleMap = new Map<string, string>();
    for (const r of roles ?? []) {
      const prev = roleMap.get(r.user_id);
      if (!prev || rank(r.role) > rank(prev)) roleMap.set(r.user_id, r.role);
    }
    return {
      isSuper: ctx.isSuper,
      accounts: (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "viewer" })),
    };
  });

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const ctx = await assertUserAdmin(context.userId);
    assertCanManage(ctx, "viewer", data.role);
    if (await usernameTaken(ctx, data.username)) throw new Error("That username is already taken.");
    if (await emailTaken(ctx, data.email)) throw new Error("That email is already registered.");

    const { data: created, error } = await ctx.admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name || data.username, username: data.username },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create the account.");
    const id = created.user.id;

    await ctx.admin
      .from("profiles")
      .update({
        full_name: data.full_name || data.username,
        username: data.username,
        phone: data.phone ?? null,
        department: data.department ?? null,
        email: data.email,
        status: data.status,
      })
      .eq("id", id);

    await ctx.admin.from("user_roles").delete().eq("user_id", id);
    await ctx.admin.from("user_roles").insert({ user_id: id, role: data.role });
    if (data.status === "Inactive") await ctx.admin.auth.admin.updateUserById(id, { ban_duration: "876000h" });

    await audit(ctx, context.userId, "Created", id, `Created account ${data.username} (${data.role})`);
    return { ok: true as const, id };
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        full_name: z.string().trim().max(120).optional().nullable(),
        username: usernameSchema,
        email: z.string().trim().email().max(255),
        phone: z.string().trim().max(40).optional().nullable(),
        department: z.string().trim().max(120).optional().nullable(),
        status: z.enum(["Active", "Inactive"]),
        role: manageableRole,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = await assertUserAdmin(context.userId);
    if (data.id === context.userId) throw new Error("You cannot change your own account here.");
    const current = await targetRole(ctx, data.id);
    assertCanManage(ctx, current, data.role);
    if (await usernameTaken(ctx, data.username, data.id)) throw new Error("That username is already taken.");
    if (await emailTaken(ctx, data.email, data.id)) throw new Error("That email is already registered.");

    const { data: before } = await ctx.admin.from("profiles").select("email, status").eq("id", data.id).maybeSingle();

    const authUpdate: { email?: string; email_confirm?: boolean; ban_duration: string } = {
      ban_duration: data.status === "Inactive" ? "876000h" : "none",
    };
    if (before?.email?.toLowerCase() !== data.email.toLowerCase()) {
      authUpdate.email = data.email;
      authUpdate.email_confirm = true;
    }
    const { error } = await ctx.admin.auth.admin.updateUserById(data.id, authUpdate);
    if (error) throw new Error(error.message);

    await ctx.admin
      .from("profiles")
      .update({
        full_name: data.full_name || data.username,
        username: data.username,
        email: data.email,
        phone: data.phone ?? null,
        department: data.department ?? null,
        status: data.status,
      })
      .eq("id", data.id);

    if (current !== data.role) {
      await ctx.admin.from("user_roles").delete().eq("user_id", data.id);
      await ctx.admin.from("user_roles").insert({ user_id: data.id, role: data.role });
      await audit(ctx, context.userId, "Role changed", data.id, `${data.username}: ${current} → ${data.role}`);
    }
    if ((before?.status ?? "Active") !== data.status) {
      await audit(ctx, context.userId, data.status === "Active" ? "Activated" : "Deactivated", data.id, `Account ${data.username} marked ${data.status}`);
    }
    await audit(ctx, context.userId, "Updated", data.id, `Updated account ${data.username}`);
    return { ok: true as const };
  });

export const setAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["Active", "Inactive"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = await assertUserAdmin(context.userId);
    if (data.id === context.userId) throw new Error("You cannot deactivate your own account.");
    assertCanManage(ctx, await targetRole(ctx, data.id));

    await ctx.admin.from("profiles").update({ status: data.status }).eq("id", data.id);
    await ctx.admin.auth.admin.updateUserById(data.id, {
      ban_duration: data.status === "Inactive" ? "876000h" : "none",
    });
    await audit(ctx, context.userId, data.status === "Active" ? "Activated" : "Deactivated", data.id, `Account marked ${data.status}`);
    return { ok: true as const };
  });

export const resetAccountPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), password: strongPassword }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = await assertUserAdmin(context.userId);
    const current = await targetRole(ctx, data.id);
    // Super Admins may reset their own password; otherwise normal management rules apply.
    if (!(ctx.isSuper && data.id === context.userId)) assertCanManage(ctx, current);
    const { error } = await ctx.admin.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) throw new Error(error.message);
    await audit(ctx, context.userId, "Password reset", data.id, "Password reset by administrator");
    return { ok: true as const };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = await assertUserAdmin(context.userId);
    if (data.id === context.userId) throw new Error("You cannot delete your own account.");
    assertCanManage(ctx, await targetRole(ctx, data.id));
    const { data: p } = await ctx.admin.from("profiles").select("username").eq("id", data.id).maybeSingle();
    const { error } = await ctx.admin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    await ctx.admin.from("user_roles").delete().eq("user_id", data.id);
    await ctx.admin.from("profiles").delete().eq("id", data.id);
    await audit(ctx, context.userId, "Deleted", data.id, `Deleted account ${p?.username ?? data.id}`);
    return { ok: true as const };
  });
