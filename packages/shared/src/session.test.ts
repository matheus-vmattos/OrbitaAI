import { describe, expect, it } from "vitest";
import { ObligationSession, type ReceivedMessage } from "./session";
import { replyTo } from "./conversation";
const event = (
  id: string,
  text = "Me envie o comprovante amanhã.",
  options: Partial<ReceivedMessage> = {},
): ReceivedMessage => ({
  conversationId: "marina",
  source: "export",
  senderId: "Marina",
  displayName: "Marina",
  historical: true,
  fromMe: false,
  message: {
    id,
    author: "Marina",
    text,
    timestamp: "2026-10-27T09:00:00-03:00",
  },
  ...options,
});
const own = (id: string, text: string, time = "2026-10-27T09:01:00-03:00") =>
  event(id, text, {
    senderId: "Você",
    displayName: "Você",
    fromMe: true,
    message: { id, author: "Você", text, timestamp: time },
  });
const session = () =>
  new ObligationSession({
    workspaceId: "teste",
    clock: () => new Date("2026-10-28T12:00:00Z"),
  });
describe("sessão unificada de obrigações", () => {
  it("une pedido/promessa/envio/recebimento em lotes", () => {
    const s = session();
    s.ingest([event("a"), own("b", "Te mando amanhã.")], { self: "Você" });
    expect(s.snapshot().tasks).toHaveLength(1);
    expect(s.snapshot().tasks[0].status).toBe("open");
    s.ingest(
      [own("c", "Enviei o comprovante, confira.", "2026-10-27T10:00:00-03:00")],
      { self: "Você" },
    );
    expect(s.snapshot().tasks[0].status).toBe("possibly_resolved");
    s.ingest(
      [
        event("d", "Recebido, obrigado.", {
          message: {
            id: "d",
            author: "Marina",
            text: "Recebido, obrigado.",
            timestamp: "2026-10-27T10:01:00-03:00",
          },
        }),
      ],
      { self: "Você" },
    );
    expect(s.snapshot().tasks[0].status).toBe("resolved");
    expect(s.snapshot().messageCount).toBe(4);
  });
  it("preserva conclusão manual na reimportação idêntica", () => {
    const s = session();
    s.ingest([event("a")], { self: "Você" });
    s.setManualStatus(s.snapshot().tasks[0].id, "resolved");
    expect(s.ingest([event("a")], { self: "Você" }).duplicates).toBe(1);
    expect(s.snapshot().tasks[0].status).toBe("resolved");
  });
  it("backfill anterior pode mudar ID sem perder decisão segura", () => {
    const s = session();
    const later = event("later", "Pode enviar o comprovante?", {
      message: {
        id: "later",
        author: "Marina",
        text: "Pode enviar o comprovante?",
        timestamp: "2026-10-27T10:00:00-03:00",
      },
    });
    s.ingest([later], { self: "Você" });
    const id = s.snapshot().tasks[0].id;
    s.setManualStatus(id, "resolved");
    s.ingest([event("earlier")], { self: "Você" });
    expect(s.snapshot().tasks[0].id).not.toBe(id);
    expect(s.snapshot().tasks[0].status).toBe("resolved");
  });
  it("nova evidência posterior não herda conclusão antiga silenciosamente", () => {
    const s = session();
    s.ingest([event("a")], { self: "Você" });
    s.setManualStatus(s.snapshot().tasks[0].id, "resolved");
    s.ingest(
      [
        event("new", "Me envie o comprovante hoje.", {
          message: {
            id: "new",
            author: "Marina",
            text: "Me envie o comprovante hoje.",
            timestamp: "2026-10-28T10:00:00-03:00",
          },
        }),
      ],
      { self: "Você" },
    );
    const task = s.snapshot().tasks[0];
    expect(task.requiresReview).toBe(true);
    expect(
      replyTo("Urgente Hoje", false, s.snapshot().tasks, s.snapshot().coverage)
        .text,
    ).toContain("precisam de revisão");
    expect(task.status).not.toBe("resolved");
    s.setManualStatus(task.id, "resolved");
    expect(s.snapshot().tasks[0].status).toBe("resolved");
  });
  it("decisão de um assunto não conclui outro da mesma mensagem", () => {
    const s = session();
    s.ingest([event("a", "Pode enviar a proposta e o comprovante?")], {
      self: "Você",
    });
    const task = s.snapshot().tasks.find((t) => t.topic === "proposta")!;
    s.setManualStatus(task.id, "resolved");
    expect(
      s.snapshot().tasks.find((t) => t.topic === "comprovante")?.status,
    ).toBe("open");
    expect(
      s.snapshot().tasks.find((t) => t.topic === "comprovante")?.requiresReview,
    ).not.toBe(true);
  });
  it("separa conversas e fontes com IDs iguais", () => {
    const s = session();
    s.ingest(
      [
        event("a"),
        event("a", undefined, { conversationId: "outra" }),
        event("a", undefined, { source: "whatsapp-experimental" }),
      ],
      { self: "Você" },
    );
    expect(s.snapshot().conversationCount).toBe(3);
    expect(new Set(s.snapshot().tasks.map((t) => t.id)).size).toBe(3);
  });
  it("instâncias de escopos diferentes não compartilham mensagens", () => {
    const a = session(),
      b = new ObligationSession({ workspaceId: "outro" });
    a.ingest([event("a")], { self: "Você" });
    expect(b.snapshot().tasks).toHaveLength(0);
    expect(() =>
      b.setManualStatus(a.snapshot().tasks[0].id, "resolved"),
    ).toThrow("sessão");
  });
  it("recusa mensagem mutada sem alterar evidência anterior", () => {
    const s = session();
    s.ingest([event("a")], { self: "Você" });
    expect(() =>
      s.ingest([event("a", "Pode enviar hoje?")], { self: "Você" }),
    ).toThrow("mudou");
    expect(s.snapshot().tasks[0].evidence).toContain("amanhã");
  });
  it("lote inválido é atômico", () => {
    const s = session();
    expect(() =>
      s.ingest([event("a"), event("b", undefined, { fromMe: true })], {
        self: "Você",
      }),
    ).toThrow("inconsistente");
    expect(s.snapshot().messageCount).toBe(0);
  });
  it("recusa troca de identidade em lotes da mesma conversa", () => {
    const s = session();
    s.ingest([event("a")], { self: "Você" });
    expect(() => s.ingest([event("b")], { self: "Outro nome" })).toThrow(
      "mesmo nome",
    );
    expect(s.snapshot().messageCount).toBe(1);
  });
  it("não aceita substituição do escopo pelo lote", () => {
    const s = session();
    expect(() =>
      s.ingest([{ ...event("a"), workspaceId: "outro" } as ReceivedMessage], {
        self: "Você",
      }),
    ).toThrow("Lote inválido");
  });
  it("limita armazenamento sem aceitar parte do lote", () => {
    const s = session();
    expect(() =>
      s.ingest(
        Array.from({ length: 2000 }, (_, i) =>
          event(`m-${i}`, "Pode enviar? " + "a".repeat(3000)),
        ),
        { self: "Você" },
      ),
    ).toThrow("5 MB");
    expect(s.snapshot().messageCount).toBe(0);
  });
  it("não afirma cobertura completa e mantém desconexão no recebimento de backfill", () => {
    const s = session();
    s.ingest([event("a", undefined, { source: "whatsapp-experimental" })], {
      self: "Você",
    });
    expect(s.snapshot().coverage).toBe("partial");
    s.setCoverage("whatsapp-experimental", "marina", "disconnected");
    s.ingest([event("b", undefined, { source: "whatsapp-experimental" })], {
      self: "Você",
    });
    expect(s.snapshot().coverage).toBe("disconnected");
    expect(() =>
      s.setCoverage("whatsapp-experimental", "marina", "complete" as never),
    ).toThrow("completa");
  });
  it("resumo informa cobertura desconhecida, desatualizada ou desconectada", () => {
    for (const coverage of ["unknown", "stale", "disconnected"] as const) {
      const r = replyTo("Urgente Hoje", false, [], coverage);
      expect(r.text).not.toMatch(/não há pendências/i);
      expect(r.text).toContain(
        {
          unknown: "desconhecida",
          stale: "desatualizados",
          disconnected: "desconectadas",
        }[coverage],
      );
    }
  });
  it("limpar remove mensagens e decisões", () => {
    const s = session();
    s.ingest([event("a")], { self: "Você" });
    s.setManualStatus(s.snapshot().tasks[0].id, "resolved");
    s.clear();
    expect(s.snapshot().messageCount).toBe(0);
    expect(s.snapshot().coverage).toBe("unknown");
    s.ingest([event("a")], { self: "Você" });
    expect(s.snapshot().tasks[0].status).toBe("open");
  });
  it("snapshot não permite mutar as mensagens internas", () => {
    const s = session();
    s.ingest([event("a")], { self: "Você" });
    s.snapshot().tasks[0].evidenceHistory![0].text = "alterado";
    expect(s.snapshot().tasks[0].evidence).toContain("amanhã");
  });
  it("nome de exibição não altera identidade da obrigação", () => {
    const s = session();
    const m = event("a", undefined, {
      displayName: "Marina · RH",
      message: { ...event("a").message, author: "id-marina" },
      senderId: "id-marina",
    });
    s.ingest([m], { self: "Você" });
    expect(s.snapshot().tasks[0].contact).toBe("id-marina");
    expect(s.snapshot().tasks[0].contactLabel).toBe("Marina · RH");
  });
});

it("repetir exportação não remove uma marca explícita de desatualização", () => {
  const s = session();
  s.ingest([event("a")], { self: "Você" });
  s.setCoverage("export", "marina", "stale");
  s.ingest([event("a")], { self: "Você" });
  expect(s.snapshot().coverage).toBe("stale");
});

it("correção negativa posterior impede conclusão manual silenciosa e mantém evidência", () => {
  const s = session();
  s.ingest([event("a")], { self: "Você" });
  s.setManualStatus(s.snapshot().tasks[0].id, "resolved");
  s.ingest(
    [
      own(
        "neg",
        "Ainda não enviei o comprovante.",
        "2026-10-27T11:00:00-03:00",
      ),
    ],
    { self: "Você" },
  );
  const task = s.snapshot().tasks[0];
  expect(task.status).not.toBe("resolved");
  expect(task.requiresReview).toBe(true);
  expect(task.evidence).toContain("Ainda não enviei");
  s.setManualStatus(task.id, "resolved");
  expect(s.snapshot().tasks[0].status).toBe("resolved");
  expect(s.snapshot().tasks[0].requiresReview).not.toBe(true);
});
