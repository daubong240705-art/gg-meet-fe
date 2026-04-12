import { PlayCircle, Plus, Video } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function QuickAction() {
    return (
        <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    Start a new meeting
                </h2>
                <p className="text-muted-foreground mb-6">
                    Create an instant meeting and invite participants
                </p>
                <Button size="lg" className="w-full">
                    <PlayCircle className="w-5 h-5" />
                    Start instant meeting
                </Button>
            </Card>

            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    Join a meeting
                </h2>
                <p className="text-muted-foreground mb-4">
                    Enter a meeting code to join
                </p>
                <div className="flex gap-2">
                    <Input
                        placeholder="Enter meeting code"
                    />
                    <Button >
                        Join
                    </Button>
                </div>
            </Card>
        </div>
    )
}