# Serviço de importação do RedijaApp (Railway).
# Node 24 executa TypeScript diretamente (type stripping), então não há etapa de build.
FROM node:24-bookworm-slim

ARG PANDOC_VERSION=3.6.4
ARG TARGETARCH=amd64

# Pandoc oficial (binário estático do release no GitHub)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && curl -fsSL -o /tmp/pandoc.deb \
     "https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-1-${TARGETARCH}.deb" \
  && dpkg -i /tmp/pandoc.deb \
  && rm /tmp/pandoc.deb \
  && apt-get purge -y curl && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/* \
  && pandoc --version | head -1

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
  && npm cache clean --force

COPY src ./src

# Sem root: o processo só escreve em /tmp (pastas temporárias por requisição)
USER node
EXPOSE 8080
CMD ["node", "src/index.ts"]
