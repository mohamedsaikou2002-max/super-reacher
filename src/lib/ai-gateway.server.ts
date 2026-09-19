// Server-only helper that connects the AI SDK to the Lovable AI Gateway and
// propagates the gateway run id across requests.

export type LovableRunIdFetch = { fetch: typeof fetch; getRunId: () => string | undefined };

export function createLovableAiGatewayRunIdFetch(initialRunId?: string): LovableRunIdFetch {
  let runId = initialRunId;
  const wrapped: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
    const response = await fetch(input, { ...init, headers });
    const returned = response.headers.get("X-Lovable-AIG-Run-ID");
    if (returned) runId = returned;
    return response;
  };
  return { fetch: wrapped, getRunId: () => runId };
}
