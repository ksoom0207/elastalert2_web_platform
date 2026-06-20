FROM node:20-slim

# docker CLI is needed so the backend can exec elastalert-test-rule inside the
# ElastAlert2 container for the real-data dry-run "test alarm".
# openssl + ca-certificates are required by the Prisma query/schema engines.
RUN apt-get update \
  && apt-get install -y --no-install-recommends docker.io openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src

EXPOSE 4000
# Sync schema to the DB then start. (For dev convenience; in prod use
# `prisma migrate deploy` with committed migrations instead of db push.)
CMD ["sh", "-c", "npx prisma db push --skip-generate && node src/index.js"]
