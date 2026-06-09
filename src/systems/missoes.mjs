import { EmbedBuilder } from 'discord.js';
import Missao from '../db/models/Missao.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { ganharXP } from './xpSystem.mjs';

// ════════════════════════════════════════════════════════
//  POOL DE MISSÕES — 40 diárias + 20 semanais
//  A cada período, 4 são sorteadas para o usuário.
// ════════════════════════════════════════════════════════

const POOL_DIARIAS = [
  { id: 'msg_5', tipo: 'mensagem', descricao: 'Enviar 5 mensagens no chat', meta: 5, recompensa: 30 },
  { id: 'msg_10', tipo: 'mensagem', descricao: 'Enviar 10 mensagens no chat', meta: 10, recompensa: 50 },
  { id: 'msg_20', tipo: 'mensagem', descricao: 'Enviar 20 mensagens no chat', meta: 20, recompensa: 80 },
  { id: 'msg_30', tipo: 'mensagem', descricao: 'Enviar 30 mensagens no chat', meta: 30, recompensa: 100 },
  { id: 'msg_50', tipo: 'mensagem', descricao: 'Enviar 50 mensagens no chat', meta: 50, recompensa: 130 },
  { id: 'msg_75', tipo: 'mensagem', descricao: 'Enviar 75 mensagens', meta: 75, recompensa: 160 },
  { id: 'msg_100', tipo: 'mensagem', descricao: 'Super ativo: 100 mensagens', meta: 100, recompensa: 200 },
  { id: 'quiz_1', tipo: 'quiz', descricao: 'Responder 1 quiz', meta: 1, recompensa: 30 },
  { id: 'quiz_3', tipo: 'quiz', descricao: 'Responder 3 quizzes', meta: 3, recompensa: 70 },
  { id: 'quiz_5', tipo: 'quiz', descricao: 'Acertar 5 quizzes', meta: 5, recompensa: 100 },
  { id: 'quiz_8', tipo: 'quiz', descricao: 'Completar 8 quizzes', meta: 8, recompensa: 140 },
  { id: 'quiz_10', tipo: 'quiz', descricao: 'Dez quizzes hoje!', meta: 10, recompensa: 180 },
  { id: 'forca_1', tipo: 'forca', descricao: 'Vencer 1 partida de forca', meta: 1, recompensa: 50 },
  { id: 'forca_2', tipo: 'forca', descricao: 'Vencer 2 partidas de forca', meta: 2, recompensa: 90 },
  { id: 'forca_3', tipo: 'forca', descricao: 'Vencer 3 partidas de forca', meta: 3, recompensa: 130 },
  { id: 'forca_5', tipo: 'forca', descricao: 'Ganhar 5 vezes na forca', meta: 5, recompensa: 180 },
  { id: 'int_3', tipo: 'interacao', descricao: 'Fazer 3 interações sociais', meta: 3, recompensa: 40 },
  { id: 'int_5', tipo: 'interacao', descricao: 'Fazer 5 interações sociais', meta: 5, recompensa: 60 },
  { id: 'int_10', tipo: 'interacao', descricao: 'Fazer 10 interações sociais', meta: 10, recompensa: 90 },
  { id: 'int_15', tipo: 'interacao', descricao: 'Fazer 15 interações com amigos', meta: 15, recompensa: 120 },
  { id: 'int_20', tipo: 'interacao', descricao: 'Ser social: 20 interações', meta: 20, recompensa: 150 },
  { id: 'rep_1', tipo: 'reputacao', descricao: 'Dar reputação para alguém', meta: 1, recompensa: 40 },
  { id: 'rep_2', tipo: 'reputacao', descricao: 'Dar rep para 2 pessoas hoje', meta: 2, recompensa: 70 },
  { id: 'rep_3', tipo: 'reputacao', descricao: 'Elogiar 3 pessoas (reputação)', meta: 3, recompensa: 100 },
  { id: 'cmd_5', tipo: 'comando', descricao: 'Usar 5 comandos do bot', meta: 5, recompensa: 30 },
  { id: 'cmd_10', tipo: 'comando', descricao: 'Usar 10 comandos do bot', meta: 10, recompensa: 50 },
  { id: 'cmd_15', tipo: 'comando', descricao: 'Usar 15 comandos do bot', meta: 15, recompensa: 70 },
  { id: 'cmd_20', tipo: 'comando', descricao: 'Usar 20 comandos do bot', meta: 20, recompensa: 90 },
  { id: 'cmd_30', tipo: 'comando', descricao: 'Expert: 30 comandos do bot', meta: 30, recompensa: 120 },
  { id: 'afin_1', tipo: 'afinidade', descricao: 'Fazer 1 interação afetiva', meta: 1, recompensa: 35 },
  { id: 'afin_3', tipo: 'afinidade', descricao: 'Criar 3 interações afetivas', meta: 3, recompensa: 60 },
  { id: 'afin_5', tipo: 'afinidade', descricao: 'Fortalecer 5 laços de amizade', meta: 5, recompensa: 90 },
  { id: 'xp_50', tipo: 'xp', descricao: 'Ganhar 50 XP hoje', meta: 50, recompensa: 40 },
  { id: 'xp_100', tipo: 'xp', descricao: 'Ganhar 100 XP hoje', meta: 100, recompensa: 70 },
  { id: 'xp_200', tipo: 'xp', descricao: 'Ganhar 200 XP hoje', meta: 200, recompensa: 100 },
  { id: 'xp_300', tipo: 'xp', descricao: 'Acumular 300 XP em um dia', meta: 300, recompensa: 130 },
  { id: 'esp_voz', tipo: 'quiz', descricao: 'Participar de 2 quizzes diferentes', meta: 2, recompensa: 80 },
  { id: 'esp_jogo', tipo: 'forca', descricao: 'Jogar forca 2x e quiz 1x', meta: 2, recompensa: 100 },
  { id: 'esp_msg', tipo: 'mensagem', descricao: 'Enviar 40 mensagens hoje', meta: 40, recompensa: 110 },
  { id: 'esp_ativo', tipo: 'comando', descricao: 'Usar 25 comandos do bot hoje', meta: 25, recompensa: 100 },
];

const POOL_SEMANAIS = [
  { id: 'w_xp_500', tipo: 'xp', descricao: 'Ganhar 500 XP esta semana', meta: 500, recompensa: 400 },
  { id: 'w_xp_1000', tipo: 'xp', descricao: 'Acumular 1.000 XP na semana', meta: 1000, recompensa: 700 },
  { id: 'w_xp_1500', tipo: 'xp', descricao: 'Ser um monstro: 1.500 XP', meta: 1500, recompensa: 900 },
  { id: 'w_quiz_10', tipo: 'quiz', descricao: 'Completar 10 quizzes', meta: 10, recompensa: 300 },
  { id: 'w_quiz_20', tipo: 'quiz', descricao: 'Completar 20 quizzes', meta: 20, recompensa: 500 },
  { id: 'w_quiz_30', tipo: 'quiz', descricao: 'Mestre: completar 30 quizzes', meta: 30, recompensa: 700 },
  { id: 'w_forca_3', tipo: 'forca', descricao: 'Vencer 3 partidas de forca', meta: 3, recompensa: 250 },
  { id: 'w_forca_5', tipo: 'forca', descricao: 'Vencer 5 partidas de forca', meta: 5, recompensa: 350 },
  { id: 'w_forca_10', tipo: 'forca', descricao: 'Mestre da forca: 10 vitórias', meta: 10, recompensa: 600 },
  { id: 'w_int_20', tipo: 'interacao', descricao: 'Fazer 20 interações esta semana', meta: 20, recompensa: 200 },
  { id: 'w_int_50', tipo: 'interacao', descricao: 'Fazer 50 interações esta semana', meta: 50, recompensa: 400 },
  { id: 'w_msg_100', tipo: 'mensagem', descricao: 'Enviar 100 mensagens na semana', meta: 100, recompensa: 
