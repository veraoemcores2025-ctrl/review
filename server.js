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
  buttonUrl: '/avaliacoes.html',
  brandColor: '#b0565b',
  backgroundColor: '#fff7f7',
  headerBackgroundColor: '#f4f6f5',
  textColor: '#222222',
  kickerColor: '#b0565b',
  titleColor: '#111827',
  subtitleColor: '#4b5563',
  fontFamily: 'inherit',
  titleFontSize: 28,
  textFontSize: 15,
  maxReviews: 8,
  displayMode: 'grid',
  hideNativeHomeReviews: false,
  socialProofEnabled: true,
  socialProofHome: true,
  socialProofProduct: true,
  socialProofLabel: 'Cliente real aprovou',
  socialProofDelaySeconds: 6,
  socialProofIntervalSeconds: 26,
  conversionEnabled: true,
  conversionHome: true,
  conversionProduct: true,
  conversionCheckout: false,
  conversionTitle: 'Compra segura na Verao em Cores',
  conversionText: 'Fotos reais, atendimento proximo e pagamento protegido para comprar com confianca.',
  conversionBenefits: 'Compra segura|Fotos reais de clientes|Pagamento protegido|Atendimento no WhatsApp',
  conversionUrgency: 'Oferta por tempo limitado',
  rewardEnabled: true,
  rewardCoupon: 'VERAO10',
  rewardText: 'Obrigado por enviar sua foto ou video. Use o cupom VERAO10 na proxima compra.',
  qnaEnabled: true,
  lookbookEnabled: true
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
  limits: { fileSize: 35 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.m4v', '.webm'];
    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/') && !allowed.includes(ext)) {
      return cb(new Error('Envie apenas imagens ou videos.'));
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
    const [
      { data: reviews, error: reviewsError },
      { data: settings, error: settingsError },
      productGroupsResult,
      questionsResult
    ] = await Promise.all([
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      supabase.from('review_settings').select('*').eq('id', 1).maybeSingle(),
      readOptionalTable('product_groups', 'created_at'),
      readOptionalTable('questions', 'created_at')
    ]);

    if (!reviewsError && !settingsError) {
      return {
        reviews: (reviews || []).map(dbReviewToApp),
        settings: { ...DEFAULT_SETTINGS, ...dbSettingsToApp(settings) },
        productGroups: (productGroupsResult.data || []).map(dbGroupToApp),
        questions: (questionsResult.data || []).map(dbQuestionToApp)
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
  db.productGroups ||= [];
  db.questions ||= [];
  db.settings = { ...DEFAULT_SETTINGS, ...(db.settings || {}) };
  return db;
}

async function writeDb(db) {
  if (supabase) {
    const settings = db.settings || DEFAULT_SETTINGS;
    let settingsRow = appSettingsToDb(settings);
    let { error: settingsError } = await supabase
      .from('review_settings')
      .upsert(settingsRow, { onConflict: 'id' });

    if (settingsError && /reward_|qna_|lookbook_/i.test(settingsError.message || '')) {
      settingsRow = appSettingsToDb(settings, { includeOptional: false });
      const retry = await supabase
        .from('review_settings')
        .upsert(settingsRow, { onConflict: 'id' });
      settingsError = retry.error;
    }

    if (settingsError) {
      if (process.env.VERCEL) {
        throw new Error(`Falha ao salvar configurações no Supabase: ${settingsError.message}`);
      }
      console.warn('[Verão Reviews] Falha ao salvar configurações no Supabase, usando arquivo local.', settingsError);
    } else {
      await saveOptionalCollection('product_groups', db.productGroups || [], appGroupToDb);
      await saveOptionalCollection('questions', db.questions || [], appQuestionToDb);

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

async function readOptionalTable(table, orderColumn) {
  if (!supabase) return { data: [], error: null };
  const query = supabase.from(table).select('*');
  const { data, error } = orderColumn
    ? await query.order(orderColumn, { ascending: false })
    : await query;

  if (error) {
    console.warn(`[Verao Reviews] Tabela opcional ${table} indisponivel.`, error.message);
    return { data: [], error };
  }

  return { data: data || [], error: null };
}

async function saveOptionalCollection(table, items, mapper) {
  if (!supabase) return;
  const rows = (items || []).map(mapper);
  const { error: deleteError } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteError) {
    if (/does not exist|schema cache|relation/i.test(deleteError.message || '')) {
      console.warn(`[Verao Reviews] Execute a migracao do Supabase para ativar ${table}.`);
      return;
    }
    if (process.env.VERCEL) {
      throw new Error(`Falha ao salvar ${table} no Supabase: ${deleteError.message}`);
    }
    console.warn(`[Verao Reviews] Falha ao limpar ${table}.`, deleteError.message);
    return;
  }

  if (!rows.length) return;
  const { error: insertError } = await supabase.from(table).insert(rows);
  if (insertError) {
    if (process.env.VERCEL) {
      throw new Error(`Falha ao salvar ${table} no Supabase: ${insertError.message}`);
    }
    console.warn(`[Verao Reviews] Falha ao inserir ${table}.`, insertError.message);
  }
}

function dbReviewToApp(review) {
  return {
    id: review.id,
    customerName: review.customer_name,
    productName: review.product_name,
    productUrl: review.product_url || '',
    productSlug: review.product_slug || makeProductSlug(review.product_url || review.product_name),
    rating: review.rating,
    comment: review.comment,
    verifiedLabel: review.verified_label,
    imagePath: review.image_url,
    mediaType: mediaTypeFromPath(review.image_url),
    active: review.active,
    status: review.status || (review.active ? 'approved' : 'pending'),
    createdAt: review.created_at
  };
}

function appReviewToDb(review) {
  return {
    id: review.id,
    customer_name: review.customerName,
    product_name: review.productName,
    product_url: review.productUrl || '',
    product_slug: review.productSlug || makeProductSlug(review.productUrl || review.productName),
    rating: review.rating,
    comment: review.comment,
    verified_label: review.verifiedLabel,
    image_url: review.imagePath,
    active: review.active,
    status: review.status || (review.active ? 'approved' : 'pending'),
    created_at: review.createdAt
  };
}

function dbGroupToApp(group) {
  return {
    id: group.id,
    name: group.name || '',
    mainSlug: group.main_slug || '',
    relatedSlugs: Array.isArray(group.related_slugs) ? group.related_slugs : [],
    createdAt: group.created_at
  };
}

function appGroupToDb(group) {
  return {
    id: group.id,
    name: group.name || '',
    main_slug: makeProductSlug(group.mainSlug || group.name),
    related_slugs: (group.relatedSlugs || []).map(makeProductSlug).filter(Boolean),
    created_at: group.createdAt || new Date().toISOString()
  };
}

function dbQuestionToApp(question) {
  return {
    id: question.id,
    productName: question.product_name || '',
    productUrl: question.product_url || '',
    productSlug: question.product_slug || makeProductSlug(question.product_url || question.product_name),
    customerName: question.customer_name || '',
    question: question.question || '',
    answer: question.answer || '',
    status: question.status || 'pending',
    active: question.active !== false,
    createdAt: question.created_at,
    answeredAt: question.answered_at || ''
  };
}

function appQuestionToDb(question) {
  return {
    id: question.id,
    product_name: question.productName || '',
    product_url: question.productUrl || '',
    product_slug: makeProductSlug(question.productSlug || question.productUrl || question.productName),
    customer_name: question.customerName || '',
    question: question.question || '',
    answer: question.answer || '',
    status: question.status || 'pending',
    active: question.active !== false,
    created_at: question.createdAt || new Date().toISOString(),
    answered_at: question.answeredAt || null
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
    headerBackgroundColor: settings.header_background_color,
    textColor: settings.text_color,
    kickerColor: settings.kicker_color,
    titleColor: settings.title_color,
    subtitleColor: settings.subtitle_color,
    fontFamily: settings.font_family ?? DEFAULT_SETTINGS.fontFamily,
    titleFontSize: settings.title_font_size ?? DEFAULT_SETTINGS.titleFontSize,
    textFontSize: settings.text_font_size ?? DEFAULT_SETTINGS.textFontSize,
    maxReviews: settings.max_reviews,
    displayMode: settings.display_mode,
    hideNativeHomeReviews: settings.hide_native_home_reviews,
    socialProofEnabled: settings.social_proof_enabled ?? DEFAULT_SETTINGS.socialProofEnabled,
    socialProofHome: settings.social_proof_home ?? DEFAULT_SETTINGS.socialProofHome,
    socialProofProduct: settings.social_proof_product ?? DEFAULT_SETTINGS.socialProofProduct,
    socialProofLabel: settings.social_proof_label ?? DEFAULT_SETTINGS.socialProofLabel,
    socialProofDelaySeconds: settings.social_proof_delay_seconds ?? DEFAULT_SETTINGS.socialProofDelaySeconds,
    socialProofIntervalSeconds: settings.social_proof_interval_seconds ?? DEFAULT_SETTINGS.socialProofIntervalSeconds,
    conversionEnabled: settings.conversion_enabled ?? DEFAULT_SETTINGS.conversionEnabled,
    conversionHome: settings.conversion_home ?? DEFAULT_SETTINGS.conversionHome,
    conversionProduct: settings.conversion_product ?? DEFAULT_SETTINGS.conversionProduct,
    conversionCheckout: settings.conversion_checkout ?? DEFAULT_SETTINGS.conversionCheckout,
    conversionTitle: settings.conversion_title ?? DEFAULT_SETTINGS.conversionTitle,
    conversionText: settings.conversion_text ?? DEFAULT_SETTINGS.conversionText,
    conversionBenefits: settings.conversion_benefits ?? DEFAULT_SETTINGS.conversionBenefits,
    conversionUrgency: settings.conversion_urgency ?? DEFAULT_SETTINGS.conversionUrgency,
    rewardEnabled: settings.reward_enabled ?? DEFAULT_SETTINGS.rewardEnabled,
    rewardCoupon: settings.reward_coupon ?? DEFAULT_SETTINGS.rewardCoupon,
    rewardText: settings.reward_text ?? DEFAULT_SETTINGS.rewardText,
    qnaEnabled: settings.qna_enabled ?? DEFAULT_SETTINGS.qnaEnabled,
    lookbookEnabled: settings.lookbook_enabled ?? DEFAULT_SETTINGS.lookbookEnabled
  };
}

function appSettingsToDb(settings, options = {}) {
  const includeOptional = options.includeOptional !== false;
  const row = {
    id: 1,
    title: settings.title,
    kicker: settings.kicker,
    subtitle: settings.subtitle,
    button_text: settings.buttonText,
    button_url: settings.buttonUrl,
    brand_color: settings.brandColor,
    background_color: settings.backgroundColor,
    header_background_color: settings.headerBackgroundColor,
    text_color: settings.textColor,
    kicker_color: settings.kickerColor,
    title_color: settings.titleColor,
    subtitle_color: settings.subtitleColor,
    font_family: settings.fontFamily,
    title_font_size: settings.titleFontSize,
    text_font_size: settings.textFontSize,
    max_reviews: settings.maxReviews,
    display_mode: settings.displayMode,
    hide_native_home_reviews: settings.hideNativeHomeReviews,
    social_proof_enabled: settings.socialProofEnabled,
    social_proof_home: settings.socialProofHome,
    social_proof_product: settings.socialProofProduct,
    social_proof_label: settings.socialProofLabel,
    social_proof_delay_seconds: settings.socialProofDelaySeconds,
    social_proof_interval_seconds: settings.socialProofIntervalSeconds,
    conversion_enabled: settings.conversionEnabled,
    conversion_home: settings.conversionHome,
    conversion_product: settings.conversionProduct,
    conversion_checkout: settings.conversionCheckout,
    conversion_title: settings.conversionTitle,
    conversion_text: settings.conversionText,
    conversion_benefits: settings.conversionBenefits,
    conversion_urgency: settings.conversionUrgency
  };

  if (includeOptional) {
    row.reward_enabled = settings.rewardEnabled;
    row.reward_coupon = settings.rewardCoupon;
    row.reward_text = settings.rewardText;
    row.qna_enabled = settings.qnaEnabled;
    row.lookbook_enabled = settings.lookbookEnabled;
  }

  return row;
}

function publicReview(review, req) {
  const mediaType = review.mediaType || mediaTypeFromPath(review.imagePath);
  if (/^https?:\/\//i.test(String(review.imagePath || ''))) {
    return { ...review, imageUrl: review.imagePath, mediaUrl: review.imagePath, mediaType };
  }

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = process.env.VERCEL ? 'https' : (forwardedProto || req.protocol);
  const origin = `${proto}://${req.get('host')}`;
  return {
    ...review,
    imageUrl: review.imagePath ? `${origin}${review.imagePath}` : '',
    mediaUrl: review.imagePath ? `${origin}${review.imagePath}` : '',
    mediaType
  };
}

function mediaTypeFromPath(value) {
  const ext = path.extname(String(value || '').split('?')[0]).toLowerCase();
  return ['.mp4', '.mov', '.m4v', '.webm'].includes(ext) ? 'video' : 'image';
}

async function uploadReviewMedia(file) {
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
    console.warn('[Verão Reviews] Falha ao enviar midia ao Supabase Storage, usando arquivo local.', error);
    return `/uploads/${file.filename}`;
  }

  await unlink(file.path).catch(() => {});

  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

function limitText(value, max) {
  return String(value || '').trim().slice(0, max);
}

function makeProductSlug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || '';
}

function groupedProductSlugs(db, productSlug) {
  const target = makeProductSlug(productSlug);
  const groups = db.productGroups || [];
  const group = groups.find((item) => {
    const slugs = [item.mainSlug, ...(item.relatedSlugs || [])].map(makeProductSlug).filter(Boolean);
    return slugs.includes(target);
  });

  if (!group) return new Set([target]);
  return new Set([group.mainSlug, ...(group.relatedSlugs || [])].map(makeProductSlug).filter(Boolean));
}

function parseSlugList(value) {
  return String(value || '')
    .split(/\n|,|\|/)
    .map(makeProductSlug)
    .filter(Boolean);
}

function publicQuestion(question) {
  return {
    id: question.id,
    productName: question.productName,
    productSlug: question.productSlug,
    customerName: question.customerName,
    question: question.question,
    answer: question.answer,
    createdAt: question.createdAt,
    answeredAt: question.answeredAt
  };
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
    headerBackgroundColor: settings.headerBackgroundColor,
    textColor: settings.textColor,
    kickerColor: settings.kickerColor,
    titleColor: settings.titleColor,
    subtitleColor: settings.subtitleColor,
    fontFamily: settings.fontFamily,
    titleFontSize: settings.titleFontSize,
    textFontSize: settings.textFontSize,
    maxReviews: settings.maxReviews,
    displayMode: settings.displayMode,
    hideNativeHomeReviews: settings.hideNativeHomeReviews,
    socialProofEnabled: settings.socialProofEnabled,
    socialProofHome: settings.socialProofHome,
    socialProofProduct: settings.socialProofProduct,
    socialProofLabel: settings.socialProofLabel,
    socialProofDelaySeconds: settings.socialProofDelaySeconds,
    socialProofIntervalSeconds: settings.socialProofIntervalSeconds,
    conversionEnabled: settings.conversionEnabled,
    conversionHome: settings.conversionHome,
    conversionProduct: settings.conversionProduct,
    conversionCheckout: settings.conversionCheckout,
    conversionTitle: settings.conversionTitle,
    conversionText: settings.conversionText,
    conversionBenefits: settings.conversionBenefits,
    conversionUrgency: settings.conversionUrgency,
    rewardEnabled: settings.rewardEnabled,
    rewardCoupon: settings.rewardCoupon,
    rewardText: settings.rewardText,
    qnaEnabled: settings.qnaEnabled,
    lookbookEnabled: settings.lookbookEnabled
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
  const productSlug = makeProductSlug(req.query.productSlug || req.query.productUrl || '');
  const allowedSlugs = productSlug ? groupedProductSlugs(db, productSlug) : null;
  const reviews = db.reviews
    .filter((review) => review.active && (review.status || 'approved') === 'approved')
    .filter((review) => !allowedSlugs || allowedSlugs.has(makeProductSlug(review.productSlug || review.productUrl || review.productName)))
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

app.get('/api/lookbook', async (req, res) => {
  const db = await readDb();
  if (db.settings.lookbookEnabled === false) return res.json({ reviews: [], settings: publicSettings(db.settings) });
  const reviews = db.reviews
    .filter((review) => review.active && (review.status || 'approved') === 'approved' && review.imagePath)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((review) => publicReview(review, req));
  res.json({ reviews, settings: publicSettings(db.settings) });
});

app.get('/api/questions', async (req, res) => {
  const db = await readDb();
  if (db.settings.qnaEnabled === false) return res.json({ questions: [] });
  const productSlug = makeProductSlug(req.query.productSlug || req.query.productUrl || '');
  const allowedSlugs = productSlug ? groupedProductSlugs(db, productSlug) : null;
  const questions = (db.questions || [])
    .filter((question) => question.active && question.status === 'answered' && question.answer)
    .filter((question) => !allowedSlugs || allowedSlugs.has(makeProductSlug(question.productSlug || question.productUrl || question.productName)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(publicQuestion);
  res.json({ questions });
});

app.post('/api/questions', async (req, res) => {
  const db = await readDb();
  if (db.settings.qnaEnabled === false) return res.status(403).json({ error: 'Perguntas estao desativadas.' });
  const productUrl = limitText(req.body.productUrl, 500);
  const question = {
    id: randomUUID(),
    productName: limitText(req.body.productName, 120),
    productUrl,
    productSlug: makeProductSlug(req.body.productSlug || productUrl || req.body.productName),
    customerName: limitText(req.body.customerName || 'Cliente', 80),
    question: limitText(req.body.question, 500),
    answer: '',
    status: 'pending',
    active: true,
    createdAt: new Date().toISOString(),
    answeredAt: ''
  };

  if (!question.productSlug || !question.question) {
    return res.status(400).json({ error: 'Informe produto e pergunta.' });
  }

  db.questions.push(question);
  await writeDb(db);
  res.status(201).json({ ok: true, message: 'Pergunta enviada. Ela aparece na loja depois da resposta.' });
});

app.get('/api/admin/groups', requireAdmin, async (_req, res) => {
  const db = await readDb();
  res.json({ groups: db.productGroups || [] });
});

app.post('/api/admin/groups', requireAdmin, async (req, res) => {
  const db = await readDb();
  const mainSlug = makeProductSlug(req.body.mainSlug || req.body.mainUrl || req.body.name);
  const relatedSlugs = parseSlugList(req.body.relatedSlugs || req.body.relatedUrls)
    .filter((slug) => slug && slug !== mainSlug);
  const group = {
    id: randomUUID(),
    name: limitText(req.body.name || mainSlug, 120),
    mainSlug,
    relatedSlugs: [...new Set(relatedSlugs)],
    createdAt: new Date().toISOString()
  };

  if (!group.mainSlug || !group.relatedSlugs.length) {
    return res.status(400).json({ error: 'Informe o produto principal e pelo menos um produto relacionado.' });
  }

  db.productGroups = (db.productGroups || []).filter((item) => item.id !== group.id);
  db.productGroups.push(group);
  await writeDb(db);
  res.status(201).json({ group });
});

app.patch('/api/admin/groups/:id', requireAdmin, async (req, res) => {
  const db = await readDb();
  const group = (db.productGroups || []).find((item) => item.id === req.params.id);
  if (!group) return res.status(404).json({ error: 'Grupo nao encontrado.' });
  if ('name' in req.body) group.name = limitText(req.body.name, 120);
  if ('mainSlug' in req.body || 'mainUrl' in req.body) group.mainSlug = makeProductSlug(req.body.mainSlug || req.body.mainUrl);
  if ('relatedSlugs' in req.body || 'relatedUrls' in req.body) {
    group.relatedSlugs = [...new Set(parseSlugList(req.body.relatedSlugs || req.body.relatedUrls).filter((slug) => slug !== group.mainSlug))];
  }
  await writeDb(db);
  res.json({ group });
});

app.delete('/api/admin/groups/:id', requireAdmin, async (req, res) => {
  const db = await readDb();
  const before = (db.productGroups || []).length;
  db.productGroups = (db.productGroups || []).filter((item) => item.id !== req.params.id);
  if (db.productGroups.length === before) return res.status(404).json({ error: 'Grupo nao encontrado.' });
  await writeDb(db);
  res.status(204).end();
});

app.get('/api/admin/questions', requireAdmin, async (_req, res) => {
  const db = await readDb();
  res.json({ questions: db.questions || [] });
});

app.patch('/api/admin/questions/:id', requireAdmin, async (req, res) => {
  const db = await readDb();
  const question = (db.questions || []).find((item) => item.id === req.params.id);
  if (!question) return res.status(404).json({ error: 'Pergunta nao encontrada.' });
  if ('answer' in req.body) {
    question.answer = limitText(req.body.answer, 700);
    question.status = question.answer ? 'answered' : 'pending';
    question.answeredAt = question.answer ? new Date().toISOString() : '';
  }
  if ('status' in req.body && ['pending', 'answered', 'rejected'].includes(String(req.body.status))) {
    question.status = String(req.body.status);
    question.active = question.status !== 'rejected';
  }
  if ('active' in req.body) question.active = Boolean(req.body.active);
  await writeDb(db);
  res.json({ question });
});

app.delete('/api/admin/questions/:id', requireAdmin, async (req, res) => {
  const db = await readDb();
  const before = (db.questions || []).length;
  db.questions = (db.questions || []).filter((item) => item.id !== req.params.id);
  if (db.questions.length === before) return res.status(404).json({ error: 'Pergunta nao encontrada.' });
  await writeDb(db);
  res.status(204).end();
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
    headerBackgroundColor: /^#[0-9a-f]{6}$/i.test(String(req.body.headerBackgroundColor || '')) ? req.body.headerBackgroundColor : DEFAULT_SETTINGS.headerBackgroundColor,
    textColor: /^#[0-9a-f]{6}$/i.test(String(req.body.textColor || '')) ? req.body.textColor : DEFAULT_SETTINGS.textColor,
    kickerColor: /^#[0-9a-f]{6}$/i.test(String(req.body.kickerColor || '')) ? req.body.kickerColor : DEFAULT_SETTINGS.kickerColor,
    titleColor: /^#[0-9a-f]{6}$/i.test(String(req.body.titleColor || '')) ? req.body.titleColor : DEFAULT_SETTINGS.titleColor,
    subtitleColor: /^#[0-9a-f]{6}$/i.test(String(req.body.subtitleColor || '')) ? req.body.subtitleColor : DEFAULT_SETTINGS.subtitleColor,
    fontFamily: ['inherit', 'Arial', 'Georgia', 'Montserrat', 'Poppins', 'Playfair Display'].includes(String(req.body.fontFamily)) ? req.body.fontFamily : DEFAULT_SETTINGS.fontFamily,
    titleFontSize: Math.max(20, Math.min(44, Number(req.body.titleFontSize || DEFAULT_SETTINGS.titleFontSize))),
    textFontSize: Math.max(12, Math.min(22, Number(req.body.textFontSize || DEFAULT_SETTINGS.textFontSize))),
    maxReviews: Math.max(1, Math.min(24, Number(req.body.maxReviews || DEFAULT_SETTINGS.maxReviews))),
    displayMode: ['grid', 'carousel'].includes(String(req.body.displayMode)) ? req.body.displayMode : DEFAULT_SETTINGS.displayMode,
    hideNativeHomeReviews: Boolean(req.body.hideNativeHomeReviews),
    socialProofEnabled: Boolean(req.body.socialProofEnabled),
    socialProofHome: Boolean(req.body.socialProofHome),
    socialProofProduct: Boolean(req.body.socialProofProduct),
    socialProofLabel: limitText(req.body.socialProofLabel || DEFAULT_SETTINGS.socialProofLabel, 60),
    socialProofDelaySeconds: Math.max(2, Math.min(60, Number(req.body.socialProofDelaySeconds || DEFAULT_SETTINGS.socialProofDelaySeconds))),
    socialProofIntervalSeconds: Math.max(10, Math.min(180, Number(req.body.socialProofIntervalSeconds || DEFAULT_SETTINGS.socialProofIntervalSeconds))),
    conversionEnabled: Boolean(req.body.conversionEnabled),
    conversionHome: Boolean(req.body.conversionHome),
    conversionProduct: Boolean(req.body.conversionProduct),
    conversionCheckout: Boolean(req.body.conversionCheckout),
    conversionTitle: limitText(req.body.conversionTitle || DEFAULT_SETTINGS.conversionTitle, 90),
    conversionText: limitText(req.body.conversionText || DEFAULT_SETTINGS.conversionText, 180),
    conversionBenefits: limitText(req.body.conversionBenefits || DEFAULT_SETTINGS.conversionBenefits, 320),
    conversionUrgency: limitText(req.body.conversionUrgency || DEFAULT_SETTINGS.conversionUrgency, 80),
    rewardEnabled: Boolean(req.body.rewardEnabled),
    rewardCoupon: limitText(req.body.rewardCoupon || DEFAULT_SETTINGS.rewardCoupon, 40),
    rewardText: limitText(req.body.rewardText || DEFAULT_SETTINGS.rewardText, 220),
    qnaEnabled: Boolean(req.body.qnaEnabled),
    lookbookEnabled: Boolean(req.body.lookbookEnabled)
  };
  await writeDb(db);
  res.json({ settings: db.settings });
});

app.post('/api/admin/reviews', requireAdmin, upload.single('photo'), async (req, res) => {
  const db = await readDb();
  const imagePath = await uploadReviewMedia(req.file);
  const productUrl = limitText(req.body.productUrl, 500);
  const review = {
    id: randomUUID(),
    customerName: limitText(req.body.customerName, 80),
    productName: limitText(req.body.productName, 120),
    productUrl,
    productSlug: makeProductSlug(productUrl || req.body.productName),
    rating: Math.max(1, Math.min(5, Number(req.body.rating || 5))),
    comment: limitText(req.body.comment, 500),
    verifiedLabel: limitText(req.body.verifiedLabel || 'cliente verificada', 80),
    imagePath,
    mediaType: req.file?.mimetype?.startsWith('video/') ? 'video' : mediaTypeFromPath(imagePath),
    active: req.body.active !== 'off',
    status: req.body.active === 'off' ? 'pending' : 'approved',
    createdAt: new Date().toISOString()
  };

  if (!review.customerName || !review.productName || !review.comment || !review.imagePath) {
    return res.status(400).json({ error: 'Preencha nome, produto, comentario e foto ou video.' });
  }

  db.reviews.push(review);
  await writeDb(db);
  res.status(201).json({ review: publicReview(review, req) });
});

app.post('/api/reviews/submit', upload.single('photo'), async (req, res) => {
  const db = await readDb();
  const imagePath = await uploadReviewMedia(req.file);
  const productUrl = limitText(req.body.productUrl, 500);
  const review = {
    id: randomUUID(),
    customerName: limitText(req.body.customerName, 80),
    productName: limitText(req.body.productName, 120),
    productUrl,
    productSlug: makeProductSlug(productUrl || req.body.productSlug || req.body.productName),
    rating: Math.max(1, Math.min(5, Number(req.body.rating || 5))),
    comment: limitText(req.body.comment, 500),
    verifiedLabel: 'compra a validar',
    imagePath,
    mediaType: req.file?.mimetype?.startsWith('video/') ? 'video' : mediaTypeFromPath(imagePath),
    active: false,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  if (!review.customerName || !review.productName || !review.comment || !review.imagePath) {
    return res.status(400).json({ error: 'Preencha nome, produto, comentario e foto ou video.' });
  }

  db.reviews.push(review);
  await writeDb(db);
  const reward = db.settings.rewardEnabled !== false
    ? {
      coupon: db.settings.rewardCoupon || DEFAULT_SETTINGS.rewardCoupon,
      text: db.settings.rewardText || DEFAULT_SETTINGS.rewardText
    }
    : null;
  res.status(201).json({ ok: true, message: 'Avaliação enviada para aprovação.', reward });
});

app.patch('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
  const db = await readDb();
  const review = db.reviews.find((item) => item.id === req.params.id);
  if (!review) return res.status(404).json({ error: 'Avaliação não encontrada.' });

  if ('active' in req.body) review.active = Boolean(req.body.active);
  if ('status' in req.body && ['pending', 'approved', 'rejected'].includes(String(req.body.status))) {
    review.status = String(req.body.status);
    review.active = review.status === 'approved';
    if (review.status === 'approved' && (!review.verifiedLabel || review.verifiedLabel === 'compra a validar')) {
      review.verifiedLabel = 'compra verificada';
    }
  }
  if ('customerName' in req.body) review.customerName = limitText(req.body.customerName, 80);
  if ('productName' in req.body) review.productName = limitText(req.body.productName, 120);
  if ('productUrl' in req.body) {
    review.productUrl = limitText(req.body.productUrl, 500);
    review.productSlug = makeProductSlug(review.productUrl || review.productName);
  }
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
