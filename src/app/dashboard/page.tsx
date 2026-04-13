import QuickAction from '@/components/dashboard/quick-action';

export default function DashboardPage() {
    return (
        <div className="bg-background py-8">
            <div className="max-w-7xl mx-auto px-6">
                {/* <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Good morning, John!</h1>
                    <p className="text-muted-foreground text-lg">Saturday, February 28, 2026</p>
                </div> */}

                <QuickAction />
            </div>
        </div>
    );
}
