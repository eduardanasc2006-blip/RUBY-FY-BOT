import { makeModel } from '../sqlite.mjs';
export default makeModel('usuarios', {
  jsonFields: ['titulos'],
  dateFields: ['ultimaRep', 'ultimaMensagem', 'ultimoXP', 'createdAt', 'updatedAt'],
});
