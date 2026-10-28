import { object, normalizeWhatsApp } from "./normalize";
import {
  initialStatus,
  type BatchConsumer,
  type ConnectorStatus,
  type EventName,
  type InboundMessage,
  type ReceiveSocket,
} from "./types";

export class ReadOnlyWhatsAppConnector {
  private status = initialStatus("whatsapp-experimental");
  private socket: ReceiveSocket | null = null;
  private bindings: Array<[EventName, (payload: unknown) => void]> = [];
  private seen = new Set<string>();
  private queue: Promise<void> = Promise.resolve();
  private epoch = 0;
  private opening: Promise<void> | null = null;
  constructor(
    private options: {
      enabled: boolean;
      authorizedTestAccount: boolean;
      self: string;
      onBatch: BatchConsumer;
      makeSocket?: () => Promise<ReceiveSocket>;
      clock?: () => Date;
    },
  ) {}
  getStatus(): ConnectorStatus {
    return { ...this.status };
  }
  connect(): Promise<void> {
    if (!this.options.enabled || !this.options.authorizedTestAccount) {
      this.status.reason = "disabled";
      return Promise.reject(
        new Error(
          "Conector desligado. Exige flag e conta de teste explicitamente autorizada.",
        ),
      );
    }
    if (!this.options.makeSocket) {
      this.status.reason = "transport_missing";
      return Promise.reject(
        new Error(
          "Transporte real ainda não configurado. Nenhuma sessão foi criada.",
        ),
      );
    }
    if (this.opening) return this.opening;
    if (this.socket && this.status.connection !== "disconnected")
      return Promise.resolve();
    this.unbind();
    const epoch = ++this.epoch;
    this.status.connection = "connecting";
    this.status.coverage = "unknown";
    this.status.reason = null;
    this.opening = this.open(epoch).finally(() => {
      this.opening = null;
    });
    return this.opening;
  }
  private async open(epoch: number) {
    try {
      const socket = await this.options.makeSocket!();
      if (epoch !== this.epoch) {
        socket.end(undefined);
        return;
      }
      this.socket = socket;
      const bind = (name: EventName, listener: (data: unknown) => void) => {
        const guarded = (data: unknown) => {
          if (this.epoch === epoch) listener(data);
        };
        this.bindings.push([name, guarded]);
        socket.ev.on(name, guarded);
      };
      bind("messages.upsert", (data) => this.enqueue(data, false, epoch));
      bind("messaging-history.set", (data) => this.enqueue(data, true, epoch));
      bind("connection.update", (data) => {
        const update = object(data);
        if (!update) return;
        this.status.lastEventAt = this.now();
        if (typeof update.qr === "string") {
          this.status.reason = "pairing_required";
        } // QR nunca é retido nem exposto pelo status.
        if (update.connection === "open") {
          this.status.connection = "connected";
          this.status.coverage = "partial";
          this.status.reason = null;
        }
        if (update.connection === "close") {
          this.status.connection = "disconnected";
          this.status.coverage = "disconnected";
          this.status.reason = "connection_closed";
        }
      });
    } catch {
      try {
        this.unbind();
      } catch {
        /* Falha de transporte não deve vazar payload/credenciais. */
      }
      this.status.connection = "error";
      this.status.reason = "transport_failed";
      throw new Error("Falha ao preparar transporte.");
    }
  }
  private now() {
    return (this.options.clock?.() ?? new Date()).toISOString();
  }
  private enqueue(data: unknown, history: boolean, epoch: number) {
    this.queue = this.queue
      .then(async () => {
        if (this.epoch !== epoch) return;
        const payload = object(data);
        if (!Array.isArray(payload?.messages)) {
          this.status.ignored++;
          return;
        }
        const historical = history || payload.type === "append";
        const batch: InboundMessage[] = [];
        const keys: string[] = [];
        const current = new Set<string>();
        for (const raw of payload.messages) {
          const item = normalizeWhatsApp(raw, historical, this.options.self);
          if (!item) {
            this.status.ignored++;
            continue;
          }
          const id = JSON.stringify([item.conversationId, item.message.id]);
          if (this.seen.has(id) || current.has(id)) {
            this.status.duplicate++;
            continue;
          }
          batch.push(item);
          keys.push(id);
          current.add(id);
        }
        if (batch.length) {
          await this.options.onBatch(batch);
          for (const id of keys) {
            this.seen.add(id);
            if (this.seen.size > 5000)
              this.seen.delete(this.seen.values().next().value!);
          }
          this.status.received += batch.length;
          for (const item of batch) {
            const timestamp = item.message.timestamp;
            this.status.messageFrom =
              this.status.messageFrom && this.status.messageFrom < timestamp
                ? this.status.messageFrom
                : timestamp;
            this.status.messageTo =
              this.status.messageTo && this.status.messageTo > timestamp
                ? this.status.messageTo
                : timestamp;
          }
        }
        this.status.lastEventAt = this.now();
        if (this.status.connection !== "disconnected")
          this.status.coverage = "partial";
        // isLatest/progress do SDK não demonstram que todo o histórico foi capturado.
      })
      .catch(() => {
        this.status.connection = "error";
        this.status.reason = "consumer_failed";
        this.status.coverage = "partial";
      });
  }
  async drain() {
    await this.queue;
  }
  private unbind() {
    if (this.socket) {
      for (const [name, listener] of this.bindings)
        this.socket.ev.off(name, listener);
      this.socket.end(undefined);
    }
    this.socket = null;
    this.bindings = [];
  }
  async disconnect() {
    ++this.epoch;
    this.unbind();
    await this.drain();
    this.status.connection = "disconnected";
    this.status.coverage = "disconnected";
  }
  historyCapability() {
    return {
      requestSupported: false,
      reason:
        "Histórico depende dos eventos recebidos do transporte; cobertura não garantida.",
    };
  }
}
