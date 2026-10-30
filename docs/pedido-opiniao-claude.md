# Pedido de opinião ao Claude — OrbitAI

Preparado em 30/10/2026. Este é o pedido, não um parecer já recebido. O dono solicitou uma consulta às 14h10 de 30/10/2026 em America/Sao_Paulo (17h10 UTC). Esta sessão não tem agendador disponível; nenhuma execução futura foi registrada.

## Objetivo

Você é o assistente técnico do Codex, que lidera o projeto. Revise a estrutura atual do OrbitAI e recomende o próximo teste que prove utilidade com R$ 0 de novos gastos. A prioridade é uso por voz em Android e iPhone, com web complementar.

Leia primeiro `CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/memoria.md`, `docs/visao-do-dono.md`, `ARCHITECTURE.md`, `COSTS.md` e `RISKS.md`. Depois leia o código necessário para sustentar os achados.

## Cenário e estado observável

João está na esteira, pede “me dá o que é urgente”, recebe um resumo curto e dita respostas para fornecedor e RH. Ele revisa e copia os textos para enviar pelo WhatsApp. A interface deve ter pouco texto permanente, estrelas discretas e referências Apple/SpaceX/Tron/Matrix. A abertura aprovada diz “Iniciar Conexão” e oferece “Urgente Hoje”. Polimento visual amplo foi adiado pelo dono.

- `apps/web`: interface Next.js, roteiro fixo do João, importação de TXT, voz opcional do navegador e PWA. Sem geração livre de respostas por IA.
- `packages/shared`: parser brasileiro UTC−3, conciliação de obrigações, evidências, prioridade e sessão em memória. Regras determinísticas e conservadoras, sem banco/autenticação.
- `packages/connectors`: contratos e normalização, com transporte simulado nos testes. Sem SDK/fábrica de sessão WhatsApp real, credenciais ou pareamento.
- `packages/ai`: adaptador Cloudflare e benchmark backend desligado por padrão. Modo normal com fixtures, sem API pública nem ligação à UI. Limites SQLite locais não equivalem a orçamento global.
- A conversa fictícia dentro da UI passa pelo parser/motor e fica separada das importações. Confirmação contestada exige revisão. Dados se perdem ao recarregar.
- Há registro de 109 testes e verificações de browser aprovados pelo Codex. Isso não valida qualidade de IA, WhatsApp real, instalação/voz nos aparelhos físicos nem Windows real. Não diga que você os executou.

## Perguntas

1. Quais problemas concretos do código ameaçam o fluxo pedido → promessa → envio → recebimento → correção? Considere falsos encerramentos, decisões manuais, resumo e separação de dados.
2. O que já é adequado na estrutura compartilhada e o que precisa mudar antes de usuários reais? Evite expandir infraestrutura sem uma necessidade demonstrada.
3. Qual a menor prova de captura autorizada de WhatsApp e uso mobile que valha realizar? Distingua exportação manual, API oficial e conector não oficial. Não suponha que uma API permite ler o histórico pessoal completo. Apresente incertezas e termos/permissões que exigem verificação.
4. Como validar interpretação em português sem habilitar chamadas pagas? Defina critérios de aceitação e exemplos de falha; não invente resultados ou preços atuais.
5. Qual deveria ser a próxima entrega do Codex, com escopo de um marco pequeno e verificável? Qual evidência faria você mudar de recomendação?

## Formato da resposta

- Até cinco achados prioritários: gravidade, arquivo/trecho, caso que reproduz ou evidencia, impacto e correção sugerida.
- Um próximo experimento: hipótese, passos, custo novo esperado, limite para parar e critério de aprovação.
- Itens que podem esperar e informações ainda desconhecidas.

Faça somente revisão de leitura/busca. Não execute shell/testes, não altere arquivos, não instale nada, não use agentes adicionais, não acesse segredos ou mensagens reais e não faça chamadas de API, comentários no GitHub ou envio de mensagens. O dono encaminhará o parecer ao Codex.
