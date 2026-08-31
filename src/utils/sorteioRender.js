const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const COR = 0xbeb6ff;

function escolherVencedores(participantes, qtd) {
  const pool = [...participantes];
  const sorteados = [];
  while (sorteados.length < qtd && pool.length) {
    sorteados.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return sorteados;
}

function montarEmbed(sorteio) {
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('🎉 SORTEIO')
    .setDescription(sorteio.descricao || 'Participe para concorrer!');
  if (sorteio.imagem) embed.setImage(sorteio.imagem);
  const vencedores = (sorteio.vencedores && sorteio.vencedores.length)
    ? sorteio.vencedores.map((u) => '<@' + u + '>').join(', ')
    : (sorteio.encerrado ? 'Nenhum' : 'Aguardando');
  embed.addFields(
    { name: '🎁 Prêmio', value: sorteio.premio || '—', inline: true },
    { name: '⏰ Término', value: (sorteio.fimEm ? '<t:' + Math.floor(new Date(sorteio.fimEm).getTime() / 1000) + ':R>' : '—'), inline: true },
    { name: '🏆 Vencedores', value: vencedores, inline: true },
    { name: '👥 Participantes', value: String(Array.isArray(sorteio.participantes) ? sorteio.participantes.length : 0), inline: true }
  );
  embed.setFooter({ text: sorteio.encerrado ? 'Sorteio encerrado' : 'Sorteio ativo · clique em 🎟 Participar' })
    .setTimestamp(sorteio.fimEm ? new Date(sorteio.fimEm) : new Date());
  return { embed };
}

function montarComponentes(sorteio, donoId, guildId, id) {
  const bts = [];
  if (!sorteio.encerrado) {
    bts.push(new ButtonBuilder().setCustomId('sorteio:participar:' + guildId + ':' + id).setLabel('🎟 Participar').setStyle(ButtonStyle.Primary));
  } else {
    bts.push(new ButtonBuilder().setCustomId('sorteio:sortear:' + donoId + ':' + guildId + ':' + id).setLabel('🔁 Sortear novamente').setStyle(ButtonStyle.Secondary));
  }
  bts.push(new ButtonBuilder().setCustomId('sorteio:encerrar:' + donoId + ':' + guildId + ':' + id).setLabel('🏁 Encerrar').setStyle(ButtonStyle.Danger));
  const linhas = [];
  for (let i =  0; i < bts.length; i += 5) {
    linhas.push(new ActionRowBuilder().addComponents(bts.slice(i, i + 5)));
  }
  return linhas;
}

async function renderizar(client, guildId, id, sorteio, canalId, donoId, isReagendado) {

  const canal = await client.channels.fetch(canalId || sorteio.canalId).catch(() => null);
  if (!canal || !canal.isTextBased()) return;
   const { embed } = montarEmbed(sorteio);
   const comps = montarComponentes(sorteio, donoId || sorteio.criadorId, guildId, id);
   if (isReagendado && sorteio.msgId) {


    const m = await canal.messages.fetch(sorteio.msgId).catch(() => null);
    if (m) {
      await m.edit({ embeds: [embed], components: comps });
      return;
    }
   }
   const msg = await canal.send({ embeds: [embed], components: comps });
   sorteio.msgId = msg.id;



   require('./sorteioStore').salvarSorteio(guildId, id, sorteio);
}

function reagendar(client, guildId, id, sorteio) {
  const fimEm = new Date(sorteio.fimEm).getTime();
  if (!Number.isFinite(fimEm) || fimEm <= 0) {
    console.warn("[Sorteio] fimEm inválido — sorteio ignorado no reagendamento.", guildId, id);
    return;
  }
  const agora = Date.now();
   const restante = fimEm - agora;
   if (restante <= 0) {
    setTimeout(() => {
      encerrar(client, guildId, id);
    }, 1000);
  } else if (restante <=  5000) {
    setTimeout(() => {
      encerrar(client, guildId, id);
    }, restante);
  } else {



    setTimeout(() => {
      encerrar(client, guildId, id);
    }, restante);
   }
}

async function encerrar(client, guildId, id) {
   const store = require('./sorteioStore');
   const sorteio = store.obter(guildId, id);
   if (!sorteio || sorteio.encerrado) return;
   sorteio.encerrado = true;
   sorteio.vencedores = (sorteio.vencedores && sorteio.vencedores.length) ? sorteio.vencedores : escolherVencedores((sorteio.participantes || []), sorteio.qtdVencedores || 1);
   store.salvarSorteio(guildId, id, sorteio);
   const canal = await client.channels.fetch(sorteio.canalId).catch(() => null);
   if (canal && canal.isTextBased() && sorteio.msgId) {  
    const m = await canal.messages.fetch(sorteio.msgId).catch(() => null);
    if (m) {
      const { embed } = montarEmbed(sorteio);
      await m.edit({ embeds: [embed], components: montarComponentes(sorteio, sorteio.criadorId, guildId, id) });
    }
   }
   if (canal && canal.isTextBased()) {
    await canal.send({ content: '🏁 **Sorteio encerrado!** ' + ((sorteio.vencedores && sorteio.vencedores.length) ? 'Vencedor(es): ' + sorteio.vencedores.map((u) => '<@' + u + '>').join(', ') : 'Nenhum vencedor desta vez.'), allowedMentions: { users: (sorteio.vencedores || []) } });
  }
}

async function sortearNovamente(client, guildId, id, callerId) {
  const store = require('./sorteioStore');
  const sorteio = store.obter(guildId, id);
  if (!sorteio || !sorteio.encerrado || !(sorteio.participantes || []).length) return null;
  sorteio.vencedores = escolherVencedores((sorteio.participantes || []), sorteio.qtdVencedores || 1);
  store.salvarSorteio(guildId, id, sorteio);
  const canal = await client.channels.fetch(sorteio.canalId).catch(() => null);
  if (canal && canal.isTextBased() && sorteio.msgId) {
    const m = await canal.messages.fetch(sorteio.msgId).catch(() => null);
    if (m) {
      const { embed } = montarEmbed(sorteio);
      await m.edit({ embeds: [embed], components: montarComponentes(sorteio, sorteio.criadorId, guildId, id) });
    }
  }
  return sorteio;
}

function reagendarTodos(client) {
  const store = require('./sorteioStore');
  const tudo = store.carregar();
  for (const guildId of Object.keys(tudo)) {
    const sorteios = tudo[guildId] || {};
    for (const id of Object.keys(sorteios)) {
      const s = sorteios[id];
      if (s && !s.encerrado) {
        reagendar(client, guildId, id, s);
      }
    }
  }
}

module.exports = { montarEmbed, montarComponentes, escolherVencedores, renderizar, encerrar, reagendar, sortearNovamente, reagendarTodos };