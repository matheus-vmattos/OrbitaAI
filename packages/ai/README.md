# IA de backend — testes controlados

Adaptador Cloudflare Workers AI, contrato Zod, validação de evidência literal, cache e limitador SQLite para testes em uma máquina. Nenhuma rota pública de IA foi criada. A interface atual continua usando demo/regras locais; este módulo não implementa autenticação, RLS ou conexão WhatsApp.

## Teste sem custo externo

Node.js 24.19+ e dependências do workspace. Na raiz:

```bash
pnpm benchmark:ai
```

Executa três fixtures (10 mensagens sintéticas) com respostas predeterminadas. `mode=mock` testa o comparador e o contrato; resultados aprovados **não demonstram qualidade de modelo real**. SQLite é temporário, em memória, nesse modo. Comando usa o proxy herdado por `node --use-env-proxy`.

## Comparação real — pendente de configuração

Pré-requisitos:

1. Conta Cloudflare Free; conferir elegibilidade e limites dos modelos na própria conta. Nenhum limite local representa garantia de gratuidade se a conta estiver em plano pago ou receber tráfego de outros aplicativos.
2. `CLOUDFLARE_ACCOUNT_ID` como variável de ambiente.
3. `CLOUDFLARE_API_TOKEN` como credencial segura, limitada à conta e à API Workers AI. Nunca colocar o valor em código, linha de comando, logs ou chat. Usar configuração segura de ambiente.
4. Liberar `api.cloudflare.com` no acesso HTTPS, mantendo domínios existentes. Para ler instruções no site, também `developers.cloudflare.com` e `dash.cloudflare.com`.
5. Após configurar as credenciais de forma segura, habilitar `ORBIT_AI_LIVE_ENABLED=true` só para a execução do teste e executar `pnpm benchmark:ai -- --live`. A execução normal da aplicação nunca chama esse comparador.

O CLI lê variáveis exportadas/injetadas; não carrega `.env.example` ou `.env.local` automaticamente. Nenhuma credencial é fornecida no repositório.

Os modelos candidatos são `@cf/meta/llama-3.1-8b-instruct` e `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, listados no guia oficial de JSON Mode. Não foram testados na conta. Qwen do levantamento de preços não foi escolhido aqui porque a compatibilidade com JSON Schema não consta da lista consultada. Isso não prova incompatibilidade definitiva, apenas falta de confirmação.

Uma execução real faz até seis chamadas (três casos × dois modelos), antes de cache e erros de quota. Não há retries automáticos, inclusive em erro 429/timeout. Erros de rede ou formato não viram respostas aprovadas. O modo real está desativado por padrão.

## Limites e evidências

- Até 30 mensagens, 4 mil caracteres por mensagem e 12 KB no corpo serializado da requisição ao modelo; limite de 512 tokens de saída e timeout de 20 s.
- Reserva transacional por dia UTC: até 10 chamadas, 120 mil bytes de entrada e 5.120 tokens máximos de saída. Reservas continuam consumidas em falhas, pois não é possível concluir que o provedor não faturou.
- Contador persistente em `.cache/orbit-ai/budget.sqlite`, compartilhado por processos que usam esse mesmo arquivo. Não apagar/recriar o arquivo para contornar quota. Não é um limitador distribuído nem teto financeiro em dólares.
- Cache particionado por workspace, conversa, modelo, provedor, versão de prompt/schema e entrada. Validade de 24 h. Linhas expiradas são limpas em gravações futuras; não há daemon de exclusão nem garantia de eliminação física de arquivos/backups. O CLI usa somente fixtures sintéticas.
- `workspaceId` e `conversationId` precisam vir de um chamador autorizado no servidor. Esses campos isolam chaves de cache; **não substituem autenticação ou autorização**. Nada deste módulo autoriza conta A a acessar dados de B.
- O modelo devolve observações (`request`, `promise`, `waiting_other`, `sent`, `acknowledged`, `information`), não status final de tarefa. Toda saída tem `requiresReview=true`; não conclui obrigações nem dispara envio.
- ID e citação precisam existir literalmente na entrada; `deadlineText` precisa estar na citação. Isso não demonstra veracidade semântica do assunto/classificação. Datas reais serão calculadas pelo domínio, não inventadas pelo modelo.
- Benchmarks avaliam cobertura de atos, conflitos e trechos de prazo dos três casos. Não medem redação livre, voz, qualidade geral em pt-BR, carga ou fidelidade de assuntos; ainda exigem revisão humana e mais casos antes de produção.
- Métricas de tokens só são mostradas se o provedor retornar campos reconhecidos. `usage=null` e `costUsd=null` significam não medidos, nunca consumo ou custo zero.

## Verificação executada nesta etapa

Testes automatizados cobrem IDs/citações inventados, prazo sem evidência, status de tarefa proibido, cache particionado/expiração, reserva persistente entre conexões, limite antes da chamada, erros sem retry, request/response HTTP usando doubles, e CLI bloqueado sem ativação ou credenciais. O benchmark real não foi executado; mock e contratos HTTP não validam a disponibilidade dos modelos.

Fontes oficiais consultadas:

- https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/workers-ai/get-started/rest-api.mdx
- https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/workers-ai/features/json-mode.mdx

Em 28/10/2026, o ambiente não tinha as variáveis Cloudflare/Supabase, a chamada de verificação sem credenciais a `api.cloudflare.com` foi bloqueada pelo proxy com 403 e o leitor de rascunho informou contexto de onboarding indisponível. Nenhuma configuração de rede/credencial foi salva na plataforma por esta etapa.
