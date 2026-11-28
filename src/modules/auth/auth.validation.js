import bcrypt from "bcryptjs";
import { z } from "zod";
import { EGYPT_PHONE_REGEX } from "../../common/validators/common.js";

const PASSWORD_MIN_LENGTH = 8;

const newPasswordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  )
  // bcrypt ignores everything after 72 bytes, so reject instead of truncating.
  .refine((value) => !bcrypt.truncates(value), "Password is too long");

export const registerBodySchema = z
  .strictObject({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(40, "Name must be at most 40 characters"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Invalid email address")),
    phone: z
      .string()
      .trim()
      .regex(EGYPT_PHONE_REGEX, "Invalid Egyptian phone number"),
    password: newPasswordSchema,
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords do not match",
    path: ["passwordConfirm"],
    // Run even when unrelated fields fail, so all errors are reported at once. => collecting all not fail-fast
    when: (payload) =>
      payload.issues.every(
        (issue) => !["password", "passwordConfirm"].includes(issue.path?.[0]),
      ),
  });

export const loginBodySchema = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email("Invalid email address")),
  password: z.string().min(1, "Password is required"),
});
