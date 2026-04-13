"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";

import { ThemeProvider } from "./theme-provider";

export function AppProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                {children}
                <Toaster position="top-right" richColors />
            </ThemeProvider>
        </QueryClientProvider>
    );
}
