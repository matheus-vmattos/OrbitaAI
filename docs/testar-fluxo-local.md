# Fluxo local de mensagens e obrigações — sem conta externa

Esta etapa usa o código real de normalização, importação, sessão, conciliação e resumo, com transporte e mensagens **sintéticos**. Não valida uma conexão WhatsApp real, qualidade de IA ou aparelho Android/iPhone.

## Teste reproduzível sem servidor

Na raiz, com as dependências instaladas:

```bash
pnpm test:flow
```

Executa dois testes:

1. Um EventEmitter local reproduz histórico/pedido/promessa, mensagem enviada e recebimento. A sessão mantém uma obrigação com quatro evidências, elimina repetição, aceita reabertura manual e avisa sobre desconexão informada pelo chamador. `fetch` é bloqueado no teste e a contagem de chamadas deve ser zero.
2. A importação de TXT usa a mesma sessão de domínio e mantém decisão manual na reimportação.

No primeiro teste, `enabled` e `authorizedTestAccount` exercitam somente a ramificação positiva com uma fábrica de objeto local. Nenhuma conta ou sessão de rede existe. O estado de conexão é informado pelo simulador e aplicado explicitamente à sessão; o transporte real e seus callbacks ainda precisam ser integrados.

## Teste da aplicação no navegador

```bash
pnpm build
pnpm --filter @orbita/web start
```

Em outro terminal:

```bash
pnpm test:obligations
pnpm test:mobile
```

`ORBIT_TEST_URL` permite escolher o endereço local de teste. Os scripts usam `/usr/bin/chromium` disponível neste ambiente. Não abrir nem criar conta externa. Os scripts não fazem chamadas de IA.

O teste de obrigações importa `01-pedido-promessa.txt`, conclui manualmente e recebe `00-backfill-anterior.txt`. O ID derivado pode mudar, mas a decisão deve permanecer se assunto/contato/evidências continuam vinculados. Ao importar `04-nova-solicitacao.txt`, há evidência posterior: a conclusão antiga não é aplicada silenciosamente e a resposta pede revisão. Também verifica separação entre abas, largura mobile e limpeza da sessão.

O teste mobile verifica manifesto, ícones, cabeçalho de atualização do SW, instalabilidade no Chromium normal, cache apenas público e fallback offline. Instalação, microfone e voz nos aparelhos reais continuam pendentes.

## Comportamento de segurança do domínio

- `ObligationSession` guarda dados somente em memória. A interface usa uma instância por aba; callbacks do conector podem usar `sessionConsumer` para alimentar a mesma classe de domínio.
- A sessão valida lotes atomicamente. Mensagem malformada, identidade inconsistente, mudança de conteúdo de ID existente ou excesso de armazenamento recusa o lote sem sobrescrever o estado anterior.
- Limites atuais: 5 mil mensagens / 5 MB de conteúdo serializado e 4 mil caracteres por mensagem. Não há persistência/recuperação após fechar ou recarregar.
- Chaves incluem origem e conversa. `workspaceId` identifica uma instância confiável; não implementa login, autorização ou isolamento multiusuário em banco. A integração futura deve vincular a sessão a usuário/conexão autorizados no servidor.
- Decisões manuais usam assunto, responsável e evidências vinculadas; mudança segura de ID por backfill anterior não perde a decisão. Novas evidências posteriores ou associações ambíguas exigem revisão. Isso é uma política conservadora, não interpretação semântica universal.
- Correções explícitas como “Ainda não enviei o comprovante” ou “Ainda não recebi o comprovante” são vinculadas ao assunto conhecido, preservadas nas evidências e contestam uma conclusão. A revisão humana pode confirmar novamente. Mensagens genéricas ou fora dos padrões continuam limitadas pelas regras do motor.
- Data de uma confirmação não redefine o prazo do pedido. Datas relativas continuam em UTC−3 e dependem da mensagem de pedido/promessa; outros fusos/prazos complexos exigem evolução.
- Cobertura aceita somente unknown/partial/stale/disconnected. Repetir um arquivo não remove automaticamente uma marca explícita de desatualização. Silêncio de uma conversa não é usado para inferir que a conexão falhou.
- Textos e IDs do conteúdo não são instruções. Rascunho, cópia e leitura não equivalem a envio ou conclusão automática.

## Resultado desta etapa

109 testes automatizados, checagem de tipos, lint do app e build passaram. Fluxo local de dois casos e scripts de navegador `test:obligations`/`test:mobile` passaram contra build de produção. Testes sintéticos e verificações de browser não são evidência de WhatsApp conectado, qualidade de modelo real ou instalação em celular físico.

Nenhum novo serviço contratado, credencial criada, chamada de modelo, pareamento de conta ou deploy público foi realizado.
