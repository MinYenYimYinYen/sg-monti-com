"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { UserPlus } from "lucide-react";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { authSelect } from "@/app/auth/authSlice";
import {
  checkPasswordEntry,
  PASSWORD_RULE_MESSAGE,
  SA_ID_RULE_MESSAGE,
  USER_ROLES,
  validateCreateUser,
} from "@/app/auth/_lib/userValidation";
import { USER_NAME_RULE_MESSAGE } from "@/app/auth/_lib/userNameUtils";
import { Notice } from "@/app/permission/_components/Notice";
import { FormGroup } from "@/components/FormGroup";
import type { Role } from "@/lib/api/types/roles";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { Switch } from "@/style/components/switch";

/**
 * Superuser only. Makes a regular user (real RealGreen employee id) or a kiosk user (made-up id),
 * with a password the administrator sets. Superuser status is never set here; that is a direct
 * database edit.
 */
export function CreateUserDialog() {
  const { resetCreateUserStatus } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    // Closing clears the result, so the next time the dialog opens it shows a fresh form.
    if (!open) resetCreateUserStatus();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus />
          Create User
        </Button>
      </DialogTrigger>
      {/* The form is taller than a short window, and the dialog is fixed-position, so it must scroll itself. */}
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <CreateUserForm />
      </DialogContent>
    </Dialog>
  );
}

type CreateUserFormState = {
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  saId: string;
  role: Role;
  isKiosk: boolean;
  password: string;
  confirmPassword: string;
  mustChangePassword: boolean;
};

const EMPTY_FORM: CreateUserFormState = {
  userName: "",
  email: "",
  firstName: "",
  lastName: "",
  saId: "",
  role: "office",
  isKiosk: false,
  password: "",
  confirmPassword: "",
  mustChangePassword: false,
};

// Rendered only while the dialog is open, so its state resets every time it opens.
function CreateUserForm() {
  const { createUser } = useAuth();
  const status = useSelector(authSelect.createUserStatus);
  const [form, setForm] = useState<CreateUserFormState>(EMPTY_FORM);
  const [problem, setProblem] = useState<string | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const passwordProblem = checkPasswordEntry({
      password: form.password,
      confirmPassword: form.confirmPassword,
    });
    if (passwordProblem) {
      setProblem(passwordProblem);
      return;
    }
    // The confirmation is form-only, so it is left out of what is sent.
    const { confirmPassword: _confirmPassword, ...fields } = form;
    const check = validateCreateUser(fields);
    if (!check.ok) {
      setProblem(check.message);
      return;
    }
    setProblem(null);
    createUser(check.value);
  }

  if (status === "success") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>User created</DialogTitle>
          <DialogDescription>
            {form.mustChangePassword
              ? "The user signs in with the password you set and must choose a new one at first login."
              : "The user can sign in with the password you set."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogFooter>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <DialogHeader>
        <DialogTitle>Create User</DialogTitle>
        <DialogDescription>
          Creates a user with a password you set. Employees can also register
          themselves.
        </DialogDescription>
      </DialogHeader>

      <FormGroup className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="create-isKiosk">Kiosk</Label>
          <p className="text-xs text-muted-foreground">
            A shared-device user with a made-up saId. Leave off for a real
            employee.
          </p>
        </div>
        <Switch
          id="create-isKiosk"
          checked={form.isKiosk}
          onCheckedChange={(checked) =>
            setForm((previous) => ({ ...previous, isKiosk: checked }))
          }
        />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="create-userName">Username</Label>
        <Input
          id="create-userName"
          name="userName"
          value={form.userName}
          onChange={handleChange}
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          {USER_NAME_RULE_MESSAGE}
        </p>
      </FormGroup>

      <FormGroup>
        <Label htmlFor="create-email">Email</Label>
        <Input
          id="create-email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          autoComplete="off"
        />
      </FormGroup>

      <div className="grid grid-cols-2 gap-4">
        <FormGroup>
          <Label htmlFor="create-firstName">First name</Label>
          <Input
            id="create-firstName"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="create-lastName">Last name</Label>
          <Input
            id="create-lastName"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
          />
        </FormGroup>
      </div>

      <FormGroup>
        <Label htmlFor="create-saId">saId</Label>
        <Input
          id="create-saId"
          name="saId"
          value={form.saId}
          onChange={handleChange}
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          {form.isKiosk
            ? "A made-up id that must not belong to a real RealGreen employee. "
            : "The person's RealGreen employee id. It is checked against RealGreen and must not already belong to a user. "}
          {SA_ID_RULE_MESSAGE}
        </p>
      </FormGroup>

      <FormGroup>
        <Label>Role</Label>
        <Select
          variant="shadcnDefault"
          value={form.role}
          onValueChange={(role) =>
            setForm((previous) => ({ ...previous, role: role as Role }))
          }
        >
          <SelectTrigger variant="shadcnDefault">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {USER_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/*<p className="text-xs text-muted-foreground">*/}
        {/*  A user who resolves password resets needs the admin role until roles*/}
        {/*  are retired.*/}
        {/*</p>*/}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="create-password">Password</Label>
        <Input
          id="create-password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">{PASSWORD_RULE_MESSAGE}</p>
      </FormGroup>

      <FormGroup>
        <Label htmlFor="create-confirmPassword">Confirm password</Label>
        <Input
          id="create-confirmPassword"
          name="confirmPassword"
          type="password"
          value={form.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
        />
      </FormGroup>

      <FormGroup className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="create-mustChangePassword">
            Force password reset on login
          </Label>
          <p className="text-xs text-muted-foreground">
            If checked, the password above is temporary. The user must choose a
            new one the first time they sign in.
          </p>
        </div>
        <Switch
          id="create-mustChangePassword"
          checked={form.mustChangePassword}
          onCheckedChange={(checked) =>
            setForm((previous) => ({
              ...previous,
              mustChangePassword: checked,
            }))
          }
        />
      </FormGroup>

      {problem && <Notice tone="warning">{problem}</Notice>}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={status === "pending"}>
          Create User
        </Button>
      </DialogFooter>
    </form>
  );
}
