import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import {
  CloudflareProvider,
  supportedModels,
} from "../packages/ai/src/provider.ts";
import { AnalysisService } from "../packages/ai/src/service.ts";
import { LocalBudgetStore } from "../packages/ai/src/store.ts";
import {
  benchmarkCases,
  mockProvider,
  evaluate,
} from "../packages/ai/src/fixtures.ts";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
if (args.some((a) => a !== "--live"))
  throw new Error("Opção inválida. Use sem argumentos (mock) ou --live.");
const live = args.includes("--live");
if (live && process.env.ORBIT_AI_LIVE_ENABLED !== "true")
  throw new Error(
    "Chamadas reais desligadas. Defina ORBIT_AI_LIVE_ENABLED=true somente para o teste autorizado.",
  );
const account = process.env.CLOUDFLARE_ACCOUNT_ID,
  token = process.env.CLOUDFLARE_API_TOKEN;
if (live && (!account || !token))
  throw new Error(
    "Configure CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_API_TOKEN em ambiente seguro. Não informe valores no chat.",
  );
const directory = join(process.cwd(), ".cache", "orbit-ai");
mkdirSync(directory, { recursive: true });
const store = new LocalBudgetStore(
  live ? join(directory, "budget.sqlite") : ":memory:",
);
const providers = live
  ? supportedModels.map(
      (model) => new CloudflareProvider(account!, token!, model),
    )
  : [mockProvider];
let failed = false;
try {
  for (const provider of providers)
    for (const test of benchmarkCases) {
      const selected = live
        ? provider
        : {
            ...mockProvider,
            run: async () => ({ raw: test.expected, usage: null }),
          };
      const service = new AnalysisService(selected, store);
      const start = performance.now();
      try {
        const result = await service.analyze(test.input);
        const quality = evaluate(result.analysis, test.expected);
        console.log(
          JSON.stringify({
            mode: live ? "live" : "mock",
            provider: provider.id,
            model: provider.model,
            case: test.id,
            cached: result.cached,
            latencyMs: Math.round(performance.now() - start),
            ...quality,
            usage: result.usage,
            requiresReview: result.requiresReview,
            scope:
              "classificação de atos com evidência sintética; sem benchmark de redação ou áudio",
            costUsd: null,
          }),
        );
        if (!quality.passed) failed = true;
      } catch {
        failed = true;
        console.log(
          JSON.stringify({
            mode: live ? "live" : "mock",
            provider: provider.id,
            model: provider.model,
            passed: false,
            error:
              "Teste não concluído; orçamento reservado mantido. Verifique configuração, rede, quota e compatibilidade. Sem retry.",
          }),
        );
      }
    }
  console.log(
    JSON.stringify({
      day: new Date().toISOString().slice(0, 10),
      localReservation: store.usage(new Date().toISOString().slice(0, 10)),
      billing:
        "Reserva local, não custo real. Consumo total da conta deve ser conferido no provedor.",
    }),
  );
} finally {
  store.close();
}
if (failed) process.exitCode = 1;
