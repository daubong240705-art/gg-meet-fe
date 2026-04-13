"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import Homefooter from "./home.footer";
import Homeheader from "./home.header";

function shouldRenderSiteShell(pathname: string | null) {
    if (!pathname) {
        return false;
    }

    return pathname === "/" || pathname.startsWith("/dashboard");
}

export function SiteShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    if (!shouldRenderSiteShell(pathname)) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen flex-col">
            <Homeheader />
            <main className="flex-1">{children}</main>
            <Homefooter />
        </div>
    );
}
