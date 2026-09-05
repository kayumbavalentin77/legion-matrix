import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
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
import { ROLE_LABELS, ROLE_OPTIONS, useAuthState } from "@/lib/auth";
import { createAccount, deleteAccount, listAccounts, updateAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "Manage Users | Military Management System" },
      { name: "description", content: "Create accounts, assign sections and control access for system users." },
      { property: "og:title", content: "Manage Users | Military Management System" },
      { property: "og:description", content: "Create accounts, assign sections and control access for system users." },
    ],
  }),
  component: UsersPage,
});

type Account = {
  id: string;
  full_name: string;
  username: string | null;
  email: string | null;
  phone?: string | null;
  department: string | null;
  status: string;
  last_login: string | null;
  role: string;
};

const EMPTY = {
  id: "",
  full_name: "",
  username: "",
  email: "",
  phone: "",
  department: "",
  status: "Active",
  role: "viewer",
  password: "",
};

function UsersPage() {
  const { isSuperAdmin, isLoading: authLoading, user } = useAuthState();
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => (await listAccounts()) as unknown as Account[],
    enabled: isSuperAdmin,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["accounts"] });

  const save = useMutation({
    mutationFn: async () => {
      if (form.id) {
        await updateAccount({
          data: {
            id: form.id,
            full_name: form.full_name,
            username: form.username,
            phone: form.phone || null,
            department: form.department || null,
            status: form.status === "Suspended" ? "Suspended" : "Active",
            role: form.role as "super_admin",
            password: form.password || null,
          },
        });
      } else {
        await createAccount({
          data: {
            full_name: form.full_name,
            username: form.username,
            email: form.email,
            password: form.password,
            phone: form.phone || null,
            role: form.role as "super_admin",
          },
        });
      }
    },
    onSuccess: () => {
      toast.success(form.id ? "Account updated" : "Account created");
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not save the account"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await deleteAccount({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Account deleted");
      setDeleteId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete the account"),
  });

  if (authLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <h1 className="text-lg font-semibold">Restricted area</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Only the Super Admin can manage user accounts.
          </p>
        </CardContent>
      </Card>
    );
  }

  const openCreate = () => {
    setForm({ ...EMPTY });
    setOpen(true);
  };

  const openEdit = (account: Account) => {
    setForm({
      id: account.id,
      full_name: account.full_name ?? "",
      username: account.username ?? "",
      email: account.email ?? "",
      phone: account.phone ?? "",
      department: account.department ?? "",
      status: account.status ?? "Active",
      role: account.role,
      password: "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Users"
        description="Create accounts and assign each user to a section."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New account
          </Button>
        }
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.full_name}</TableCell>
                  <TableCell>{account.username ?? "—"}</TableCell>
                  <TableCell>{ROLE_LABELS[account.role] ?? account.role}</TableCell>
                  <TableCell>
                    <StatusBadge value={account.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {account.last_login ? new Date(account.last_login).toLocaleString() : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(account)} aria-label="Edit account">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={account.id === user?.id}
                      onClick={() => setDeleteId(account.id)}
                      aria-label="Delete account"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No accounts yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit account" : "New account"}</DialogTitle>
            <DialogDescription>
              The user signs in with their username. Passwords are stored securely by the
              authentication service and are never visible here.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1.5"
              />
            </div>
            {!form.id ? (
              <div className="sm:col-span-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            ) : null}
            <div>
              <Label htmlFor="role">Section / role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger id="role" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger id="status" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="password">{form.id ? "Reset password (optional)" : "Temporary password"}</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1.5"
                placeholder="Minimum 8 characters"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              The user will immediately lose access. Their recorded activity stays in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && remove.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
