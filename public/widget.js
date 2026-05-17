(function () {
  const currentScript = document.currentScript;
  const baseUrl = currentScript ? new URL(currentScript.src).origin : window.location.origin;
  const mountId = 'verao-reviews-widget';
  const safeMountId = 'verao-reviews-widget-safe';
  const existingStyleId = 'verao-reviews-widget-style';
  const defaultSettings = {
    title: 'Clientes usando Verão em Cores',
    kicker: 'Avaliações com foto',
    subtitle: 'Fotos e comentários de quem comprou e aprovou.',
    buttonText: 'Ver todas as avaliações',
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
    return '★★★★★'.slice(0, count) + '☆☆☆☆☆'.slice(0, 5 - count);
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

      @media (max-width: 900px) {
        .vr-widget__grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
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
      if (document.querySelector('main.page_home') || document.querySelector('footer')) {
        resolve(true);
        return;
      }

      let tries = 0;
      const interval = setInterval(() => {
        tries += 1;
        if (document.querySelector('main.page_home') || document.querySelector('footer')) {
          clearInterval(interval);
          resolve(true);
        } else if (tries >= 16) {
          clearInterval(interval);
          resolve(false);
        }
      }, 250);
    });
  }

  function render(mount, reviews, settings) {
    placeMount(mount, settings);

    if (!reviews.length) {
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
          <div class="vr-card__customer">${escapeHtml(review.customerName)} · ${escapeHtml(review.verifiedLabel || 'cliente verificada')}</div>
        </div>
      </article>
    `).join('');

    const mode = settings.displayMode === 'carousel' ? 'carousel' : 'grid';

    mount.innerHTML = `
      <section class="vr-widget" style="--vr-brand: ${escapeHtml(settings.brandColor)};" aria-label="Avaliações com fotos de clientes">
        <div class="vr-widget__inner">
          <header class="vr-widget__head">
            <span class="vr-widget__kicker">${escapeHtml(settings.kicker)}</span>
            <h2>${escapeHtml(settings.title)}</h2>
            <p class="vr-widget__subtitle">${escapeHtml(settings.subtitle)}</p>
          </header>
          <div class="vr-widget__grid">${cards}</div>
          <a class="vr-widget__button" href="${escapeHtml(settings.buttonUrl)}">${escapeHtml(settings.buttonText)}</a>
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

    const track = mount.querySelector('.vr-widget__grid');
    track?.insertAdjacentHTML('afterend', `
      <div class="vr-widget__controls" aria-label="Controle do carrossel">
        <button class="vr-widget__nav" type="button" data-vr-prev aria-label="Avaliação anterior">‹</button>
        <button class="vr-widget__nav" type="button" data-vr-next aria-label="Próxima avaliação">›</button>
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
      const response = await fetch(`${baseUrl}/api/reviews`, { cache: 'no-store' });
      const data = await response.json();
      const settings = { ...defaultSettings, ...(data.settings || {}) };
      await waitForPageAnchor();
      const mount = settings.hideNativeHomeReviews ? createNativeMount() : createMount(settings);
      render(mount, data.reviews || [], settings);
      setTimeout(() => placeMount(mount, settings), 800);
      setTimeout(() => placeMount(mount, settings), 2500);
    } catch (error) {
      console.warn('[Verão Reviews] Não foi possível carregar avaliações.', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }

  window.addEventListener('veraoReviewsRefresh', load);
})();
