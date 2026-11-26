import dotenv from "dotenv";
import { z } from "zod";

// Load .env into process.env. This is the only place that does it.
dotenv.config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.coerce.number().int().min(1).max(65535),
  MONGODB_URI: z
    .string()
    .refine(
      (value) =>
        value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
      { message: "must start with mongodb:// or mongodb+srv://" },
    ),
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  BODY_LIMIT: z.string().default("100kb"),
  //  number of proxies in front of the app (0 = none)
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration:");
  for (const issue of result.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const env = result.data;

const config = Object.freeze({
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  port: env.PORT,
  db: Object.freeze({
    uri: env.MONGODB_URI,
  }),
  corsOrigins: Object.freeze(env.CORS_ORIGINS),
  bodyLimit: env.BODY_LIMIT,
  trustProxy: env.TRUST_PROXY,
});

export default config;
