import { Video } from "lucide-react";

export default function Homefooter() {
    return (
        <footer className="border-t border-border bg-muted/30 py-12">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid md:grid-cols-3 gap-8 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                <Video className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-semibold">Kallio</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Professional video meetings made simple
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-3">Ngô Minh Đức</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><a href="#" className="hover:text-foreground transition-colors">Gmail: </a></li>
                            <li><a href="#" className="hover:text-foreground transition-colors">Github: </a></li>

                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-3">Giang gay</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><a href="#" className="hover:text-foreground transition-colors">Gmail: </a></li>
                            <li><a href="#" className="hover:text-foreground transition-colors">Github: </a></li>

                        </ul>
                    </div>

                    {/* <div>
                        <h4 className="font-semibold mb-3">Support</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
                            <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                            <li><a href="#" className="hover:text-foreground transition-colors">Status</a></li>
                        </ul>
                    </div> */}
                </div>

                <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
                    <p>&copy; 2026 Kallio. All rights reserved.</p>
                </div>
            </div>
        </footer>
    )
}