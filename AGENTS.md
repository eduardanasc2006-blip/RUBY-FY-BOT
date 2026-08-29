# RUBY-FY-BOT — notas de trabalho

## Repositório
- GitHub: `eduardanasc2006-blip/RUBY-FY-BOT` (agora **público** desde 2026-08-28).
- Branch padrão: `main`. Pushes de fix podem ir direto ao main (convenção do repo, feita por openhands no passado).
- Para pushes com o token do ambiente (sem scope de escrita), usar o token pessoal do usuário (`ghp_...`) no remote URL: `https://x-access-token:ghp_...@github.com/eduardanasc2006-blip/RUBY-FY-BOT.git` (não deixar espaço/commitar o token no repo).

## Testes
- Harnesses manuais em `tests/` (executar com `node tests/<arquivo>.js`): `embedPainel.test.js`, `prefixotabela.test.js`, `prefixopainelcat.test.js`, `prefixopainelestoque.test.js`, `syntax_probe.js`, `ajudadm.test.js`.
- `tests/ajudadm.test.js` cobre o menu de ajuda na DM: público não vê botões de admin; `buildAjuda(page, isAdmin)` — NAO mostrar `ajuda:cat:admin` para `isAdmin=false` (fix de 2026-08-29: o botão de Administração aparecia para todos e ao clicar voltava mudo para a home — parecia quebrado na DM).
- `data/` nunca deve conter `estoque.json` criado por teste — testes de `painelcategoria`/`painelestoque` recriam via `addCategoria`/publica; limpar depois (`rm -f data/estoque.json`).

## Deploy / Discord
- `deploy-commands.js` redefine os comandos GLOBAIS do app — ao rodar, **remove comandos custom** (`pix`, `pagamento` — gerados via `/criarcomando` e armazenados em `data/comandos_custom.json` **no host do Discloud**, não no repo). Eles voltam quando o bot reinicia no host `RUBY-FY-BOT` (Discloud ID `RUBY-FY-BOT`).
- Para o bot aparecer na DM, os usuários precisam instalar o app via **User Install**: `https://discord.com/oauth2/authorize?client_id=1509146932478476389&scope=applications.commands&integration_type=1`.
- Toque de verificação rápida do estado do bot: `curl -H "Authorization: Bot <token>" https://discord.com/api/v10/users/@me` (e `/users/@me/guilds`, `/applications/<id>/commands`).

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
- ⚠️ O token atual (`ghp_...`) **não tem permissão para criar/editar releases** (403 "Resource not accessible by integration" — fine-grained sem permissão Contents/Releases). Push de tags funciona; source zip automático da tag fica disponível em `github.com/<user>/<repo>/archive/refs/tags/<tag>.zip`. Para subir asset p/ release, usar token com permissão de Releases.
- v1.2 (tag `ruby-fy-bot-v1.2`, HEAD main) — source zip disponível via codeload; asset custom não subido por limitação de token.