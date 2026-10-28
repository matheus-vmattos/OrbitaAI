// Conteúdo fictício; passa pelo mesmo parser e sessão das importações TXT.
export const sampleStages = [
  {
    action: "Simular pedido e promessa",
    text: "27/10/2026, 09:00 - Marina: Me envie o comprovante amanhã.\n27/10/2026, 09:01 - Você: Te mando amanhã.",
  },
  {
    action: "Simular envio do comprovante",
    text: "27/10/2026, 10:00 - Você: Enviei o comprovante, confira.",
  },
  {
    action: "Simular confirmação de recebimento",
    text: "27/10/2026, 10:02 - Marina: Recebido, obrigado.",
  },
  {
    action: "Simular correção da confirmação",
    text: "27/10/2026, 10:05 - Marina: Ainda não recebi o comprovante.",
  },
] as const;
