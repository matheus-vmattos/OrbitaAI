import { reconcileMessages, rankTasks } from "./engine";
export { reconcileMessages, scoreTask, defaultWeights } from "./engine";
import { z } from "zod";
export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  contact: z.string(),
  contactLabel: z.string().optional(),
  requiresReview: z.boolean().optional(),
  reviewReason: z.string().optional(),
  evidence: z.string(),
  status: z.enum(["open", "waiting_other", "possibly_resolved", "resolved"]),
  deadline: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  impact: z.number().min(0).max(1),
  conversationId: z.string().optional(),
  topic: z.string().optional(),
  evidenceIds: z.array(z.string()).optional(),
  evidenceHistory: z
    .array(
      z.object({
        id: z.string(),
        author: z.string(),
        text: z.string(),
        timestamp: z.string(),
      }),
    )
    .optional(),
  responsibility: z.enum(["self", "other"]).optional(),
  hierarchy: z.number().min(0).max(1).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  criticalRisk: z.boolean().optional(),
  priorityReason: z.string().optional(),
});
export type Task = z.infer<typeof TaskSchema>;
export type Message = {
  id: string;
  author: string;
  text: string;
  timestamp: string;
};
export type ImportResult = { messages: Message[]; ignored: number };
export const demoTasks: Task[] = [
  {
    id: "demo-1",
    title: "Enviar a proposta comercial",
    contact: "Marina · Estúdio Aurora",
    evidence:
      "Marina: Você consegue me mandar a proposta até amanhã? Preciso fechar o orçamento.",
    status: "open",
    deadline: null,
    confidence: 0.94,
    impact: 1,
  },
  {
    id: "demo-2",
    title: "Compartilhar o comprovante",
    contact: "Rafael · Projeto Atlas",
    evidence: "Você: Te mando o comprovante amanhã.",
    status: "open",
    deadline: null,
    confidence: 0.97,
    impact: 0.8,
  },
  {
    id: "demo-3",
    title: "Confirmar o horário da reunião",
    contact: "Luiza · Equipe",
    evidence: "Luiza: Pode confirmar o horário da nossa reunião?",
    status: "open",
    deadline: null,
    confidence: 0.91,
    impact: 0.6,
  },
  {
    id: "demo-4",
    title: "Aguardar retorno do fornecedor",
    contact: "Bruno · Operações",
    evidence: "Você: Aguardo resposta do fornecedor para confirmar.",
    status: "waiting_other",
    deadline: null,
    confidence: 0.96,
    impact: 0.5,
  },
];
// ponytail: timestamp explícito UTC−3 evita depender do relógio do servidor.
// Limite: exportações brasileiras em UTC−3; fusos e horário de verão históricos exigem seleção futura.
export function parseExport(text: string): ImportResult {
  if (new TextEncoder().encode(text).length > 1_000_000)
    throw new Error("O arquivo deve ter até 1 MB.");
  const messages: Message[] = [];
  let ignored = 0;
  const pattern =
    /^\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\]?\s*(?:-\s*)?([^:]+):\s*(.*)$/;
  let active: Message | undefined;
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.replace(/[\u200e\u200f]/g, "");
    const m = line.match(pattern);
    if (m) {
      const [, d, month, y, h, min, sec, author, body] = m;
      const year = y.length === 2 ? `20${y}` : y;
      const stamp = `${year}-${month.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${min}:${sec ?? "00"}-03:00`;
      const date = new Date(stamp);
      if (
        Number.isNaN(date.getTime()) ||
        +month < 1 ||
        +month > 12 ||
        +d < 1 ||
        +d > new Date(Date.UTC(+year, +month, 0)).getUTCDate() ||
        +h > 23 ||
        +min > 59 ||
        +(sec ?? 0) > 59
      ) {
        ignored++;
        active = undefined;
        continue;
      }
      active = {
        id: `${stamp}|${author.trim()}|${body}`,
        author: author.trim(),
        text: body,
        timestamp: stamp,
      };
      messages.push(active);
    } else if (/^\[?\d{1,2}\/\d{1,2}\//.test(line)) {
      ignored++;
      active = undefined;
    } else if (line.trim() && active) active.text += "\n" + line;
    else if (line.trim()) ignored++;
  }
  const unique = new Map<string, Message>();
  for (const message of messages) {
    message.id = `${message.timestamp}|${message.author}|${message.text}`;
    unique.set(message.id, message);
  }
  return { messages: [...unique.values()], ignored };
}
export function extractTasks(
  messages: Message[],
  self: string,
  conversationId = "Exportação",
): Task[] {
  return reconcileMessages(messages, { self, conversationId }).map((t) =>
    TaskSchema.parse(t),
  );
}
export function prioritize(tasks: Task[], now?: string) {
  return rankTasks(tasks, now);
}
