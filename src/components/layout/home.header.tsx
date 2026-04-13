import { Video } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "../ui/button";

export default function Homeheader() {
    return (
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                        <Video className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-semibold text-foreground">Kallio</span>
                </Link>

                {/* <nav className="hidden md:flex items-center gap-8">
                    <a href="#features" className="text-foreground/70 hover:text-foreground transition-colors">Features</a>
                    <a href="#pricing" className="text-foreground/70 hover:text-foreground transition-colors">Pricing</a>
                    <a href="#about" className="text-foreground/70 hover:text-foreground transition-colors">About</a>
                </nav> */}

                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <Button asChild  size="sm">
                        <Link href="/sign-in">Sign in</Link>
                    </Button>
                </div>
            </div>
        </header>
    )

}
