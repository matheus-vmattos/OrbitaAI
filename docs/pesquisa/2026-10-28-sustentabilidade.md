# OrbitAI — sustentabilidade da arquitetura

Avaliação técnica em 28/10/2026. Fontes oficiais consultadas pelo GitHub; sem benchmark real, contratação, migração ou alteração de implementação nesta etapa. Recomendação de arquitetura é proposta, não validação de produção.

## Parecer

A combinação é viável para evolução se Cloudflare Workers AI for um fornecedor substituível, não o local de todo estado do produto. A arquitetura atual é um protótipo com ferramenta de benchmark; ainda não suporta operação autenticada multiusuário. Franquias gratuitas são adequadas para testes e não devem sustentar a previsão econômica de produção.

O risco principal ainda é confirmar uma captura de WhatsApp compatível com o cenário pessoal do João, estável e operável dentro das regras aplicáveis. Essa hipótese deve ser testada antes de ampliar infraestrutura. Instalar aplicativo mobile ou contratar IA não concede acesso às conversas de outro aplicativo.

## Desenho alvo proposto

- **Mobile prioritário**: React Native/Expo para Android e iPhone é a recomendação a validar para o produto com foco em voz. Compartilhar regras/contratos e cliente de API com a web; não pressupor reaproveitamento integral de componentes Next.js/DOM. Não implementado.
- **Web complementar**: manter o protótipo Next.js e evoluir a mesma conta/dados por API compartilhada. A UI atual não está conectada ao backend de IA ou ao banco.
- **Backend modular Node.js**: começar com poucos serviços e módulos explícitos, evitando um microserviço para cada função. Contas, autorização, cotas e regras do produto ficam no backend/banco.
- **PostgreSQL/Supabase**: fonte de verdade das obrigações e evidências; Supabase Auth e RLS testada por operação/conta antes de usuários reais. Usar migrações SQL versionadas e plano de exportação/restauração. Postgres é portátil, mas migrar Auth, APIs e políticas específicas do Supabase exige trabalho.
- **Jobs**: avaliar pgmq/Supabase Queues para começar com o banco existente. Idempotência e tratamento de redelivery são necessários; uma fila durável não torna automaticamente uma operação externa exatamente uma vez. Redis/BullMQ só se carga/latência/operação justificarem.
- **Captura WhatsApp**: conector isolado. Para sessão persistente tipo WhatsApp Web, recomendação inicial de processo Node persistente/container com estado de credenciais protegido. Uma integração oficial via webhook pode ter outro desenho. Não implementar captura dentro de uma função qualquer sem validar ciclo de vida/compatibilidade.
- **IA intercambiável**: interface AnalysisProvider já existe, mas só há implementação Cloudflare e testes com doubles. Uma segunda implementação e teste de portabilidade ainda não existem. O modelo sugere observações, enquanto autorização, prioridades, datas verificáveis e transições de obrigação permanecem no domínio.

## O que Cloudflare oferece e o que não foi demonstrado

A documentação de Workers AI informa 10.000 Neurons/dia de franquia no Free e cobrança de excedentes no Paid. Isso pode mudar e não mede o total da nossa conta. A qualidade de classificação, a compatibilidade dos modelos escolhidos e a latência para português continuam sem medição real.

Workers Free tem limites publicados de CPU e memória: 10 ms de CPU por requisição e 128 MB de memória. Espera por rede não conta como CPU. Esses limites pertencem ao runtime Workers, não ao processo Node atual nem à inferência remota Workers AI. Usar a API de IA não exige migrar nosso backend para Workers.

Cloudflare suporta WebSockets em Workers/Durable Objects; portanto, dizer que “serverless nunca pode manter conexão” seria excessivo. Durable Objects tem desenho próprio, hibernação, persistência e reconstrução de estado. Isso não prova que Baileys funciona sem adaptações nesse runtime ou que será a opção mais barata para conexões de cliente. O processo Node dedicado é uma escolha inicial de menor risco técnico, sujeita à PoC.

A página oficial de tratamento de dados diz que Workers AI não usa Customer Content para treinamento e descreve retenção zero para inferência padrão, com exceções legais/operacionais e recursos stateful. Ativar logs/cache no Gateway, armazenamento ou outro provedor muda o tratamento. Não prometer que todos os dados do produto são “zero retention”; banco, filas, cache e backups exigem política própria.

## Sensibilidade de custo

Cenário ilustrativo: 100 usuários, 20 análises por usuário/dia, 30 dias, 2.000 tokens de entrada e 500 de saída por análise. São 60.000 chamadas, 120 milhões de tokens de entrada e 30 milhões de saída por mês. Não é consumo observado do OrbitAI.

Tarifas por milhão de tokens da tabela oficial consultada:

| Modelo documentado | Entrada | Saída | Equivalente mensal antes de franquias |
|---|---:|---:|---:|
| Llama 3.1 8B Instruct | US$ 0,282 | US$ 0,827 | US$ 58,65 |
| Llama 3.3 70B Instruct FP8 Fast | US$ 0,293 | US$ 2,253 | US$ 102,75 |

Cálculo 8B: 120 × 0,282 + 30 × 0,827 = 58,65. Cálculo 70B: 120 × 0,293 + 30 × 2,253 = 102,75. Não são faturas estimadas completas: não descontam franquias nem incluem plano Workers, banco, hospedagem do conector, voz paga, lojas/builds mobile, impostos, câmbio, retries ou suporte. Um modelo mais caro pode ser necessário se o barato falhar no benchmark; números não são comparação de qualidade.

A estimativa anterior de Qwen não se aplica automaticamente aos modelos do comparador atual. Modelo e volume precisam constar de qualquer conta de custo. Reenviar todo o histórico ou fazer uma chamada por mensagem pode multiplicar esse custo. Processamento incremental, lotes pequenos por conversa, cache por conta e redação sob demanda reduzem consumo sem depender de franquia eterna. O custo por usuário deve ser medido no piloto com limites por conta e agregados.

## Controles necessários antes de operação real

1. **Dados multiusuário**: autenticação, grants e RLS por workspace, testes negativos entre contas, segredos administrativos só no servidor. Não confiar no workspaceId fornecido livremente pelo cliente.
2. **Cotas compartilhadas**: migrar reserva de orçamento para transações no banco central antes de múltiplas instâncias. O SQLite atual protege apenas processos que usam o mesmo arquivo de benchmark; não é autorização ou teto financeiro distribuído.
3. **Operação**: backups e teste de restauração, monitoramento sem conteúdo privado, idempotência, reconexão e tratamento de mensagens fora de ordem. A documentação Supabase recomenda exportações e cópias externas para projetos Free; os backups gerenciados descritos para planos pagos não devem ser presumidos no Free. Objetos Storage precisam de tratamento separado.
4. **Privacidade**: retenção e exclusão cobrindo mensagens brutas, trechos, filas, cache, logs e backups; termos de provedores e consentimento antes de dados reais.
5. **Mobile**: testes Android/iPhone de microfone, áudio, interrupções, rede oscilante e retorno do app. Voz do navegador no protótipo não comprova experiência de aplicativo móvel de produção.
6. **Economia e qualidade**: quotas por usuário, cálculo de uso real, limite de saída e de contexto, sem fallback silencioso para modelo/provedor pago. Comparar fidelidade dos fatos e falsas conclusões, não só JSON válido e preço nominal.

## WhatsApp e ordem de validação

O README Baileys afirma que o projeto não é autorizado/afiliado ao WhatsApp. O repositório oficial de exemplos da Meta é da WhatsApp Business Platform e não comprova acesso irrestrito a todo histórico pessoal. Os termos e capacidades atuais da Meta para o cenário específico não puderam ser totalmente verificados pelo acesso de rede atual; não dar a viabilidade comercial/regulatória como resolvida.

Ajuste de prioridade proposto: validar em paralelo captura somente leitura com conta de teste autorizada e experiência mobile nos dois sistemas; fazer benchmark pequeno da IA; depois selecionar provedores e aprofundar contas/banco e operação. Nenhum QR ou sessão real foi aberto nesta pesquisa. Se a captura necessária não for viável, a proposta de produto deve ser ajustada antes de escalar, independentemente da infraestrutura escolhida.

## Evidência atual versus futuro

Já existem: protótipo web responsivo, parser TXT, motor local, adaptador privado Cloudflare, cache/limites de benchmark e testes. Não existem: app Android/iOS entregue, sessão WhatsApp, autenticação/RLS, Postgres provisionado, fila de produção, API de IA pública autenticada ou medições reais de modelo. Portanto o parecer é viabilidade de desenho, não prontidão de produção.

## Fontes oficiais

Consultadas em 28/10/2026. Preços e recursos podem mudar.

- Cloudflare Workers AI / preços: https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/workers-ai/platform/pricing.mdx
- Cloudflare Workers / limites: https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/workers/platform/limits.mdx
- Durable Objects / WebSockets: https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/durable-objects/best-practices/websockets.mdx
- Workers AI / dados: https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/workers-ai/platform/data-usage.mdx
- Supabase / RLS: https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/postgres/row-level-security.mdx
- Supabase / backups: https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/platform/backups.mdx
- Supabase / filas: https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/queues.mdx
- Expo / monorepo: https://github.com/expo/expo/blob/main/docs/pages/guides/monorepos.mdx
- Expo / PWA: https://github.com/expo/expo/blob/main/docs/pages/guides/progressive-web-apps.mdx
- Baileys / declaração de independência e funcionamento: https://github.com/WhiskeySockets/Baileys
- Meta / exemplos Business: https://github.com/fbsamples/whatsapp-api-examples
