import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { extractTasks, type Message } from "@orbita/shared";
import {
  ExportImportConnector,
  ReadOnlyWhatsAppConnector,
  normalizeWhatsApp,
  type InboundMessage,
} from "./index";
const raw = (
  id: string,
  text = "Pode enviar o comprovante?",
  extras: Record<string, unknown> = {},
) => ({
  key: { id, remoteJid: "contato-teste@s.whatsapp.net", fromMe: false },
  pushName: "Marina fictícia",
  messageTimestamp: 1793091600,
  message: { conversation: text },
  ...extras,
});
function fixture(
  options: {
    enabled?: boolean;
    authorized?: boolean;
    consumer?: (batch: InboundMessage[]) => void | Promise<void>;
  } = {},
) {
  const emitter = new EventEmitter();
  const end = vi.fn();
  const sink = vi.fn(options.consumer ?? (() => {}));
  const factory = vi.fn(async () => ({ ev: emitter, end }));
  const connector = new ReadOnlyWhatsAppConnector({
    enabled: options.enabled ?? true,
    authorizedTestAccount: options.authorized ?? true,
    self: "Você",
    onBatch: sink,
    makeSocket: factory,
  });
  return { emitter, end, sink, factory, connector };
}
describe("recebimento somente leitura — transporte simulado", () => {
  it("desligado não cria transporte ou sessão", async () => {
    const x = fixture({ enabled: false });
    await expect(x.connector.connect()).rejects.toThrow("desligado");
    expect(x.factory).not.toHaveBeenCalled();
  });
  it("exige conta de teste autorizada", async () => {
    const x = fixture({ authorized: false });
    await expect(x.connector.connect()).rejects.toThrow("autorizada");
    expect(x.factory).not.toHaveBeenCalled();
  });
  it("sem fábrica real não declara conexão pronta", async () => {
    const c = new ReadOnlyWhatsAppConnector({
      enabled: true,
      authorizedTestAccount: true,
      self: "Você",
      onBatch: () => {},
    });
    await expect(c.connect()).rejects.toThrow("Transporte real");
    expect(c.getStatus().connection).toBe("disconnected");
  });
  it("somente evento open declara conectado, com cobertura parcial", async () => {
    const x = fixture();
    await x.connector.connect();
    expect(x.connector.getStatus().connection).toBe("connecting");
    x.emitter.emit("connection.update", { connection: "open" });
    expect(x.connector.getStatus().coverage).toBe("partial");
    expect(x.connector.getStatus().connection).toBe("connected");
  });
  it("conexões simultâneas usam uma fábrica", async () => {
    const x = fixture();
    await Promise.all([x.connector.connect(), x.connector.connect()]);
    expect(x.factory).toHaveBeenCalledTimes(1);
  });
  it("captura todos os 300 eventos de um lote, incluindo grupo silenciado", async () => {
    const x = fixture();
    await x.connector.connect();
    x.emitter.emit("messages.upsert", {
      type: "notify",
      muted: true,
      messages: Array.from({ length: 300 }, (_, i) => raw(`id-${i}`)),
    });
    await x.connector.drain();
    expect(x.sink.mock.calls[0][0]).toHaveLength(300);
    expect(x.connector.getStatus().received).toBe(300);
  });
  it("deduplica backfill + evento novo e mantém origem histórica", async () => {
    const x = fixture();
    await x.connector.connect();
    x.emitter.emit("messaging-history.set", {
      messages: [raw("a")],
      isLatest: true,
      progress: 100,
    });
    x.emitter.emit("messages.upsert", {
      messages: [raw("a"), raw("b")],
      type: "notify",
    });
    await x.connector.drain();
    expect(x.connector.getStatus().received).toBe(2);
    expect(x.connector.getStatus().duplicate).toBe(1);
    expect(x.sink.mock.calls[0][0][0].historical).toBe(true);
    expect(x.sink.mock.calls[1][0][0].historical).toBe(false);
    expect(x.connector.getStatus().coverage).toBe("partial");
  });
  it("append é histórico, não evento em tempo real", async () => {
    const x = fixture();
    await x.connector.connect();
    x.emitter.emit("messages.upsert", { messages: [raw("a")], type: "append" });
    await x.connector.drain();
    expect(x.sink.mock.calls[0][0][0].historical).toBe(true);
  });
  it("mesmo ID em conversas diferentes não é descartado", async () => {
    const x = fixture();
    await x.connector.connect();
    x.emitter.emit("messages.upsert", {
      messages: [
        raw("a"),
        raw("a", "Teste", {
          key: {
            id: "a",
            remoteJid: "grupo-ficticio@g.us",
            participant: "participante-teste@lid",
          },
        }),
      ],
      type: "notify",
    });
    await x.connector.drain();
    expect(x.connector.getStatus().received).toBe(2);
  });
  it("trata fromMe, texto expandido e timestamp Long", () => {
    const n = normalizeWhatsApp(
      raw("a", "", {
        key: {
          id: "a",
          remoteJid: "contato-teste@s.whatsapp.net",
          fromMe: true,
        },
        messageTimestamp: { low: 1793091600, high: 0 },
        message: { extendedTextMessage: { text: "Te mando amanhã." } },
      }),
      false,
      "Você",
    );
    expect(n?.message.author).toBe("Você");
    expect(n?.fromMe).toBe(true);
    expect(n?.message.text).toBe("Te mando amanhã.");
    expect(n?.message.timestamp).toBe(
      new Date(1793091600 * 1000).toISOString(),
    );
  });
  it("ignora mídia, view-once e timestamp ausente sem derrubar lote", async () => {
    const x = fixture();
    await x.connector.connect();
    x.emitter.emit("messages.upsert", {
      type: "notify",
      messages: [
        raw("a"),
        raw("media", "", { message: { imageMessage: {} } }),
        raw("view", "", {
          message: { viewOnceMessage: { message: { imageMessage: {} } } },
        }),
        raw("missing", "", { messageTimestamp: null }),
      ],
    });
    await x.connector.drain();
    expect(x.connector.getStatus().received).toBe(1);
    expect(x.connector.getStatus().ignored).toBe(3);
  });
  it("QR não aparece em status nem é enviado ao consumidor", async () => {
    const x = fixture();
    await x.connector.connect();
    x.emitter.emit("connection.update", { qr: "sensitive-test-placeholder" });
    expect(JSON.stringify(x.connector.getStatus())).not.toContain(
      "sensitive-test-placeholder",
    );
    expect(x.connector.getStatus().reason).toBe("pairing_required");
    expect(x.sink).not.toHaveBeenCalled();
  });
  it("reconexão manual remove listeners e preserva dedup recente", async () => {
    const x = fixture();
    await x.connector.connect();
    x.emitter.emit("messages.upsert", { messages: [raw("a")], type: "notify" });
    await x.connector.drain();
    await x.connector.disconnect();
    expect(x.emitter.listenerCount("messages.upsert")).toBe(0);
    await x.connector.connect();
    expect(x.emitter.listenerCount("messages.upsert")).toBe(1);
    x.emitter.emit("messages.upsert", {
      messages: [raw("a"), raw("b")],
      type: "notify",
    });
    await x.connector.drain();
    expect(x.connector.getStatus().received).toBe(2);
    expect(x.factory).toHaveBeenCalledTimes(2);
  });
  it("falha do consumidor não confirma dedup; reenvio pode recuperar", async () => {
    let fail = true;
    const x = fixture({
      consumer: () => {
        if (fail) throw new Error("sensitive content");
      },
    });
    await x.connector.connect();
    x.emitter.emit("messages.upsert", { messages: [raw("a")], type: "notify" });
    await x.connector.drain();
    expect(x.connector.getStatus().received).toBe(0);
    expect(x.connector.getStatus().reason).toBe("consumer_failed");
    fail = false;
    x.emitter.emit("messages.upsert", { messages: [raw("a")], type: "notify" });
    await x.connector.drain();
    expect(x.connector.getStatus().received).toBe(1);
    expect(JSON.stringify(x.connector.getStatus())).not.toContain(
      "sensitive content",
    );
  });
  it("não expõe operação de envio nem garante histórico completo", () => {
    const x = fixture();
    expect("sendMessage" in x.connector).toBe(false);
    expect(x.connector.historyCapability().requestSupported).toBe(false);
  });
  it("serializa consumidores assíncronos sem perder ordem", async () => {
    const ids: string[] = [];
    const x = fixture({
      consumer: async (batch) => {
        await Promise.resolve();
        ids.push(batch[0].message.id);
      },
    });
    await x.connector.connect();
    for (const id of ["a", "b", "c"])
      x.emitter.emit("messages.upsert", {
        messages: [raw(id)],
        type: "notify",
      });
    await x.connector.drain();
    expect(ids).toEqual(["a", "b", "c"]);
  });
});
describe("exportação e integração com obrigações", () => {
  const text =
    "27/10/2026, 09:00 - Marina: Me envie o comprovante amanhã.\n27/10/2026, 09:01 - Você: Te mando amanhã.";
  it("importa uma vez e informa histórico parcial, sem conexão", async () => {
    const sink = vi.fn();
    const c = new ExportImportConnector(sink);
    expect(await c.importText(text, "Marina", "Você")).toBe(2);
    expect(await c.importText(text, "Marina", "Você")).toBe(0);
    expect(c.getStatus().coverage).toBe("partial");
    expect(c.getStatus().connection).toBe("disconnected");
    expect(sink).toHaveBeenCalledTimes(1);
  });
  it("separa o mesmo arquivo importado como outra conversa", async () => {
    const sink = vi.fn();
    const c = new ExportImportConnector(sink);
    await c.importText(text, "A", "Você");
    await c.importText(text, "B", "Você");
    expect(c.getStatus().received).toBe(4);
  });
  it("entrega lotes para formar uma única obrigação rastreável", async () => {
    const messages: Message[] = [];
    const c = new ExportImportConnector((batch) => {
      messages.push(...batch.map((e) => e.message));
    });
    await c.importText(text, "Marina", "Você");
    await c.importText(
      "27/10/2026, 10:00 - Você: Enviei o comprovante, confira.\n27/10/2026, 10:01 - Marina: Recebido, obrigado.",
      "Marina",
      "Você",
    );
    const tasks = extractTasks(messages, "Você", "Marina");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe("resolved");
    expect(tasks[0].evidenceIds).toHaveLength(4);
  });
  it("conversa/usuário ausentes são recusados antes de leitura", async () => {
    const sink = vi.fn();
    await expect(
      new ExportImportConnector(sink).importText(text, "", "Você"),
    ).rejects.toThrow();
    expect(sink).not.toHaveBeenCalled();
  });
});

it("separa identidade de participantes com o mesmo nome de exibição", () => {
  const a = normalizeWhatsApp(
    raw("a", "Pode enviar?", {
      key: {
        id: "a",
        remoteJid: "grupo-ficticio@g.us",
        participant: "participante-a@lid",
      },
      pushName: "Marina",
    }),
    false,
    "Você",
  );
  const b = normalizeWhatsApp(
    raw("b", "Pode enviar?", {
      key: {
        id: "b",
        remoteJid: "grupo-ficticio@g.us",
        participant: "participante-b@lid",
      },
      pushName: "Marina",
    }),
    false,
    "Você",
  );
  expect(a?.displayName).toBe(b?.displayName);
  expect(a?.message.author).not.toBe(b?.message.author);
});
