import { EventEmitter } from "node:events";
import { expect, it, vi } from "vitest";
import { ObligationSession } from "@orbita/shared/session";
import { replyTo } from "@orbita/shared/conversation";
import {
  ExportImportConnector,
  ReadOnlyWhatsAppConnector,
  sessionConsumer,
} from "./index";

it("fluxo local completo: eventos sintéticos → obrigação → revisão → alerta de desconexão", async () => {
  const network = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("Rede proibida no teste local."));
  const session = new ObligationSession({
    workspaceId: "synthetic-offline-flow",
  });
  const emitter = new EventEmitter();
  const connector = new ReadOnlyWhatsAppConnector({
    enabled: true,
    authorizedTestAccount: true,
    self: "Você",
    onBatch: sessionConsumer(session, "Você"),
    makeSocket: async () => ({ ev: emitter, end: () => {} }),
  });
  const raw = (id: string, text: string, time: string, fromMe = false) => ({
    key: { id, remoteJid: "marina-ficticia@s.whatsapp.net", fromMe },
    pushName: "Marina fictícia",
    messageTimestamp: Date.parse(time) / 1000,
    message: { conversation: text },
  });
  try {
    await connector.connect();
    emitter.emit("connection.update", { connection: "open" });
    emitter.emit("messaging-history.set", {
      isLatest: true,
      progress: 100,
      messages: [
        raw(
          "m1",
          "Me envie o comprovante amanhã.",
          "2026-10-28T09:00:00-03:00",
        ),
        raw("m2", "Te mando amanhã.", "2026-10-28T09:01:00-03:00", true),
      ],
    });
    await connector.drain();
    expect(session.snapshot().tasks).toHaveLength(1);
    expect(session.snapshot().tasks[0].status).toBe("open");
    expect(session.snapshot().tasks[0].contactLabel).toBe("Marina fictícia");
    expect(session.snapshot().coverage).toBe("partial");
    emitter.emit("messages.upsert", {
      type: "notify",
      messages: [
        raw(
          "m3",
          "Enviei o comprovante, confira.",
          "2026-10-28T10:00:00-03:00",
          true,
        ),
      ],
    });
    await connector.drain();
    expect(session.snapshot().tasks[0].status).toBe("possibly_resolved");
    emitter.emit("messages.upsert", {
      type: "notify",
      messages: [raw("m4", "Recebido, obrigado.", "2026-10-28T10:01:00-03:00")],
    });
    await connector.drain();
    expect(session.snapshot().tasks[0].status).toBe("resolved");
    expect(session.snapshot().tasks[0].evidenceIds).toHaveLength(4);
    emitter.emit("messages.upsert", {
      type: "notify",
      messages: [raw("m4", "Recebido, obrigado.", "2026-10-28T10:01:00-03:00")],
    });
    await connector.drain();
    expect(session.snapshot().messageCount).toBe(4);
    session.setManualStatus(session.snapshot().tasks[0].id, "open");
    expect(session.snapshot().tasks[0].status).toBe("open");
    emitter.emit("connection.update", { connection: "close" });
    session.setCoverage(
      "whatsapp-experimental",
      "marina-ficticia@s.whatsapp.net",
      "disconnected",
    );
    const snapshot = session.snapshot();
    const answer = replyTo(
      "Urgente Hoje",
      false,
      snapshot.tasks,
      snapshot.coverage,
    );
    expect(answer.text).toContain("desconectadas");
    expect(answer.text).toContain("Marina fictícia");
    expect(network).not.toHaveBeenCalled();
    console.info(
      JSON.stringify({
        mode: "synthetic",
        transport: "EventEmitter local",
        tasks: snapshot.tasks.length,
        evidence: 4,
        manualReopen: true,
        coverage: snapshot.coverage,
        networkCalls: 0,
      }),
    );
  } finally {
    await connector.disconnect();
    network.mockRestore();
  }
});

it("exportação usa a mesma sessão e mantém decisão após reimportação", async () => {
  const session = new ObligationSession({
    workspaceId: "synthetic-export-flow",
  });
  const importer = new ExportImportConnector(sessionConsumer(session, "Você"));
  const text =
    "28/10/2026, 09:00 - Marina: Pode enviar a proposta?\n28/10/2026, 09:01 - Você: Te mando amanhã.";
  await importer.importText(text, "Marina", "Você");
  expect(session.snapshot().tasks).toHaveLength(1);
  session.setManualStatus(session.snapshot().tasks[0].id, "resolved");
  await importer.importText(text, "Marina", "Você");
  expect(session.snapshot().tasks[0].status).toBe("resolved");
  expect(session.snapshot().messageCount).toBe(2);
});
