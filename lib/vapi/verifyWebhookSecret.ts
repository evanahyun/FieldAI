/**
 * Matches Vapi Custom Credential patterns: Bearer on `Authorization`, or legacy `X-Vapi-Secret`.
 */
export function verifyVapiWebhookSecret(request: Request, expected: string): boolean {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  const xVapi =
    request.headers.get("x-vapi-secret")?.trim() ?? request.headers.get("X-Vapi-Secret")?.trim() ?? null;
  return bearer === expected || xVapi === expected;
}
