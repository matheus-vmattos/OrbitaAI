# Custos e limite da fase atual

**Decisão do dono: R$ 0 de novos gastos na validação.** Não contratar infraestrutura ou habilitar consumo faturável sem autorização posterior explícita. Franquia gratuita precisa ser confirmada na conta e bloquear excedentes; se a gratuidade não estiver comprovada, o teste externo fica desligado. Ao esgotar a franquia, interromper ou aguardar, sem upgrade/recarga/fallback pago. O limite local de chamadas não garante gratuidade do provedor.


O protótipo não chama APIs pagas. Não há consumo de tokens nem telemetria de conteúdo. Custos de hospedagem dependem do provedor escolhido.

Futuro: medir tokens de entrada/saída, modelo, duração e custo por workspace sem registrar mensagens. Verificar disponibilidade e preço de modelos na conta antes de selecionar; não presumir a existência do modelo sugerido nos documentos. Supabase, Redis, worker e hospedagem ainda não provisionados.

O novo benchmark `pnpm benchmark:ai` usa doubles/fixtures e não mede preço ou qualidade de provedor. Modo real é opcional e desligado por padrão. Até 10 chamadas por dia UTC no arquivo local, com reserva mantida em erros. Esse limite não é garantia de gratuidade nem teto em dólares; conferir a conta Free e uso total Cloudflare. Guia: `packages/ai/README.md`.
