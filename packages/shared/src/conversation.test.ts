import { expect, it } from "vitest";
import { exampleCommand, joaoTasks, replyTo } from "./conversation";
it("resume o cenário do João em uma resposta curta", () => {
  const r = replyTo("me dá o que é urgente", true, joaoTasks);
  expect(r.text).toContain("fornecedor X");
  expect(r.text).toContain("Amanda");
  expect(r.drafts).toBeUndefined();
});
it("prepara dois textos preservando datas e intervalo", () => {
  const r = replyTo(exampleCommand, true, joaoTasks);
  expect(r.drafts).toHaveLength(2);
  expect(r.drafts?.[0].text).toContain("dia 20");
  expect(r.drafts?.[0].text).toContain("dia 15");
  expect(r.drafts?.[1].text).toContain("uma hora");
  expect(joaoTasks.every((t) => t.status === "open")).toBe(true);
});
it("não usa o roteiro para inventar respostas de dados importados", () => {
  expect(replyTo(exampleCommand, false, []).drafts).toBeUndefined();
  expect(replyTo("urgente", false, []).text).toContain("histórico é parcial");
});
it("não substitui instruções diferentes por datas do exemplo", () => {
  expect(
    replyTo("prepara pro fornecedor dia 12 e pagamento dia 10", true, joaoTasks)
      .drafts,
  ).toBeUndefined();
});

it("respeita conclusão manual no resumo", () => {
  expect(
    replyTo(
      "urgente",
      true,
      joaoTasks.map((t) => ({ ...t, status: "resolved" })),
    ).text,
  ).toContain("marcadas como concluídas");
});
