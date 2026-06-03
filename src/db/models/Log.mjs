import { makeModel } from '../sqlite.mjs';
export default makeModel('logs', {
  jsonFields: ['dados'],
  dateFields: ['createdAt'],
});
