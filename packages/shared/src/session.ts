import { z } from "zod";
import { extractTasks, type Message, type Task } from "./index";

export const ReceivedMessageSchema = z
  .object({
    conversationId: z.string().trim().min(1).max(200),
    source: z.enum(["export", "whatsapp-experimental"]),
    senderId: z.string().min(1).max(200),
    displayName: z.string().min(1).max(100),
    historical: z.boolean(),
    fromMe: z.boolean(),
    message: z
      .object({
        id: z.string().min(1).max(5000),
        author: z.string().min(1).max(200),
        text: z.string().min(1).max(4000),
        timestamp: z.string().datetime({ offset: true }),
      })
      .strict(),
  })
  .strict();
export type ReceivedMessage = z.infer<typeof ReceivedMessageSchema>;
export type Coverage = "unknown" | "partial" | "stale" | "disconnected";
type Conversation = {
  source: ReceivedMessage["source"];
  id: string;
  self: string;
  label: string;
  messages: Map<string, Message>;
  labels: Map<string, string>;
  coverage: Coverage;
  lastEventAt: string | null;
};
type ManualDecision = {
  key: string;
  topic: string | undefined;
  contact: string;
  anchors: Set<string>;
  through: string;
  status: "open" | "resolved";
};
const keyFor = (source: ReceivedMessage["source"], id: string) =>
  JSON.stringify([source, id]);
const normalized = (value: string) => value.trim().toLocaleLowerCase("pt-BR");

/** Sessão efêmera para um escopo confiável. workspaceId não é login nem autorização. */
export class ObligationSession {
  private conversations = new Map<string, Conversation>();
  private decisions: ManualDecision[] = [];
  readonly workspaceId: string;
  constructor(options: { workspaceId: string; clock?: () => Date }) {
    if (!options.workspaceId.trim())
      throw new Error("Escopo da sessão ausente.");
    this.workspaceId = options.workspaceId;
    this.clock = options.clock ?? (() => new Date());
  }
  private clock: () => Date;
  ingest(
    raw: ReceivedMessage[],
    options: { self: string; conversationLabel?: string },
  ) {
    if (!options.self.trim() || options.self.length > 100)
      throw new Error("Identifique o usuário desta conversa.");
    if (!Array.isArray(raw) || raw.length > 5000)
      throw new Error("Lote excede o limite local.");
    const parsed = z.array(ReceivedMessageSchema).safeParse(raw);
    if (!parsed.success)
      throw new Error(
        "Lote inválido: confira IDs, autores, datas e limite de 4 mil caracteres por mensagem.",
      );
    const candidate = new Map(this.conversations);
    const touched = new Set<string>();
    let accepted = 0,
      duplicates = 0;
    for (const item of parsed.data) {
      const key = keyFor(item.source, item.conversationId);
      let record = candidate.get(key);
      if (record && normalized(record.self) !== normalized(options.self))
        throw new Error(
          "Use o mesmo nome próprio dos lotes anteriores desta conversa ou escolha outro identificador.",
        );
      if (!touched.has(key)) {
        record = record
          ? {
              ...record,
              messages: new Map(record.messages),
              labels: new Map(record.labels),
            }
          : {
              source: item.source,
              id: item.conversationId,
              self: options.self.trim(),
              label:
                options.conversationLabel?.trim().slice(0, 100) ||
                item.conversationId,
              messages: new Map(),
              labels: new Map(),
              coverage: "partial",
              lastEventAt: null,
            };
        candidate.set(key, record);
        touched.add(key);
      }
      record = candidate.get(key)!;
      if (!item.fromMe && item.senderId !== item.message.author)
        throw new Error("Identidade do remetente inconsistente.");
      if (
        item.fromMe !==
        (normalized(item.message.author) === normalized(record.self))
      )
        throw new Error("Identidade própria inconsistente no lote.");
      const previous = record.messages.get(item.message.id);
      if (previous) {
        if (
          previous.text !== item.message.text ||
          previous.author !== item.message.author ||
          Date.parse(previous.timestamp) !== Date.parse(item.message.timestamp)
        )
          throw new Error(
            "Uma mensagem existente mudou. Edições exigem revisão, sem sobrescrever evidências.",
          );
        duplicates++;
      } else {
        record.messages.set(item.message.id, { ...item.message });
        accepted++;
      }
      record.labels.set(item.message.author, item.displayName);
      record.lastEventAt = this.clock().toISOString();
      // Reimportação de arquivo não prova atualização da conexão WhatsApp.
      // Cobertura já marcada como stale/disconnected exige atualização explícita do chamador,
      // não a simples repetição de uma exportação antiga.
    }
    const all = [...candidate.values()];
    const messages = all.flatMap((r) => [...r.messages.values()]);
    if (
      messages.length > 5000 ||
      new TextEncoder().encode(JSON.stringify(messages)).length > 5_000_000
    )
      throw new Error(
        "Limite desta aba: 5 mil mensagens ou 5 MB. Limpe os dados antes de importar mais.",
      );
    this.conversations = candidate;
    return { accepted, duplicates, conversations: touched.size };
  }
  snapshot() {
    const tasks: Task[] = [];
    for (const [key, record] of this.conversations) {
      const derived = extractTasks(
        [...record.messages.values()],
        record.self,
        key,
      );
      for (const task of derived) {
        const overlapping = this.decisions.filter(
          (d) =>
            d.key === key && task.evidenceIds?.some((id) => d.anchors.has(id)),
        );
        const matching = overlapping.filter(
          (d) => d.topic === task.topic && d.contact === task.contact,
        );
        const statuses = new Set(matching.map((d) => d.status));
        const freshEvidence = matching.some((d) =>
          task.evidenceHistory?.some(
            (m) =>
              !d.anchors.has(m.id) &&
              Date.parse(m.timestamp) > Date.parse(d.through),
          ),
        );
        const ambiguous = overlapping.some(
          (d) =>
            !matching.includes(d) &&
            (d.topic === "indefinido" ||
              task.topic === "indefinido" ||
              d.contact !== task.contact),
        );
        const reviewAcknowledged = matching.some((d) =>
          task.evidenceIds?.every((id) => d.anchors.has(id)),
        );
        if (
          statuses.size === 1 &&
          !freshEvidence &&
          !ambiguous &&
          (!task.requiresReview || reviewAcknowledged)
        ) {
          task.status = matching[0].status;
          if (reviewAcknowledged) {
            delete task.requiresReview;
            delete task.reviewReason;
          }
        } else if (statuses.size > 1 || freshEvidence || ambiguous) {
          task.requiresReview = true;
          task.reviewReason =
            "O histórico mudou a associação de uma decisão manual. Confira as evidências.";
          if (task.status === "resolved") task.status = "possibly_resolved";
        }
        task.contactLabel =
          record.labels.get(task.contact) ??
          (task.contact === key ? record.label : task.contact);
        tasks.push(task);
      }
    }
    const records = [...this.conversations.values()];
    const coverage: Coverage = records.some(
      (r) => r.coverage === "disconnected",
    )
      ? "disconnected"
      : records.some((r) => r.coverage === "stale")
        ? "stale"
        : records.some((r) => r.coverage === "unknown")
          ? "unknown"
          : records.length
            ? "partial"
            : "unknown";
    const times = records
      .flatMap((r) => [...r.messages.values()].map((m) => m.timestamp))
      .sort((a, b) => Date.parse(a) - Date.parse(b));
    return {
      tasks,
      coverage,
      messageCount: times.length,
      conversationCount: records.length,
      periodFrom: times[0] ?? null,
      periodTo: times.at(-1) ?? null,
      sources: records.map((r) => ({
        source: r.source,
        conversationId: r.id,
        label: r.label,
        coverage: r.coverage,
        lastEventAt: r.lastEventAt,
      })),
    };
  }
  setManualStatus(taskId: string, status: "open" | "resolved") {
    if (status !== "open" && status !== "resolved")
      throw new Error("Decisão manual inválida.");
    const task = this.snapshot().tasks.find((t) => t.id === taskId);
    if (!task || !task.conversationId || !task.evidenceIds?.length)
      throw new Error("Obrigação não pertence a esta sessão.");
    const anchors = new Set(task.evidenceIds);
    this.decisions = this.decisions.filter(
      (d) =>
        !(
          d.key === task.conversationId &&
          d.topic === task.topic &&
          d.contact === task.contact &&
          [...d.anchors].some((id) => anchors.has(id))
        ),
    );
    this.decisions.push({
      key: task.conversationId,
      topic: task.topic,
      contact: task.contact,
      anchors,
      through: task.updatedAt ?? this.clock().toISOString(),
      status,
    });
  }
  setCoverage(
    source: ReceivedMessage["source"],
    conversationId: string,
    coverage: Coverage,
  ) {
    if (!["unknown", "partial", "stale", "disconnected"].includes(coverage))
      throw new Error(
        "Cobertura completa não pode ser inferida por esta fonte.",
      );
    const record = this.conversations.get(keyFor(source, conversationId));
    if (!record) throw new Error("Conversa não pertence a esta sessão.");
    record.coverage = coverage;
  }
  clear() {
    this.conversations.clear();
    this.decisions = [];
  }
}
