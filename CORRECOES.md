# Encurta — Correções aplicadas

## Causa do erro de conexão

O projeto usa **Prisma 7**, que mudou a forma como o `PrismaClient` se conecta
ao banco: agora é **obrigatório** passar um "driver adapter" (não basta mais
só a `DATABASE_URL`). Como isso não estava configurado, toda inicialização do
servidor quebrava antes mesmo de subir.

## O que foi corrigido

1. **`backend/prisma/schema.prisma`** — faltava `url = env("DATABASE_URL")`
   no bloco `datasource`.
2. **`backend/.env`** — `DATABASE_URL` apontava para `file:./dev.db`
   (caminho errado); corrigido para `file:./prisma/dev.db`, que é onde o
   arquivo do banco realmente está.
3. **`backend/src/server.ts`**:
   - Faltava `import "dotenv/config"` — as variáveis do `.env` nunca eram
     carregadas.
   - `new PrismaClient()` sem nenhuma configuração não funciona no Prisma 7.
     Agora ele é criado com o driver adapter `@prisma/adapter-better-sqlite3`,
     que é o exigido para SQLite nessa versão.
4. **`backend/package.json`**:
   - Faltavam os scripts `dev`/`start` para rodar o servidor.
   - Faltava o pacote `prisma` (CLI) como devDependency.
   - Adicionadas as dependências `@prisma/adapter-better-sqlite3` e
     `better-sqlite3` (+ `@types/better-sqlite3`), exigidas pelo Prisma 7.

## Como rodar

```bash
cd backend
npm install
npm run start      # ou: npm run dev (reinicia sozinho ao salvar)
```

O servidor sobe em `http://localhost:3000`.

Depois, abra o `index.html` (na raiz do projeto) diretamente no navegador —
ele já está configurado para chamar `http://localhost:3000/api`.

## Testado e validado

Todas as rotas foram testadas manualmente e estão funcionando:
- `GET /api/links` — lista os links salvos
- `POST /api/shorten` — cria um link (com ou sem apelido personalizado)
- `DELETE /api/shorten/:code` — remove um link
- `GET /:code` — redireciona (301) para a URL original e soma 1 clique

## Se precisar recriar o banco do zero

```bash
cd backend
npx prisma migrate dev
```
