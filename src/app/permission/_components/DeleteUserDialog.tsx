"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { authSelect } from "@/app/auth/authSlice";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { FormGroup } from "@/components/FormGroup";
import { Button } from "@/style/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/style/components/dialog";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";

/**
 * Superuser only. Deletes one user and their access for good, after the superuser re-enters their
 * own password (checked again on the server). The caller decides who may see this button.
 */
export function DeleteUserDialog({ userName }: { userName: string }) {
  const { resetDeleteUserStatus } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    // A finished delete leaves "success" behind (this dialog unmounts with the deleted user), so
    // every open and close starts from a clean status.
    resetDeleteUserStatus();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive" intensity="soft">
          <Trash2 />
          Delete user
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DeleteUserForm userName={userName} />
      </DialogContent>
    </Dialog>
  );
}

// Rendered only while the dialog is open, so the typed password is gone every time it closes.
function DeleteUserForm({ userName }: { userName: string }) {
  const { deleteUser } = useAuth();
  const status = useSelector(authSelect.deleteUserStatus);
  const users = useSelector(userCapabilitiesSelect.users);
  const [password, setPassword] = useState("");

  const person = users.find((user) => user.userName === userName);
  const displayName = person ? `${person.firstName} ${person.lastName}` : userName;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length === 0) return;
    // A wrong password comes back as an error message, and this dialog stays open for another try.
    deleteUser({ userName, password });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Delete {displayName}?</DialogTitle>
        <DialogDescription>
          This permanently deletes @{userName} and everything they can do in the app: their bundles, their direct
          capabilities, and any pending password reset. Any credit card they are responsible for becomes unassigned,
          and its account override is lost, so someone must assign it again before the next import. Things they
          created elsewhere, such as inventory counts and posted entries, are kept. This cannot be undone.
        </DialogDescription>
      </DialogHeader>

      <FormGroup>
        <Label htmlFor="delete-user-password">Your password</Label>
        <Input
          id="delete-user-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">Enter your own password to confirm.</p>
      </FormGroup>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" variant="destructive" intensity="solid" disabled={password.length === 0 || status === "pending"}>
          {status === "pending" ? "Deleting..." : "Delete user"}
        </Button>
      </DialogFooter>
    </form>
  );
}
