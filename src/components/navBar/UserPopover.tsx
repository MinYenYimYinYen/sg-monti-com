"use client";

import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/style/components/dropdown-menu";
import { Button } from "@/style/components/button";

export function UserPopover() {
  const user = useSelector(authSelect.user);
  const { logout } = useAuth();

  if (!user) return null;

  const initials =
    (user.firstName[0] ?? "") + (user.lastName[0] ?? "");
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {initials}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="font-normal">
          <p className="font-semibold text-foreground">{fullName}</p>
          <p className="text-xs text-muted-foreground">@{user.userName}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={() => logout()}
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
