# OrbitAI — pesquisa de arquitetura, alternativas e custo de testes

Consulta em 27/10/2026. **Pesquisa parcial, com recomendação provisória. Nenhuma implementação de produto, contratação, conta, integração ou chamada de IA foi feita nesta etapa.**

## Conclusão para decisão

O menor desembolso inicial viável é manter a aplicação no ambiente existente, usar Supabase local ou Free para contas/banco e avaliar um modelo elegível à franquia gratuita do Cloudflare Workers AI. A meta é US$ 0 incremental de provedores durante testes pequenos; isso não inclui assinaturas já pagas, máquina, energia, internet, impostos ou futura hospedagem pública. Franquias e disponibilidade precisam ser confirmadas na conta.

Não escolher um modelo apenas pelo menor preço. Uma conclusão incorreta de obrigação ou mudança de data na resposta custa mais ao produto que a pequena economia de tokens. Primeiro comparar qualidade em português com exemplos sintéticos.

A outra decisão central é separar **captura do WhatsApp**, **estado das obrigações** e **IA**. A pergunta “Urgente Hoje” deve consultar obrigações já estruturadas; a IA entra em extração ambígua e redação, sem reprocessar todo o histórico.

## O que foi efetivamente pesquisado

Foram lidas fontes oficiais públicas no GitHub: documentação de Cloudflare, Supabase e OpenAI; repositórios de OpenClaw, NanoClaw, nanobot, Beeper, mautrix/WhatsApp, whatsmeow, Baileys, Ollama e exemplos da Meta. Foram lidas licenças MIT de OpenClaw/NanoClaw e AGPLv3 de mautrix-whatsapp. Nenhum desses produtos foi instalado, conectado a uma conta ou submetido a benchmark. Características abaixo são declarações documentadas dos projetos; implicações para OrbitAI são nossa avaliação.

As páginas diretas de OpenAI, Supabase, Beeper, TimelinesAI, respond.io e WATI retornaram bloqueio 403 do proxy. A configuração de rede está `restricted/enforced`. O leitor de configuração retornou que o contexto de onboarding está indisponível. A pesquisa técnica avançou por fontes oficiais acessíveis; **preços comerciais e termos atuais desses serviços não foram validados**.

## Concorrentes e soluções próximas

| Produto / fonte examinada | Evidência documentada | O que aproveitar | Limite da comparação |
|---|---|---|---|
| [OpenClaw](https://github.com/openclaw/openclaw/blob/12bb61686cc759fbfbc4e9005d48689ede39a1c9/README.md) | Assistente pessoal, gateway, sessões/memória, canais como WhatsApp e modelos intercambiáveis | Separar canal de mensageria de modelo; contexto persistente; trocar provedor sem refazer a UI | Framework amplo não prova classificação correta de obrigações; gasto depende de modelo, uso e operação. Sem benchmark |
| [NanoClaw](https://github.com/qwibitai/nanoclaw/blob/acc2b1c8f52a954368cfaf04b61c32f9a1efc280/README.md) | Agentes em containers, isolamento por agente, canais instalados sob demanda, provedores alternativos | Isolamento, componentes pequenos e permissão explícita | Containers/agent harness adicionam operação; não precisamos de agentes com shell para resumir pendências. Não adotar as críticas do README a concorrentes como auditoria independente |
| [Beeper Bridge Manager](https://github.com/beeper/bridge-manager/blob/d04569b64f21d495e75eae08b784ded325a33839/README.md) | Bridges auto-hospedadas conectadas ao servidor Beeper; lista inclui WhatsApp | Conector separado e armazenamento de sessão separado da análise | Esse utilitário depende de conta/servidor Beeper; não é backend genérico do OrbitAI. O README descreve implicações de recriptografia e bridges sem criptografia fim a bridge. Preço do aplicativo não verificado |
| [nanobot](https://github.com/HKUDS/nanobot) | Framework pessoal auto-hospedado com memória e provedores locais/compatíveis | Núcleo pequeno e liberdade de provedor | Não afirmar suporte WhatsApp atual só por semelhança com outros projetos; os canais devem ser verificados na versão escolhida |
| TimelinesAI, respond.io e WATI | Sites comerciais tentados, bloqueados | Comparação comercial ainda pendente | Sem afirmar planos, preços, cobertura de histórico ou recursos não consultados |

A oportunidade específica do OrbitAI, como hipótese de produto, é acompanhar **obrigações com evidência** e responder sob demanda por voz. A existência de memória ou resumo em um concorrente não demonstra que ele mantém corretamente uma promessa até sua conclusão. Essa diferenciação ainda exige comparação prática.

## Captura das conversas: custo e viabilidade

1. **Exportação autorizada**: melhor caminho imediato para testar interpretação com custo mínimo e sem sessão persistente. É estática e parcial; não reproduz a leitura automática do cenário completo do João.
2. **Conector pessoal experimental**: [Baileys](https://github.com/WhiskeySockets/Baileys/blob/81345beb67ca3fb0eb79a2c20cd4ac24da517929/README.md) usa WebSocket em vez de navegador automatizado, documenta sessão de dispositivo vinculado e declara não ser afiliado/autorizado pelo WhatsApp. Reduzir RAM de browser não elimina custo de servidor, manutenção de sessão, compatibilidade e risco de restrição. O README não é garantia de histórico completo. Manter fora do primeiro teste de IA; eventual PoC somente leitura, flag desligada e conta secundária explicitamente autorizada.
3. **Business oficial**: [exemplos oficiais da Meta](https://github.com/fbsamples/whatsapp-api-examples) são da WhatsApp Business Platform/Cloud API, incluindo webhooks. Isso **não comprova acesso irrestrito às conversas pessoais existentes**. Validar documentação e termos atuais antes de prometer esse comportamento. Preços e eventuais opções de coexistência não verificados nesta pesquisa.

Para atingir exatamente “João abre o app e ele lê o WhatsApp”, ainda precisamos resolver e validar o conector; trocar o modelo de IA sozinho não resolve essa etapa.

## IA: candidato barato e contas reproduzíveis

A [documentação oficial do Workers AI](https://github.com/cloudflare/cloudflare-docs/blob/d57d195ee99ea8ffca6b5b9ee4bc763a08fa7a38/src/content/docs/workers-ai/platform/pricing.mdx) informa **10.000 Neurons gratuitos por dia**, reinício às 00:00 UTC e bloqueio de operações ao exceder limites no Free. Alguns modelos exigem pagamento; não presumir que todo o catálogo pertence à franquia gratuita.

Candidato documentado para benchmark: `@cf/qwen/qwen3-30b-a3b-fp8`. A tabela consultada informa US$ 0,051 / milhão de tokens de entrada e US$ 0,335 / milhão de saída; equivalência de 4.625 Neurons / milhão de entrada e 30.475 / milhão de saída. Isso é documentação de preço, **não validação de disponibilidade, compatibilidade de schema, latência, qualidade em pt-BR ou autorização na conta**.

Cenário ilustrativo, não medição do OrbitAI: 100 análises/dia, 2.000 tokens de entrada e 500 de saída por análise, por 30 dias:

- Entrada mensal: 100 × 30 × 2.000 = 6 milhões de tokens.
- Saída mensal: 100 × 30 × 500 = 1,5 milhão.
- Equivalente tarifário antes de franquias: 6 × US$ 0,051 + 1,5 × US$ 0,335 = **US$ 0,8085**.
- Consumo diário estimado: 100 × (2.000 × 4.625 + 500 × 30.475) / 1.000.000 = **2.448,75 Neurons**, abaixo de 10.000.
- Nesse cenário e sob elegibilidade/limites do Free: **US$ 0 de inferência**. Tráfego adicional, retries, raciocínio contabilizado e outros limites podem mudar o resultado. Medir os contadores retornados pelo serviço.

Não converter Neurons em um número fixo de mensagens: consumo depende de modelo, tokens e contexto. O [Workers Paid](https://github.com/cloudflare/cloudflare-docs/blob/d57d195ee99ea8ffca6b5b9ee4bc763a08fa7a38/src/content/docs/workers/platform/pricing.mdx) tem mínimo de **US$ 5/mês**, separado da inferência excedente. Não habilitar Paid para perseguir economia em um teste que já cabe no Free.

Comparar esse candidato a um modelo econômico de outro provedor quando as tabelas atuais forem acessíveis. O [cookbook oficial OpenAI sobre cache](https://github.com/openai/openai-cookbook/blob/a8132ca2f7a5de3a6cf15d9e79d172787b42b697/examples/Prompt_Caching101.ipynb) mostra a utilidade de prefixos estáveis; não aumentar artificialmente prompts pequenos só para buscar cache. O [cookbook Gemini de observabilidade](https://github.com/google-gemini/cookbook/blob/main/examples/Cost_Estimation_And_Health_Monitoring.ipynb) orienta medir tokens e atualizar tarifas; ele identifica seus números como exemplos, portanto não foram usados como preços atuais.

Ollama/local é uma alternativa se já houver hardware adequado, mas não é “custo zero” de máquina/energia e não foi medido nesta máquina. Não contratar GPU para esta fase. Termos de tratamento/retenção dos provedores ainda precisam ser verificados antes de enviar conversas reais; benchmark inicial usa apenas mensagens sintéticas.

## Banco, contas, processamento e voz

- [Supabase local](https://github.com/supabase/supabase/blob/c4424c97952e95640e1b4e1d1b307dcb7b688be4/apps/docs/content/guides/local-development.mdx): documentação informa desenvolvimento gratuito sem consumir cota do projeto; exige runtime compatível, tipicamente Docker. Não instalado/validado nesta etapa.
- [Supabase Free](https://github.com/supabase/supabase/blob/c4424c97952e95640e1b4e1d1b307dcb7b688be4/apps/docs/content/guides/platform/cost-control.mdx): documentação informa ausência de cobrança no Free; [MAU](https://github.com/supabase/supabase/blob/c4424c97952e95640e1b4e1d1b307dcb7b688be4/apps/docs/content/guides/platform/manage-your-usage/monthly-active-users.mdx) lista 50.000 incluídos. Isso é limite de autenticação, não garantia de capacidade do banco inteiro. A [pausa por baixa atividade em janela de sete dias](https://github.com/supabase/supabase/blob/c4424c97952e95640e1b4e1d1b307dcb7b688be4/apps/docs/content/guides/platform/free-project-pausing.mdx) é uma limitação relevante para testes. Backups, e-mails, egress e demais cotas precisam ser conferidos antes do piloto.
- **Fila PostgreSQL antes de Redis**, se precisarmos de jobs: [Supabase Queues](https://github.com/supabase/supabase/blob/c4424c97952e95640e1b4e1d1b307dcb7b688be4/apps/docs/content/guides/queues.mdx) usa pgmq, persistência em Postgres e controle de acesso/RLS. Esta é uma mudança proposta em relação ao prompt inicial BullMQ/Redis, para reduzir serviços e operação; ainda exige validar consumo, disponibilidade e processamento idempotente. Não implantar fila sem necessidade real nem tratar entrega de fila como execução exatamente uma vez.
- **Voz**: aproveitar ditado/síntese do navegador, com fallback para texto. Validar celular real, pt-BR, permissões e latência. Navegador pode depender de processamento externo. Evitar começar com sessão de áudio IA contínua, que amplia complexidade e consumo.
- **Frontend**: manter Next.js no ambiente existente durante os testes privados. Não migrar toda a aplicação para Workers só por uma franquia; a API Workers AI pode ser um serviço separado. Hospedagem pública e elegibilidade de planos gratuitos para uso comercial ainda não decididas.

## Desenho proposto para gastar pouco

Exportação / eventos autorizados → deduplicação → estado das obrigações → pequeno contexto da conversa → extração por IA quando necessária → schema + validação de IDs/datas → conciliação → prioridade determinística → resposta curta → redação sob demanda → copiar.

- Processar incrementalmente, com debounce por conversa; não uma chamada por cada fragmento de mensagem e não o histórico inteiro por pergunta.
- Cache de resultado por usuário/workspace, conector, hash de conteúdo, versão do prompt/schema e modelo. Não compartilhar conteúdo entre contas.
- Prioridade, datas e autorização ficam no código/banco. JSON bem formado não demonstra que a extração é verdadeira.
- Reservar o custo máximo antes da chamada e acertar o uso depois, com contador transacional e bloqueio por orçamento. Alertas isolados não são teto rígido. Manter timeout, limite de saída e retries limitados.
- Sem embeddings, banco vetorial, múltiplos agentes ou Redis no primeiro benchmark. Introduzir somente se uma falha medida justificar.
- Nenhum envio automático, nenhum agente com acesso ao sistema operacional para interpretar mensagens.

## Experimento antes da implementação da integração

1. Montar conjunto sintético em pt-BR: promessas, pedidos, grupos, negações, duplicatas, conclusões, datas relativas e instruções adversariais; incluir fornecedor dia 20/pagamento dia 15 e Amanda em uma hora.
2. Comparar dois candidatos elegíveis, com o mesmo contexto e schema. Medir validade de evidência, falsas conclusões, fidelidade de datas/valores, custo real e latência. Nenhum benchmark de modelo foi executado nesta pesquisa.
3. Só então escolher o provedor. Meta de aceite no conjunto: nenhuma conclusão falsa ou alteração de data/valor; falhas viram pedido de revisão, não sucesso inventado.
4. Implementar adaptador no servidor e isolamento por conta, mantendo demo gratuita como padrão. Conector ao WhatsApp real é PoC separada.

## Pendências para completar a comparação comercial

Permitir leitura HTTPS, preservando os domínios já existentes, para: `openai.com`, `developers.openai.com`, `supabase.com`, `developers.cloudflare.com`, `ai.google.dev`, `www.beeper.com`, `timelines.ai`, `respond.io`, `www.wati.io`, `developers.facebook.com`, `business.whatsapp.com` e `www.whatsapp.com`. Redirects podem exigir hosts adicionais, a verificar pelo erro real.

O editor de configuração não está disponível neste contexto; nenhuma alteração de allowlist foi feita e nenhum caminho de proxy foi contornado. Reabrir o contexto de configuração original ou liberar esses destinos nas configurações é necessário para validar os sites bloqueados. Nenhuma tarifa de concorrente comercial foi inventada para preencher a comparação.
