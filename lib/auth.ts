
import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.AUTH_SECRET || "dev-secret-change-me";
  return encoder.encode(secret);
}

export type SessionPayload = {
  username: string;
  role: "admin" | "employee";
};

export async function signSession(payload: SessionPayload) {
  const secret = getSecret();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    const username = String(payload.username || "");
    const role = String(payload.role || "");
    if (!username) return null;
    if (role !== "admin" && role !== "employee") return null;
    return { username, role } as SessionPayload;
  } catch {
    return null;
  }
}
