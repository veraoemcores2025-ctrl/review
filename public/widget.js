(function () {
  const currentScript = document.currentScript;
  const baseUrl = currentScript ? new URL(currentScript.src).origin : window.location.origin;
  const mountId = 'verao-reviews-widget';
  const safeMountId = 'verao-reviews-widget-safe';
  const existingStyleId = 'verao-reviews-widget-style';
  const defaultSettings = {
    title: 'Clientes usando Ver\u00e3o em Cores',
    kicker: 'Avalia\u00e7\u00f5es com foto',
    subtitle: 'Fotos e coment\u00e1rios de quem comprou e aprovou.',
    buttonText: 'Ver todas as avalia\u00e7\u00f5es',
    buttonUrl: '/m/clientes-usando-verao-em-cores/',
    brandColor: '#b0565b',
    backgroundColor: '#fff7f7',
    headerBackgroundColor: '#f4f6f5',
    textColor: '#222222',
    kickerColor: '#b0565b',
    titleColor: '#111827',
    subtitleColor: '#4b5563',
    maxReviews: 8,
    displayMode: 'grid',
    hideNativeHomeReviews: false
  };

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function stars(rating) {
    const count = Math.max(1, Math.min(5, Number(rating || 5)));
    return '\u2605\u2605\u2605\u2605\u2605'.slice(0, count) + '\u2606\u2606\u2606\u2606\u2606'.slice(0, 5 - count);
  }

  function averageRating(reviews) {
    if (!reviews.length) return 0;
    return reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length;
  }

  function productSlugFromUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.pathname.replace(/\/$/, '').split('/').filter(Boolean).pop() || '';
    } catch {
      return '';
    }
  }

  function getProductContext() {
    const slug = productSlugFromUrl(window.location.href);
    const isHome = ['/', '', '/index.php'].includes(window.location.pathname);
    const hasProductSignal = document.querySelector('#produto, [itemtype*="schema.org/Product"], .nome_produto');
    if (!slug || isHome || !hasProductSignal) return null;

    const name = document.querySelector('.nome_produto')?.textContent?.trim()
      || window.nome_produto
      || document.querySelector('h1')?.textContent?.trim()
      || document.querySelector('[itemprop="name"]')?.textContent?.trim()
      || document.title.replace(/\s*\|.*$/, '').trim()
      || slug.replaceAll('-', ' ');

    return { slug, name, url: window.location.href.split('#')[0] };
  }

  function ensureStyle() {
    if (document.getElementById(existingStyleId)) return;
    const style = document.createElement('style');
    style.id = existingStyleId;
    style.textContent = `
      .vr-widget {
        --vr-brand: #b0565b;
        --vr-text: #222;
        --vr-muted: #666;
        --vr-line: #f0dddd;
        --vr-bg: #fff7f7;
        --vr-head-bg: #f4f6f5;
        --vr-kicker: #b0565b;
        --vr-title: #111827;
        --vr-subtitle: #4b5563;
        font-family: inherit;
        background: var(--vr-bg);
        clear: both !important;
        display: block !important;
        float: none !important;
        isolation: isolate;
        margin: 56px 0 0 !important;
        opacity: 1 !important;
        padding: 48px 14px;
        position: static !important;
        transform: none !important;
        visibility: visible !important;
        width: 100% !important;
        z-index: auto !important;
      }

      .vr-widget,
      .vr-widget * {
        box-sizing: border-box !important;
      }

      #verao-reviews-widget,
      #verao-reviews-widget-safe {
        clear: both !important;
        display: block !important;
        float: none !important;
        margin: 0 !important;
        opacity: 1 !important;
        position: static !important;
        transform: none !important;
        visibility: visible !important;
        width: 100% !important;
        z-index: auto !important;
      }

      #verao-reviews-widget:empty {
        display: none !important;
      }

      .vr-widget__inner {
        clear: both !important;
        display: block !important;
        float: none !important;
        margin: 0 auto;
        max-width: 1180px;
        position: static !important;
        width: 100% !important;
      }

      .vr-widget__head {
        background: var(--vr-head-bg);
        clear: both !important;
        display: block !important;
        float: none !important;
        margin: 0 auto 32px;
        max-width: 950px;
        opacity: 1 !important;
        padding: 8px 18px;
        position: static !important;
        text-align: center;
        top: auto !important;
        transform: none !important;
        visibility: visible !important;
        width: 100% !important;
        z-index: auto !important;
      }

      .vr-widget__kicker {
        color: var(--vr-kicker);
        display: block;
        font-size: 13px;
        font-weight: 800;
        margin-bottom: 8px;
        position: static !important;
        top: auto !important;
        transform: none !important;
        text-transform: uppercase;
      }

      .vr-widget h2 {
        color: var(--vr-title);
        font-size: 28px;
        font-weight: 800;
        line-height: 1.2;
        margin: 0;
        position: static !important;
        top: auto !important;
        transform: none !important;
      }

      .vr-widget__subtitle {
        color: var(--vr-subtitle);
        font-size: 15px;
        margin: 10px 0 0;
        position: static !important;
        top: auto !important;
        transform: none !important;
      }

      .vr-proof {
        align-items: center;
        background: #fff;
        border: 1px solid var(--vr-line);
        border-radius: 14px;
        box-shadow: 0 10px 24px rgba(176, 86, 91, .08);
        display: grid;
        gap: 14px;
        grid-template-columns: auto 1fr;
        margin: 0 auto 24px;
        max-width: 760px;
        padding: 14px;
      }

      .vr-proof__score {
        align-items: center;
        background: var(--vr-brand);
        border-radius: 12px;
        color: #fff;
        display: grid;
        font-size: 12px;
        font-weight: 800;
        height: 72px;
        justify-items: center;
        line-height: 1;
        width: 72px;
      }

      .vr-proof__score strong {
        font-size: 26px;
      }

      .vr-proof__title {
        color: var(--vr-title);
        font-size: 16px;
        font-weight: 800;
        margin: 0 0 4px;
      }

      .vr-proof__text {
        color: var(--vr-subtitle);
        font-size: 13px;
        line-height: 1.45;
        margin: 0;
      }

      .vr-proof__photos,
      .vr-gallery {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .vr-proof__photos {
        margin-top: 10px;
      }

      .vr-proof__photos img,
      .vr-gallery__button img {
        aspect-ratio: 1;
        border-radius: 999px;
        display: block;
        object-fit: cover;
        width: 42px;
      }

      .vr-gallery-wrap {
        margin: 0 auto 24px;
        max-width: 950px;
        text-align: center;
      }

      .vr-gallery-wrap h3 {
        color: var(--vr-title);
        font-size: 18px;
        margin: 0 0 12px;
      }

      .vr-gallery {
        justify-content: center;
      }

      .vr-gallery__button {
        background: none;
        border: 0;
        cursor: pointer;
        padding: 0;
      }

      .vr-gallery__button img {
        border: 2px solid #fff;
        box-shadow: 0 6px 16px rgba(17, 24, 39, .12);
        width: 58px;
      }

      .vr-widget__grid {
        clear: both !important;
        display: grid !important;
        float: none !important;
        gap: 18px;
        grid-template-columns: repeat(auto-fit, minmax(230px, 282px));
        justify-content: center !important;
        margin: 0 auto !important;
        max-width: 1180px !important;
        position: static !important;
        width: 100% !important;
      }

      .vr-widget[data-mode="carousel"] .vr-widget__grid {
        display: flex !important;
        gap: 16px;
        justify-content: flex-start !important;
        max-width: 100% !important;
        overflow-x: auto;
        overscroll-behavior-x: contain;
        padding: 4px 2px 14px;
        scroll-behavior: smooth;
        scroll-snap-type: x mandatory;
        scrollbar-width: thin;
      }

      .vr-widget[data-mode="carousel"] .vr-card {
        flex: 0 0 min(282px, 82vw);
        scroll-snap-align: start;
      }

      .vr-widget__controls {
        display: none;
        gap: 10px;
        justify-content: center;
        margin: 18px 0 0;
      }

      .vr-widget[data-mode="carousel"] .vr-widget__controls {
        display: flex;
      }

      .vr-widget__nav {
        align-items: center;
        background: #fff;
        border: 1px solid var(--vr-line);
        border-radius: 999px;
        color: var(--vr-brand);
        cursor: pointer;
        display: inline-flex;
        font-size: 22px;
        font-weight: 800;
        height: 42px;
        justify-content: center;
        line-height: 1;
        width: 42px;
      }

      .vr-card {
        background: #fff;
        border: 1px solid var(--vr-line);
        border-radius: 14px;
        box-shadow: 0 8px 20px rgba(176, 86, 91, .055);
        float: none !important;
        max-width: 282px !important;
        min-width: 0 !important;
        overflow: hidden;
        position: static !important;
        width: 100% !important;
      }

      .vr-card__image {
        aspect-ratio: 1 / 1.16;
        background: #f6eeee;
        display: block;
        object-fit: cover;
        width: 100%;
      }

      .vr-card__body {
        padding: 15px;
      }

      .vr-card__stars {
        color: #ffc400;
        font-size: 18px;
        letter-spacing: 1px;
        margin-bottom: 8px;
      }

      .vr-card__comment {
        color: #333;
        display: -webkit-box;
        font-size: 13px;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
        line-height: 1.5;
        margin: 0 0 12px;
        overflow: hidden;
      }

      .vr-card__product {
        color: var(--vr-brand);
        display: -webkit-box;
        font-size: 12px;
        font-weight: 800;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        margin-bottom: 6px;
        overflow: hidden;
      }

      .vr-card__customer {
        color: var(--vr-muted);
        font-size: 12px;
      }

      .vr-widget__button {
        background: var(--vr-brand);
        border-radius: 999px;
        color: #fff !important;
        display: block;
        font-size: 14px;
        font-weight: 800;
        margin: 26px auto 0;
        padding: 12px 24px;
        text-align: center;
        text-decoration: none !important;
        width: fit-content;
      }

      .vr-widget__empty {
        color: var(--vr-subtitle);
        font-size: 14px;
        margin: 0 auto;
        max-width: 620px;
        text-align: center;
      }

      .vr-widget__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        justify-content: center;
        margin-top: 24px;
      }

      .vr-widget__button--ghost {
        background: #fff;
        border: 1px solid var(--vr-line);
        color: var(--vr-brand) !important;
      }

      .vr-product-proof {
        background: #fff;
        border: 1px solid #f0dddd;
        border-radius: 12px;
        box-shadow: 0 10px 28px rgba(176, 86, 91, .10);
        clear: both;
        display: grid;
        gap: 10px;
        margin: 14px 0;
        max-width: 420px;
        padding: 14px;
      }

      .vr-product-proof__top {
        align-items: center;
        display: flex;
        gap: 10px;
      }

      .vr-product-proof__stars {
        color: #ffc400;
        font-size: 16px;
        letter-spacing: 1px;
        white-space: nowrap;
      }

      .vr-product-proof__title {
        color: #222;
        font-size: 13px;
        font-weight: 800;
        line-height: 1.35;
      }

      .vr-product-proof__text {
        color: #666;
        font-size: 12px;
        line-height: 1.45;
        margin: 0;
      }

      .vr-product-proof__photos {
        display: flex;
        gap: 7px;
      }

      .vr-product-proof__photos button {
        background: none;
        border: 0;
        cursor: pointer;
        padding: 0;
      }

      .vr-product-proof__photos img {
        aspect-ratio: 1;
        border-radius: 999px;
        object-fit: cover;
        width: 38px;
      }

      .vr-product-proof__link {
        color: var(--vr-brand, #b0565b) !important;
        cursor: pointer;
        font-size: 12px;
        font-weight: 800;
        text-decoration: none !important;
      }

      .vr-lightbox {
        align-items: center;
        background: rgba(17, 24, 39, .82);
        display: flex;
        inset: 0;
        justify-content: center;
        padding: 18px;
        position: fixed;
        z-index: 2147483647;
      }

      .vr-lightbox[hidden] {
        display: none;
      }

      .vr-lightbox__dialog {
        background: #fff;
        border-radius: 14px;
        max-width: min(920px, 100%);
        overflow: hidden;
        position: relative;
        width: 100%;
      }

      .vr-lightbox__close {
        background: #fff;
        border: 0;
        border-radius: 999px;
        color: #222;
        cursor: pointer;
        font-size: 22px;
        height: 38px;
        line-height: 1;
        position: absolute;
        right: 12px;
        top: 12px;
        width: 38px;
        z-index: 2;
      }

      .vr-lightbox__body {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(280px, .75fr);
      }

      .vr-lightbox__image {
        aspect-ratio: 1;
        background: #f6eeee;
        height: 100%;
        object-fit: cover;
        width: 100%;
      }

      .vr-lightbox__copy {
        display: grid;
        align-content: center;
        gap: 10px;
        padding: 28px;
      }

      .vr-lightbox__stars {
        color: #ffc400;
        font-size: 20px;
        letter-spacing: 1px;
      }

      .vr-lightbox__product {
        color: var(--vr-brand, #b0565b);
        font-weight: 800;
      }

      .vr-lightbox__comment {
        color: #333;
        font-size: 15px;
        line-height: 1.55;
        margin: 0;
      }

      @media (max-width: 900px) {
        .vr-widget__grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .vr-lightbox__body {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 640px) {
        .vr-widget {
          padding: 38px 12px;
        }

        .vr-widget h2 {
          font-size: 23px;
        }

        .vr-widget__grid {
          grid-template-columns: minmax(0, min(100%, 300px));
        }

        .vr-widget[data-mode="carousel"] .vr-widget__grid {
          grid-template-columns: none;
        }

        .vr-card {
          max-width: 300px !important;
        }

        .vr-proof {
          grid-template-columns: 1fr;
          text-align: center;
        }

        .vr-proof__score {
          margin: 0 auto;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function removeLegacyMounts() {
    document.querySelectorAll(`#${mountId}`).forEach((item) => item.remove());
  }

  function createMount(settings = defaultSettings) {
    removeLegacyMounts();
    let mount = document.getElementById(safeMountId);

    if (mount) {
      placeMount(mount, settings);
      return mount;
    }

    mount = document.createElement('div');
    mount.id = safeMountId;
    document.body.appendChild(mount);
    placeMount(mount, settings);

    return mount;
  }

  function createNativeMount() {
    return createMount({ ...defaultSettings, hideNativeHomeReviews: true });
  }

  function placeMount(mount, settings = defaultSettings) {
    if (!mount) return;

    const nativeReviews = document.querySelector('#widget_avaliacoes');
    if (settings.hideNativeHomeReviews && nativeReviews) {
      nativeReviews.style.display = 'none';
    }

    if (settings.productContext) {
      document.querySelectorAll('#produto .comentarios').forEach((item) => {
        item.style.display = 'none';
      });
    }

    const relatedTitle = Array.from(document.querySelectorAll('h2, h3, .titulo'))
      .find((item) => item.textContent?.trim().toLowerCase().includes('produtos relacionados'));
    const relatedSection = relatedTitle?.closest('section, .block, div');
    if (settings.productContext && relatedSection && relatedSection.previousElementSibling !== mount) {
      relatedSection.insertAdjacentElement('beforebegin', mount);
      return;
    }

    const productSection = document.querySelector('#produto');
    if (settings.productContext && productSection && productSection.nextElementSibling !== mount) {
      productSection.insertAdjacentElement('afterend', mount);
      return;
    }

    const main = document.querySelector('main.page_home');
    const footer = document.querySelector('footer');
    if (main && main.nextElementSibling !== mount) {
      main.insertAdjacentElement('afterend', mount);
    } else if (footer && mount.nextElementSibling !== footer) {
      footer.insertAdjacentElement('beforebegin', mount);
    } else if (!mount.parentElement) {
      document.body.appendChild(mount);
    }
  }

  function waitForPageAnchor() {
    return new Promise((resolve) => {
      if (document.querySelector('main.page_home') || document.querySelector('footer') || document.querySelector('#produto')) {
        resolve(true);
        return;
      }

      let tries = 0;
      const interval = setInterval(() => {
        tries += 1;
        if (document.querySelector('main.page_home') || document.querySelector('footer') || document.querySelector('#produto')) {
          clearInterval(interval);
          resolve(true);
        } else if (tries >= 16) {
          clearInterval(interval);
          resolve(false);
        }
      }, 250);
    });
  }

  function productTrustAnchor() {
    const candidates = [
      '[class*="comprar"]',
      '[id*="comprar"]',
      'button[type="submit"]',
      'input[type="submit"]',
      'a[href*="carrinho"]'
    ];

    for (const selector of candidates) {
      const item = document.querySelector(`#produto ${selector}`);
      if (item) return item.closest('form, .acoes, .comprar, .produto_detalhes, div') || item;
    }

    return document.querySelector('#produto .preco') || document.querySelector('#produto h1') || document.querySelector('#produto');
  }

  function openReviewLightbox(review) {
    let lightbox = document.querySelector('.vr-lightbox');
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.className = 'vr-lightbox';
      lightbox.hidden = true;
      document.body.appendChild(lightbox);
    }

    lightbox.innerHTML = `
      <div class="vr-lightbox__dialog" role="dialog" aria-modal="true" aria-label="Avalia\u00e7\u00e3o de cliente">
        <button class="vr-lightbox__close" type="button" aria-label="Fechar">×</button>
        <div class="vr-lightbox__body">
          <img class="vr-lightbox__image" src="${escapeHtml(review.imageUrl)}" alt="Cliente usando ${escapeHtml(review.productName)}">
          <div class="vr-lightbox__copy">
            <div class="vr-lightbox__stars">${stars(review.rating)}</div>
            <div class="vr-lightbox__product">${escapeHtml(review.productName)}</div>
            <p class="vr-lightbox__comment">${escapeHtml(review.comment)}</p>
            <div class="vr-card__customer">${escapeHtml(review.customerName)} \u00b7 ${escapeHtml(review.verifiedLabel || 'cliente verificada')}</div>
          </div>
        </div>
      </div>
    `;
    lightbox.hidden = false;
    lightbox.querySelector('.vr-lightbox__close')?.addEventListener('click', () => {
      lightbox.hidden = true;
    });
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) lightbox.hidden = true;
    }, { once: true });
  }

  function renderProductTrustBadge(reviews, settings) {
    const existing = document.querySelector('.vr-product-proof');
    if (existing) existing.remove();
    if (!settings.productContext || !reviews.length) return;

    const anchor = productTrustAnchor();
    if (!anchor) return;

    const score = averageRating(reviews).toFixed(1);
    const countLabel = reviews.length === 1 ? '1 avalia\u00e7\u00e3o real' : `${reviews.length} avalia\u00e7\u00f5es reais`;
    const badge = document.createElement('div');
    badge.className = 'vr-product-proof';
    badge.style.setProperty('--vr-brand', settings.brandColor || defaultSettings.brandColor);
    badge.innerHTML = `
      <div class="vr-product-proof__top">
        <span class="vr-product-proof__stars">${stars(Math.round(score))}</span>
        <div class="vr-product-proof__title">${score}/5 com ${countLabel} deste produto</div>
      </div>
      <p class="vr-product-proof__text">Veja fotos de clientes antes de comprar. Ajuda a conferir caimento, tecido e tamanho real.</p>
      <div class="vr-product-proof__photos">
        ${reviews.slice(0, 5).map((review, index) => `
          <button type="button" data-vr-proof-photo="${index}" aria-label="Abrir foto de cliente">
            <img src="${escapeHtml(review.imageUrl)}" alt="">
          </button>
        `).join('')}
      </div>
      <a class="vr-product-proof__link" href="#${safeMountId}">Ver todas as fotos e avalia\u00e7\u00f5es</a>
    `;

    anchor.insertAdjacentElement('afterend', badge);
    badge.querySelectorAll('[data-vr-proof-photo]').forEach((button) => {
      button.addEventListener('click', () => openReviewLightbox(reviews[Number(button.dataset.vrProofPhoto)]));
    });
  }

  function render(mount, reviews, settings) {
    placeMount(mount, settings);
    renderProductTrustBadge(reviews, settings);

    const productContext = settings.productContext || null;
    if (!reviews.length && !productContext) {
      mount.innerHTML = '';
      return;
    }

    const cards = reviews.slice(0, settings.maxReviews).map((review) => `
      <article class="vr-card">
        <img class="vr-card__image" src="${escapeHtml(review.imageUrl)}" alt="Cliente usando ${escapeHtml(review.productName)}">
        <div class="vr-card__body">
          <div class="vr-card__stars">${stars(review.rating)}</div>
          <p class="vr-card__comment">${escapeHtml(review.comment)}</p>
          <div class="vr-card__product">${escapeHtml(review.productName)}</div>
          <div class="vr-card__customer">${escapeHtml(review.customerName)} \u00b7 ${escapeHtml(review.verifiedLabel || 'cliente verificada')}</div>
        </div>
      </article>
    `).join('');

    const mode = settings.displayMode === 'carousel' ? 'carousel' : 'grid';
    const score = averageRating(reviews);
    const scoreLabel = score ? score.toFixed(1) : '5.0';
    const countLabel = reviews.length === 1 ? '1 avalia\u00e7\u00e3o com foto' : `${reviews.length} avalia\u00e7\u00f5es com foto`;
    const proof = productContext && reviews.length ? `
      <div class="vr-proof">
        <div class="vr-proof__score"><strong>${scoreLabel}</strong><span>/5</span></div>
        <div>
          <p class="vr-proof__title">Fotos reais deste produto</p>
          <p class="vr-proof__text">${countLabel} de clientes verificadas. Clique nas fotos para ver detalhes antes de comprar.</p>
          <div class="vr-proof__photos">
            ${reviews.slice(0, 5).map((review) => `<img src="${escapeHtml(review.imageUrl)}" alt="">`).join('')}
          </div>
        </div>
      </div>
    ` : '';
    const gallery = productContext && reviews.length ? `
      <div class="vr-gallery-wrap">
        <h3>Galeria de fotos reais</h3>
        <div class="vr-gallery">
          ${reviews.slice(0, 10).map((review, index) => `
            <button class="vr-gallery__button" type="button" data-vr-gallery="${index}" aria-label="Abrir avalia\u00e7\u00e3o de ${escapeHtml(review.customerName)}">
              <img src="${escapeHtml(review.imageUrl)}" alt="">
            </button>
          `).join('')}
        </div>
      </div>
    ` : '';
    const submitUrl = productContext
      ? `${baseUrl}/avaliar.html?productName=${encodeURIComponent(productContext.name)}&productUrl=${encodeURIComponent(productContext.url)}&productSlug=${encodeURIComponent(productContext.slug)}`
      : '';

    mount.innerHTML = `
      <section class="vr-widget" style="--vr-brand: ${escapeHtml(settings.brandColor)};" aria-label="Avalia\u00e7\u00f5es com fotos de clientes">
        <div class="vr-widget__inner">
          <header class="vr-widget__head">
            <span class="vr-widget__kicker">${escapeHtml(settings.kicker)}</span>
            <h2>${escapeHtml(settings.title)}</h2>
            <p class="vr-widget__subtitle">${escapeHtml(settings.subtitle)}</p>
          </header>
          ${proof}
          ${gallery}
          ${cards ? `<div class="vr-widget__grid">${cards}</div>` : '<p class="vr-widget__empty">Este produto ainda n\u00e3o tem avalia\u00e7\u00f5es com foto.</p>'}
          <div class="vr-widget__actions">
            ${productContext ? `<a class="vr-widget__button vr-widget__button--ghost" href="${escapeHtml(submitUrl)}">Avaliar este produto</a>` : ''}
            <a class="vr-widget__button" href="${escapeHtml(settings.buttonUrl)}">${escapeHtml(settings.buttonText)}</a>
          </div>
        </div>
      </section>
    `;

    const widget = mount.querySelector('.vr-widget');
    widget?.setAttribute('data-mode', mode);
    widget?.style.setProperty('--vr-bg', settings.backgroundColor || defaultSettings.backgroundColor);
    widget?.style.setProperty('--vr-head-bg', settings.headerBackgroundColor || defaultSettings.headerBackgroundColor);
    widget?.style.setProperty('--vr-text', settings.textColor || defaultSettings.textColor);
    widget?.style.setProperty('--vr-kicker', settings.kickerColor || defaultSettings.kickerColor);
    widget?.style.setProperty('--vr-title', settings.titleColor || defaultSettings.titleColor);
    widget?.style.setProperty('--vr-subtitle', settings.subtitleColor || defaultSettings.subtitleColor);

    mount.querySelectorAll('[data-vr-gallery]').forEach((button) => {
      button.addEventListener('click', () => openReviewLightbox(reviews[Number(button.dataset.vrGallery)]));
    });

    const track = mount.querySelector('.vr-widget__grid');
    if (track) track.insertAdjacentHTML('afterend', `
      <div class="vr-widget__controls" aria-label="Controle do carrossel">
        <button class="vr-widget__nav" type="button" data-vr-prev aria-label="Avalia\u00e7\u00e3o anterior">\u2039</button>
        <button class="vr-widget__nav" type="button" data-vr-next aria-label="Pr\u00f3xima avalia\u00e7\u00e3o">\u203a</button>
      </div>
    `);

    const prev = mount.querySelector('[data-vr-prev]');
    const next = mount.querySelector('[data-vr-next]');
    const scrollByCard = (direction) => {
      const card = track?.querySelector('.vr-card');
      if (!track || !card) return;
      const amount = card.getBoundingClientRect().width + 16;
      const nextLeft = track.scrollLeft + (direction * amount);
      const maxLeft = track.scrollWidth - track.clientWidth - 4;
      track.scrollTo({ left: nextLeft > maxLeft ? 0 : Math.max(0, nextLeft), behavior: 'smooth' });
    };
    prev?.addEventListener('click', () => scrollByCard(-1));
    next?.addEventListener('click', () => scrollByCard(1));

    if (mode === 'carousel' && track && track.scrollWidth > track.clientWidth) {
      let paused = false;
      const setPaused = (value) => {
        paused = value;
      };

      track.addEventListener('mouseenter', () => setPaused(true));
      track.addEventListener('mouseleave', () => setPaused(false));
      track.addEventListener('touchstart', () => setPaused(true), { passive: true });
      track.addEventListener('touchend', () => setPaused(false), { passive: true });
      setInterval(() => {
        if (!paused && document.visibilityState === 'visible') scrollByCard(1);
      }, 4500);
    }
  }

  async function load() {
    ensureStyle();
    try {
      const productContext = getProductContext();
      const query = productContext ? `?productSlug=${encodeURIComponent(productContext.slug)}` : '';
      const response = await fetch(`${baseUrl}/api/reviews${query}`, { cache: 'no-store' });
      const data = await response.json();
      const settings = { ...defaultSettings, ...(data.settings || {}), productContext };
      await waitForPageAnchor();
      const mount = settings.hideNativeHomeReviews ? createNativeMount() : createMount(settings);
      render(mount, data.reviews || [], settings);
      setTimeout(() => placeMount(mount, settings), 800);
      setTimeout(() => placeMount(mount, settings), 2500);
    } catch (error) {
      console.warn('[Ver\u00e3o Reviews] N\u00e3o foi poss\u00edvel carregar avalia\u00e7\u00f5es.', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }

  window.addEventListener('veraoReviewsRefresh', load);
})();
