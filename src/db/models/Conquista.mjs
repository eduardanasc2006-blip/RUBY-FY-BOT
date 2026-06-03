import { makeModel } from '../sqlite.mjs';
export default makeModel('conquistas', {
  jsonFields: ['conquistas', 'badges'],
  dateFields: [],
});
