"use client";

import { AlertCircle, Loader2, Plus, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { ReasonDialog } from "@/components/reason-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { addAdminUser, removeAdminUser } from "@/app/actions";
import { formatDate } from "@/lib/format";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABEL,
  type AdminRole,
  type AssignableRole,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

export type AdminUserRecord = {
  user_id: string;
  role: AdminRole;
  added_at: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_color: string | null;
};

/**
 * Owner-only management of who can sign in here. The list is server data;
 * this holds the add dialog and the per-row remove confirmation.
 *
 * A Remove button is not rendered for the signed-in owner (no self-removal)
 * or for any owner row (owners are managed in SQL) — the RPC refuses both,
 * so the UI simply does not offer them.
 */
export function AdminUsersManager({
  rows,
  currentUserId,
}: {
  rows: AdminUserRecord[];
  currentUserId: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<AdminUserRecord | null>(null);
  const router = useRouter();

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" aria-hidden />
          Add admin
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <caption className="sr-only">Admin users</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {["Account", "Email", "Role", "Added", ""].map((header, index) => (
                  <TableHead
                    key={index}
                    className={cn(
                      "h-11 bg-muted text-xs font-medium tracking-wide text-muted-foreground uppercase",
                      index === 4 && "w-28 text-right"
                    )}
                  >
                    {header || <span className="sr-only">Actions</span>}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isSelf = row.user_id === currentUserId;
                const removable = !isSelf && row.role !== "owner";
                return (
                  <TableRow key={row.user_id}>
                    <TableCell className="py-3">
                      <span className="flex items-center gap-2.5">
                        <UserAvatar
                          name={row.display_name}
                          email={row.email}
                          avatarPath={row.avatar_url}
                          color={row.avatar_color}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {row.display_name ?? (
                              <span className="text-muted-foreground italic">
                                No profile
                              </span>
                            )}
                          </span>
                          {isSelf ? (
                            <span className="text-xs text-muted-foreground">You</span>
                          ) : null}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-muted-foreground">
                      {row.email ?? "—"}
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusBadge status={row.role} />
                    </TableCell>
                    <TableCell className="py-3 text-muted-foreground">
                      {formatDate(row.added_at)}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      {removable ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-red-50"
                          onClick={() => setRemoving(row)}
                        >
                          <UserMinus className="size-4" aria-hidden />
                          Remove
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {isSelf ? "Cannot remove yourself" : "Managed in SQL"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {addOpen ? (
        <AddAdminDialog
          open
          onOpenChange={(open) => {
            if (!open) setAddOpen(false);
          }}
        />
      ) : null}

      <ReasonDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title={`Remove ${removing?.email ?? "this admin"}?`}
        description="They lose access to this dashboard immediately. Their account in the app is unaffected."
        confirmLabel="Remove admin access"
        noteLabel="Reason"
        notePlaceholder="Why is this access being withdrawn?"
        noteRequired
        minLength={10}
        onConfirm={async (reason) => {
          if (!removing) return { success: false, error: "No admin selected" };
          const result = await removeAdminUser(removing.user_id, reason);
          if (result.success) router.refresh();
          return result;
        }}
      />
    </>
  );
}

function AddAdminDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("moderator");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleItems = ASSIGNABLE_ROLES.map((value) => ({
    value,
    label: ROLE_LABEL[value],
  }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await addAdminUser(email, role);
    setPending(false);
    if (!result.success) {
      setError(result.error ?? "Could not add the admin");
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add an admin</DialogTitle>
          <DialogDescription>
            The email must belong to an existing Nilya account. The owner role
            cannot be granted here.
          </DialogDescription>
        </DialogHeader>

        <form id="add-admin-form" onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={emailId}>Email</Label>
            <Input
              id={emailId}
              type="email"
              autoComplete="off"
              required
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <Select
              items={roleItems}
              value={role}
              onValueChange={(value) => {
                if (value) setRole(value as AssignableRole);
              }}
            >
              <SelectTrigger className="w-full" aria-label="Role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Admin and moderator can act on listings, users, reports and
              disputes. Support can read everything but change nothing here.
            </p>
          </div>

          {error ? (
            <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>
            Cancel
          </DialogClose>
          <Button type="submit" form="add-admin-form" disabled={pending || !email}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Adding…
              </>
            ) : (
              "Add admin"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
