const { PermissionFlagsBits } = require('discord.js');

// Permissões de que o bot precisa para funcionar (envio, embeds, gerenciar
// mensagens para o auto-delete, cargos para o /rolegive, etc.)
function linkConvite(clientId) {
  const permissoes =
    PermissionFlagsBits.ViewChannel |
    PermissionFlagsBits.SendMessages |
    PermissionFlagsBits.EmbedLinks |
    PermissionFlagsBits.AttachFiles |
    PermissionFlagsBits.ReadMessageHistory |
    PermissionFlagsBits.ManageMessages |
    PermissionFlagsBits.ManageRoles |
    PermissionFlagsBits.MentionEveryone |
    PermissionFlagsBits.AddReactions;
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissoes}&scope=bot%20applications.commands`;
}

module.exports = { linkConvite };