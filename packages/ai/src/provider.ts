import {
  outputJsonSchema,
  systemPrompt,
  type AnalysisInput,
} from "./contracts.ts";
export const supportedModels = [
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
] as const;
export type Model = (typeof supportedModels)[number];
export type ProviderResult = {
  raw: unknown;
  usage: { inputTokens: number; outputTokens: number } | null;
};
export interface AnalysisProvider {
  id: string;
  model: string;
  run(input: AnalysisInput): Promise<ProviderResult>;
}

export function makeRequest(input: AnalysisInput) {
  return {
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: JSON.stringify({ self: input.self, messages: input.messages }),
      },
    ],
    max_tokens: 512,
    temperature: 0,
    response_format: { type: "json_schema", json_schema: outputJsonSchema },
  };
}
export class CloudflareProvider implements AnalysisProvider {
  readonly id = "cloudflare";
  private accountId: string;
  private token: string;
  private http: typeof fetch;
  readonly model: Model;
  constructor(
    accountId: string,
    token: string,
    model: Model,
    http: typeof fetch = fetch,
  ) {
    this.accountId = accountId;
    this.token = token;
    this.model = model;
    this.http = http;
    if (!/^[a-fA-F0-9]{32}$/.test(accountId) || !token)
      throw new Error("Credenciais Cloudflare não configuradas.");
    if (!supportedModels.includes(model))
      throw new Error("Modelo não habilitado para este comparador.");
  }
  async run(input: AnalysisInput): Promise<ProviderResult> {
    // Sem retries automáticos: timeout/erro pode já ter gerado consumo no provedor.
    const response = await this.http(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(makeRequest(input)),
        signal: AbortSignal.timeout(20_000),
        redirect: "error",
      },
    );
    if (!response.ok)
      throw new Error(
        `Falha no provedor (HTTP ${response.status}); sem retry.`,
      );
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Resposta vazia do provedor.");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 100_000)
          throw new Error("Resposta do provedor excede limite.");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const envelope = JSON.parse(new TextDecoder().decode(buffer));
    if (envelope.success !== true || envelope.result?.response === undefined)
      throw new Error("Resposta inválida do provedor.");
    const payload = envelope.result.response;
    const usage = envelope.result.usage;
    return {
      raw: typeof payload === "string" ? JSON.parse(payload) : payload,
      usage:
        usage &&
        Number.isSafeInteger(usage.prompt_tokens) &&
        usage.prompt_tokens >= 0 &&
        Number.isSafeInteger(usage.completion_tokens) &&
        usage.completion_tokens >= 0
          ? {
              inputTokens: usage.prompt_tokens,
              outputTokens: usage.completion_tokens,
            }
          : null,
    };
  }
}
