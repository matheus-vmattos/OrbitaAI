# Ambiente cloud

Preparação reproduzível: `bash scripts/setup-cloud.sh` a partir da raiz. Script executa instalação congelada, testes, lint, checagem de tipos e build. Use o checkout existente em `/workspace/OrbitaAI`; não crie worktree sem pedido explícito.

Inicialização (processos precisam reiniciar em novas sessões):

```bash
cd /workspace/OrbitaAI
export XDG_DATA_HOME="$PWD/.cache/data"
export XDG_CACHE_HOME="$PWD/.cache"
export NEXT_TELEMETRY_DISABLED=1
pnpm dev
```

Para produção local depois de build: `pnpm --filter @orbita/web start`.
Verifique resposta HTTP na porta 3000 e o fluxo demo no navegador: consultar, abrir evidência, concluir/reabrir, importar `fixtures/conversa-sintetica.txt` e reimportar sem duplicação.

Não precisa de credenciais. Não existe WhatsApp, Supabase, Redis ou IA real nesta versão. Não gerar links localhost de preview durante onboarding.

A tentativa de salvar `install_script` e `start_skill` na plataforma retornou “The environment configuration is unavailable. Check the onboarding context.” A persistência nesses campos não foi confirmada; estes arquivos registram as instruções sem substituir o salvamento/publicação pela plataforma.
