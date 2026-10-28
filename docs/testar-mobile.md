# Mobile — base instalável para testes sem custo externo

Foi adicionada uma base PWA ao site existente para antecipar testes de uso sem contratar infraestrutura nem publicar em lojas. Não é um aplicativo nativo Android/iOS e não muda a prioridade mobile do produto. A recomendação de React Native/Expo para a versão nativa continua proposta.

## Disponível

- Manifesto `OrbitAI`, abertura standalone, ícones 192/512 e ícone Apple 180.
- Viewport com safe-area, zoom permitido e adaptação de teclado em navegadores compatíveis.
- Service worker só em produção/contexto seguro. Cache exclusivo de ícones e uma página pública offline; conversas, páginas da aplicação, API, credenciais e respostas de IA não são gravadas nesse cache.
- Sem rede, uma navegação nova/reload mostra a página offline e ação de tentar novamente. Não promete executar o app inteiro offline. A aba já carregada mantém o comportamento local enquanto estiver aberta.
- Instalação não inicia microfone nem uma sessão WhatsApp. Voz depende de suporte e permissão do navegador; fallback para texto continua disponível.

## Verificação local executada

Build de produção iniciado no ambiente existente. Teste reproduzível: iniciar `pnpm --filter @orbita/web start`, depois executar `pnpm test:mobile` em outro terminal; `ORBIT_TEST_URL` permite escolher outro endereço local. O teste usa Chromium do sistema em `/usr/bin/chromium`; fora deste ambiente, instalar o browser compatível do Playwright e ajustar o executável antes de rodar. No Chromium com perfil de teste normal (não janela anônima), foram conferidos manifesto, dimensões dos ícones, Apple icon, cabeçalho de atualização do SW, registro/controlador, ausência de erros de instalabilidade no CDP, fluxo demo em viewport mobile, cache restrito e fallback offline/reconexão. Em janela anônima, o Chromium reporta `in-incognito`, uma restrição do modo de navegação e não uma instalação validada.

**Instalação, microfone, áudio e teclado em Android/iPhone reais ainda não foram testados.** Não há publicação/URL pública de teste gerada por esta etapa. Para instalar num aparelho real será necessário acesso a um endereço HTTPS válido da aplicação; a exceção de localhost usada na validação local não se aplica a um celular acessando outro computador por IP.

## Quando o dono estiver disponível

1. Abrir o endereço HTTPS de teste no Chrome Android. Menu → “Instalar app” / “Adicionar à tela inicial”, conforme a versão. Abrir pelo ícone e conferir uso sem barra de endereço.
2. No iPhone, abrir o mesmo endereço no Safari. Compartilhar → “Adicionar à Tela de Início”. Se a versão oferecer “Abrir como App da Web”, manter habilitado.
3. Nos dois: testar “Urgente Hoje”, abrir contexto, preparar/copiar os textos, importar arquivo sintético e limpar dados. Confirmar que nenhuma ação envia mensagens.
4. Testar ditado/leitura com permissão, negar microfone e conferir fallback. Validar interrupção, retorno ao app e fones. Essas verificações precisam de aparelho/pessoa reais.
5. Desligar a rede e reabrir/recarregar: deve aparecer a página offline sem dados pessoais. Religando, tentar novamente.

A base continua sem hospedagem nova, conta externa ou chamadas de IA. Instruções de instalação também ficam dentro de “Conversas e privacidade”, mantendo a abertura aprovada limpa.

Ícones podem ser regenerados com `node scripts/generate-app-icons.mjs`, usando apenas bibliotecas padrão de Node.
