import "dotenv/config";
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET;
if (!secret && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET must be set in production");
}
const JWT_SECRET = secret || "dev-only-secret-do-not-use-in-production";
if (!secret) console.warn("JWT_SECRET not set: using an insecure dev secret");

export type AuthUser = { id: number; email: string };
export type Ctx = { user: AuthUser | null };

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: String(user.id), email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function userFromRequest(request: Request): AuthUser | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as jwt.JwtPayload;
    return { id: Number(payload.sub), email: String(payload.email) };
  } catch {
    return null;
  }
}
