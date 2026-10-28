# Visão do dono

OrbitAI: assistente para entender o que exige ação nas próprias conversas do WhatsApp. Pergunta central: “O que precisa de mim agora?”. Público pessoal e empresarial, incluindo pessoas leigas.

Direção expressa pelo dono: design mais focado em espacial, com Apple/SpaceX/Tron e pitadas de Matrix. Codex é o líder e Claude o assistente, invertendo o arranjo do EsquecAI.

Cenário fornecido pelo dono: João é gerente geral e está na esteira durante o horário comercial. Abre o app e pede por voz “me dá o que é urgente”. O assistente consulta as conversas e responde falando que há uma pendência com o fornecedor X e que Amanda, do RH, aguarda resposta. João dita entregas todo dia 20, pagamento dia 15 e pede formalização; para Amanda, dita que chega ao escritório em uma hora e responderá lá. Recebe os textos prontos para revisar, copiar e colar no WhatsApp.

Correção visual do dono: primeira tela estava poluída e com texto demais. Menos informação permanentemente na tela; mais informação dada sob demanda. Ambiente espacial com estrelas discretas. A entrada principal é a conversa, não um dashboard.

Decisão de implementação inicial: copiar texto revisável e oferecer link genérico para WhatsApp Web. Sem número de contato confirmado não há link direto para destinatário; não inventar telefone nem prometer envio. Detalhes e evidências aparecem sob demanda.

Os dois documentos fornecidos são referências. A stack Electron/Firebase do EsquecAI não é transferida: o prompt do OrbitAI propõe web/PWA, Next.js e futuro Supabase/worker. O protótipo atual não representa a entrega integral da Fase 1.

O dono aprovou o cenário visual base; polimento visual adiado. Autorizou avançar para a próxima fase funcional.

Prioridade reforçada pelo dono em 28/10: duas versões, web e mobile, sendo mobile a mais relevante. Projeto e validação devem partir do uso no celular (voz, uma mão, academia). Backend e regras devem ser compartilhados. O protótipo atual é web responsivo; não há app mobile instalável entregue. Validar voz/conector nos aparelhos-alvo antes da decisão PWA versus app nativo.

Aparelhos de teste confirmados pelo dono: Android e iPhone. A voz e a experiência mobile precisam ser validadas nos dois, sem presumir comportamento idêntico de APIs do navegador.
