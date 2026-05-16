(function () {
  const currentScript = document.currentScript;
  const baseUrl = currentScript ? new URL(currentScript.src).origin : window.location.origin;
  const mountId = 'verao-reviews-widget';
  const existingStyleId = 'verao-reviews-widget-style';
  const defaultSettings = {
    title: 'Clientes usando Verão em Cores',
    kicker: 'Avaliações com foto',
    subtitle: 'Fotos e comentários de quem comprou e aprovou.',
    buttonText: 'Ver todas as avaliações',
    buttonUrl: '/m/clientes-usando-verao-em-cores/',
    brandColor: '#b0565b',
    maxReviews: 8,
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
        font-family: inherit;
        background: linear-gradient(180deg, #fff 0%, var(--vr-bg) 100%);
        clear: both;
        isolation: isolate;
        margin-top: 56px;
        padding: 48px 14px;
        position: relative;
        z-index: 2;
      }

      #verao-reviews-widget {
        clear: both;
        display: block;
        float: none;
        position: relative;
        width: 100%;
      }

      .vr-widget__inner {
        margin: 0 auto;
        max-width: 1180px;
      }

      .vr-widget__head {
        margin: 0 auto 24px;
        max-width: 760px;
        text-align: center;
      }

      .vr-widget__kicker {
        color: var(--vr-brand);
        display: block;
        font-size: 13px;
        font-weight: 800;
        margin-bottom: 8px;
        text-transform: uppercase;
      }

      .vr-widget h2 {
        color: var(--vr-text);
        font-size: 28px;
        font-weight: 800;
        line-height: 1.2;
        margin: 0;
      }

      .vr-widget__subtitle {
        color: var(--vr-muted);
        font-size: 15px;
        margin: 10px 0 0;
      }

      .vr-widget__grid {
        display: grid;
        gap: 18px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .vr-card {
        background: #fff;
        border: 1px solid var(--vr-line);
        border-radius: 14px;
        box-shadow: 0 14px 34px rgba(176, 86, 91, .12);
        overflow: hidden;
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
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 10px;
          scroll-snap-type: x mandatory;
        }

        .vr-card {
          min-width: 74%;
          scroll-snap-align: start;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createMount() {
    let mount = document.getElementById(mountId);

    if (mount) {
      placeMount(mount);
      return mount;
    }

    const nativeReviews = document.querySelector('#widget_avaliacoes');
    mount = document.createElement('div');
    mount.id = mountId;

    if (nativeReviews) {
      nativeReviews.insertAdjacentElement('afterend', mount);
    } else {
      document.body.appendChild(mount);
    }

    return mount;
  }

  function placeMount(mount) {
    const nativeReviews = document.querySelector('#widget_avaliacoes');
    if (nativeReviews && mount.previousElementSibling !== nativeReviews) {
      nativeReviews.insertAdjacentElement('afterend', mount);
    }
  }

  function waitForNativeReviews() {
    return new Promise((resolve) => {
      if (document.querySelector('#widget_avaliacoes')) {
        resolve(true);
        return;
      }

      let tries = 0;
      const interval = setInterval(() => {
        tries += 1;
        if (document.querySelector('#widget_avaliacoes')) {
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
    placeMount(mount);

    if (!reviews.length) {
      mount.innerHTML = '';
      return;
    }

    if (settings.hideNativeHomeReviews) {
      const nativeReviews = document.querySelector('#widget_avaliacoes');
      if (nativeReviews) nativeReviews.style.display = 'none';
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
  }

  async function load() {
    ensureStyle();
    try {
      const response = await fetch(`${baseUrl}/api/reviews`, { cache: 'no-store' });
      const data = await response.json();
      const settings = { ...defaultSettings, ...(data.settings || {}) };
      await waitForNativeReviews();
      const mount = createMount();
      render(mount, data.reviews || [], settings);
      setTimeout(() => placeMount(mount), 800);
      setTimeout(() => placeMount(mount), 2500);
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
