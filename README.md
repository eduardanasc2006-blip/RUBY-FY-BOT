# 💎 RUBY-FY BOT

Bot de Discord simples para conversão de Robux ↔ Reais e cálculo de Game Pass.

## Comandos

| Comando | Descrição |
| --- | --- |
| `/robux <quantidade>` | Converte Robux para R$ |
| `/reais <valor>` | Converte R$ para Robux |
| `/gamepass <robux>` | Quanto colocar no Game Pass para receber X Robux (Roblox desconta 30%) |
| `/taxa` | Mostra as taxas atuais |

## Taxas

As taxas ficam em **um único arquivo**: `src/config/rates.js`

- **100–999 Robux** → R$ 3,80 a cada 100 Robux
- **1.000+ Robux** → R$ 37,99 a cada 1.000 Robux
- **Game Pass** → 30% de desconto (você recebe 70%)

Para alterar, edite apenas o `rates.js` — todo o bot se ajusta automaticamente.

## Configuração

1. Instale as dependências: `npm install`

2. Crie um arquivo `.env` baseado no `.env.example`:

   `DISCORD_TOKEN` = token do seu bot
   `CLIENT_ID` = ID do aplicativo

3. Registre os comandos (só precisa rodar quando criar ou alterar comandos): `npm run deploy`

   Comandos globais podem levar até 1 hora para aparecer no Discord.

4. Inicie o bot: `npm start`

## Discloud

O bot já vem com `discloud.config` configurado. Envie o projeto (zip sem `node_modules` e sem `.env`) e configure o `DISCORD_TOKEN` nas variáveis de ambiente do painel.

Comando de inicialização: `node src/index.js`

## Estrutura

```
src/
├── config/
│   └── rates.js          ← taxas (edite aqui)
├── commands/
│   ├── robux.js
│   ├── reais.js
│   ├── gamepass.js
│   └── taxa.js
├── utils/
│   └── robuxConverter.js ← cálculos
└── index.js              ← entrada do bot
```
