import { z } from "zod";

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

export const idParamsSchema = z.object({
  id: objectIdSchema,
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const EGYPT_PHONE_REGEX = /^01[0125][0-9]{8}$/;
