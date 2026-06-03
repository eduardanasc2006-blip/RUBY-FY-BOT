await registrarLog(client, guildId, 'economy', userId, {
  evento: 'xp_shop_buy',
  origem: 'loja-quiz',
  item: item.nome,
  custo: item.custo,
  saldoFinal: user.xp,
  descricao: `<@${userId}> comprou **${item.nome}** na loja`,
}, configs);
