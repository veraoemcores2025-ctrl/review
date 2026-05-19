create table if not exists public.review_settings (
  id integer primary key default 1 check (id = 1),
  title text not null default 'Clientes usando Verão em Cores',
  kicker text not null default 'Avaliações com foto',
  subtitle text not null default 'Fotos e comentários de quem comprou e aprovou.',
  button_text text not null default 'Ver todas as avaliações',
  button_url text not null default '/m/clientes-usando-verao-em-cores/',
  brand_color text not null default '#b0565b',
  background_color text not null default '#fff7f7',
  header_background_color text not null default '#f4f6f5',
  text_color text not null default '#222222',
  kicker_color text not null default '#b0565b',
  title_color text not null default '#111827',
  subtitle_color text not null default '#4b5563',
  font_family text not null default 'inherit',
  title_font_size integer not null default 28,
  text_font_size integer not null default 15,
  max_reviews integer not null default 8,
  display_mode text not null default 'grid' check (display_mode in ('grid', 'carousel')),
  hide_native_home_reviews boolean not null default false,
  social_proof_enabled boolean not null default true,
  social_proof_home boolean not null default true,
  social_proof_product boolean not null default true,
  social_proof_label text not null default 'Cliente real aprovou',
  social_proof_delay_seconds integer not null default 6,
  social_proof_interval_seconds integer not null default 26,
  conversion_enabled boolean not null default true,
  conversion_home boolean not null default true,
  conversion_product boolean not null default true,
  conversion_checkout boolean not null default false,
  conversion_title text not null default 'Compra segura na Verao em Cores',
  conversion_text text not null default 'Fotos reais, atendimento proximo e pagamento protegido para comprar com confianca.',
  conversion_benefits text not null default 'Compra segura|Fotos reais de clientes|Pagamento protegido|Atendimento no WhatsApp',
  conversion_urgency text not null default 'Oferta por tempo limitado',
  updated_at timestamptz not null default now()
);

alter table public.review_settings
  add column if not exists background_color text not null default '#fff7f7';

alter table public.review_settings
  add column if not exists header_background_color text not null default '#f4f6f5';

alter table public.review_settings
  add column if not exists text_color text not null default '#222222';

alter table public.review_settings
  add column if not exists kicker_color text not null default '#b0565b';

alter table public.review_settings
  add column if not exists title_color text not null default '#111827';

alter table public.review_settings
  add column if not exists subtitle_color text not null default '#4b5563';

alter table public.review_settings
  add column if not exists font_family text not null default 'inherit';

alter table public.review_settings
  add column if not exists title_font_size integer not null default 28;

alter table public.review_settings
  add column if not exists text_font_size integer not null default 15;

alter table public.review_settings
  add column if not exists display_mode text not null default 'grid';

alter table public.review_settings
  add column if not exists social_proof_enabled boolean not null default true;

alter table public.review_settings
  add column if not exists social_proof_home boolean not null default true;

alter table public.review_settings
  add column if not exists social_proof_product boolean not null default true;

alter table public.review_settings
  add column if not exists social_proof_label text not null default 'Cliente real aprovou';

alter table public.review_settings
  add column if not exists social_proof_delay_seconds integer not null default 6;

alter table public.review_settings
  add column if not exists social_proof_interval_seconds integer not null default 26;

alter table public.review_settings
  add column if not exists conversion_enabled boolean not null default true;

alter table public.review_settings
  add column if not exists conversion_home boolean not null default true;

alter table public.review_settings
  add column if not exists conversion_product boolean not null default true;

alter table public.review_settings
  add column if not exists conversion_checkout boolean not null default false;

alter table public.review_settings
  add column if not exists conversion_title text not null default 'Compra segura na Verao em Cores';

alter table public.review_settings
  add column if not exists conversion_text text not null default 'Fotos reais, atendimento proximo e pagamento protegido para comprar com confianca.';

alter table public.review_settings
  add column if not exists conversion_benefits text not null default 'Compra segura|Fotos reais de clientes|Pagamento protegido|Atendimento no WhatsApp';

alter table public.review_settings
  add column if not exists conversion_urgency text not null default 'Oferta por tempo limitado';

alter table public.review_settings
  add column if not exists reward_enabled boolean not null default true;

alter table public.review_settings
  add column if not exists reward_coupon text not null default 'VERAO10';

alter table public.review_settings
  add column if not exists reward_text text not null default 'Obrigado por enviar sua foto ou video. Use o cupom VERAO10 na proxima compra.';

alter table public.review_settings
  add column if not exists qna_enabled boolean not null default true;

alter table public.review_settings
  add column if not exists lookbook_enabled boolean not null default true;

alter table public.review_settings
  add column if not exists video_showcase_enabled boolean not null default true;

alter table public.review_settings
  add column if not exists video_showcase_home boolean not null default true;

alter table public.review_settings
  add column if not exists video_showcase_product boolean not null default true;

alter table public.review_settings
  add column if not exists video_showcase_title text not null default 'Clientes usando em video';

alter table public.review_settings
  add column if not exists video_showcase_subtitle text not null default 'Veja detalhes reais do caimento antes de comprar.';

alter table public.review_settings
  add column if not exists video_showcase_max integer not null default 6;

create table if not exists public.reviews (
  id uuid primary key,
  customer_name text not null,
  product_name text not null,
  product_url text not null default '',
  product_slug text not null default '',
  rating smallint not null default 5 check (rating between 1 and 5),
  comment text not null,
  verified_label text not null default 'cliente verificada',
  image_url text not null,
  active boolean not null default true,
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.reviews
  add column if not exists product_url text not null default '';

alter table public.reviews
  add column if not exists product_slug text not null default '';

alter table public.reviews
  add column if not exists status text not null default 'approved';

create table if not exists public.product_groups (
  id uuid primary key,
  name text not null default '',
  main_slug text not null default '',
  related_slugs text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key,
  product_name text not null default '',
  product_url text not null default '',
  product_slug text not null default '',
  customer_name text not null default '',
  question text not null,
  answer text not null default '',
  status text not null default 'pending' check (status in ('pending', 'answered', 'rejected')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

insert into public.review_settings (id)
values (1)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-photos',
  'review-photos',
  true,
  36700160,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
