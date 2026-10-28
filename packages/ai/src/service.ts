import { createHash } from "node:crypto";
import {
  InputSchema,
  promptVersion,
  validateOutput,
  type AnalysisInput,
  type AnalysisOutput,
} from "./contracts.ts";
import { makeRequest, type AnalysisProvider } from "./provider.ts";
import { LocalBudgetStore } from "./store.ts";

export class AnalysisService {
  private provider: AnalysisProvider;
  private store: LocalBudgetStore;
  private clock: () => Date;
  constructor(
    provider: AnalysisProvider,
    store: LocalBudgetStore,
    clock: () => Date = () => new Date(),
  ) {
    this.provider = provider;
    this.store = store;
    this.clock = clock;
  }
  async analyze(rawInput: AnalysisInput): Promise<{
    analysis: AnalysisOutput;
    cached: boolean;
    requiresReview: true;
    usage: { inputTokens: number; outputTokens: number } | null;
  }> {
    const input = InputSchema.parse(rawInput);
    const bytes = Buffer.byteLength(JSON.stringify(makeRequest(input)), "utf8");
    if (bytes > 12_000)
      throw new Error(
        "Contexto excede 12 KB. Reduza o lote antes de chamar a IA.",
      );
    // Escopo recebido do chamador confiável; não é credencial nem autorização de endpoint.
    const key = createHash("sha256")
      .update(
        JSON.stringify({
          provider: this.provider.id,
          model: this.provider.model,
          promptVersion,
          input,
        }),
      )
      .digest("hex");
    const now = this.clock();
    const hit = this.store.get(key, now.getTime());
    if (hit !== undefined)
      return {
        analysis: validateOutput(hit, input),
        cached: true,
        requiresReview: true,
        usage: null,
      };
    this.store.reserve(now.toISOString().slice(0, 10), bytes);
    const result = await this.provider.run(input);
    const analysis = validateOutput(result.raw, input);
    this.store.put(key, analysis, now.getTime());
    return {
      analysis,
      cached: false,
      requiresReview: true,
      usage: result.usage,
    };
  }
}
