process.env.DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || "fake-token";

const { Client } = require("discord.js");

let capturado = null;
const loginOriginal = Client.prototype.login;
Client.prototype.login = async function () {
  capturado = this;
  return "local";
};

require("../src/index.js");

Client.prototype.login = loginOriginal;

if (!capturado) {
  console.error("FALHA: nao capturou o client");
  process.exit(1);
}

console.log("client capturado. Total listeners messageCreate:", capturado.listenerCount("messageCreate"));
console.log("listeners interactionCreate:", capturado.listenerCount("interactionCreate"));