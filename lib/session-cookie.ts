import { COOKIE } from "./auth";

// The admin login cookie (7 days).
export const sessionCookie = (token: string) => ({
  name: COOKIE,
  value: token,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
});
