import express from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4173;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'verao123';
const AUTH_SECRET = process.env.AUTH_SECRET || 'troque-este-segredo-antes-de-hospedar';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'review-photos';
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
  backgroundColor: '#fff7f7',
  textColor: '#222222',
  maxReviews: 8,
  displayMode: 'grid',
  hideNativeHomeReviews: false
};
const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  : null;

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
  if (supabase) {
    const [{ data: reviews, error: reviewsError }, { data: settings, error: settingsError }] = await Promise.all([
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      supabase.from('review_settings').select('*').eq('id', 1).maybeSingle()
    ]);

    if (!reviewsError && !settingsError) {
      return {
        reviews: (reviews || []).map(dbReviewToApp),
        settings: { ...DEFAULT_SETTINGS, ...dbSettingsToApp(settings) }
      };
    }

    console.warn('[Verão Reviews] Falha ao ler Supabase, usando arquivo local.', reviewsError || settingsError);
  }

  let db = JSON.parse(await readFile(DB_FILE, 'utf8'));
  if (process.env.VERCEL && !db.reviews?.length && existsSync(BUNDLED_DB_FILE)) {
    const bundledDb = JSON.parse(await readFile(BUNDLED_DB_FILE, 'utf8'));
    if (bundledDb.reviews?.length) {
      db = bundledDb;
      await writeFile(DB_FILE, JSON.stringify(db, null, 2));
    }
  }
  db.reviews ||= [];
  db.settings = { ...DEFAULT_SETTINGS, ...(db.settings || {}) };
  return db;
}

async function writeDb(db) {
  if (supabase) {
    const settings = db.settings || DEFAULT_SETTINGS;
    const { error: settingsError } = await supabase
      .from('review_settings')
      .upsert(appSettingsToDb(settings), { onConflict: 'id' });

    if (settingsError) {
      if (process.env.VERCEL) {
        throw new Error(`Falha ao salvar configurações no Supabase: ${settingsError.message}`);
      }
      console.warn('[Verão Reviews] Falha ao salvar configurações no Supabase, usando arquivo local.', settingsError);
    } else {
      const rows = (db.reviews || []).map(appReviewToDb);
      if (rows.length) {
        const { error: deleteError } = await supabase.from('reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const { error: insertError } = await supabase.from('reviews').insert(rows);
        if (!deleteError && !insertError) return;
        if (process.env.VERCEL) {
          throw new Error(`Falha ao salvar avaliações no Supabase: ${(deleteError || insertError).message}`);
        }
        console.warn('[Verão Reviews] Falha ao salvar avaliações no Supabase, usando arquivo local.', deleteError || insertError);
      } else {
        const { error: deleteError } = await supabase.from('reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (!deleteError) return;
        if (process.env.VERCEL) {
          throw new Error(`Falha ao limpar avaliações no Supabase: ${deleteError.message}`);
        }
        console.warn('[Verão Reviews] Falha ao limpar avaliações no Supabase, usando arquivo local.', deleteError);
      }
    }
  }

  const tmp = `${DB_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2));
  await rename(tmp, DB_FILE);
}

function dbReviewToApp(review) {
  return {
    id: review.id,
    customerName: review.customer_name,
    productName: review.product_name,
    rating: review.rating,
    comment: review.comment,
    verifiedLabel: review.verified_label,
    imagePath: review.image_url,
    active: review.active,
    createdAt: review.created_at
  };
}

function appReviewToDb(review) {
  return {
    id: review.id,
    customer_name: review.customerName,
    product_name: review.productName,
    rating: review.rating,
    comment: review.comment,
    verified_label: review.verifiedLabel,
    image_url: review.imagePath,
    active: review.active,
    created_at: review.createdAt
  };
}

function dbSettingsToApp(settings) {
  if (!settings) return {};
  return {
    title: settings.title,
    kicker: settings.kicker,
    subtitle: settings.subtitle,
    buttonText: settings.button_text,
    buttonUrl: settings.button_url,
    brandColor: settings.brand_color,
    backgroundColor: settings.background_color,
    textColor: settings.text_color,
    maxReviews: settings.max_reviews,
    displayMode: settings.display_mode,
    hideNativeHomeReviews: settings.hide_native_home_reviews
  };
}

function appSettingsToDb(settings) {
  return {
    id: 1,
    title: settings.title,
    kicker: settings.kicker,
    subtitle: settings.subtitle,
    button_text: settings.buttonText,
    button_url: settings.buttonUrl,
    brand_color: settings.brandColor,
    background_color: settings.backgroundColor,
    text_color: settings.textColor,
    max_reviews: settings.maxReviews,
    display_mode: settings.displayMode,
    hide_native_home_reviews: settings.hideNativeHomeReviews
  };
}

function publicReview(review, req) {
  if (/^https?:\/\//i.test(String(review.imagePath || ''))) {
    return { ...review, imageUrl: review.imagePath };
  }

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = process.env.VERCEL ? 'https' : (forwardedProto || req.protocol);
  const origin = `${proto}://${req.get('host')}`;
  return {
    ...review,
    imageUrl: review.imagePath ? `${origin}${review.imagePath}` : ''
  };
}

async function uploadReviewImage(file) {
  if (!file) return '';

  if (!supabase) {
    return `/uploads/${file.filename}`;
  }

  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const storagePath = `reviews/${Date.now()}-${randomUUID()}${ext}`;
  const buffer = await readFile(file.path);
  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    console.warn('[Verão Reviews] Falha ao enviar foto ao Supabase Storage, usando arquivo local.', error);
    return `/uploads/${file.filename}`;
  }

  await unlink(file.path).catch(() => {});

  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
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
    backgroundColor: settings.backgroundColor,
    textColor: settings.textColor,
    maxReviews: settings.maxReviews,
    displayMode: settings.displayMode,
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
    backgroundColor: /^#[0-9a-f]{6}$/i.test(String(req.body.backgroundColor || '')) ? req.body.backgroundColor : DEFAULT_SETTINGS.backgroundColor,
    textColor: /^#[0-9a-f]{6}$/i.test(String(req.body.textColor || '')) ? req.body.textColor : DEFAULT_SETTINGS.textColor,
    maxReviews: Math.max(1, Math.min(24, Number(req.body.maxReviews || DEFAULT_SETTINGS.maxReviews))),
    displayMode: ['grid', 'carousel'].includes(String(req.body.displayMode)) ? req.body.displayMode : DEFAULT_SETTINGS.displayMode,
    hideNativeHomeReviews: Boolean(req.body.hideNativeHomeReviews)
  };
  await writeDb(db);
  res.json({ settings: db.settings });
});

app.post('/api/admin/reviews', requireAdmin, upload.single('photo'), async (req, res) => {
  const db = await readDb();
  const imagePath = await uploadReviewImage(req.file);
  const review = {
    id: randomUUID(),
    customerName: limitText(req.body.customerName, 80),
    productName: limitText(req.body.productName, 120),
    rating: Math.max(1, Math.min(5, Number(req.body.rating || 5))),
    comment: limitText(req.body.comment, 500),
    verifiedLabel: limitText(req.body.verifiedLabel || 'cliente verificada', 80),
    imagePath,
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
