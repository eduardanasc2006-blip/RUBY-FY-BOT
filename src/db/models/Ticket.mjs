import { makeModel } from '../sqlite.mjs';
export default makeModel('tickets', {
  jsonFields: ['transcript'],
  dateFields: ['createdAt'],
});
