# Conectores de recebimento — validação local

Sem serviços pagos ou contas externas. Este pacote prepara a ingestão de eventos; **não conecta uma conta real do WhatsApp**. Não há SDK Baileys instalado nem uma fábrica de socket real integrada. Os testes usam um EventEmitter local.

## O que está implementado

- `ExportImportConnector`: usa o parser brasileiro, entrega mensagens ao consumidor e deduplica reimportações recentes. Histórico sempre parcial e sem atualização automática.
- `ReadOnlyWhatsAppConnector`: ponte para `messages.upsert`, `messaging-history.set` e `connection.update`. Exige `enabled` e `authorizedTestAccount` explícitos antes de invocar uma fábrica de transporte.
- Normalização de textos simples/estendidos/encapsulados efêmeros, grupos, `fromMe` e timestamp numérico/Long. Identidade do participante é separada do nome de exibição; participantes de mesmo nome não se fundem por esse motivo. Importação TXT continua limitada aos nomes que constam no arquivo, sem IDs de contato confiáveis.
- Lotes completos de 300 mensagens nos testes; `append`/histórico separados de `notify`. Deduplicação por conversa+ID, inclusive na reconexão manual.
- Callback serializado para consumidor assíncrono. Só confirma dedup após sucesso do consumidor. Falha não recebe retry automático; consumidor deve persistir antes de resolver e implementar idempotência.
- Estado com origem, conexão, cobertura, últimos eventos/período conhecido, contagens de recebidas/ignoradas/duplicadas. Mesmo `isLatest=true` e progresso 100 não produzem cobertura completa.
- O contrato não oferece operação de envio, presença ou logout. QR recebido não é armazenado/exposto no status. Não baixa mídia ou processa view-once.

## Validar

Na raiz: `pnpm test` e `pnpm typecheck`. `packages/connectors/src/connectors.test.ts` cobre flags, fábrica ausente, lotes, duplicatas, histórico, grupos, autor próprio, reconexão simulada, nomes repetidos, falha do consumidor, e integração de exportações com uma obrigação e quatro evidências.

Esses testes verificam o código com eventos sintéticos. **Não provam estabilidade, autorização da plataforma, histórico completo, pareamento, criptografia de sessão ou funcionamento em uma conta real.**

## Pendências antes de uma prova real

1. Confirmar autorização explícita para uma conta de teste secundária e avaliar regras/riscos da integração não oficial. Nada deve usar a conta principal automaticamente.
2. Instalar/pinar SDK compatível após revisão e implementar `makeSocket` no backend, com autenticação e persistência de credenciais criptografadas. O pacote apenas recebe uma fábrica confiável; não fornece a autenticação.
3. Implementar entrega de pareamento restrita ao dono, exclusão segura de sessão e proteção contra exposição de credenciais/QR em logs ou UI pública. Nenhuma rota pública existe.
4. Validar eventos da versão real, mapeamento de identificadores LID/telefone, atualizações/edições/revogação, reconexão com backoff e idempotência em armazenamento persistente.
5. Acrescentar fila persistente/backpressure para produção. Dedup atual mantém apenas as últimas 5 mil chaves por instância; não garante dedup permanente ou entrega exatamente uma vez. A fila de callbacks é em memória e não foi validada sob carga contínua.
6. Se o aplicativo ficar indisponível ou o histórico vier parcial, mostrar essa limitação nas respostas. Uma ligação de socket não comprova cobertura das conversas.

Referências revisadas: README público de https://github.com/WhiskeySockets/Baileys e os eventos documentados `messages.upsert`, `messaging-history.set`, `connection.update`. O pacote declara não ser autorizado/afiliado ao WhatsApp. Interfaces locais não substituem teste de compatibilidade do SDK.

## Ponte para obrigações

`sessionConsumer(session, self)` entrega lotes à `ObligationSession` de `@orbita/shared/session`. O mesmo domínio é usado pela importação da UI. A sessão precisa estar vinculada a um escopo/conexão confiável; não representa autenticação multiusuário. Atualizações de cobertura são explícitas pelo chamador e não são inferidas como completas pelo recebimento de histórico.

Validação reproduzível: `pnpm test:flow`. Usa somente EventEmitter e mensagens sintéticas; não instala nem abre uma sessão Baileys. Veja `docs/testar-fluxo-local.md`.
