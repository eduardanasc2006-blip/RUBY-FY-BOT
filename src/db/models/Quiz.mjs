import { makeModel } from '../sqlite.mjs';
export default makeModel('quiz_stats', {
  jsonFields: ['categoriasContagem'],
  dateFields: [],
});
