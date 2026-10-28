# Riscos e limitações

- Regras simples podem perder solicitações, duplicar obrigações semanticamente, unir pedidos do mesmo assunto em uma janela de sete dias ou atribuir responsabilidade incorreta. Conferir evidências; ausência de ação detectada não prova ausência de pendências.
- Exportação é parcial e estática, nunca sincronização completa. UTC−3 fixo não cobre outros fusos ou horário de verão histórico.
- A prioridade ponderada é heurística e não calibrada; confiança continua ilustrativa. Não representa avaliação de urgência por IA.
- Parser não aceita ZIP, mídia, todas as localidades ou todos os formatos WhatsApp. Mensagens que parecem cabeçalhos podem ser ambíguas.
- Não há segurança multi-tenant porque não há contas/banco; esses controles são pré-requisito para produção.
- Futuro conector não oficial pode violar termos e levar à suspensão de conta. Não implementado nem habilitado. Nenhuma conta real foi conectada.
- A interface é uma proposta inicial executável, ainda sujeita à revisão do dono.

- Respostas formais do João são modelos fixos do cenário, não redação livre por IA. Voz depende do navegador e pode falhar ou usar processamento externo; autorização de microfone não garante reconhecimento. Links genéricos do WhatsApp não selecionam destinatário nem enviam mensagem.

- A janela de sete dias e os assuntos cadastrados não cobrem todas as referências. Recebimento genérico em grupo não conclui tarefa. Reutilizar o mesmo identificador para contatos diferentes invalida o isolamento da importação.
- Decisões manuais são preservadas por ID; um backfill com pedido anterior pode mudar a identidade da obrigação e exigir revisão manual.
- “Amanhã/hoje” sem hora produz fim do dia como referência, não prazo contratual. O parser permanece limitado a UTC−3.
