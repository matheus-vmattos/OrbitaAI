import { describe, expect, it } from "vitest";
import { parseExport, extractTasks, prioritize, demoTasks } from "./index";
describe("importação e obrigações", () => {
  it("deduplica mensagens e tarefas", () => {
    const line = "27/10/2026, 09:00 - Você: Te mando amanhã.";
    const r = parseExport(line + "\n" + line);
    expect(r.messages).toHaveLength(1);
    expect(extractTasks(r.messages, "Você")).toHaveLength(1);
  });
  it("preserva mensagens multilinha e formato iOS", () => {
    const r = parseExport(
      "[27/10/2026, 09:00:00] Marina: Pode me enviar?\nO comprovante.",
    );
    expect(r.messages[0].text).toContain("\nO comprovante.");
  });
  it("usa fim de amanhã em UTC−3 como referência quando não há hora", () => {
    const t = extractTasks(
      parseExport("01/01/2020, 23:30 - Você: Te mando amanhã.").messages,
      "Você",
    )[0];
    expect(t.deadline).toBe("2020-01-03T02:59:59.000Z");
    expect(t.status).toBe("open");
  });
  it.each(["Vou verificar", "Te mando amanhã"])("não encerra %s", (text) => {
    expect(
      extractTasks(
        parseExport(`27/10/2026, 09:00 - Você: ${text}`).messages,
        "Você",
      )[0].status,
    ).toBe("open");
  });
  it("envio é possível conclusão, sem confirmar recebimento", () => {
    expect(
      extractTasks(
        parseExport("27/10/2026, 09:00 - Você: Enviei o comprovante, confira")
          .messages,
        "Você",
      )[0].status,
    ).toBe("possibly_resolved");
  });
  it("separa espera de terceiros", () => {
    expect(
      extractTasks(
        parseExport("27/10/2026, 09:00 - Você: Aguardo resposta do fornecedor")
          .messages,
        "Você",
      )[0].status,
    ).toBe("waiting_other");
  });
  it("ignora data inválida e avisos de sistema", () => {
    const r = parseExport(
      "31/02/2026, 09:00 - Você: Te mando amanhã\n27/10/2026, 09:00 - Mensagens protegidas",
    );
    expect(r.messages).toHaveLength(0);
    expect(r.ignored).toBe(2);
  });
  it("limita upload", () =>
    expect(() => parseExport("a".repeat(1_000_001))).toThrow("1 MB"));
  it("prioriza três ações abertas por impacto", () => {
    expect(prioritize(demoTasks).map((t) => t.id)).toEqual([
      "demo-1",
      "demo-2",
      "demo-3",
    ]);
  });
  it("processa 300 eventos sem descartar lote", () => {
    const r = parseExport(
      Array.from(
        { length: 300 },
        (_, i) => `27/10/2026, 09:00 - Contato ${i}: Pode me enviar?`,
      ).join("\n"),
    );
    expect(extractTasks(r.messages, "Você")).toHaveLength(300);
  });
});
