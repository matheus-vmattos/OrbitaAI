# Arquitetura atual

`apps/web` contém Next.js App Router e interface React. `packages/shared` contém schemas Zod, exemplos sintéticos, parser, extração por regras e seleção ponderada de três prioridades. O navegador processa o TXT e guarda resultados apenas em memória. Não há endpoints que recebam conversas.

Fluxo: TXT autorizado → parser/deduplicação → regras demonstrativas → tarefas em memória → confirmação humana ou recebimento inequívoco vinculado ao solicitante.

Destino revisado proposto, ainda não implementado: mobile Android/iPhone prioritário (React Native/Expo a validar), web Next.js, API/regras comuns, Supabase Auth/PostgreSQL com RLS e filas PostgreSQL/pgmq a avaliar antes de Redis. Conector por sessão requer validação de ciclo de vida; a escolha inicial é processo Node persistente. Workers/Durable Objects suportam WebSockets, mas compatibilidade e custo do conector nesse runtime não foram provados. IA fica atrás de adaptadores intercambiáveis; o único implementado é o Cloudflare de benchmark. A arquitetura do EsquecAI é referência de princípios, não stack deste produto.

Interface conversacional com revelação progressiva de evidências. `conversation.ts` mantém o roteiro do João separado do parser. Rascunhos são editáveis e copiáveis, sem afetar o estado das obrigações. A UI usa speechSynthesis para leitura e SpeechRecognition opcional para ditado; na ausência desses recursos mantém entrada/saída por texto.

`engine.ts` reconcilia mensagens em ordem cronológica, deduplica IDs e mantém evidências. Identificador da conversa é explícito na importação; batches de contatos distintos não devem reutilizar esse identificador. A aba acumula mensagens por conversa em memória (até 5000 mensagens / 5 MB) para reprocessar backfill fora de ordem. Não há fila/worker persistente. Semântica é limitada a assuntos e padrões suportados; casos ambíguos permanecem separados ou pendentes.

Prioridade tem data de referência injetável e pesos configuráveis no domínio. Motivo e fatores são inspecionáveis por `scoreTask`; interface revela motivo apenas sob demanda. Sinais textuais de risco não substituem análise de contexto.

Backend de IA isolado em `packages/ai`: schemas de entrada/observações, adaptador Cloudflare REST JSON Schema e serviço com cache/limitador SQLite. O CLI usa somente fixtures sintéticas. Não há API pública autenticada de análise ou ligação desse backend à importação; a UI atual continua local. Escopo de cache não é autorização de usuário. Produção requer auth/RLS e orçamento transacional compartilhado em Postgres.

Revisão de sustentabilidade e custos ilustrativos: `docs/pesquisa/2026-10-28-sustentabilidade.md`. Propostas não equivalem a componentes implantados ou aprovados para produção.

Base mobile de validação: manifesto PWA, ícones Apple/Android e SW de produção com cache exclusivo de assets públicos/offline. `packages/connectors` adiciona contratos de recepção e normalização, com fábrica de socket injetada apenas em testes; sem SDK, credenciais ou sessão real. Identidade do remetente é separada do nome de exibição. Dedup e fila de callbacks são em memória, inadequados como persistência de produção.

`packages/shared/src/session.ts` unifica ingestão e decisões na UI/ponte de conector, com estado efêmero por escopo, validação atômica e limites. IDs iguais em origens/conversas diferentes não se fundem. Decisões manuais usam evidências para sobreviver a backfill seguro; associações ambíguas e novas evidências pedem revisão. Não substitui armazenamento persistente, autenticação, orçamento compartilhado ou RLS. Fluxos de validação estão em `docs/testar-fluxo-local.md`.
