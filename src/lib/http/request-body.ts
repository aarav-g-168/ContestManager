import { ProfileRequestError } from "@/lib/http/request-error";
export async function readLimitedText(request: Request, max = 16384) {
  if (Number(request.headers.get("content-length")) > max)
    throw new ProfileRequestError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ProfileRequestError("The request body is empty.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new ProfileRequestError("Request is too large.", 413);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
export async function readAccountJson(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    const input = JSON.parse(await readLimitedText(request));
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new Error();
    return input;
  } catch (error) {
    if (error instanceof ProfileRequestError) throw error;
    throw new ProfileRequestError("The request contains invalid data.", 400);
  }
}
