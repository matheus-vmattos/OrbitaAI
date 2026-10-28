import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CloudflareProvider } from "./provider.ts";
import { InputSchema, validateOutput } from "./contracts.ts";
import { AnalysisService } from "./service.ts";
import { LocalBudgetStore } from "./store.ts";
import {
  mockProvider,
  syntheticInput,
  syntheticOutput,
  evaluate,
} from "./fixtures.ts";

const stores: LocalBudgetStore[] = [];
const directories: string[] = [];
const store = () => {
  const s = new LocalBudgetStore(":memory:");
  stores.push(s);
  return s;
};
const now = () => new Date("2026-10-28T12:00:00Z");
afterEach(() => {
  for (const s of stores.splice(0)) s.close();
  for (const d of directories.splice(0))
    rmSync(d, { recursive: true, force: true });
});
describe("análise validada", () => {
  it("aceita evidência literal e não encerra nenhuma tarefa", () => {
    expect(validateOutput(syntheticOutput, syntheticInput)).toEqual(
      syntheticOutput,
    );
    expect(evaluate(syntheticOutput).passed).toBe(true);
  });
  it("rejeita ID inventado", () => {
    const out = structuredClone(syntheticOutput);
    out.observations[0].evidence[0].messageId = "fake";
    expect(() => validateOutput(out, syntheticInput)).toThrow(
      "vínculo literal",
    );
  });
  it("rejeita citação alterada", () => {
    const out = structuredClone(syntheticOutput);
    out.observations[0].evidence[0].quote = "Me envie hoje.";
    expect(() => validateOutput(out, syntheticInput)).toThrow(
      "vínculo literal",
    );
  });
  it("rejeita prazo sem trecho de evidência", () => {
    const out = structuredClone(syntheticOutput);
    out.observations[0].deadlineText = "sexta-feira";
    expect(() => validateOutput(out, syntheticInput)).toThrow("Prazo");
  });
  it("não aceita status de tarefa inventado pela IA", () => {
    const out = {
      ...syntheticOutput,
      observations: [
        { ...syntheticOutput.observations[0], status: "resolved" },
      ],
    };
    expect(() => validateOutput(out, syntheticInput)).toThrow();
  });
  it("valida datas e duplicatas antes de chamar provedor", () => {
    expect(() =>
      InputSchema.parse({
        ...syntheticInput,
        messages: [syntheticInput.messages[0], syntheticInput.messages[0]],
      }),
    ).toThrow("duplicados");
    expect(() =>
      InputSchema.parse({
        ...syntheticInput,
        messages: [{ ...syntheticInput.messages[0], timestamp: "ontem" }],
      }),
    ).toThrow();
  });
  it("não reporta benchmark aprovado se faltam atos", () => {
    expect(
      evaluate({ observations: syntheticOutput.observations.slice(1) }).passed,
    ).toBe(false);
  });
  it("rejeita tipos não autorizados", () => {
    expect(() =>
      validateOutput(
        {
          observations: [
            { ...syntheticOutput.observations[0], act: "send_message" },
          ],
        },
        syntheticInput,
      ),
    ).toThrow();
  });
});
describe("cache e orçamento persistente", () => {
  it("reusa análise sem outra reserva ou chamada", async () => {
    const run = vi.fn(mockProvider.run);
    const s = store();
    const service = new AnalysisService({ ...mockProvider, run }, s, now);
    await service.analyze(syntheticInput);
    expect((await service.analyze(syntheticInput)).cached).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
    expect(s.usage("2026-10-28").calls).toBe(1);
  });
  it("separa workspace, conversa e modelo", async () => {
    const run = vi.fn(mockProvider.run);
    const s = store();
    const service = new AnalysisService({ ...mockProvider, run }, s, now);
    await service.analyze(syntheticInput);
    await service.analyze({ ...syntheticInput, workspaceId: "outro" });
    await service.analyze({ ...syntheticInput, conversationId: "outra" });
    await new AnalysisService(
      { ...mockProvider, model: "outro", run },
      s,
      now,
    ).analyze(syntheticInput);
    expect(run).toHaveBeenCalledTimes(4);
  });
  it("limite diário bloqueia antes da chamada externa", async () => {
    const run = vi.fn(mockProvider.run);
    const s = store();
    const service = new AnalysisService({ ...mockProvider, run }, s, now);
    for (let i = 0; i < 10; i++)
      await service.analyze({ ...syntheticInput, conversationId: `conv-${i}` });
    await expect(
      service.analyze({ ...syntheticInput, conversationId: "conv-11" }),
    ).rejects.toThrow("Limite diário");
    expect(run).toHaveBeenCalledTimes(10);
  });
  it("reserva é compartilhada entre conexões e sobrevive reabertura", () => {
    const d = mkdtempSync(join(tmpdir(), "orbit-budget-"));
    directories.push(d);
    const path = join(d, "usage.sqlite");
    const a = new LocalBudgetStore(path);
    const b = new LocalBudgetStore(path);
    try {
      for (let i = 0; i < 5; i++) {
        a.reserve("2026-10-28", 100);
        b.reserve("2026-10-28", 100);
      }
      expect(() => b.reserve("2026-10-28", 100)).toThrow("Limite diário");
    } finally {
      a.close();
      b.close();
    }
    const reopened = new LocalBudgetStore(path);
    try {
      expect(reopened.usage("2026-10-28").calls).toBe(10);
    } finally {
      reopened.close();
    }
  });
  it("falha de rede não devolve reserva nem repete automaticamente", async () => {
    const run = vi.fn(async () => {
      throw new Error("network");
    });
    const s = store();
    await expect(
      new AnalysisService({ ...mockProvider, run }, s, now).analyze(
        syntheticInput,
      ),
    ).rejects.toThrow();
    expect(run).toHaveBeenCalledTimes(1);
    expect(s.usage("2026-10-28").calls).toBe(1);
  });
  it("saída inválida não entra no cache", async () => {
    const run = vi.fn(async () => ({ raw: { invalid: true }, usage: null }));
    const s = store();
    const service = new AnalysisService({ ...mockProvider, run }, s, now);
    await expect(service.analyze(syntheticInput)).rejects.toThrow();
    await expect(service.analyze(syntheticInput)).rejects.toThrow();
    expect(run).toHaveBeenCalledTimes(2);
  });
  it("cache expira e orçamento renova no dia seguinte", async () => {
    const run = vi.fn(mockProvider.run);
    const s = store();
    await new AnalysisService({ ...mockProvider, run }, s, now).analyze(
      syntheticInput,
    );
    await new AnalysisService(
      { ...mockProvider, run },
      s,
      () => new Date("2026-10-29T12:00:01Z"),
    ).analyze(syntheticInput);
    expect(run).toHaveBeenCalledTimes(2);
    expect(s.usage("2026-10-29").calls).toBe(1);
  });
  it("entrada grande é recusada sem chamada", async () => {
    const run = vi.fn(mockProvider.run);
    const s = store();
    await expect(
      new AnalysisService({ ...mockProvider, run }, s, now).analyze({
        ...syntheticInput,
        messages: Array.from({ length: 4 }, (_, i) => ({
          ...syntheticInput.messages[0],
          id: `x${i}`,
          text: "a".repeat(3900),
        })),
      }),
    ).rejects.toThrow("12 KB");
    expect(run).not.toHaveBeenCalled();
  });
});
describe("contrato HTTP Cloudflare sem consumo", () => {
  const account = "a".repeat(32);
  const model = "@cf/meta/llama-3.1-8b-instruct";
  it("usa JSON schema, limite de saída e endpoint fixo", async () => {
    const http = vi.fn(async () =>
      Response.json({
        success: true,
        result: {
          response: JSON.stringify(syntheticOutput),
          usage: { prompt_tokens: 100, completion_tokens: 80 },
        },
      }),
    );
    const result = await new CloudflareProvider(
      account,
      "test-only",
      model,
      http as typeof fetch,
    ).run(syntheticInput);
    expect(result.raw).toEqual(syntheticOutput);
    expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 80 });
    const [url, init] = http.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`,
    );
    const body = JSON.parse(String(init.body));
    expect(body.response_format.type).toBe("json_schema");
    expect(body.max_tokens).toBe(512);
    expect(body.messages[1].content).toContain("Me envie");
    expect(init.redirect).toBe("error");
  });
  it("aceita objeto JSON e distingue ausência de métricas de custo zero", async () => {
    const http = vi.fn(async () =>
      Response.json({ success: true, result: { response: syntheticOutput } }),
    );
    const r = await new CloudflareProvider(
      account,
      "test-only",
      model,
      http as typeof fetch,
    ).run(syntheticInput);
    expect(r.usage).toBeNull();
  });
  it.each([401, 429, 500])("erro HTTP %s não tem retry", async (status) => {
    const http = vi.fn(
      async () => new Response("private provider text", { status }),
    );
    await expect(
      new CloudflareProvider(
        account,
        "test-only",
        model,
        http as typeof fetch,
      ).run(syntheticInput),
    ).rejects.toThrow(`HTTP ${status}`);
    expect(http).toHaveBeenCalledTimes(1);
  });
  it("erro lógico e truncamento não viram sucesso", async () => {
    const http = vi.fn(async () =>
      Response.json({ success: false, result: { response: syntheticOutput } }),
    );
    await expect(
      new CloudflareProvider(
        account,
        "test-only",
        model,
        http as typeof fetch,
      ).run(syntheticInput),
    ).rejects.toThrow("Resposta inválida");
  });
});
