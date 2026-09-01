"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import { custFlagSelect } from "@/app/realGreen/custFlag/_lib/custFlagSelect";
import { authSelect } from "@/app/auth/authSlice";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/style/components/dropdown-menu";
import { Button } from "@/style/components/button";
import { Switch } from "@/style/components/switch";
import { Moon, Settings, Sun } from "lucide-react";
import { FlagFilterSection } from "./FlagFilterSection";
import { SetRenewalFlagsSection } from "./SetRenewalFlagsSection";
import { useIsClient } from "@/lib/hooks/useIsClient";

function getInitialDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("theme");
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return document.documentElement.classList.contains("dark");
}

export function GlobalConfigMenu() {
  const isClient = useIsClient();
  const flagDocs = useSelector(flagSelect.flagDocs);
  const selectedFlagIds = useSelector(custFlagSelect.selectedFlagIds);
  const role = useSelector(authSelect.role);
  const hasFlagFilters = flagDocs.length > 0;
  const canConfigureRenewalFlags = role === "admin" || role === "office";

  // Initialize from DOM/localStorage directly — avoids setState-in-effect
  const [isDark, setIsDark] = useState(getInitialDarkMode);

  // Sync class on mount in case localStorage differs from current class
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
    } else if (stored === "light") {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  function toggleDarkMode() {
    const next = !isDark;
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setIsDark(next);
  }

  if (!isClient) return null;

  const flagBadge = selectedFlagIds.length > 0 ? ` (${selectedFlagIds.length})` : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings className="h-4 w-4" />
          Config{flagBadge}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* Dark Mode row — onSelect preventDefault keeps dropdown open */}
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          onClick={toggleDarkMode}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
          </div>
          <Switch
            checked={isDark}
            onCheckedChange={toggleDarkMode}
            onClick={(e) => e.stopPropagation()}
          />
        </DropdownMenuItem>

        {hasFlagFilters && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                Flag Filters
                {selectedFlagIds.length > 0 && (
                  <span className="ml-auto text-xs text-primary font-semibold">
                    {selectedFlagIds.length}
                  </span>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <FlagFilterSection />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}

        {canConfigureRenewalFlags && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Set Renewal Flags</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <SetRenewalFlagsSection />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
