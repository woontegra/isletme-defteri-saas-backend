import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { env } from "../config/env";

export interface JwtPayload {
  userId: string;
  tenantId: string;
  rol: UserRole;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
