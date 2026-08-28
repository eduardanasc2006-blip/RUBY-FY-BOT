# Dockerfile para build correto no DisCloud/builder genérico.
# Copia os arquivos ANTES de rodar npm install (ordem que evita o erro
# "ENOENT /home/node/package.json" quando o builder roda npm install antes do COPY).
FROM node:20

WORKDIR /home/node

# Aceita tanto a raiz limpa quanto o zip "Code" do GitHub (que vem com a
# pasta wrapper "RUBY-FY-BOT-main/"). Se houver UMA unica subpasta no topo
# contendo package.json, trata-a como raiz do projeto.
COPY . .

# Se o upload veio com a pasta wrapper (ex.: "RUBY-FY-BOT-main"), usa o
# conteudo dela como raiz; caso contrario, usa o diretorio ja copiado.

RUN if [ ! -f package.json ]; then \
        d="$(find . -maxdepth 2 -name package.json -not -path './node_modules/*' | head -n 1 | xargs dirname)"; \
        echo "wrapper detectado ($d): movendo conteudo para a raiz"; \
        shopt -s dotglob; \
        cp -a "$d/." .; \
        rm -rf "$d"; \
    fi; \
    test -f package.json || { echo "ERRO: package.json nao encontrado na raiz"; exit 1; }

# instala as dependencias ja com a raiz corretta
RUN npm install --omit=dev

# evita rodar o container como root
RUN chown -R node:node /home/node
USER node

CMD ["node", "src/index.js"]