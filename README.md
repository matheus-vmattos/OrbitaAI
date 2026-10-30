# OrbitAI

Protótipo conversacional do assistente “O que precisa de mim agora?”. Visual espacial discreto. **Demonstração do cenário do João: sem WhatsApp ou IA conectados.**

## Guias

- [Primeiro teste no PC e revisão com Claude](docs/primeiro-teste-pc-e-claude.md): instalação no Windows, assinatura existente e pedido de opinião sem alterações.
- [Fluxo local e testes de pendências](docs/testar-fluxo-local.md): o que já funciona e como reproduzir os testes sem conta externa.
- [Android e iPhone](docs/testar-mobile.md): base PWA, instalação futura e verificações ainda pendentes nos aparelhos.
- [Configurar Cloudflare](docs/configurar-cloudflare.md): preparação para uma etapa futura; não é necessária para os testes locais.
- [Custos e limite financeiro](COSTS.md): validação sem novos gastos e restrições para ativar serviços externos.

## Executar

Node.js 24 e pnpm 11.25.0. Na raiz:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Na máquina cloud, antes de comandos pnpm:

```bash
export XDG_DATA_HOME=/workspace/OrbitaAI/.cache/data
export XDG_CACHE_HOME=/workspace/OrbitaAI/.cache
```

## Validar

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Build local: `pnpm --filter @orbita/web start`. Porta padrão 3000.

## Experimentar

1. A abertura mostra só a órbita, o botão de falar e a entrada de texto.
2. Clique em “Urgente Hoje” ou digite a pergunta. O roteiro responde sobre fornecedor X e Amanda do RH.
3. Experimente preparar as duas respostas. Edite os textos e copie separadamente. “Abrir WhatsApp” abre o WhatsApp Web: escolha o contato e cole. Sem envio automático e sem número inventado.
4. “Ver contexto” revela as evidências e permite conclusão/reabertura manual; copiar um rascunho não conclui tarefa.
5. Configurações permite importar `fixtures/conversa-sintetica.txt`, nome próprio `Você`. Identifique a conversa pelo contato ou grupo; reutilize exatamente esse identificador em novos lotes da mesma conversa e use outro para contatos diferentes. Reimportar não duplica ações. Limpar remove dados da aba; recarregar restaura os exemplos.
6. Para testar o motor sem escolher arquivos, abra “Conversas e privacidade” → “Experimentar conversa fictícia”. Avance pelos botões de simulação e abra “Ver contexto” para acompanhar as evidências. O teste fica separado das importações; “Voltar às importações” recupera os dados que já estavam na aba.

Leitura em voz usa Web Speech synthesis quando disponível, pode ser interrompida e desativada. Ditado é opcional, depende de SpeechRecognition e de permissão do navegador. Antes de ativar, é informado que o serviço do navegador pode processar áudio externamente. Sem suporte ou permissão, digite. Voz real varia por navegador/dispositivo e precisa de validação nos aparelhos-alvo.

Parser: `27/10/2026, 09:00 - Nome: mensagem` ou `[27/10/2026, 09:00:00] Nome: mensagem`, com continuação multilinha e UTC−3 fixo. Outros locais, ZIP e mídia ainda não são suportados. Limite 1 MB, somente conteúdo autorizado.

## Limites

Resumo e redação do João são roteirizados, não geração por IA. Comandos fora do roteiro não são formalizados. Importações usam conciliação conservadora por assunto, conversa e janela de sete dias. Pedido e promessa podem formar uma obrigação; envio exige confirmação do solicitante para concluir. Grupos e referências ambíguas não são unidos por palpite. A prioridade combina prazo (30%), impacto (25%), responsabilidade (20%), hierarquia (15%) e espera (10%), com precedência para sinais explícitos de risco. Os pesos são hipóteses, não avaliação calibrada; “Ver contexto” revela o motivo. Confiança é ilustrativa. Não há sincronização, autenticação, Supabase/RLS, worker/Redis, modelo de IA ou aplicativo nativo publicado. A base PWA está preparada para testar instalação, sem validação em aparelhos reais.

Dados ficam na memória da aba. A leitura/ditado de voz pode usar serviços do navegador; não prometer processamento inteiramente local desses recursos. Consulte `SECURITY.md`, `RISKS.md` e `docs/ambiente-cloud.md`.

## Validar a conciliação por lotes

Em Configurações, informe `Marina` como conversa e `Você` como nome próprio. Importe, na ordem, os arquivos de `fixtures/conciliacao/`:

1. `01-pedido-promessa.txt`: uma obrigação aberta, duas evidências.
2. `02-envio.txt`: a mesma obrigação, possível conclusão.
3. `03-recebimento.txt`: recebimento confirma a obrigação, quatro evidências.

Reimportar não duplica; importar com outro identificador não mistura conversas. Decisões manuais são mantidas em reimportações que preservem a identidade da obrigação. Mensagens ficam só na memória da aba; limite acumulado de 5 mil mensagens ou 5 MB. Sem hora explícita, “hoje/amanhã” usa fim do dia em UTC−3 como referência, sempre a partir da data da mensagem. Não é horário confirmado.

## Comparador de IA no backend

`pnpm benchmark:ai` executa três fixtures mock sem chamadas externas. Adaptador real, cache e limites locais estão em `packages/ai`; a demonstração da UI permanece independente de provedores. Para credenciais, ativação controlada e limites, leia [o guia de IA](packages/ai/README.md). Benchmark real e autenticação multiusuário ainda pendentes.

## Testes mobile e recepção de mensagens

Base PWA com manifesto/ícones e tela offline pública, sem cache de conversas. Após `pnpm build`, iniciar `pnpm --filter @orbita/web start` e executar `pnpm test:mobile` em outro terminal. O teste usa Chromium local com perfil normal, não prova instalação/voz em Android/iPhone reais. Instruções em `docs/testar-mobile.md`.

`packages/connectors` prepara normalização de eventos somente leitura e importação; testes usam transporte simulado. Não há SDK/fábrica de sessão WhatsApp real integrada. Guia em `packages/connectors/README.md`. Nenhuma conta externa ou chamada de IA é necessária para esses testes.

## Sessão unificada e fluxo local

A UI de importação usa `ObligationSession`, a mesma sessão de domínio aceita pelos callbacks do conector. Lotes são validados antes de alterar dados; decisões manuais são vinculadas a evidências e novas mensagens podem exigir revisão. `pnpm test:flow` reproduz eventos sintéticos sem servidor/conta; `pnpm test:obligations` verifica o fluxo de importação no browser contra um build em execução. Detalhes e limites em `docs/testar-fluxo-local.md`.

`pnpm test:sample` verifica o teste fictício dentro da interface: quatro etapas, confirmação contestada, revisão manual com atualização do resumo, reinício e separação das importações. Requer o mesmo build em execução e Chromium local; bloqueia requisições externas. Não conecta ao WhatsApp nem a um modelo de IA.
