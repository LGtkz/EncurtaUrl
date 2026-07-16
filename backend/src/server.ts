import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// Altere esta variável no seu backend para refletir o seu nome personalizado:
const CUSTOM_DOMAIN = 'https://Maria.Eduarda';

const app = express();

// Prisma 7 exige um "driver adapter" para se conectar ao banco.
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db'
});
const prisma = new PrismaClient({ adapter });
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ROTA: Listar todos os links (GET /api/links)
app.get('/api/links', async (req: Request, res: Response) => {
  try {
    const records = await prisma.link.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    // Formata o retorno para bater com o formato esperado pelo seu script HTML
    const formatted = records.map(l => ({
      id: l.id,
      original: l.originalUrl,
      code: l.shortCode,
      short: `Aesthetic/${l.shortCode}`
    }));
    
    return res.json(formatted);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar links.' });
  }
});

// ROTA: Criar encurtador (POST /api/shorten)
app.post('/api/shorten', async (req: Request, res: Response) => {
  try {
    const { original_url, custom_code } = req.body;
    if (!original_url) return res.status(400).json({ error: 'Cole um link para continuar.' });

    const trimmedCode = typeof custom_code === 'string'
      ? custom_code.trim()
      : undefined;

    let code: string | undefined = trimmedCode;

    if (code) {
      if (!/^[a-zA-Z0-9-_]{3,20}$/.test(code)) {
        return res.status(400).json({ error: 'O apelido deve ter de 3 a 20 caracteres.' });
      }
      const existing = await prisma.link.findUnique({ where: { shortCode: code.toLowerCase() } });
      if (existing) return res.status(400).json({ error: 'Esse apelido já está em uso.' });
    } else {
      let isUnique = false;
      while (!isUnique) {
        code = CUSTOM_DOMAIN ;
        const check = await prisma.link.findUnique({ where: { shortCode: code.toLowerCase() } });
        if (!check) isUnique = true;
      }
    }

    const savedCode = code!.toLowerCase();
    let targetUrl = original_url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = `https://${targetUrl}`;

    const newLink = await prisma.link.create({
      data: { originalUrl: targetUrl, shortCode: savedCode }
    });

    return res.status(201).json({
      original: newLink.originalUrl,
      code: newLink.shortCode,
      short: `localhost:${PORT}/${newLink.shortCode}`
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// ROTA: Deletar Link (DELETE /api/shorten/:code)
app.delete('/api/shorten/:code', async (req: Request, res: Response) => {
  try {
    const rawCode = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
    const code = typeof rawCode === 'string' ? rawCode.trim().toLowerCase() : undefined;
    if (!code) return res.status(400).json({ error: 'Código inválido.' });

    await prisma.link.delete({ where: { shortCode: code } });
    return res.sendStatus(200);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao deletar link.' });
  }
});

app.get('/:code', async (req: Request, res: Response) => {
  try {
    const rawCode = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
    const code = typeof rawCode === 'string' ? rawCode.trim().toLowerCase() : undefined;
    if (!code) {
      return res.status(404).send(`
        <div style="font-family:sans-serif; text-align:center; padding-top:100px;">
          <h1>Link não encontrado 💔</h1>
          <p>O código <strong>${rawCode ?? ''}</strong> não existe ou foi apagado.</p>
        </div>
      `);
    }

    // Busca no banco pelo shortCode (garantindo o mesmo padrão de caixa)
    const linkObj = await prisma.link.findUnique({
      where: { shortCode: code }
    });

    // Se o código não existir no banco de dados SQLite
    if (!linkObj) {
      return res.status(404).send(`
        <div style="font-family:sans-serif; text-align:center; padding-top:100px;">
          <h1>Link não encontrado 💔</h1>
          <p>O código <strong>${code}</strong> não existe ou foi apagado.</p>
        </div>
      `);
    }

    // REDIRECIONA PARA O SITE ORIGINAL
    // Importante: garante que a URL tenha http/https para o Express não achar que é uma rota interna
    const urlDestino = linkObj.originalUrl.startsWith('http') 
      ? linkObj.originalUrl 
      : `https://${linkObj.originalUrl}`;

    return res.redirect(urlDestino);
  } catch (error) {
    console.error('Erro no redirecionamento:', error);
    return res.status(500).send('Erro interno ao redirecionar.');
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`));