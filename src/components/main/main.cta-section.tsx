import Link from "next/link";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

export default function CTASection() {
    return (
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-10 md:pb-12">
            <Card className="p-12 md:p-16 text-center bg-linear-to-br from-primary/5 to-primary/10 border-primary/20">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Ready to get started?
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                    Join thousands of teams already using Kallio for their video meetings
                </p>
                <Link href="/dashboard">
                    <Button size="lg">
                        Start your first meeting
                    </Button>
                </Link>
            </Card>
        </section>
    )
}
