const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const COR = 0xbeb6ff;

function escolherVencedores(participantes, qtd) {
  const pool = [...participantes];
  const sorteados = [];
  while (sorteados.length < qtd && pool.length) {
    sorteados.push(pool.splice(Math.floor(Math.random() * pool.length), )[0]);
  }
  return sorteados;
}

function montarEmbed(sorteio) {
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('🎉 Sorteio: ' + (sorteio.premio || 'Sorteio'))
    .setDescription(sorteio.descricao || 'Participe para concorrer!')
    .setFooter({ text: sorteio.encerrado ? 'Sorteio encerrado' : 'Sorteio ativo' })
    .setTimestamp(new Date(sorteio.fimEm));
  if (sorteio.imagem) embed.setImage(sorteio.imagem);
  embed.addFields(
    { name: '🎁 Prêmio', value: sorteio.premio || '—', inline: true },
    { name: '👥 Participantes', value: String(sorteio.participantes.length), inline: true },
    { name: '🏆 Vencedores', value: sorteio.vencedores.length ? sorteio.vencedores.map((u) => '<@' + u + '>').join(', ') : (sorteio.qtdVencedores ? String(sorteio.qtdVencedores) : '1'), inline: true }
  );
  return { embed };
}

function montarComponentes(sorteio, uid, guildId, id) {
  const bts = [];
  if (!sorteio.encerrado) {
    bts.push(new ButtonBuilder().setCustomId('sorteio:participar:' + guildId + ':' + id).setLabel('🎟 Participar').setStyle(ButtonStyle.Primary));
    bts.push(new ButtonBuilder().setCustomId('sorteio:refazer:' + uid + ':' + guildId + ':' + id).setLabel('🔁 Refazer').setStyle(ButtonStyle.Secondary));
  }
  bts.push(new ButtonBuilder().setCustomId('sorteio:encerrar:' + uid + ':' + guildId + ':' + id).setLabel('🏁 Encerrar').setStyle(ButtonStyle.Danger));
  const rows = [];
  rows.push(new ActionRowBuilder().addComponents(bts.splice(0, 5)));
  if (bts.length) rows.push(new ActionRowBuilder().addComponents(bts.splice(0, 5)));
  return rows;
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
   const agora = Date.now();
   const restante = fimEm - agora;
   if (restante > 5000) {



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
   sorteio.vencedores = sorteio.vencedores.length ? sorteio.vencedores : escolherVencedores(sorteio.participantes, sorteio.qtdVencedores || 1);
   store.salvarSorteio(guildId, id, sorteio);
   const canal = await client.channels.fetch(sorteio.canalId.catch(() => null));
   if (canal && canal.isTextBased() && sorteio.msgId) {  
    const m = await canal.messages.fetch(sorteio.msgId.catch(() => null));
    if (m) {
      const { embed } = montarEmbed(sorteio);
      await m.edit({ embeds: [embed], components: montarComponentes(sorteio, sorteio.criadorId, guildId, id) });
    }
   }
   if (canal && canal.isTextBased()) {  
     await canal.send({ content: '🏁 **Sorteio encerrado!** Vencedor(es): ' + (sorteio.vencedores.length ? sorteio.vencedores.map((u) => '<@' + u + '>').join(', ') : 'Nenhum') });
   }
}

module.exports = { montarEmbed, montarComponentes, escolherVencedores, renderizar, encerrar, reagendar };