import z from "zod";

export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .email("Please enter a valid email address."),
    password: z
        .string()
        .min(6, "Password must be at least 6 characters."),
});

export type LoginForm = z.infer<typeof loginSchema>;

export const signupSchema = z
    .object({
        fullName: z
            .string()
            .trim()
            .min(1, "Full name is required."),
        email: z
            .string()
            .trim()
            .email("Please enter a valid email address."),
        password: z
            .string()
            .min(6, "Password must be at least 6 characters."),
        confirmPassword: z
            .string()
            .min(1, "Please confirm your password."),
        verifyCode: z
            .string()
            .trim()
            .regex(/^\d{6}$/, "Verification code must be exactly 6 digits."),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });

export type SignupForm = z.infer<typeof signupSchema>;
