import { makeModel } from '../sqlite.mjs';
export default makeModel('configs', {
  jsonFields: ['taxaHistorico', 'levelRoles'],
  dateFields: ['createdAt', 'updatedAt'],
});
