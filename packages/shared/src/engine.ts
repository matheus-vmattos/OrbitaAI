import type { Message, Task } from "./index";

export type AnalysisOptions = { conversationId: string; self: string };
const DAY = 86_400_000;
const topics = [
  ["comprovante", /comprovante/],
  ["proposta", /proposta|orçamento/],
  ["contrato", /contrato/],
  ["entrega", /entrega|produtos/],
  ["pagamento", /pagamento|boleto|fatura/],
  ["reunião", /reunião/],
] as const;
const normalize = (text: string) => text.trim().toLocaleLowerCase("pt-BR");

function deadlineFor(message: Message): string | null {
  const text = normalize(message.text);
  if (/não.*(?:hoje|amanhã)|sem prazo/.test(text)) return null;
  // ponytail: exportações suportadas têm UTC−3 fixo. A data nasce da mensagem,
  // nunca de "hoje" no servidor. Sem horário explícito, usa fim do dia como referência.
  const local = new Date(Date.parse(message.timestamp) - 3 * 3_600_000);
  let days: number;
  if (/(?:^|\s)amanhã(?=$|[\s.,!?])/u.test(text)) days = 1;
  else if (/(?:^|\s)hoje(?=$|[\s.,!?])/u.test(text)) days = 0;
  else return null;
  local.setUTCDate(local.getUTCDate() + days);
  return new Date(
    `${local.toISOString().slice(0, 10)}T23:59:59-03:00`,
  ).toISOString();
}

/** Regras conservadoras: mesmo assunto + mesma conversa + vínculo inequívoco.
 * Não interpreta instruções de mensagens como comandos. Não é um classificador semântico. */
export function reconcileMessages(
  input: Message[],
  options: AnalysisOptions,
): Task[] {
  if (!options.self.trim() || !options.conversationId.trim())
    throw new Error("Identifique você e a conversa.");
  const messages = [...new Map(input.map((m) => [m.id, m])).values()]
    .filter((m) => Number.isFinite(Date.parse(m.timestamp)))
    .sort(
      (a, b) =>
        Date.parse(a.timestamp) - Date.parse(b.timestamp) ||
        a.id.localeCompare(b.id),
    );
  const self = normalize(options.self);
  const isGroup =
    new Set(messages.map((m) => normalize(m.author)).filter((a) => a !== self))
      .size > 1;
  const remoteAuthors = [
    ...new Set(
      messages.filter((m) => normalize(m.author) !== self).map((m) => m.author),
    ),
  ];
  const tasks: Task[] = [];
  for (const message of messages) {
    const text = normalize(message.text);
    const mine = normalize(message.author) === self;
    const negated =
      /\b(não|nunca)\s+(?:te\s+)?(?:enviei|concluí|recebi|mando|vou|enviar)|ainda não|não foi|não está/.test(
        text,
      );
    const correction =
      /(?:ainda\s+)?não\s+(?:enviei|recebi|concluí|foi enviado|está concluído)/u.test(
        text,
      );
    const waiting = mine && /aguardo|aguardando/.test(text);
    const possible =
      mine &&
      !negated &&
      /(?:^|\s)(?:enviei|concluí)(?=$|[\s.,!?])/u.test(text);
    const confirmation =
      !mine &&
      !negated &&
      /(?:^|\s)(?:recebido|recebi|confirmo o recebimento)(?=$|[\s.,!?])/u.test(
        text,
      );
    const promise =
      mine &&
      !negated &&
      /te mando|vou enviar|vou verificar|enviarei/.test(text);
    const request =
      !mine &&
      /me envi[ae]|me mand[ae]|pode|consegue|confirma|preciso/.test(text);
    if (
      !waiting &&
      !possible &&
      !promise &&
      !request &&
      !confirmation &&
      !correction
    )
      continue;
    const namedTopics = topics
      .filter(([, pattern]) => pattern.test(text))
      .map(([topic]) => topic);
    const matches = tasks.filter(
      (t) =>
        (t.status !== "resolved" || correction) &&
        Date.parse(message.timestamp) - Date.parse(t.updatedAt!) <= 7 * DAY &&
        (mine || normalize(t.contact) === normalize(message.author)),
    );
    const subjects: string[] = namedTopics.length
      ? namedTopics
      : ["indefinido"];
    for (const topic of subjects) {
      if (correction && topic === "indefinido") continue;
      const candidates = matches.filter(
        (t) => topic === "indefinido" || t.topic === topic,
      );
      const genericAcknowledgment =
        /^(?:recebido|recebi|confirmo o recebimento)(?:[,!]?\s*obrigad[oa])?[.!]*$/.test(
          text,
        );
      const genericSent = /^(?:já )?enviei(?:,? confira)?[.!]*$/.test(text);
      const genericPromise =
        /^(?:te mando|vou enviar|enviarei|vou verificar)(?: (?:hoje|amanhã|mais tarde))?[.!]*$/.test(
          text,
        );
      const genericAllowed =
        (confirmation && genericAcknowledgment) ||
        (possible && genericSent) ||
        (promise && genericPromise);
      // Grupo ou contexto com vários assuntos: não associar uma fala genérica por palpite.
      let task =
        candidates.length === 1 &&
        !(topic === "indefinido" && (isGroup || !genericAllowed))
          ? candidates[0]
          : undefined;
      if (correction && !task) continue;
      if (confirmation && !correction) {
        if (
          !task ||
          task.status !== "possibly_resolved" ||
          normalize(task.contact) !== normalize(message.author)
        )
          continue;
      } else if (!task) {
        if (possible && topic === "indefinido") continue;
        const id = `${options.conversationId}|${topic}|${message.id}`;
        task = {
          id,
          conversationId: options.conversationId,
          topic,
          title:
            topic === "indefinido"
              ? waiting
                ? "Aguardar retorno"
                : promise
                  ? "Revisar seu compromisso"
                  : "Responder à solicitação"
              : `${waiting ? "Acompanhar" : "Revisar"} ${topic}`,
          contact: mine
            ? remoteAuthors.length === 1
              ? remoteAuthors[0]
              : options.conversationId
            : message.author,
          evidence: "",
          evidenceIds: [],
          evidenceHistory: [],
          status: "open",
          deadline: null,
          confidence: 0.6,
          impact: 0.5,
          responsibility: waiting ? "other" : "self",
          hierarchy: 0.5,
          createdAt: message.timestamp,
          updatedAt: message.timestamp,
          criticalRisk: false,
        };
        tasks.push(task);
      }
      task.evidenceIds!.push(message.id);
      task.evidenceHistory!.push({ ...message });
      task.evidence = task
        .evidenceHistory!.map((m) => `${m.author}: ${m.text}`)
        .join("\n");
      task.updatedAt = message.timestamp;
      if (correction) {
        task.status =
          task.status === "resolved" || task.status === "possibly_resolved"
            ? "possibly_resolved"
            : "open";
        task.requiresReview = true;
        task.reviewReason =
          "Há uma correção na conversa. Confira as evidências antes de concluir.";
      } else if (confirmation) task.status = "resolved";
      else if (possible) task.status = "possibly_resolved";
      else if (waiting) task.status = "waiting_other";
      else if (promise || request) task.status = "open";
      task.responsibility = waiting ? "other" : "self";
      if ((request || promise) && !correction && !confirmation && !possible) {
        const deadline = deadlineFor(message);
        if (/sem prazo|não.*(?:hoje|amanhã)/.test(text)) task.deadline = null;
        else if (deadline) task.deadline = deadline;
      }
      // Sinais explícitos, não detecção universal de risco. Negação reduz falso positivo.
      if (
        !/sem risco|sem multa|não há risco|não tem risco/.test(text) &&
        /multa|risco financeiro|interrupção|corte de serviço/.test(text)
      ) {
        task.criticalRisk = true;
        task.impact = 1;
      }
    }
  }
  return tasks;
}

export type PriorityWeights = {
  deadline: number;
  impact: number;
  responsibility: number;
  hierarchy: number;
  waiting: number;
};
export const defaultWeights: PriorityWeights = {
  deadline: 0.3,
  impact: 0.25,
  responsibility: 0.2,
  hierarchy: 0.15,
  waiting: 0.1,
};
export function scoreTask(task: Task, now: string, weights = defaultWeights) {
  if (!Number.isFinite(Date.parse(now)))
    throw new Error("Data de referência inválida.");
  const values = Object.values(weights);
  if (
    values.some((w) => !Number.isFinite(w) || w < 0) ||
    Math.abs(values.reduce((a, b) => a + b, 0) - 1) > 0.0001
  )
    throw new Error("Pesos precisam ser não negativos e somar 1.");
  const remaining = task.deadline
    ? Date.parse(task.deadline) - Date.parse(now)
    : Infinity;
  const urgency =
    remaining <= 0
      ? 1
      : remaining <= DAY
        ? 0.9
        : remaining <= 3 * DAY
          ? 0.5
          : 0;
  const age = task.createdAt
    ? Math.max(0, Date.parse(now) - Date.parse(task.createdAt))
    : 0;
  const factors = {
    deadline: urgency,
    impact: task.impact,
    responsibility: task.responsibility === "other" ? 0 : 1,
    hierarchy: task.hierarchy ?? 0.5,
    waiting: Math.min(1, age / (7 * DAY)),
  };
  const score = Object.entries(factors).reduce(
    (total, [key, value]) =>
      total + value * weights[key as keyof PriorityWeights],
    0,
  );
  const reasons = [
    task.criticalRisk ? "risco explícito na evidência" : "",
    remaining <= 0
      ? "prazo de referência vencido"
      : urgency
        ? "prazo próximo"
        : "",
    task.impact >= 0.8 ? "impacto alto" : "",
    task.responsibility === "other" ? "depende de terceiro" : "depende de você",
  ].filter(Boolean);
  return { score, factors, reason: reasons.join("; ") };
}
export function rankTasks(
  tasks: Task[],
  now = new Date().toISOString(),
  weights = defaultWeights,
): Task[] {
  return tasks
    .filter((t) => t.status === "open")
    .map((task) => ({ task, priority: scoreTask(task, now, weights) }))
    .sort(
      (a, b) =>
        Number(!!b.task.criticalRisk) - Number(!!a.task.criticalRisk) ||
        b.priority.score - a.priority.score ||
        a.task.id.localeCompare(b.task.id),
    )
    .slice(0, 3)
    .map(({ task, priority }) => ({
      ...task,
      priorityReason: priority.reason,
    }));
}
