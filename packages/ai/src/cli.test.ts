import { expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const script = resolve("scripts/benchmark-ai.mts");
function run(args: string[], live = "false") {
  const directory = mkdtempSync(join(tmpdir(), "orbit-cli-"));
  const env = { ...process.env, ORBIT_AI_LIVE_ENABLED: live };
  delete env.CLOUDFLARE_ACCOUNT_ID;
  delete env.CLOUDFLARE_API_TOKEN;
  const result = spawnSync(
    process.execPath,
    ["--use-env-proxy", script, ...args],
    { cwd: directory, env, encoding: "utf8", timeout: 15_000 },
  );
  const createdBudget = existsSync(
    join(directory, ".cache/orbit-ai/budget.sqlite"),
  );
  rmSync(directory, { recursive: true, force: true });
  return { ...result, createdBudget };
}
it("CLI padrão usa fixtures e não cria orçamento real", () => {
  const result = run([]);
  expect(result.status).toBe(0);
  const rows = result.stdout
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  expect(rows.filter((r) => r.mode === "mock")).toHaveLength(3);
  expect(rows.some((r) => r.mode === "live")).toBe(false);
  expect(result.createdBudget).toBe(false);
});
it("modo real exige ativação explícita antes de reservar ou chamar", () => {
  const result = run(["--live"]);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("Chamadas reais desligadas");
  expect(result.createdBudget).toBe(false);
});
it("ativação sem credenciais falha antes de reservar ou chamar", () => {
  const result = run(["--live"], "true");
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("CLOUDFLARE_ACCOUNT_ID");
  expect(result.createdBudget).toBe(false);
});
