import { timingSafeEqual } from "node:crypto";
export function validJobToken(request: Request) {
  const secret = process.env.CRON_SECRET ?? "",
    token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  return (
    Buffer.byteLength(secret) >= 32 &&
    Buffer.byteLength(token) === Buffer.byteLength(secret) &&
    timingSafeEqual(Buffer.from(token), Buffer.from(secret))
  );
}
