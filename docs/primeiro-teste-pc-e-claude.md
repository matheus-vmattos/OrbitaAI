# Primeiro teste no PC e revisão com Claude

Guia de 30/10/2026, para Windows, com base nas capturas enviadas pelo dono. Não há instalador `.exe` do OrbitAI: o protótipo roda no navegador a partir da pasta do projeto. Não precisa configurar Cloudflare, banco, cartão ou WhatsApp para este teste.

## 1. Custos e contas

| Etapa | Novo gasto esperado | Conta necessária |
| --- | --- | --- |
| Node.js, pnpm, Git e execução local | R$ 0 em software/infraestrutura nova; usa seu PC e internet | GitHub para baixar se o repositório for privado |
| Claude Code instalado | A instalação não compra plano; consultas consomem a modalidade autenticada | Claude Pro/Max existente, com acesso ao Code e uso extra pago desativado a conferir na conta |
| API Anthropic ou uso extra | Pode gerar cobrança; não usar nesta fase | Não configurar |
| Cloudflare e hospedagem | Dispensáveis para este teste local | Nenhuma configuração agora |

Você informou que já tem Claude Pro ou Max. Não há necessidade de contratar outro plano para tentar esta etapa. Se a conta não incluir acesso ou a cota acabar, pare; não habilite uso extra, API, créditos, Bedrock/Vertex ou outro caminho de cobrança. Não informe senha/token ao Codex e não grave credenciais no Git.

## 2. Instalar o Node.js 24

1. Abra https://nodejs.org/en/download e selecione a versão **24 LTS** para Windows, instalador `.msi`, arquitetura do seu PC (geralmente x64).
2. Instale com as opções padrão. Não precisa marcar instalação de ferramentas adicionais para este teste.
3. Feche e reabra o terminal após instalar. No menu Iniciar procure **Prompt de Comando** e abra.
4. Execute:

```bat
node --version
npm --version
```

O primeiro deve mostrar `v24...`. Se aparecer “não é reconhecido”, reabra o terminal; se continuar, confira a instalação e a opção de adicionar o Node ao PATH. No PowerShell, use `npm.cmd`/`pnpm.cmd` caso a política bloqueie scripts `.ps1`; não precisa reduzir a segurança global do Windows.

## 3. Baixar o OrbitAI

1. Entre em https://github.com/matheus-vmattos/OrbitaAI com sua conta GitHub.
2. Confira a branch **main**. Clique em **Code → Download ZIP**.
3. No Explorador de Arquivos, clique com o botão direito no ZIP → **Extrair Tudo**. Não execute de dentro do ZIP.
4. Abra a pasta extraída e confirme que nela aparecem `package.json`, `pnpm-lock.yaml`, `apps` e `packages`. Se necessário, entre mais uma pasta.
5. Clique na barra de endereço dessa pasta, digite `cmd` e pressione Enter. O terminal abrirá no lugar certo.

Se já baixou uma versão antiga por ZIP, extraia a versão atual em outra pasta. Isso preserva seus arquivos locais. Comandos Git só funcionam se você tiver feito clone, não apenas extraído ZIP.

## 4. Instalar dependências e abrir o app

No terminal da pasta do projeto, execute uma linha por vez e aguarde terminar:

```bat
npm install -g pnpm@11.25.0
pnpm --version
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm --version` deve mostrar `11.25.0`. A instalação baixa dependências e pode levar alguns minutos. Não precisa criar/copiar `.env` nem fornecer chaves para a demonstração.

Quando o terminal mostrar **Ready**, abra `http://localhost:3000` no Chrome ou Edge do mesmo PC. Se a porta estiver ocupada, use o endereço local que o terminal indicar. Mantenha o terminal aberto enquanto usa o app.

Para parar, volte ao terminal e pressione **Ctrl+C**. Nas próximas vezes, abra o terminal na pasta e execute somente `pnpm dev`. Se atualizar o código e o lockfile, rode antes `pnpm install --frozen-lockfile`.

## 5. O que conferir

1. A abertura deve dizer **Iniciar Conexão**, com estrelas discretas e o atalho **Urgente Hoje**.
2. Toque no atalho: o exemplo do João resume fornecedor X e Amanda. Experimente preparar as duas respostas, editar e copiar. Nenhuma mensagem é enviada pelo OrbitAI.
3. Abra **Conversas e privacidade → Experimentar conversa fictícia**. Use os botões para simular envio, confirmação e correção.
4. Em **Ver contexto**, confira a obrigação: aberta → conferir conclusão → concluída → conferir conclusão com revisão. Concluir/reabrir manualmente deve atualizar o resumo.
5. Para importar um TXT sintético depois, use os arquivos de `fixtures`. Não precisa usar conversas reais nesta primeira rodada.
6. Limpar dados ou recarregar descarta a sessão. Voz/microfone são opcionais e dependem do navegador; digitar deve continuar funcionando sem permissão de áudio.

Teste no PC não é validação em Android/iPhone. `pnpm dev` também não é o teste de instalação da PWA: o service worker exige build de produção/contexto seguro. Para instalação nos aparelhos ainda será necessário um endereço HTTPS acessível. Não abra portas no roteador para esta etapa.

## 6. Preparar Claude Code com sua assinatura

O repositório inclui `CLAUDE.md` e o comando de revisão `/opiniao-orbitai`. Eles oferecem contexto e orientação; não conectam sua conta sozinhos. Não existe ponte automática entre a sua sessão Claude no PC e este chat do Codex.

1. Entre em https://claude.ai/ com a conta Pro/Max existente.
2. Abra https://claude.ai/settings/usage e confira limites/uso extra. Mantenha **uso extra pago desativado**. Se o painel diferir, procure a seção de uso e faturamento antes de fazer consultas; não ative recargas/créditos.
3. Consulte o instalador oficial em https://code.claude.com/docs/en/setup. O README oficial confirma o método WinGet abaixo: https://github.com/anthropics/claude-code#get-started.
4. No Windows, instale o Git oficial, se ainda não tiver: https://git-scm.com/download/win. O Git Bash é usado por algumas configurações do Claude Code no Windows. Isso não exige mudar o download ZIP para clone.
5. Abra um terminal e execute:

```bat
winget install --id Anthropic.ClaudeCode -e
```

Se `winget` não existir, siga uma das alternativas do instalador oficial, sem instalar pacotes de terceiros. Feche/reabra o terminal e confira:

```bat
claude --version
```

6. Volte ao terminal **na pasta raiz do OrbitAI** (a que contém `CLAUDE.md`). Execute:

```bat
claude --permission-mode plan
```

7. Confira o diretório solicitado, aceite somente a pasta conhecida do projeto e faça login no navegador com a **conta Claude da assinatura existente**. Não escolha Console/API paga e não adicione chave Anthropic. A ordem das telas pode variar. Se já houver configuração de API/provedor diferente, pare e confira a modalidade autenticada antes de enviar a consulta.
8. Confirme no Claude a conta/modalidade e a cota disponível. Para esta revisão, mantenha o modo **Plan/somente planejamento**; não habilite bypass de permissões.
9. Digite no Claude Code:

```text
/opiniao-orbitai
```

Se o comando não aparecer, reinicie o Claude Code na pasta correta ou use o texto equivalente:

```text
Leia CLAUDE.md e docs/pedido-opiniao-claude.md. Faça a revisão somente por leitura dos arquivos, sem alterações, shell, agentes adicionais, APIs ou publicação. Responda aqui em português com evidências no código e o menor próximo experimento sem novos gastos.
```

10. Quando ele devolver o parecer, copie apenas a resposta e cole neste chat do Codex. Eu vou avaliar as recomendações e continuar a implementação. Não cole credenciais nem conversas pessoais.

Essa consulta consome sua cota Claude. Instalar o Code e ter Pro/Max não comprova uso extra bloqueado; a conferência da conta é necessária para manter a regra de novos gastos em R$ 0.

## 7. Pedido das 14h10

Horário solicitado: **30/10/2026 às 14h10 em America/Sao_Paulo**, equivalente a **17h10 UTC**. Não há agendador disponível neste chat e nenhuma consulta foi marcada ou enviada. Os arquivos preparados não executam no horário sozinhos.

Para usar esse horário hoje, você pode criar um alarme local no app Relógio do Windows e executar `/opiniao-orbitai` no Claude Code autenticado quando tocar. Se o horário já tiver passado quando você ler, execute manualmente quando estiver disponível. Isso é uma alternativa manual; não é um agendamento feito pelo Codex.

## 8. O que fica para depois

- Cloudflare/IA real: siga `docs/configurar-cloudflare.md` quando estiver pronto para conferir Workers Free, bloqueio de excedentes e segredo da API. Não é requisito para abrir o app nem para a revisão Claude pela assinatura.
- WhatsApp real: ainda não conectado. Token Cloudflare, login Claude e instalação da PWA não concedem acesso a mensagens. Pareamento futuro exige conta de teste autorizada.
- Android/iPhone: instalação/voz em aparelhos físicos continuam pendentes; consulte `docs/testar-mobile.md`.

## Fontes e limites da conferência

Instalação WinGet conferida no README oficial do Claude Code em 30/10/2026: https://github.com/anthropics/claude-code. Formato de comandos conferido no repositório oficial de plugins: https://github.com/anthropics/claude-plugins-official/blob/main/plugins/code-review/commands/code-review.md. Nenhum plugin foi instalado. As páginas diretas `code.claude.com` estavam bloqueadas pela rede deste ambiente; condições atuais da sua conta e execução real no Windows não foram verificadas aqui.
