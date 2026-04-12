"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "../ui/button";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
    const { toggleTheme } = useTheme();

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="w-9 h-9 p-0"
            aria-label="Toggle theme"
        >
            <Moon className="h-5 w-5 dark:hidden" />
            <Sun className="hidden h-5 w-5 dark:block" />
        </Button>
    );
}
