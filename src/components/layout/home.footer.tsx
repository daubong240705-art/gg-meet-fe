import { Video } from "lucide-react";
import Link from "next/link";

const footerGroups = [
    {
        title: "Product",
        links: [
            { label: "Features", href: "/features" },
            { label: "How it works", href: "/how-it-works" },
            { label: "Security", href: "/security" },
        ],
    },
    {
        title: "Resources",
        links: [
            { label: "Help Center", href: "/help" },
            { label: "FAQ", href: "/faq" },
            { label: "About Kallio", href: "/about" },
        ],
    },
    {
        title: "Legal",
        links: [{ label: "Privacy Policy", href: "/privacy-policy" }],
    },
];

export default function Homefooter() {
    return (
        <footer className="border-t border-border bg-muted/30 py-12">
            <div className="mx-auto max-w-7xl px-6">
                <div className="mb-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <div className="mb-4 flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                                <Video className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-lg font-semibold">Kallio</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Professional video meetings made simple.
                        </p>
                    </div>

                    {footerGroups.map((group) => (
                        <div key={group.title}>
                            <h2 className="mb-3 text-base font-semibold">{group.title}</h2>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                {group.links.map((link) => (
                                    <li key={link.href}>
                                        <Link href={link.href} className="transition-colors hover:text-foreground">
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
                    <p>&copy; 2026 Kallio. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
