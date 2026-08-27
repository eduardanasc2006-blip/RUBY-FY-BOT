# Dockerfile para build correto no DisCloud/builder genérico.
# Copia os arquivos ANTES de rodar npm install (ordem que evita o erro
# "ENOENT /home/node/package.json" quando o builder roda npm install antes do COPY).
FROM node:20

WORKDIR /home/node

# 1º copia o código (package.json junto) para depois poder instalar
COPY . .

# 2º instala as dependências
RUN npm install --omit=dev

# evita rodar o container como root
RUN chown -R node:node /home/node
USER node

CMD ["node", "src/index.js"]