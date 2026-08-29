// Testa o menu de ajuda em contexto DM (sem guild):
// - público vê apenas Conversor/Estoque na home
// - admin vê também Administração/Comandos/Painel
const { buildAjuda } = require('../src/utils/ajudaPanel');

let falhas = 0;

function checa(nome, cond) {
  if (!cond) {
    console.error('❌', nome);
    falhas++;
  } else {
    console.log('✅', nome);
  }
}

// DM com usuário comum(sem ADMIN_IDS e sem member)
const dm = buildAjuda('inicio', false);
const botoesDm = dm.components.flatMap((r) => r.components.map((b) => b.data.custom_id));
checa('DM home tem Conversor', botoesDm.includes('ajuda:cat:conversor'));
checa('DM home tem Estoque', botoesDm.includes('ajuda:cat:estoque'));
checa('DM home NAO mostra Administracao', !botoesDm.includes('ajuda:cat:admin'));
checa('DM home NAO mostra Comandos', !botoesDm.includes('ajuda:cat:personalizados'));
checa('DM home NAO mostra Painel', !botoesDm.includes('ajuda:cat:painel'));

// Admin (com ADMIN_IDS no env) vê tudo
const admin = buildAjuda('inicio', true);
const botoesAdmin = admin.components.flatMap((r) => r.components.map((b) => b.data.custom_id));
checa('Admin home mostra Administracao', botoesAdmin.includes('ajuda:cat:admin'));
checa('Admin home mostra Comandos', botoesAdmin.includes('ajuda:cat:personalizados'));
checa('Admin home mostra Painel', botoesAdmin.includes('ajuda:cat:painel'));

// Navegação: público só navega entre as públicas
const navP = buildAjuda('conversor', false).components.find((r) => r.components.some((b) => b.data.custom_id.startsWith('ajuda:nav:')));
const idsNavP = navP.components.map((b) => b.data.custom_id);
checa('Nav publica prev para estoque', idsNavP.includes('ajuda:nav:prev:estoque'));
checa('Nav publica next para estoque', idsNavP.includes('ajuda:nav:next:estoque'));

// Admin navega por todas categorias
const navA = buildAjuda('conversor', true).components.find((r) => r.components.some((b) => b.data.custom_id.startsWith('ajuda:nav:')));
const idsNavA = navA.components.map((b) => b.data.custom_id);
checa('Nav admin prev para admin', idsNavA.includes('ajuda:nav:prev:admin'));

if (falhas > 0) {
  console.error(`\n${falhas} falha(s) no menu de ajuda DM`);
  process.exit(1);
}
console.log('\nTestes de ajuda (DM) OK');