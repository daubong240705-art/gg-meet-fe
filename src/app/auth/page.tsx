"use client"

import { useState } from 'react';

import { Video, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';


export default function AuthPage() {
    const [isSignUp, setIsSignUp] = useState(false);




    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-6">
            <div className="absolute top-6 left-6">
                <Link href="/">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4" />
                        Back to home
                    </Button>
                </Link>
            </div>

            <div className="absolute top-6 right-6">
                <ThemeToggle />
            </div>

            <Card className="w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
                        <Video className="w-9 h-9 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">
                        {isSignUp ? 'Create an account' : 'Welcome back'}
                    </h1>
                    <p className="text-muted-foreground">
                        {isSignUp
                            ? 'Get started with Meetly today'
                            : 'Sign in to continue to Meetly'
                        }
                    </p>
                </div>


                {isSignUp && (
                    <div>
                        <label className="block text-sm mb-2">Full name</label>
                        <Input
                            type="text"
                            placeholder="John Doe"
                            // icon={<User className="w-5 h-5" />}
                            required
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm mb-2">Email address</label>
                    <Input
                        type="email"
                        placeholder="you@example.com"
                        //   icon={<Mail className="w-5 h-5" />}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm mb-2">Password</label>
                    <Input
                        type="password"
                        placeholder="••••••••"
                        //   icon={<Lock className="w-5 h-5" />}
                        required
                    />
                </div>

                {!isSignUp && (
                    <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 rounded border-border" />
                            <span className="text-muted-foreground">Remember me</span>
                        </label>
                        <a href="#" className="text-primary hover:underline">
                            Forgot password?
                        </a>
                    </div>
                )}

                <Button type="submit" className="w-full" size="lg">
                    {isSignUp ? 'Create account' : 'Sign in'}
                </Button>


                <div className="mt-6 text-center text-sm">
                    <span className="text-muted-foreground">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    </span>
                    {' '}
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-primary hover:underline font-medium"
                    >
                        {isSignUp ? 'Sign in' : 'Sign up'}
                    </button>
                </div>


            </Card>
        </div>
    );
}