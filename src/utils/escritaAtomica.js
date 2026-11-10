const fs = require('node:fs');
const path = require('node:path');

// Escreve um arquivo de forma ATÔMICA: grava num .tmp na MESMA pasta e renomeia
// por cima do destino. O rename é atômico no sistema de arquivos, então uma
// queda no meio da gravação (ex: restart da Discloud) nunca deixa o JSON
// truncado/corrompido — o arquivo antigo continua íntegro até o rename.
function escreverAtomico(arquivo, conteudo) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const tmp = `${arquivo}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, conteudo);
  fs.renameSync(tmp, arquivo);
}

module.exports = { escreverAtomico };
