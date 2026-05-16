import express from 'express';
import multer from 'multer';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4173;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'verao123';
const AUTH_SECRET = process.env.AUTH_SECRET || 'troque-este-segredo-antes-de-hospedar';
const RUNTIME_DIR = process.env.VERCEL ? '/tmp/verao-reviews' : __dirname;
const DATA_DIR = process.env.VERCEL ? path.join(RUNTIME_DIR, 'data') : path.join(__dirname, 'data');
const UPLOAD_DIR = process.env.VERCEL ? path.join(RUNTIME_DIR, 'uploads') : path.join(__dirname, 'public', 'uploads');
const BUNDLED_DB_FILE = path.join(__dirname, 'data', 'reviews.json');
const BUNDLED_UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
const DB_FILE = path.join(DATA_DIR, 'reviews.json');
const DEFAULT_SETTINGS = {
  title: 'Clientes usando Verão em Cores',
  kicker: 'Avaliações com foto',
  subtitle: 'Fotos e comentários de quem comprou e aprovou.',
  buttonText: 'Ver todas as avaliações',
  buttonUrl: '/m/clientes-usando-verao-em-cores/',
  brandColor: '#b0565b',
  maxReviews: 8,
  hideNativeHomeReviews: false
};

await mkdir(DATA_DIR, { recursive: true });
await mkdir(UPLOAD_DIR, { recursive: true });

if (!existsSync(DB_FILE)) {
  const initialDb = process.env.VERCEL && existsSync(BUNDLED_DB_FILE)
    ? await readFile(BUNDLED_DB_FILE, 'utf8')
    : JSON.stringify({ reviews: [], settings: DEFAULT_SETTINGS }, null, 2);
  await writeFile(DB_FILE, initialDb);
} else if (process.env.VERCEL && existsSync(BUNDLED_DB_FILE)) {
  const runtimeDb = JSON.parse(await readFile(DB_FILE, 'utf8'));
  const bundledDb = JSON.parse(await readFile(BUNDLED_DB_FILE, 'utf8'));
  if (!runtimeDb.reviews?.length && bundledDb.reviews?.length) {
    await writeFile(DB_FILE, JSON.stringify(bundledDb, null, 2));
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!file.mimetype.startsWith('image/') && !allowed.includes(ext)) {
      return cb(new Error('Envie apenas imagens.'));
    }
    cb(null, true);
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.use((req, res, next) => {
  if (req.path === '/admin.html' && !isAuthed(req)) return res.redirect('/login.html');
  next();
});
app.get('/widget.js', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'public', 'widget.js'));
});
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/uploads', express.static(BUNDLED_UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public')));

async function readDb() {
  const db = JSON.parse(await readFile(DB_FILE, 'utf8'));
  db.reviews ||= [];
  db.settings = { ...DEFAULT_SETTINGS, ...(db.settings || {}) };
  return db;
}

async function writeDb(db) {
  const tmp = `${DB_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2));
  await rename(tmp, DB_FILE);
}

function publicReview(review, req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = process.env.VERCEL ? 'https' : (forwardedProto || req.protocol);
  const origin = `${proto}://${req.get('host')}`;
  return {
    ...review,
    imageUrl: review.imagePath ? `${origin}${review.imagePath}` : ''
  };
}

function limitText(value, max) {
  return String(value || '').trim().slice(0, max);
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf('=');
        return [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
      })
  );
}

function sign(value) {
  return createHmac('sha256', AUTH_SECRET).update(value).digest('hex');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

function makeSessionToken() {
  const value = `admin.${sign(ADMIN_PASSWORD)}`;
  return `${value}.${sign(value)}`;
}

function isAuthed(req) {
  const token = parseCookies(req).vr_session;
  const expected = makeSessionToken();
  return Boolean(token) && safeEqual(token, expected);
}

function requireAdmin(req, res, next) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Faça login para continuar.' });
  next();
}

function publicSettings(settings) {
  return {
    title: settings.title,
    kicker: settings.kicker,
    subtitle: settings.subtitle,
    buttonText: settings.buttonText,
    buttonUrl: settings.buttonUrl,
    brandColor: settings.brandColor,
    maxReviews: settings.maxReviews,
    hideNativeHomeReviews: settings.hideNativeHomeReviews
  };
}

app.get('/api/admin/session', (req, res) => {
  res.json({ authenticated: isAuthed(req) });
});

app.post('/api/admin/login', (req, res) => {
  if (String(req.body.password || '') !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  res.cookie('vr_session', makeSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    maxAge: 1000 * 60 * 60 * 24 * 7
  });
  res.json({ ok: true });
});

app.post('/api/admin/logout', (_req, res) => {
  res.clearCookie('vr_session');
  res.json({ ok: true });
});

app.get('/api/reviews', async (req, res) => {
  const db = await readDb();
  const reviews = db.reviews
    .filter((review) => review.active)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((review) => publicReview(review, req));
  res.json({ reviews, settings: publicSettings(db.settings) });
});

app.get('/api/admin/reviews', requireAdmin, async (req, res) => {
  const db = await readDb();
  res.json({
    reviews: db.reviews
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((review) => publicReview(review, req))
  });
});

app.get('/api/admin/settings', requireAdmin, async (_req, res) => {
  const db = await readDb();
  res.json({ settings: db.settings });
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  const db = await readDb();
  db.settings = {
    ...db.settings,
    title: String(req.body.title || DEFAULT_SETTINGS.title).trim(),
    kicker: String(req.body.kicker || DEFAULT_SETTINGS.kicker).trim(),
    subtitle: String(req.body.subtitle || DEFAULT_SETTINGS.subtitle).trim(),
    buttonText: String(req.body.buttonText || DEFAULT_SETTINGS.buttonText).trim(),
    buttonUrl: String(req.body.buttonUrl || DEFAULT_SETTINGS.buttonUrl).trim(),
    brandColor: /^#[0-9a-f]{6}$/i.test(String(req.body.brandColor || '')) ? req.body.brandColor : DEFAULT_SETTINGS.brandColor,
    maxReviews: Math.max(1, Math.min(24, Number(req.body.maxReviews || DEFAULT_SETTINGS.maxReviews))),
    hideNativeHomeReviews: Boolean(req.body.hideNativeHomeReviews)
  };
  await writeDb(db);
  res.json({ settings: db.settings });
});

app.post('/api/admin/reviews', requireAdmin, upload.single('photo'), async (req, res) => {
  const db = await readDb();
  const review = {
    id: randomUUID(),
    customerName: limitText(req.body.customerName, 80),
    productName: limitText(req.body.productName, 120),
    rating: Math.max(1, Math.min(5, Number(req.body.rating || 5))),
    comment: limitText(req.body.comment, 500),
    verifiedLabel: limitText(req.body.verifiedLabel || 'cliente verificada', 80),
    imagePath: req.file ? `/uploads/${req.file.filename}` : '',
    active: req.body.active !== 'off',
    createdAt: new Date().toISOString()
  };

  if (!review.customerName || !review.productName || !review.comment || !review.imagePath) {
    return res.status(400).json({ error: 'Preencha nome, produto, comentário e foto.' });
  }

  db.reviews.push(review);
  await writeDb(db);
  res.status(201).json({ review: publicReview(review, req) });
});

app.patch('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
  const db = await readDb();
  const review = db.reviews.find((item) => item.id === req.params.id);
  if (!review) return res.status(404).json({ error: 'Avaliação não encontrada.' });

  if ('active' in req.body) review.active = Boolean(req.body.active);
  if ('customerName' in req.body) review.customerName = limitText(req.body.customerName, 80);
  if ('productName' in req.body) review.productName = limitText(req.body.productName, 120);
  if ('comment' in req.body) review.comment = limitText(req.body.comment, 500);
  if ('rating' in req.body) review.rating = Math.max(1, Math.min(5, Number(req.body.rating)));
  if ('verifiedLabel' in req.body) review.verifiedLabel = limitText(req.body.verifiedLabel, 80);

  await writeDb(db);
  res.json({ review: publicReview(review, req) });
});

app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
  const db = await readDb();
  const before = db.reviews.length;
  db.reviews = db.reviews.filter((item) => item.id !== req.params.id);
  if (db.reviews.length === before) return res.status(404).json({ error: 'Avaliação não encontrada.' });
  await writeDb(db);
  res.status(204).end();
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Verao Reviews rodando em http://localhost:${PORT}`);
  });
}

export default app;
