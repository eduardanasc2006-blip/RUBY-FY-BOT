# RUBY-FY-BOT — notas de trabalho

## Repositório
- GitHub: `eduardanasc2006-blip/RUBY-FY-BOT` (agora **público** desde 2026-08-28).
- Branch padrão: `main`. Slave: `/`.

## Testes
- Harnesses manuais em `tests/` (executar com `node tests/<arquivo>.js`): `embedPainel.test.js`, `prefixotabela.test.js`, `prefixopainelcat.test.js`, `prefixopainelestoque.test.js`, `syntax_probe.js`.
- `data/` nunca deve conter `estoque.json` criado por teste — testes de `painelcategoria`/`painelestoque` recriam via `addCategoria`/publica; limpar depois (`rm -f data/estoque.json`).

## Estrutura
- `src/commands/*.js` — comandos slash (deploy via deploy-commands.js).
- `src/prefixCommands/*.js` — comandos prefixo `!`.
- `src/utils/` — painéis/editoras compartilhados (embedPainel, panelStore, permissions, etc).
- Exige paridade funcional `!` ↔ `/`; slash deve reusar os mesmos editoress/handlers dos prefixos quando houver editor visual.
- Prefixos com suporte a canal alvo (`!tabela`, `!painelcategoria`, `!painelestoque`) usam `message.mentions?.channels?.first() || message.channel` — cuidado com typo `mentions` (já corrigido; se voltar, quebra silenciosamente o envio no canal citado).

## Release
- v1.1 = primeiro release construído direto do `git ls-files` do main (70 arquivos, zip completo p/ Discloud). Assets sem `.env`, `data/`, `node_modules`.
- Publicar release: criar tag `ruby-fy-bot-vX.Y`, upload do zip via `https://uploads.github.com/.../releases/{id}/assets?name=...`.
- Repo público → links `github.com/.../releases/download/...` funcionam sem auth.