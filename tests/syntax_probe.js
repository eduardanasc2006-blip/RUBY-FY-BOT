const canalA = { id: 'a' };
const canalB = { id: 'b' };
const message = {
  guild: null,
  member: null,
  author: { id: 'x' },
  content: '',
  channel: canalA,
  reply: (p) => {},
  delete: () => {},
};
console.log('ok', Object.keys(message));
