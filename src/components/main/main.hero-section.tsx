import Link from "next/link";
import { Button } from "../ui/button";
import { Calendar, Shield, Users, Video, Zap } from "lucide-react";

export default function HeroSection() {
    return (<section className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
                Connect, collaborate,<br />anywhere you are
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 leading-relaxed">
                Professional video meetings for students, companies, and remote teams.
                Simple, secure, and seamless.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Link href="/dashboard">
                    <Button size="lg" className="w-full sm:w-auto">
                        <Video className="w-5 h-5" />
                        Start a meeting
                    </Button>
                </Link>
                <Link href="/dashboard">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                        <Calendar className="w-5 h-5" />
                        Schedule for later
                    </Button>
                </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>End-to-end encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Up to 100 participants</span>
                </div>
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span>HD quality</span>
                </div>
            </div>
        </div>
    </section>)

}