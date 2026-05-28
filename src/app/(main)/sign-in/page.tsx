import AuthFormPage from "@/components/auth/auth-form-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignInPage() {
  return <AuthFormPage mode="sign-in" />;
}
