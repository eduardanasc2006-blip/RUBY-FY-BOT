import { makeModel } from '../sqlite.mjs';

export default makeModel('xp_logs', {
  jsonFields: [],
  dateFields: ['createdAt'],
});
