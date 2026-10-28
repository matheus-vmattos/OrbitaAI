import { parseExport } from "@orbita/shared";
import {
  initialStatus,
  type BatchConsumer,
  type ConnectorStatus,
  type InboundMessage,
} from "./types";
export class ExportImportConnector {
  private status = initialStatus("export");
  private seen = new Set<string>();
  constructor(private consumer: BatchConsumer) {}
  async importText(text: string, conversationId: string, self: string) {
    if (!conversationId.trim() || !self.trim())
      throw new Error("Identifique conversa e usuário.");
    const parsed = parseExport(text);
    const batch: InboundMessage[] = [];
    const keys: string[] = [];
    for (const message of parsed.messages) {
      const id = JSON.stringify([conversationId, message.id]);
      if (this.seen.has(id)) {
        this.status.duplicate++;
        continue;
      }
      keys.push(id);
      batch.push({
        conversationId,
        senderId: message.author,
        displayName: message.author,
        message,
        source: "export",
        historical: true,
        fromMe:
          message.author.toLocaleLowerCase("pt-BR") ===
          self.trim().toLocaleLowerCase("pt-BR"),
      });
    }
    if (batch.length) await this.consumer(batch);
    for (const key of keys) {
      this.seen.add(key);
      if (this.seen.size > 5000)
        this.seen.delete(this.seen.values().next().value!);
    }
    this.status.connection = "disconnected";
    this.status.coverage = "partial";
    this.status.received += batch.length;
    this.status.ignored += parsed.ignored;
    this.status.lastEventAt = new Date().toISOString();
    for (const { message } of batch) {
      this.status.messageFrom =
        this.status.messageFrom && this.status.messageFrom < message.timestamp
          ? this.status.messageFrom
          : message.timestamp;
      this.status.messageTo =
        this.status.messageTo && this.status.messageTo > message.timestamp
          ? this.status.messageTo
          : message.timestamp;
    }
    return batch.length;
  }
  getStatus(): ConnectorStatus {
    return { ...this.status };
  }
}
