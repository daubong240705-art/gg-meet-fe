"use client";

import { Loader2, LogOut } from "lucide-react";

import { useLogoutMutation } from "@/hooks/auth/useLoginForm";
import { Button } from "@/components/ui/button";

export function AdminLogoutButton() {
    const logoutMutation = useLogoutMutation();

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
        >
            {logoutMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <LogOut className="h-4 w-4" />
            )}
            Sign out
        </Button>
    );
}
