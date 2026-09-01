# RUBY-FY-BOT — notas de trabalho

## Repositório
- GitHub: `eduardanasc2006-blip/RUBY-FY-BOT` (agora **público** desde 2026-08-28).
- Branch padrão: `main`. Pushes de fix podem ir direto ao main (convenção do repo, feita por openhands no passado).
- Para pushes com o token do ambiente (sem scope de escrita), usar o token pessoal do usuário (`ghp_...`) no remote URL: `https://x-access-token:ghp_...@github.com/eduardanasc2006-blip/RUBY-FY-BOT.git` (não deixar espaço/commitar o token no repo).

## Testes
- Harnesses manuais em `tests/` (executar com `node tests/<arquivo>.js`): `embedPainel.test.js`, `prefixotabela.test.js`, `prefixopainelcat.test.js`, `prefixopainelestoque.test.js`, `syntax_probe.js`, `ajudadm.test.js`.
- `tests/ajudadm.test.js` cobre o menu de ajuda na DM: público não vê botões de admin; `buildAjuda(page, isAdmin)` — NAO mostrar `ajuda:cat:admin` para `isAdmin=false` (fix de 2026-08-29: o botão de Administração aparecia para todos e ao clicar voltava mudo para a home — parecia quebrado na DM).
- `data/` nunca deve conter `estoque.json` criado por teste — testes de `painelcategoria`/`painelestoque` recriam via `addCategoria`/publica; limpar depois (`rm -f data/estoque.json`).

## Limites da API do Discord (componentes)
- **ActionRow**: máx 5 componentes por linha e máx 5 linhas por mensagem — violação devolve `DiscordAPIError 50035 components[N].components[BASE_TYPE_BAD_LENGTH]`.
- Painel do embed (`buildPainel` in `src/utils/embedPainel.js`): 4 linhas fixas — linha1 (4: Título/Descrição/Cor/Imagem), linha2 (5: Thumbnail/Autor/Rodapé/Fields/**Cancelar**), linha3 (5: Texto fora/Botões/Salvar/Preview/Enviar), linha4 (menu de cargos) — botões customizados entram com **no máx 1 linha** (`.slice(0, 1)`), pois o total tem que ficar ≤5 linhas.
- Layout histórico: em 2026-08-31 a linha3 tinha 6 botões (causou o 50035 em produção às 10:06); fix em `6baf26d` redistribuiu Cancelar para a linha2 e limitou customizados a 1 linha.

## Deploy / Discord
- ⚠️ **Respostas duplicadas (`!robux` respondendo 2x)**: causa raiz era o bot rodando em **2 processos** no Discloud — `discloud.config` tinha **`MAIN=src/index.js` E `START=node src/index.js`** (ambos apontando para o mesmo arquivo; o host subia o index 2x). Fix (commit `0152e0b`): remover `START` do `discloud.config` (o `MAIN` já executa o index) **e** adicionar **lockfile anti-instância única** no topo do `src/index.js` (`.bot.lock`; se outro processo do mesmo bot estiver vivo, o segundo `process.exit(0)` antes de logar no Discord). Testar local: 1ª instância liga normal; 2ª sai com `⚠️ Outra instância do bot já está rodando (PID...)`.
- ⚠️ **`DiscordAPIError 50035 COMPONENT_INVALID_EMOJI`** ao publicar painéis/embeds com botões: o usuário podia digitar texto inválido no campo "Emoji" do modal (ex: `abc`, `:teste:`), que era salvo cru e passado a `setEmoji()` — o Discord rejeita ao enviar. Fix: novo utilitário `src/utils/sanitizarEmoji.js` (aceita só emojis Unicode pictográficos ou `<:nome:id>`/ID de emoji customizado), aplicado nos modais de botão do editor embed (`embedmodal:botaosave`), de emoji de categoria do estoque (`estmodal:catemoji`) e na normalização de botões (`botoesEmLinhas` em `embedPainel.js`, `normBotoes` em `botoesPainel.js`).
- ⚠️ **Comandos personalizados são PREFIXO (`!nome`), NÃO slash.** Criados via /criarcomando, salvos em data/comandos_custom.json **no host do Discloud** (não no repo), e respondidos no messageCreate de src/index.js (handler custom.obter(commandName) → buildResposta). A resposta e publica; o campo ephemeral do comando so controla o botao copiavel. O modulo src/utils/customSync.js foi removido — nao registrar/limpar custom no Discord. Rodar deploy-commands.js redefine so os slash **nativos** e **apaga** os /custom antigos que ainda existam no seletor global (irreversivel para o formato /).
- Para o bot aparecer na DM, os usuários precisam instalar o app via **User Install**: `https://discord.com/oauth2/authorize?client_id=1509146932478476389&scope=applications.commands&integration_type=1`.
- Toque de verificação rápida do estado do bot: `curl -H "Authorization: Bot <token>" https://discord.com/api/v10/users/@me` (e `/users/@me/guilds`, `/applications/<id>/commands`).
- ⚠️ **Botão privado (`cttopen`)**: o clique envia **todos os conteúdos configurados em sequência, numa única resposta efêmera** — sem paginação, sem "Página X", sem botões de voltar/fechar. `buildConteudoPrivado` (em `embedPainel.js`) mapeia `paginasValidas` para `embeds[]` e só acrescenta o botão "✏️ Editar conteúdos" para o dono (custom id `cttopen:...:editar:<autorId>`).. Handler em `src/index.js` chama `buildConteudoPrivado(dados.paginas || [], 0,...)` — o `paginaIdx`/navegação por `:pag:`/`:fechar:` foi removido (commit `e4d0fe8`). Novo teste: `tests/embedConteudoPrivado.test.js`.
- Cor herdada nos botoes privados: as embeds efemeras usam a mesma cor da embed publicada (`estado.cor`), salva no payload do `cttStore` na publicacao via `botoesEmLinhas(..., cor)` e aplicada por `resolverCor(cor)` no `buildConteudoPrivado(..., cor)` — em vez do lilas padrao.

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