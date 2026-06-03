import { makeModel } from '../sqlite.mjs';
export default makeModel('missoes', {
  jsonFields: ['diarias', 'semanais'],
  dateFields: ['ultimaRenovacaoDiaria', 'ultimaRenovacaoSemanal'],
});
