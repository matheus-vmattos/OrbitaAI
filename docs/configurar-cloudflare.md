# Cloudflare para os testes do OrbitAI

Guia conferido na documentação oficial em 28/10/2026. O usuário já tem conta Cloudflare; este processo configura somente o uso da API Workers AI.

## Cobrança

A documentação informa 10.000 Neurons/dia gratuitos no Workers Free. Ao exceder a cota, novas operações falham; no Workers Paid, há cobrança de excedentes e mínimo de US$ 5/mês do plano Workers. O plano de um domínio (Free/Pro/etc.) é separado do plano Workers. Criar token não é uma chamada de inferência. Alguns modelos exigem pagamento; o teste preparado usa dois Llama da lista de JSON Mode, não os modelos premium listados na página de preços. Confirmar disponibilidade na conta.

A meta é teste sem cobrança de inferência dentro do Workers Free. Não se pode garantir a fatura inteira de uma conta que pode ter outras assinaturas ou tráfego. O limite de 10 chamadas/dia do comparador é local e não representa franquia de Neurons, limite financeiro ou consumo total da conta.

## Passos

1. Entre em https://dash.cloudflare.com/ e escolha a conta correta.
2. Procure Billing/Faturamento e confira a assinatura Workers. Confirme Workers Free. Não confundir com o plano do domínio. Se já estiver Paid ou houver tela exigindo contratação, primeiro conferir o plano; não modificar/cancelar outros serviços existentes para realizar esse teste.
3. Abra Workers AI. Atalho oficial: https://dash.cloudflare.com/?to=/:account/ai/workers-ai
4. Escolha Use REST API / Usar API REST.
5. Copie o Account ID mostrado em Get Account ID. Esse identificador será a variável `CLOUDFLARE_ACCOUNT_ID`.
6. Na mesma tela, escolha Create a Workers AI API Token. Revise o modelo de permissões e limite à conta selecionada; crie o token e copie para um destino seguro. Se criar manualmente em https://dash.cloudflare.com/profile/api-tokens, a documentação pede Workers AI Read e Workers AI Edit. Não usar Global API Key. Não enviar token pelo chat, screenshot, Git ou linha de comando.
7. No ambiente original do Codex, abra Editar ambiente e procure variáveis/segredos. Cadastre `CLOUDFLARE_ACCOUNT_ID` como variável e `CLOUDFLARE_API_TOKEN` como segredo com destino HTTPS `api.cloudflare.com`. Mantenha `ORBIT_AI_LIVE_ENABLED=false` como padrão.
8. No acesso à internet do ambiente, adicione `api.cloudflare.com`, preservando os hosts existentes. `developers.cloudflare.com` e `dash.cloudflare.com` são opcionais para consultar a documentação/painel a partir do ambiente; a API exige somente `api.cloudflare.com`.
9. Salve as alterações e informe no chat que terminou, sem copiar os valores. O agente deverá revalidar a presença dos nomes e a conectividade, sem mostrar o token. O editor de configuração desta conversa estava indisponível; se as seções não aparecerem, usar o contexto original ou enviar captura sem credenciais para localizar o fluxo correto.
10. Após conferir Workers Free e as configurações aplicadas, executar uma rodada controlada com a ativação real temporária apenas no processo de teste. São até seis chamadas sintéticas antes de cache/erros, sem retry automático. O usuário não precisa rodar comandos nem habilitar permanentemente a IA na aplicação.
11. Acompanhar Neurons em Workers AI/Usage. Se atingir limites, interromper ou aguardar renovação da franquia, sem upgrade automático. Nenhum upgrade ou novo serviço pago está autorizado por este guia.

## Fontes oficiais

- REST API e token: https://developers.cloudflare.com/workers-ai/get-started/rest-api/
- Preço e franquia IA: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Preço do plano Workers: https://developers.cloudflare.com/workers/platform/pricing/
- Fonte consultada pelo ambiente (o site direto pode estar bloqueado): https://github.com/cloudflare/cloudflare-docs/tree/production/src/content/docs/workers-ai

## Mobile e WhatsApp

Prioridade do produto: mobile Android e iPhone, com versão web complementar e backend/regras compartilhados. Hoje existe protótipo web responsivo, não um app mobile instalável entregue. PWA e app nativo precisam ser avaliados pelos requisitos de voz/conector nos dois aparelhos, sem tratar responsividade como entrega mobile completa.

Já há parser de exportações TXT e motor de obrigações/prioridades. Não há sessão WhatsApp conectada, QR, ingestão automática ou leitura de mensagens em tempo real. Cloudflare oferece IA; não concede acesso às conversas. PoC de captura precisa de etapa separada, com limites de cobertura explícitos e eventual conector não oficial apenas com autorização, flag experimental e conta de teste. Nenhuma mensagem é enviada automaticamente.
