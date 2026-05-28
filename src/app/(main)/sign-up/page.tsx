import AuthFormPage from "@/components/auth/auth-form-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignUpPage() {
  return <AuthFormPage mode="sign-up" />;
}
