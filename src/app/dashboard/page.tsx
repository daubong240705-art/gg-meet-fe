
import QuickAction from '@/components/dashboard/quick-action';

import Homeheader from '@/components/layout/home.header';


export default function DashboardPage() {




    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <Homeheader />

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Good morning, John!</h1>
                    <p className="text-muted-foreground text-lg">Saturday, February 28, 2026</p>
                </div> */}

                {/* Quick Actions */}
                <QuickAction />

                {/* Schedule Meeting */}
                {/* <div className="mb-12">
                    <Link href="/schedule">
                        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                                        <Calendar className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-1">Schedule a meeting</h3>
                                        <p className="text-muted-foreground">Plan ahead and send calendar invites</p>
                                    </div>
                                </div>
                                <Button variant="ghost">
                                    Schedule
                                </Button>
                            </div>
                        </Card>
                    </Link>
                </div> */}


            </div>
      
        </div>
    );
}