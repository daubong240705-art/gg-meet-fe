import { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import z from "zod";

export function zodResolver<TFieldValues extends FieldValues>(
    schema: z.ZodType<TFieldValues>,
): Resolver<TFieldValues> {
    return async (values) => {
        const result = await schema.safeParseAsync(values);

        if (result.success) {
            return {
                values: result.data,
                errors: {},
            };
        }

        const errors = result.error.issues.reduce<Record<string, { type: string; message: string }>>(
            (allErrors, issue) => {
                const fieldPath = issue.path.join(".");

                if (!fieldPath || allErrors[fieldPath]) {
                    return allErrors;
                }

                allErrors[fieldPath] = {
                    type: issue.code,
                    message: issue.message,
                };

                return allErrors;
            },
            {},
        );

        return {
            values: {} as Record<string, never>,
            errors: errors as FieldErrors<TFieldValues>,
        };
    };
}
