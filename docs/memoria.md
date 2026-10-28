# Memória — ler primeiro

## Onde estamos
Primeiro protótipo web local: Next.js, React, TypeScript e workspace pnpm. Interface refeita como assistente: estrelas discretas, sem sidebar, indicadores ou lista inicial. Roteiro sintético do João → resumo urgente → dois rascunhos editáveis → copiar/abrir WhatsApp Web. Evidências e conclusão manual sob demanda, importação TXT brasileira até 1 MB com deduplicação. Leitura via Web Speech synthesis; ditado opcional via SpeechRecognition do navegador, com consentimento e fallback para texto. Dados só em memória da aba.

Motor local: conciliação por assunto/conversa/janela de sete dias, cadeia pedido → promessa → possível conclusão → recebimento do solicitante. Correções explícitas posteriores contestam conclusões e ficam nas evidências; confirmação não altera prazo do pedido. Evidências identificadas, grupos tratados conservadoramente, importação incremental idempotente com limites acumulados. Prioridade ponderada por prazo/impacto/responsabilidade/hierarquia/espera, precedência para sinais explícitos de risco e motivo em contexto. Regras determinísticas, sem IA ou WhatsApp real.

Marco de backend (28/10): `packages/ai` contém adaptador Cloudflare, validação de evidência literal e cache/limites persistentes em SQLite para benchmark de uma máquina. `pnpm benchmark:ai` usa três fixtures predeterminadas sem chamadas externas. `--live` exige ativação e credenciais seguras, e faz comparação de dois Llama com JSON Mode documentado. Não há rota pública nem integração desse módulo na UI; sem autenticação/RLS ainda. Não anunciar qualidade/custo de modelo real com resultados mock. Detalhes e pré-requisitos em `packages/ai/README.md`.

## Limite financeiro atual
R$ 0 de novos gastos para validar o produto. Serviços pagos, créditos, upgrades e recargas exigem autorização posterior explícita. Credenciais não autorizam gasto. Teste externo depende de plano gratuito e bloqueio de excedente confirmados; caso contrário permanece desligado. Não usar fallback pago. Priorizar captura WhatsApp autorizada, qualidade de interpretação e uso real Android/iPhone sobre infraestrutura.

Marco autônomo sem conta externa: PWA adicionada à web com cache só de ícones e página offline; nenhuma conversa é armazenada pelo service worker. `pnpm test:mobile` valida o build de produção no Chromium local. `packages/connectors` prepara ingestão somente leitura, importação, histórico parcial, dedup recente e reconexão simulada. A importação da UI e o conector podem usar `ObligationSession`, com lotes atômicos, limites, cobertura e decisões manuais ancoradas em evidências. Backfill seguro preserva decisão; mensagens posteriores podem exigir revisão. `pnpm test:flow` reproduz o percurso sem rede e `pnpm test:obligations` verifica o fluxo na UI. O SDK/transporte Baileys e autenticação não foram integrados; não existe sessão WhatsApp real. Guias: `docs/testar-mobile.md`, `docs/testar-fluxo-local.md` e `packages/connectors/README.md`.

Teste acessível na própria UI: “Conversas e privacidade” → “Experimentar conversa fictícia” percorre pedido/promessa → envio → recebimento → correção, com parser e motor reais e dados sintéticos de 27/10/2026. Usa outra instância de sessão em memória; “Voltar às importações” preserva os arquivos já lidos. Limpar/restaurar elimina ambas. Decisões manuais agora atualizam também o resumo exibido e interrompem leitura antiga. `pnpm test:sample` verifica esse percurso no Chromium local com bloqueio de HTTP externo; não representa captura, IA ou telefone reais.

## Decisões do dono
Nome OrbitAI. Mobile (Android e iPhone, ambos nos primeiros testes) é a versão prioritária, com versão web complementar e backend/regras compartilhados. O protótipo atual é web responsivo; base PWA instalável preparada (manifesto, ícones e fallback offline), validada em Chromium local; app nativo e instalação/voz em Android/iPhone reais continuam pendentes. Escolha PWA versus app nativo depende de voz/conector, sem confundir responsividade com entrega mobile. Abertura: “Iniciar Conexão”, atalho “Urgente Hoje”, sem frase de apoio. Codex lidera, Claude auxilia. Referências Apple/SpaceX/Tron/Matrix. Sem commit/push sem autorização.

## Como publicar
Ainda sem deploy nem infraestrutura de produção. Não confundir demonstração com produto pronto. Publicação do ambiente cloud ocorre na interface do produto, após revisar a configuração salva.

Em 28/10/2026, o dono autorizou começar a versionar e enviar o trabalho ao repositório GitHub. Essa autorização permite publicar o código e os guias existentes; não autoriza contratação de serviços, chamadas pagas ou deploy. Preservar o histórico remoto e não usar push forçado.

## Como o Codex trabalha
Usar checkout existente, comandos do README e testes de domínio. Relatar limitações e falhas com precisão.

## Próximas prioridades
Cenário visual base aprovado pelo dono; polimento visual adiado. Próximo marco: concluir benchmark real de IA após configurar acesso Cloudflare, então autenticação e isolamento Supabase com RLS testada. Pesquisa de custo propõe avaliar fila PostgreSQL/pgmq antes de adicionar Redis. Importação ZIP segura, adaptação de modelo e integração na UI permanecem pendentes. A base PWA está preparada; falta validação real de instalação/voz nos aparelhos suportados. Integração WhatsApp real permanece ausente.

Revisão de sustentabilidade em 28/10: desenho viável condicionado a validar captura WhatsApp e mobile. Proposta (não implantação): React Native/Expo Android/iPhone, web Next.js, backend Node modular, PostgreSQL/Supabase como fonte de verdade, fila pgmq antes de Redis e IA intercambiável. Recomendado antecipar PoC de captura/experiência mobile em paralelo ao benchmark pequeno; não ampliar infraestrutura baseado apenas na franquia gratuita. Detalhes em `docs/pesquisa/2026-10-28-sustentabilidade.md`.
