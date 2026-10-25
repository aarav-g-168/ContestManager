export class ProfileRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public headers: Record<string, string> = {},
  ) {
    super(message);
  }
}
