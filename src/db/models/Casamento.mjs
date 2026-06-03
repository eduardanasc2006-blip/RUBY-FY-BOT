import { makeModel } from '../sqlite.mjs';
export default makeModel('casamentos', {
  jsonFields: [],
  dateFields: ['dataCasamento', 'dataFim'],
});
