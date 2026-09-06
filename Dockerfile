# Dockerfile para build correto no DisCloud/builder genérico.
# node:20-slim (em vez de node:20) reduz o download da imagem base
# em ~85% — evita o erro "context deadline exceeded" (timeout) do builder.
FROM node:20-slim

WORKDIR /home/node

# Copia os arquivos ANTES do npm install (ordem que evita o erro
# "ENOENT /home/node/package.json" quando o builder roda npm install antes do COPY).
COPY . .

# Aceita tanto a raiz limpa quanto o zip "Code" do GitHub (que vem com a
# pasta wrapper "RUBY-FY-BOT-main/"). Se houver UMA unica subpasta no topo
# contendo package.json, usa o conteudo dela como raiz.

# Obs.: cp -a "$d/." . inclui dotfiles, então não precisa de shopt -s dotglob
# (o /bin/sh do Debian é dash e não tem shopt).
RUN if [ ! -f package.json ]; then \
        d="$(find . -maxdepth 2 -name package.json -not -path './node_modules/*' | head -n 1 | xargs -r dirname)"; \
        if [ -n "$d" ]; then \
            echo "wrapper detectado ($d): movendo conteudo para a raiz"; \
            cp -a "$d/." .; \
            rm -rf "$d"; \
        fi; \
    fi; \
    test -f package.json || { echo "ERRO: package.json nao encontrado na raiz"; exit 1; }

# instala as dependencias ja com a raiz corretta
RUN npm install --omit=dev

# evita rodar o container como root
RUN chown -R node:node /home/node
USER node

CMD ["node", "src/index.js"]