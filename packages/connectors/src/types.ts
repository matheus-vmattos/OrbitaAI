export type Source = "export" | "whatsapp-experimental";
export type InboundMessage = import("@orbita/shared/session").ReceivedMessage;
export type ConnectorStatus = {
  source: Source;
  connection: "disconnected" | "connecting" | "connected" | "error";
  coverage: "unknown" | "partial" | "disconnected";
  lastEventAt: string | null;
  messageFrom: string | null;
  messageTo: string | null;
  received: number;
  ignored: number;
  duplicate: number;
  reason: string | null;
};
export type BatchConsumer = (
  messages: InboundMessage[],
) => void | Promise<void>;
export const initialStatus = (source: Source): ConnectorStatus => ({
  source,
  connection: "disconnected",
  coverage: "unknown",
  lastEventAt: null,
  messageFrom: null,
  messageTo: null,
  received: 0,
  ignored: 0,
  duplicate: 0,
  reason: null,
});
export type EventName =
  "messages.upsert" | "messaging-history.set" | "connection.update";
// Superfície mínima de recebimento. Não expõe sendMessage, presence ou logout.
export interface ReceiveSocket {
  ev: {
    on(event: EventName, listener: (payload: unknown) => void): unknown;
    off(event: EventName, listener: (payload: unknown) => void): unknown;
  };
  end(error: Error | undefined): void;
}
