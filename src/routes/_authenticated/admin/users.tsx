import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Filter,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/data";
import { useAuthState } from "@/lib/auth";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  resetAccountPassword,
  setAccountStatus,
  updateAccount,
} from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "User Management | Military Management System" },
      { name: "description", content: "Manage system users and access permissions across S1, S2 and S3 sections." },
      { property: "og:title", content: "User Management | Military Management System" },
      {
        property: "og:description",
        content: "Manage system users and access permissions across S1, S2 and S3 sections.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UserManagementPage,
});

type Account = {
  id: string;
  full_name: string;
  username: string | null;
  email: string | null;
  phone?: string | null;
  department: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  role: string;
};

const SECTION_ROLES = [
  { value: "s1", label: "S1", hint: "Personnel & Equipment" },
  { value: "s2", label: "S2", hint: "Intelligence" },
  { value: "s3", label: "S3", hint: "Operations" },
];

const ROLE_BADGE: Record<string, string> = {
  s1: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  s2: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  s3: "bg-chart-3/15 text-chart-3 border-chart-3/30",
};

function isActive(status: string | null | undefined) {
  return (status ?? "Active") === "Active";
}

function RoleBadge({ role }: { role: string }) {
  if (role === "super_admin") {
    return (
      <Badge variant="outline" className="gap-1 border-primary/40 bg-primary/10 text-primary">
        <ShieldCheck className="h-3 w-3" /> Super Admin
      </Badge>
    );
  }
  const known = SECTION_ROLES.find((r) => r.value === role);
  return (
    <Badge variant="outline" className={ROLE_BADGE[role] ?? ""}>
      {known ? known.label : "Unassigned"}
    </Badge>
  );
}

const EMPTY_FORM = {
  id: "",
  full_name: "",
  username: "",
  phone: "",
  department: "",
  status: "Active",
  role: "s1",
  password: "",
  confirm: "",
};

function UserManagementPage() {
  const { user } = useAuthState();
  const qc = useQueryClient();

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<Account | null>(null);
  const [resetPwd, setResetPwd] = useState({ password: "", confirm: "" });
  const [statusTarget, setStatusTarget] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);

  const {
    data: accounts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => (await listAccounts()) as unknown as Account[],
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["accounts"] });

  const summary = useMemo(() => {
    const count = (fn: (a: Account) => boolean) => accounts.filter(fn).length;
    return {
      total: accounts.length,
      active: count((a) => isActive(a.status)),
      inactive: count((a) => !isActive(a.status)),
      s1: count((a) => a.role === "s1"),
      s2: count((a) => a.role === "s2"),
      s3: count((a) => a.role === "s3"),
    };
  }, [accounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => {
      if (q && !String(a.username ?? "").toLowerCase().includes(q) && !String(a.full_name ?? "").toLowerCase().includes(q))
        return false;
      if (roleFilter !== "all" && a.role !== roleFilter) return false;
      if (statusFilter !== "all" && (statusFilter === "Active") !== isActive(a.status)) return false;
      return true;
    });
  }, [accounts, query, roleFilter, statusFilter]);

  const filtersDirty = query !== "" || roleFilter !== "all" || statusFilter !== "all";
  const clearFilters = () => {
    setQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const save = useMutation({
    mutationFn: async () => {
      if (form.id) {
        await updateAccount({
          data: {
            id: form.id,
            full_name: form.full_name || form.username,
            username: form.username,
            phone: form.phone || null,
            department: form.department || null,
            status: form.status === "Inactive" ? "Inactive" : "Active",
            role: form.role as "s1",
          },
        });
      } else {
        await createAccount({
          data: {
            full_name: form.full_name || form.username,
            username: form.username,
            password: form.password,
            phone: form.phone || null,
            role: form.role as "s1",
          },
        });
      }
    },
    onSuccess: () => {
      toast.success(form.id ? "User updated" : "User created and activated");
      setFormOpen(false);
      invalidate();
    },
    onError: (e: Error) => setFormError(e.message || "Could not save the user"),
  });

  const changeStatus = useMutation({
    mutationFn: async (vars: { id: string; status: "Active" | "Inactive" }) => {
      await setAccountStatus({ data: vars });
    },
    onSuccess: () => {
      toast.success("User status updated");
      setStatusTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not change the status"),
  });

  const resetPassword = useMutation({
    mutationFn: async () => {
      await resetAccountPassword({ data: { id: resetTarget!.id, password: resetPwd.password } });
    },
    onSuccess: () => {
      toast.success("Password reset");
      setResetTarget(null);
      setResetPwd({ password: "", confirm: "" });
    },
    onError: (e: Error) => toast.error(e.message || "Could not reset the password"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await deleteAccount({ data: { id } });
    },
    onSuccess: () => {
      toast.success("User deleted");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete the user"),
  });

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (account: Account) => {
    setForm({
      ...EMPTY_FORM,
      id: account.id,
      full_name: account.full_name ?? "",
      username: account.username ?? "",
      phone: account.phone ?? "",
      department: account.department ?? "",
      status: isActive(account.status) ? "Active" : "Inactive",
      role: SECTION_ROLES.some((r) => r.value === account.role) ? account.role : "s1",
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submitForm = () => {
    setFormError(null);
    if (!form.username.trim()) return setFormError("Username is required.");
    if (!/^[a-zA-Z0-9._-]{3,60}$/.test(form.username.trim()))
      return setFormError("Username must be 3–60 characters (letters, numbers, dot, dash or underscore).");
    if (!form.role) return setFormError("Role is required.");
    if (!form.id) {
      if (!form.password) return setFormError("Password is required.");
      if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password))
        return setFormError("Password must be at least 8 characters and include a letter and a number.");
      if (form.password !== form.confirm) return setFormError("Password and confirmation do not match.");
    }
    save.mutate();
  };

  const submitReset = () => {
    if (resetPwd.password.length < 8 || !/[A-Za-z]/.test(resetPwd.password) || !/[0-9]/.test(resetPwd.password)) {
      toast.error("Password must be at least 8 characters and include a letter and a number.");
      return;
    }
    if (resetPwd.password !== resetPwd.confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    resetPassword.mutate();
  };

  const cards = [
    { label: "Total Users", value: summary.total, icon: Users },
    { label: "Active Users", value: summary.active, icon: UserCheck },
    { label: "Inactive Users", value: summary.inactive, icon: UserX },
    { label: "S1 Users", value: summary.s1, icon: ShieldCheck },
    { label: "S2 Users", value: summary.s2, icon: ShieldCheck },
    { label: "S3 Users", value: summary.s3, icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage system users and access permissions"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Add User
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-md bg-muted p-2">
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{c.label}</p>
                <p className="text-xl font-semibold">{isLoading ? "—" : c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by username…"
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                {SECTION_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label} · {r.hint}
                  </SelectItem>
                ))}
                <SelectItem value="viewer">Unassigned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={clearFilters} disabled={!filtersDirty}>
              <X className="mr-1.5 h-4 w-4" /> Clear filters
            </Button>
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
              {error.message || "Could not load the user list."}
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No users found</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Adjust your search or filters, or add a new user to get started.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => {
                    const locked = a.role === "super_admin";
                    const self = a.id === user?.id;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          <span className="block truncate">{a.username ?? "—"}</span>
                          <span className="block truncate text-xs text-muted-foreground">{a.full_name}</span>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={a.role} />
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              isActive(a.status)
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                                : "border-destructive/30 bg-destructive/10 text-destructive"
                            }
                          >
                            {isActive(a.status) ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatDate(a.created_at)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatDate(a.updated_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={locked}
                              onClick={() => openEdit(a)}
                              aria-label="Edit user"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setResetPwd({ password: "", confirm: "" });
                                setResetTarget(a);
                              }}
                              aria-label="Reset password"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={self || locked}
                              onClick={() => setStatusTarget(a)}
                              aria-label={isActive(a.status) ? "Deactivate user" : "Activate user"}
                            >
                              {isActive(a.status) ? (
                                <UserX className="h-4 w-4 text-amber-600" />
                              ) : (
                                <UserCheck className="h-4 w-4 text-emerald-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={self || locked}
                              onClick={() => setDeleteTarget(a)}
                              aria-label="Delete user"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / edit user */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit user" : "Add user"}</DialogTitle>
            <DialogDescription>
              Users sign in with their username. Passwords are held securely by the authentication
              service and are never stored or shown here.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="full_name">Full name (optional)</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            {!form.id ? (
              <>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="mt-1.5"
                    placeholder="Min 8 chars, letter + number"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </>
            ) : null}
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger id="role" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTION_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label} · {r.hint}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.id ? (
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger id="status" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitForm} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {form.id ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password */}
      <Dialog open={resetTarget !== null} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{resetTarget?.username}</strong>. The existing password can
              never be viewed or recovered.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={resetPwd.password}
                onChange={(e) => setResetPwd({ ...resetPwd, password: e.target.value })}
                className="mt-1.5"
                placeholder="Min 8 chars, letter + number"
              />
            </div>
            <div>
              <Label htmlFor="new-confirm">Confirm new password</Label>
              <Input
                id="new-confirm"
                type="password"
                value={resetPwd.confirm}
                onChange={(e) => setResetPwd({ ...resetPwd, confirm: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitReset} disabled={resetPassword.isPending}>
              {resetPassword.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reset password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate / deactivate */}
      <AlertDialog open={statusTarget !== null} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusTarget && isActive(statusTarget.status)
                ? "Are you sure you want to deactivate this user?"
                : "Activate this user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget && isActive(statusTarget.status)
                ? "They will be signed out of protected features and blocked from signing in again."
                : "They will be able to sign in and use the sections assigned to their role."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                statusTarget &&
                changeStatus.mutate({
                  id: statusTarget.id,
                  status: isActive(statusTarget.status) ? "Inactive" : "Active",
                })
              }
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to permanently delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              The sign-in account and profile for <strong>{deleteTarget?.username}</strong> will be
              removed. Their recorded activity stays in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
