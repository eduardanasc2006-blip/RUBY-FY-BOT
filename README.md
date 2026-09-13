# 💎 RUBY-FY BOT

Bot de Discord para **conversão de Robux ↔ Reais**, gerenciamento de **estoque**, **vendas com comprovante (proof)**, **embeds personalizadas**, **metas por cargo** e **boas-vindas**.

## Funcionalidades

- 💱 **Conversor de Robux ↔ R$** com taxas por faixa (100–999 / 1.000+) e cálculo de Game Pass
- 📦 **Estoque completo**: categorias, produtos, preço, quantidade, descrição, imagem, disponibilidade
  - **Painel fixo** no canal (qualquer membro clica numa categoria e vê os produtos de forma privada)
  - **Configuração paginada** (categorias/produtos) via `!configestoque`
- 🛒 **Carrinho e compra** com finalização de pedido e log por produto
- 🧾 **Proof (comprovante)**: comandos de postagem de comprovante e configuração via `!proof`/`!setproof`
- 📨 **Embeds personalizadas** com editor visual (`!embed`): título, descrição, cor, imagem, thumbnail, autor, rodapé, fields, botões (link ou **privado** com conteúdo por clique), páginas de conteúdo privado
- ⚡ **Metas por cargo** (`!metas`) — requisito de valor/quantidade de vendas para liberar cargo
- 👋 **Boas-vindas** (`!setwelcome`) com variáveis
- 🤖 **Respostas automáticas** (`!autoresposta`) por palavra-chave
- 🔒 **Permissões por cargo** (`!permissoes`) nos grupos de comandos
- 🗃️ **Backup completo na DM** (`!backup`) com todos os dados do servidor
- 📊 **Log de compras** (`!logcompras`), **canal de aviso** de produto esgotado (`!canalavisos`)

## Comandos

Todos funcionam com **prefixo `!`** (`!robux 1000`) e também como **slash command** (`/robux valor:1000`).

### Conversão / utilidades

| Comando | Descrição |
| --- | --- |
| `!robux <qtd>` / `/robux` | Converte Robux → R$ |
| `!reais <valor>` / `/reais` | Converte R$ → Robux |
| `!gamepass <robux>` / `/gamepass` | Valor a colocar no Game Pass para receber X Robux |
| `!taxa` / `/taxa` | Mostra as taxas atuais |
| `!calc <expressão>` / `/calc` | Calculadora simples |
| `!ping` / `/ping` | Latência do bot |
| `!info` / `/info` | Informações do bot |
| `!ajuda` / `/ajuda` | Menu de ajuda interativo |

### Estoque e vendas (admin)

| Comando | Descrição |
| --- | --- |
| `!estoque` / `/estoque` | Mostra o estoque (painel público; busca por nome com argumentos) |
| `!configestoque` / `/configestoque` | Painel de configuração do estoque (categorias, produtos, quantidades, vender, ativar/desativar, remover) |
| `!painelestoque` / `/painelestoque` | Publica/atualiza o painel fixo de estoque no canal |
| `!painelcategoria` / `/painelcategoria` | Fixa no canal os produtos de uma categoria |
| `!canalavisos` / `/canalavisos` | Canal onde avisar quando um produto esgota |
| `!comprar` / `/comprar` | Fluxo de compra (carrinho) |
| `!cliente` / `/cliente` | Consulta de pedidos do cliente |

### Conversão (admin)

| Comando | Descrição |
| --- | --- |
| `!configtaxa` / `/configtaxa` | Painel de configuração das taxas |
| `!settaxa` / `/settaxa` | Altera as taxas diretamente |
| `!tabela` / `/tabela` | Publica/atualiza o painel de conversão no canal |
| `!painel` / `/painel` | Gerenciador central de painéis (conversão, estoque, categorias) |

### Conteúdo (admin)

| Comando | Descrição |
| --- | --- |
| `!embed` / `/embed` | Editor visual de embeds personalizadas |
| `!modelos` / `/modelos` | Painel de modelos de embed |
| `!mensagem` / `/mensagem` | Publica mensagem simples (texto e/ou imagem) |
| `!criarcomando` / `/criarcomando` | Cria comando personalizado (resposta com copiáveis/links) |
| `!gerenciarcomandos` / `/gerenciarcomandos` | Edita/remove comandos personalizados |
| `!proof` / `/proof` | Posta comprovante (proof) com imagens e dados |
| `!setproof` / `/setproof` | Configura o canal/log de proofs |
| `!canalcomando` / `/canalcomando` | Restringe comandos a canais específicos (admins e cargos autorizados passam em qualquer canal; a mensagem de bloqueio é personalizável e aceita `{canais}`) |

### Automação e moderação (admin)

| Comando | Descrição |
| --- | --- |
| `!autoresposta` / `/autoresposta` | Respostas automáticas por palavra-chave |
| `!setwelcome` / `/setwelcome` | Painel de boas-vindas |
| `!testwelcome` / `/testwelcome` | Envia a mensagem de boas-vindas para testar |
| `!permissões` / `/permissoes` | Permissões por cargo nos grupos de comandos |
| `!backup` / `/backup` | Envia na DM um backup completo dos dados do servidor |
| `!limpar <qtd>` / `/limpar` | Apaga mensagens do canal |
| `!lock` / `/lock` — `!unlock` / `/unlock` | Bloqueia/desbloqueia canal para membros comuns |
| `!rolegive` / `/rolegive` | Dá um cargo a um membro |

## Taxas

As taxas por padrão ficam em `src/config/rates.js` e podem ser alteradas **em tempo de execução** por `!configtaxa`/`!settaxa` (persistem em `data/rates.json`):

- **100–999 Robux** → configurável (ex.: R$ 3,80 a cada 100 Robux)
- **1.000+ Robux** → configurável (ex.: R$ 37,99 a cada 1.000 Robux)
- **Game Pass** → % de desconto cobrado pela Roblox (padrão 30%)

## Configuração

1. Instale as dependências: `npm install`
2. Crie um `.env` baseado no `.env.example`:
   - `DISCORD_TOKEN` = token do seu bot
   - `CLIENT_ID` = ID do aplicativo (opcional — o bot também usa `client.application.id`)
   - `ADMIN_IDS` = (opcional) IDs de administradores extras
3. Inicie: `npm start` (registra os comandos e sobe o bot)

> Os slash commands são **sincronizados automaticamente no boot** via `src/index.js` — não é preciso rodar `npm run deploy` manualmente na Discloud.

## Deploy (Discloud)

- Estrutura esperada: `discloud.config` (`MAIN=src/index.js`) e os arquivos na **raiz** do ZIP
- O `data/` é gerado em runtime pela própria Discloud (persistido entre restarts)

## Estrutura

```
src/
  index.js           # bootstrap e handlers de interação (painéis)
  commands/          # slash commands
  prefixCommands/    # comandos de prefixo (!)
  utils/             # lógica de domínio e painéis (estoque, embed, welcome, ...)
  config/            # taxas padrão
tests/               # testes (node:assert, sem dependências externas)
data/                # dados persistidos (não vai no git nem no ZIP da Discloud)
```

> **Importante (comandos com `!`):** ative o **Message Content Intent** no [Discord Developer Portal](https://discord.com/developers/applications) → sua aplicação → **Bot** → ligue **Message Content Intent**. Sem isso os comandos `!` não respondem (os `/` continuam funcionando).
