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
- ⚠️ **Todo elemento de `components` DEVE ser um ActionRow (type 1)** — select menu solto no top level devolve `50035 'Value of field "type" must be one of (1, 9, 10, 12, 13, 14, 17)'` (fix de 2026-09-12, commit `16f8194`: `menuCanaisRapido` do `autoRespostaPanel.js` retornava `StringSelectMenuBuilder` solto → `!autoresposta` falhava com "❌ Ocorreu um erro ao executar este comando" quando havia ≥1 auto-resposta E canais de texto válidos). Teste de regressão adicionado em `tests/painelautoresposta.test.js` (top-level deve serializar `type 1`).
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

## Isolamento por servidor (guildId) — auditoria 2026-09-14
- Todo dado persistente é por-guild. Padrões:
  - Arquivo por guild: `data/estoque/<guildId>.json`, `data/autorespostas/<guildId>.json`, `data/comandos_custom/<guildId>.json`, `data/paineis/<guildId>.json`, `data/compras.json` (chave `{ [guildId]: {...} }`), `data/metas.json`, `data/log_compras.json`, `data/canal_comandos.json`, `data/canal_avisos.json`, `data/modelos_embed.json`.
  - `proofStore`/`proofModal` (rascunhos/fluxos em memória): chave `${guildId}:${userId}` (funções agora recebem `guildId` primeiro: `salvarRascunho(guildId, userId, d)`, `obterRascunho(guildId, userId)`, `salvarFluxo(guildId, userId, d)`, etc.).
  - `painelCenter`: **NÃO** espelha mais em `data/painel_estoque.json`/`data/painel_categoria.json` globais. O legado global migra UMA vez (renomeado `.migrado`) para o primeiro servidor que acessar; `PANEL_FILE` (`data/panel.json`) é GLOBAL intencional (painel de conversão fixo do `panelStore`). `salvarCategoria(guildId, msgId, null, null)` REMOVE a categoria.
  - `avisos` (canal de avisos de esgotamento): `{ [guildId]: canalId }`; `avisar(client, guildId, texto)`.
  - `metasConquistadas(guildId, clienteId, valor)` filtra cargos que o cliente **já conquistou** (meta não reaparece em compras futuras) — mantido cumulativo.
  - Backup (`!backup`): exporta por-guild; `selecionarDaGuild(obj)` retorna `obj[guildId]` OU null — arquivos com chave que não é guildId (ex. `lock_estados.json` por channelId, `ctt_conteudos.json` por token) NÃO entram no backup por-guild (evita vazar dado de outro servidor).
- Testes: `tests/isolamento.test.js` (53 checks) e `tests/permissoes_isolamento.test.js` (37 checks).

## Sistema de permissões (auditado 2026-09-14 — completo e por-guild)
- Mecanismo: `src/utils/permissions.js` — `GRUPOS` mapeiam comandos→grupo; `comandoPode(member, userId, comando)` libera para: `ADMIN_IDS` (env) → `member.permissions.has(Administrator)` → cargo no grupo da guild. Config fica em `data/permissoes.json` (`{ [guildId]: { grupos: {...} } }`).
- `comandoDoCustomId(interaction)` em `src/index.js` mapeia customId de botão/modal → comando; `permitido(interaction)` aplica `comandoPode`. Handler `estadm:`/`estmodal:`→configestoque, `painelcenter:`→painel, `cfg:`/`cfgmodal:`→configtaxa, `autoresp:`→autoresposta, `metaspainel:`/`metasmodal:`→metas, etc.
- Comandos com proteção por `isAdmin||eDono` (owner/Administrator apenas, NÃO grupo): `permissoes`, `canalcomando`. Comandos com proteção por `comandoPode` (grupo): `configestoque`, `painelestoque`, `painelcategoria`, `metas`, `settaxa`/`configtaxa`, `backup`, `limpar`/`lock`/`unlock`/`canalavisos`, `rolegive`, `embed`/`mensagem`/`modelos`, `autoresposta`, `criarcomando`, `gerenciarcomandos`.
- ⚠️ `comprar` (comando do CLIENTE) NÃO tem checagem de permissão no comando em si (cliente comum compra). Mas os handlers ADMIN que "confirmam/cancelam pedido" e o fluxo `/proof` usam `comandoPode(...,'comprar')` (grupo vendas) — isto é, quem tem cargo no grupo `vendas` pode confirmar/cancelar/proof. Não trocar por `comandoDoCustomId` — `comp:*` não é mapeado para grupo (de propósito) e `proof*` é protegido explicitamente.
- `estoque` (consulta pública) e `estfixo:` (painel público) NÃO são restritos (clientes precisam ver). Não adicionar permissão a eles.
- Testes de regressão em `tests/permissoes_isolamento.test.js`: isolamento por-guild, usuário comum bloqueado, owner/admin passam, cargo só vale no servidor configurado.

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

## Testes de smoke (2026-09-01)
- `tests/smoke_handlers.js`: fakes de canal/interação (`isButton`, `isModalSubmit`, `isRoleSelectMenu`, `isAnySelectMenu`, `colecaoCanais` com `get/filter/sort/first/map/size`); exercita **126 handlers** ( 33 prefixos únicos) sem exceção. Rodar: `node tests/smoke_handlers.js`.
- `tests/cttopen_fluxo.test.js`: fluxo **real** do botão privado — publica a embed via `buildPreview` ( que inclui `botoesEmLinhas` com o `cttopen:guild:token`), acha o botão,, emite `interactionCreate` e confere que o handler respondeu com **todas as páginas como embeds em sequência**, `flags: 1<<6` ( efêmera), **mesma cor** da embed publicada e **sem paginação**. Rodar: `node tests/cttopen_fluxo.test.js`. ⚠️ `buildEmbed` sozinho retorna o `EmbedBuilder` — **sem `components`**; quem monta a msg com botões é `buildPreview` ( ou o próprio comando).
- `/pix`: era um **slash antigo** ( não oficial; personalizado custom)que sobrava no Discord global. Rodar `node deploy-commands.js` faz `PUT` que **substitui a lista global** e **apaga** os `/custom` antigos. Depois do deploy de 2026-09-01: **30 comandos globais, sem `pix`** ( verificado via `GET /applications/1509146932478476389/commands`).
