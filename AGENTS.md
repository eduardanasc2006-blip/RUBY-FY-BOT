# RUBY-FY-BOT — notas de trabalho

## Repositório
- GitHub: `eduardanasc2006-blip/RUBY-FY-BOT` (agora **público** desde 2026-08-28).
- Branch padrão: `main`. Slave: `/`.

## Testes
- Projeto **não possui suíte de testes** (`npm test` inexistente). Validação feita manualmente com harnesses mocks em /tmp.

## Estrutura
- `src/commands/*.js` — comandos slash (deploy via deploy-commands.js).
- `src/prefixCommands/*.js` — comandos prefixo `!`.
- `src/utils/` — painéis/editoras compartilhados (embedPainel, panelStore, permissions, etc).
- Exige paridade funcional `!` ↔ `/`; slash deve reusar os mesmos editoress/handlers dos prefixos quando houver editor visual.

## Release
- v1.1 = primeiro release construído direto do `git ls-files` do main (70 arquivos, zip completo p/ Discloud). Assets sem `.env`, `data/`, `node_modules`.
- Publicar release: criar tag `ruby-fy-bot-vX.Y`, upload do zip via `https://uploads.github.com/.../releases/{id}/assets?name=...`.
- Repo público → links `github.com/.../releases/download/...` funcionam sem auth.