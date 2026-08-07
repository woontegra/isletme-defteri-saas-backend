import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Geçersiz ortam değişkenleri:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export function isCorsOriginAllowed(origin: string): boolean {
  const allowedList = env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
  if (allowedList.includes(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return true;
  // Woontegra canlı domainleri (https)
  if (/^https:\/\/([\w-]+\.)?woontegra\.com$/.test(origin)) return true;
  return false;
}
