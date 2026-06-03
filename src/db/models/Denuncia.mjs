import { makeModel } from '../sqlite.mjs';
export default makeModel('denuncias', {
  jsonFields: [],
  dateFields: ['createdAt'],
});
