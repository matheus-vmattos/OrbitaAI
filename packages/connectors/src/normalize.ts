import type { InboundMessage } from "./types";
export const object = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
function seconds(value: unknown) {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  const long = object(value);
  if (long && Number.isInteger(long.low) && Number.isInteger(long.high))
    return (Number(long.low) >>> 0) + (Number(long.high) >>> 0) * 4294967296;
  return NaN;
}
export function normalizeWhatsApp(
  raw: unknown,
  historical: boolean,
  self: string,
): InboundMessage | null {
  const item = object(raw),
    key = object(item?.key);
  if (
    !item ||
    !key ||
    typeof key.id !== "string" ||
    !key.id ||
    key.id.length > 200 ||
    typeof key.remoteJid !== "string" ||
    key.remoteJid.length > 200 ||
    !/@(?:s\.whatsapp\.net|g\.us|lid)$/.test(key.remoteJid)
  )
    return null;
  const time = seconds(item.messageTimestamp);
  if (!Number.isFinite(time) || time <= 0 || time > 4_102_444_800) return null;
  let content = object(item.message);
  // Encapsulamento efêmero de texto. Não baixar mídia/view-once nem ler mensagens citadas como novas.
  for (let depth = 0; depth < 2 && content?.ephemeralMessage; depth++)
    content = object(object(content.ephemeralMessage)?.message);
  const text =
    typeof content?.conversation === "string"
      ? content.conversation
      : object(content?.extendedTextMessage)?.text;
  if (typeof text !== "string" || !text.trim() || text.length > 4000)
    return null;
  const fromMe = key.fromMe === true;
  if (
    !fromMe &&
    key.remoteJid.endsWith("@g.us") &&
    (typeof key.participant !== "string" || !key.participant)
  )
    return null;
  const senderId = fromMe
    ? "self"
    : typeof key.participant === "string"
      ? key.participant
      : key.remoteJid;
  const displayName = fromMe
    ? self
    : typeof item.pushName === "string" && item.pushName.trim()
      ? item.pushName.slice(0, 100)
      : senderId;
  // Identidade estável no domínio; nomes iguais de participantes não podem se fundir.
  const author = fromMe ? self : senderId;
  return {
    conversationId: key.remoteJid,
    senderId,
    displayName,
    source: "whatsapp-experimental",
    historical,
    fromMe,
    message: {
      id: key.id,
      author,
      text,
      timestamp: new Date(time * 1000).toISOString(),
    },
  };
}
