import { prioritize, type Task } from "./index";
import type { Coverage } from "./session";

export const joaoTasks: Task[] = [
  {
    id: "joao-fornecedor",
    title: "Definir entrega e pagamento",
    contact: "Fornecedor X",
    evidence:
      "Fornecedor X: João, preciso confirmar a data das próximas entregas e do pagamento.",
    status: "open",
    deadline: null,
    confidence: 0.6,
    impact: 1,
  },
  {
    id: "joao-rh",
    title: "Responder à Amanda",
    contact: "Amanda · RH",
    evidence:
      "Amanda: João, preciso de uma resposta sua sobre o assunto do RH.",
    status: "open",
    deadline: null,
    confidence: 0.6,
    impact: 0.8,
  },
];
export const exampleCommand =
  "Prepara uma resposta formal pro fornecedor: a partir de hoje quero os produtos todo dia 20 e vamos pagar no dia 15. Para Amanda: chego no escritório em 1h e te respondo lá.";
export type Draft = { recipient: string; text: string };
export type Reply = { text: string; drafts?: Draft[] };

// ponytail: cenário roteirizado permite avaliar o fluxo sem fingir uma chamada de IA.
// Limite: redação livre precisa de um adaptador de IA e validação de fatos.
export function replyTo(
  command: string,
  demo: boolean,
  tasks: Task[],
  coverage: Coverage = "partial",
): Reply {
  const coverageNotice =
    {
      unknown: "A cobertura das conversas é desconhecida.",
      partial: "O histórico é parcial.",
      stale:
        "Os dados estão desatualizados; atualize antes de confiar nas prioridades.",
      disconnected:
        "Há fontes desconectadas; mensagens recentes podem estar faltando.",
    }[coverage] +
    (tasks.some((t) => t.requiresReview)
      ? " Há pendências que precisam de revisão após novas mensagens."
      : "");
  const q = command.toLocaleLowerCase("pt-BR");
  if (
    /prepara|redig|formal|respost/.test(q) &&
    !/urgente|aguarda|precisa/.test(q)
  ) {
    if (
      demo &&
      /fornecedor/.test(q) &&
      /(?:dia\s*)20/.test(q) &&
      /(?:dia\s*)15/.test(q) &&
      /amanda/.test(q) &&
      /1\s*h|uma hora/.test(q)
    ) {
      return {
        text: "Preparei as duas respostas. Confira os textos antes de copiar.",
        drafts: [
          {
            recipient: "Fornecedor X",
            text: "Olá! A partir de hoje, gostaria de alinhar as entregas dos produtos para o dia 20 de cada mês, com os pagamentos programados para o dia 15. Poderia confirmar a viabilidade dessa programação?",
          },
          {
            recipient: "Amanda · RH",
            text: "Oi, Amanda! Chego ao escritório em uma hora e te respondo assim que estiver lá.",
          },
        ],
      };
    }
    return {
      text: "Neste protótipo, só consigo preparar as respostas do exemplo do João. A redação livre ainda precisa de IA conectada. Nada foi enviado.",
    };
  }
  if (/urgente|precisa|prioridade|pendência/.test(q)) {
    if (demo) {
      const supplier = tasks.some(
        (t) => t.id === "joao-fornecedor" && t.status === "open",
      );
      const hr = tasks.some((t) => t.id === "joao-rh" && t.status === "open");
      if (supplier && hr)
        return {
          text: "Você tem uma pendência com o fornecedor X e a Amanda, do RH, precisa de uma resposta sua.",
        };
      if (supplier)
        return { text: "Você tem uma pendência com o fornecedor X." };
      if (hr) return { text: "A Amanda, do RH, precisa de uma resposta sua." };
      return {
        text: "As duas pendências deste exemplo foram marcadas como concluídas. Isso não representa uma consulta ao WhatsApp real.",
      };
    }
    const next = prioritize(tasks);
    const confirmations = tasks.filter(
      (t) => t.status === "possibly_resolved",
    ).length;
    const waiting = tasks.filter((t) => t.status === "waiting_other").length;
    if (!next.length && (confirmations || waiting))
      return {
        text: `${confirmations ? `${confirmations} possível(is) conclusão(ões) para conferir. ` : ""}${waiting ? `${waiting} pendência(s) aguardando terceiros. ` : ""}${coverageNotice}`,
      };
    return {
      text: next.length
        ? `Nas mensagens disponíveis, encontrei estas possíveis ações: ${next.map((t) => `${t.contactLabel ?? t.contact}: ${t.title.toLocaleLowerCase("pt-BR")}`).join("; ")}. A prioridade é estimada. ${coverageNotice}`
        : `Não identifiquei ações pelas regras deste protótipo. ${coverageNotice} Isso não garante que não existam pendências.`,
    };
  }
  return {
    text: "Posso mostrar as pendências do exemplo do João ou preparar as duas respostas desse cenário. Ainda não interpreto conversas livremente.",
  };
}
