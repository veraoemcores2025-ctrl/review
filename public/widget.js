(function () {
  const currentScript = document.currentScript;
  const baseUrl = currentScript ? new URL(currentScript.src).origin : window.location.origin;
  const mountId = 'verao-reviews-widget';
  const safeMountId = 'verao-reviews-widget-safe';
  const existingStyleId = 'verao-reviews-widget-style';
  const socialProofId = 'verao-social-proof';
  const conversionId = 'verao-conversion-block';
  const checkoutReviewsId = 'verao-checkout-reviews';
  const socialProofDismissKey = 'veraoSocialProofDismissed';
  let socialProofTimer = null;
  let socialProofTimeout = null;
  let socialProofIndex = 0;
  const defaultSettings = {
    title: 'Clientes usando Ver\u00e3o em Cores',
    kicker: 'Avalia\u00e7\u00f5es com foto',
    subtitle: 'Fotos e coment\u00e1rios de quem comprou e aprovou.',
    buttonText: 'Ver todas as avalia\u00e7\u00f5es',
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
    conversionUrgency: 'Oferta por tempo limitado'
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
        --vr-font: inherit;
        --vr-title-size: 28px;
        --vr-text-size: 15px;
        font-family: var(--vr-font);
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
        font-size: var(--vr-title-size);
        font-weight: 800;
        line-height: 1.2;
        margin: 0;
        position: static !important;
        top: auto !important;
        transform: none !important;
      }

      .vr-widget__subtitle {
        color: var(--vr-subtitle);
        font-size: var(--vr-text-size);
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
        font-size: calc(var(--vr-text-size) - 2px);
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

      .vr-widget[data-product="true"][data-count="1"] .vr-widget__grid {
        display: flex !important;
        justify-content: center !important;
        max-width: 360px !important;
      }

      .vr-widget[data-product="true"][data-count="1"] .vr-card {
        max-width: 360px !important;
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
        cursor: pointer;
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
        font-size: calc(var(--vr-text-size) - 2px);
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
        line-height: 1.5;
        margin: 0 0 12px;
        overflow: hidden;
      }

      .vr-card__product {
        color: var(--vr-brand);
        display: -webkit-box;
        font-size: calc(var(--vr-text-size) - 3px);
        font-weight: 800;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        margin-bottom: 6px;
        overflow: hidden;
      }

      .vr-card__customer {
        color: var(--vr-muted);
        font-size: calc(var(--vr-text-size) - 3px);
      }

      .vr-widget__button {
        background: var(--vr-brand);
        border: 0;
        border-radius: 999px;
        color: #fff !important;
        cursor: pointer;
        display: block;
        font-family: inherit;
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
        background: none;
        border: 0;
        color: var(--vr-brand, #b0565b) !important;
        cursor: pointer;
        font-family: inherit;
        font-size: 12px;
        font-weight: 800;
        padding: 0;
        text-align: left;
        text-decoration: none !important;
      }

      .vr-conversion {
        --vr-brand: #b0565b;
        --vr-title: #111827;
        --vr-subtitle: #4b5563;
        --vr-font: inherit;
        align-items: center;
        background: #fff;
        border: 1px solid #f0dddd;
        border-radius: 16px;
        box-shadow: 0 16px 34px rgba(17, 24, 39, .08);
        box-sizing: border-box;
        color: var(--vr-title);
        display: grid;
        font-family: var(--vr-font);
        gap: 16px;
        grid-template-columns: minmax(0, 1fr) auto;
        margin: 18px auto;
        max-width: 1180px;
        padding: 16px;
        width: calc(100% - 28px);
      }

      .vr-conversion,
      .vr-conversion * {
        box-sizing: border-box;
      }

      .vr-conversion__eyebrow {
        color: var(--vr-brand);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .04em;
        margin: 0 0 5px;
        text-transform: uppercase;
      }

      .vr-conversion h3 {
        color: var(--vr-title);
        font-size: 18px;
        line-height: 1.25;
        margin: 0;
      }

      .vr-conversion__text {
        color: var(--vr-subtitle);
        font-size: 13px;
        line-height: 1.45;
        margin: 6px 0 0;
      }

      .vr-conversion__benefits {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }

      .vr-conversion__pill {
        align-items: center;
        background: #fff7f7;
        border: 1px solid #f0dddd;
        border-radius: 999px;
        color: #5b3438;
        display: inline-flex;
        font-size: 12px;
        font-weight: 800;
        gap: 6px;
        line-height: 1.25;
        padding: 7px 10px;
      }

      .vr-conversion__pill::before {
        background: var(--vr-brand);
        border-radius: 999px;
        content: "";
        height: 7px;
        width: 7px;
      }

      .vr-conversion__urgency {
        background: var(--vr-brand);
        border-radius: 999px;
        color: #fff;
        font-size: 12px;
        font-weight: 800;
        padding: 10px 13px;
        text-align: center;
        white-space: nowrap;
      }

      .vr-conversion--checkout {
        align-items: center;
        border-radius: 10px;
        box-shadow: none;
        gap: 10px;
        grid-template-columns: minmax(0, 1fr) auto;
        margin: 14px 0 20px;
        max-width: 100%;
        padding: 12px 14px;
        width: 100%;
      }

      .vr-conversion--checkout h3 {
        font-size: 15px;
      }

      .vr-conversion--checkout .vr-conversion__text {
        font-size: 12px;
        margin-top: 4px;
      }

      .vr-conversion--checkout .vr-conversion__benefits {
        gap: 6px;
        margin-top: 8px;
      }

      .vr-conversion--checkout .vr-conversion__pill {
        font-size: 11px;
        padding: 5px 8px;
      }

      .vr-conversion--checkout .vr-conversion__urgency {
        font-size: 11px;
        padding: 8px 10px;
      }

      .vr-checkout-reviews {
        --vr-brand: #b0565b;
        --vr-font: inherit;
        box-sizing: border-box;
        color: #222;
        font-family: var(--vr-font);
        margin: 22px 0 0;
        max-width: 100%;
        width: 100%;
      }

      .vr-checkout-reviews,
      .vr-checkout-reviews * {
        box-sizing: border-box;
      }

      .vr-checkout-reviews__head {
        align-items: center;
        display: flex;
        gap: 10px;
        justify-content: space-between;
        margin-bottom: 10px;
      }

      .vr-checkout-reviews__head strong {
        color: #222;
        font-size: 14px;
        line-height: 1.25;
      }

      .vr-checkout-reviews__head span {
        color: var(--vr-brand);
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .vr-checkout-reviews__grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .vr-checkout-review {
        background: #fff;
        border: 1px solid #eee0e1;
        border-radius: 10px;
        min-width: 0;
        padding: 12px;
      }

      .vr-checkout-review__top {
        align-items: center;
        display: flex;
        gap: 9px;
        margin-bottom: 8px;
      }

      .vr-checkout-review img {
        aspect-ratio: 1;
        border-radius: 8px;
        flex: 0 0 44px;
        object-fit: cover;
        width: 44px;
      }

      .vr-checkout-review__stars {
        color: #ffc400;
        font-size: 13px;
        letter-spacing: .5px;
        line-height: 1;
      }

      .vr-checkout-review__product {
        color: var(--vr-brand);
        display: -webkit-box;
        font-size: 11px;
        font-weight: 800;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        line-height: 1.25;
        overflow: hidden;
      }

      .vr-checkout-review__text {
        color: #333;
        display: -webkit-box;
        font-size: 12px;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        line-height: 1.35;
        margin: 0 0 8px;
        overflow: hidden;
      }

      .vr-checkout-review__customer {
        color: #8a8a8a;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .vr-social-proof {
        align-items: center;
        background: rgba(255, 255, 255, .98);
        border: 1px solid #f0dddd;
        border-radius: 14px;
        bottom: 18px;
        box-shadow: 0 18px 42px rgba(17, 24, 39, .14);
        color: #222;
        display: grid;
        gap: 10px;
        grid-template-columns: 54px 1fr auto;
        left: 18px;
        max-width: min(390px, calc(100vw - 36px));
        opacity: 0;
        padding: 10px;
        pointer-events: none;
        position: fixed;
        transform: translateY(14px);
        transition: opacity .22s ease, transform .22s ease;
        width: 390px;
        z-index: 2147483000;
      }

      .vr-social-proof.is-visible {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
      }

      .vr-social-proof img {
        aspect-ratio: 1;
        border-radius: 12px;
        object-fit: cover;
        width: 54px;
      }

      .vr-social-proof__kicker {
        color: var(--vr-brand, #b0565b);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .03em;
        margin: 0 0 2px;
        text-transform: uppercase;
      }

      .vr-social-proof__title {
        color: #222;
        display: -webkit-box;
        font-size: 13px;
        font-weight: 800;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        line-height: 1.25;
        margin: 0;
        overflow: hidden;
      }

      .vr-social-proof__text {
        color: #666;
        display: -webkit-box;
        font-size: 12px;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        line-height: 1.35;
        margin: 3px 0 0;
        overflow: hidden;
      }

      .vr-social-proof__stars {
        color: #ffc400;
        font-size: 12px;
        letter-spacing: .5px;
        margin-top: 3px;
      }

      .vr-social-proof__close {
        align-self: start;
        background: #f7f2f2;
        border: 0;
        border-radius: 999px;
        color: #8a4147;
        cursor: pointer;
        font-size: 18px;
        height: 26px;
        line-height: 1;
        width: 26px;
      }

      .vr-lightbox {
        align-items: center;
        backdrop-filter: blur(2px);
        background: #111827;
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

      body.vr-reviews-modal-open .vr-widget__head {
        opacity: 0 !important;
        visibility: hidden !important;
      }

      .vr-lightbox__dialog {
        background: #fff;
        border-radius: 14px;
        max-width: min(920px, 100%);
        overflow: hidden;
        position: relative;
        width: 100%;
      }

      .vr-lightbox__dialog--reviews {
        max-height: min(760px, calc(100vh - 36px));
        overflow: auto;
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

      .vr-modal-reviews {
        padding: 28px;
      }

      .vr-modal-reviews__head {
        margin: 0 auto 18px;
        max-width: 720px;
        text-align: center;
      }

      .vr-modal-reviews__kicker {
        color: var(--vr-brand, #b0565b);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .04em;
        margin: 0 0 8px;
        text-transform: uppercase;
      }

      .vr-modal-reviews__head h3 {
        color: #222;
        font-size: 28px;
        line-height: 1.15;
        margin: 0;
      }

      .vr-modal-reviews__summary {
        color: #666;
        font-size: 14px;
        line-height: 1.45;
        margin: 10px 0 0;
      }

      .vr-modal-reviews__grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }

      .vr-modal-review {
        border: 1px solid #f0dddd;
        border-radius: 12px;
        overflow: hidden;
      }

      .vr-modal-review img {
        aspect-ratio: 1 / 1.1;
        background: #f6eeee;
        display: block;
        object-fit: cover;
        width: 100%;
      }

      .vr-modal-review__body {
        padding: 13px;
      }

      .vr-modal-review__stars {
        color: #ffc400;
        font-size: 15px;
        letter-spacing: .5px;
        margin-bottom: 8px;
      }

      .vr-modal-review__text {
        color: #333;
        display: -webkit-box;
        font-size: 13px;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
        line-height: 1.45;
        margin: 0 0 10px;
        overflow: hidden;
      }

      .vr-modal-review__product {
        color: var(--vr-brand, #b0565b);
        font-size: 12px;
        font-weight: 800;
        line-height: 1.35;
        margin-bottom: 5px;
      }

      .vr-modal-review__customer {
        color: #777;
        font-size: 11px;
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
          font-size: max(23px, calc(var(--vr-title-size) - 5px));
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

        .vr-conversion {
          border-radius: 10px;
          box-shadow: none;
          grid-template-columns: 1fr;
          margin: 10px 0 16px;
          max-width: 100%;
          padding: 10px 12px;
          text-align: left;
          width: 100%;
        }

        .vr-conversion__eyebrow,
        .vr-conversion__benefits,
        .vr-conversion__urgency {
          display: none;
        }

        .vr-conversion h3 {
          font-size: 14px;
          line-height: 1.25;
        }

        .vr-conversion__text {
          font-size: 12px;
          line-height: 1.35;
          margin-top: 4px;
        }

        .vr-product-proof {
          border-left: 0;
          border-radius: 0;
          border-right: 0;
          box-sizing: border-box !important;
          box-shadow: none;
          clear: both !important;
          float: none !important;
          gap: 8px;
          margin: 18px 12px !important;
          max-width: 100% !important;
          min-width: 0 !important;
          overflow: hidden !important;
          padding: 14px 10px !important;
          position: relative !important;
          transform: none !important;
          width: calc(100% - 24px) !important;
        }

        .vr-product-proof__top {
          align-items: flex-start;
          display: grid;
          gap: 5px;
          min-width: 0;
        }

        .vr-product-proof__stars {
          font-size: 18px;
          letter-spacing: 0;
          max-width: 100%;
          overflow: hidden;
        }

        .vr-product-proof__title {
          font-size: 13px;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }

        .vr-product-proof__text {
          font-size: 12px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .vr-product-proof__photos {
          max-width: 100%;
          overflow-x: auto;
          padding-bottom: 2px;
        }

        .vr-product-proof__photos img {
          width: 34px;
        }

        .vr-product-proof__link {
          font-size: 12px;
        }

        .vr-checkout-reviews__grid {
          grid-template-columns: 1fr;
        }

        .vr-social-proof {
          bottom: 10px;
          border-radius: 12px;
          grid-template-columns: 42px 1fr auto;
          left: 12px;
          max-width: calc(100vw - 24px);
          padding: 8px;
          width: calc(100vw - 24px);
        }

        .vr-social-proof img {
          border-radius: 10px;
          width: 42px;
        }

        .vr-social-proof__kicker {
          font-size: 10px;
          margin-bottom: 1px;
        }

        .vr-social-proof__title {
          font-size: 12px;
          -webkit-line-clamp: 1;
        }

        .vr-social-proof__text {
          font-size: 11px;
          -webkit-line-clamp: 1;
          margin-top: 2px;
        }

        .vr-social-proof__stars {
          font-size: 11px;
          margin-top: 2px;
        }

        .vr-social-proof__close {
          font-size: 16px;
          height: 24px;
          width: 24px;
        }

        .vr-modal-reviews {
          padding: 20px 14px;
        }

        .vr-modal-reviews__head h3 {
          font-size: 23px;
        }

        .vr-modal-reviews__grid {
          grid-template-columns: 1fr;
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
      const hasAnchor = () => document.querySelector('main.page_home')
        || document.querySelector('footer')
        || document.querySelector('#produto')
        || findElementByText('h1, h2, h3, h4, strong, .titulo, .title', 'resumo da compra');

      if (hasAnchor()) {
        resolve(true);
        return;
      }

      let tries = 0;
      const interval = setInterval(() => {
        tries += 1;
        if (hasAnchor()) {
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
          <img class="vr-lightbox__image" loading="lazy" src="${escapeHtml(review.imageUrl)}" alt="Cliente usando ${escapeHtml(review.productName)}">
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

  function openAllReviewsModal(reviews, settings) {
    const visibleReviews = (reviews || []).filter((review) => review.imageUrl);
    if (!visibleReviews.length) return;

    if (window.location.hash === `#${safeMountId}`) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }

    let lightbox = document.querySelector('.vr-lightbox');
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.className = 'vr-lightbox';
      lightbox.hidden = true;
      document.body.appendChild(lightbox);
    }

    const score = averageRating(visibleReviews).toFixed(1);
    const countLabel = visibleReviews.length === 1 ? '1 avalia\u00e7\u00e3o aprovada' : `${visibleReviews.length} avalia\u00e7\u00f5es aprovadas`;
    lightbox.innerHTML = `
      <div class="vr-lightbox__dialog vr-lightbox__dialog--reviews" role="dialog" aria-modal="true" aria-label="Todas as avalia\u00e7\u00f5es com foto">
        <button class="vr-lightbox__close" type="button" aria-label="Fechar">×</button>
        <section class="vr-modal-reviews" style="--vr-brand: ${escapeHtml(settings.brandColor || defaultSettings.brandColor)};">
          <header class="vr-modal-reviews__head">
            <p class="vr-modal-reviews__kicker">${escapeHtml(settings.kicker || defaultSettings.kicker)}</p>
            <h3>${escapeHtml(settings.title || defaultSettings.title)}</h3>
            <p class="vr-modal-reviews__summary">${score}/5 com ${countLabel} com fotos reais de clientes.</p>
          </header>
          <div class="vr-modal-reviews__grid">
            ${visibleReviews.map((review) => `
              <article class="vr-modal-review">
                <img loading="lazy" src="${escapeHtml(review.imageUrl)}" alt="Cliente usando ${escapeHtml(review.productName)}">
                <div class="vr-modal-review__body">
                  <div class="vr-modal-review__stars">${stars(review.rating)}</div>
                  <p class="vr-modal-review__text">${escapeHtml(review.comment)}</p>
                  <div class="vr-modal-review__product">${escapeHtml(review.productName)}</div>
                  <div class="vr-modal-review__customer">${escapeHtml(review.customerName)} \u00b7 ${escapeHtml(review.verifiedLabel || 'cliente verificada')}</div>
                </div>
              </article>
            `).join('')}
          </div>
        </section>
      </div>
    `;
    lightbox.hidden = false;
    document.body.classList.add('vr-reviews-modal-open');
    const closeModal = () => {
      lightbox.hidden = true;
      document.body.classList.remove('vr-reviews-modal-open');
    };
    lightbox.querySelector('.vr-lightbox__close')?.addEventListener('click', closeModal);
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) closeModal();
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
            <img loading="lazy" src="${escapeHtml(review.imageUrl)}" alt="">
          </button>
        `).join('')}
      </div>
      <button class="vr-product-proof__link" type="button" data-vr-proof-all>Ver todas as fotos e avalia\u00e7\u00f5es</button>
    `;

    if (window.matchMedia('(max-width: 640px)').matches) {
      const conversionBlock = document.getElementById(conversionId);
      if (conversionBlock && conversionBlock.nextElementSibling !== badge) {
        conversionBlock.insertAdjacentElement('afterend', badge);
      } else {
        anchor.insertAdjacentElement('afterend', badge);
      }
    } else {
      anchor.insertAdjacentElement('afterend', badge);
    }
    badge.querySelectorAll('[data-vr-proof-photo]').forEach((button) => {
      button.addEventListener('click', () => openReviewLightbox(reviews[Number(button.dataset.vrProofPhoto)]));
    });
    badge.querySelector('[data-vr-proof-all]')?.addEventListener('click', () => openAllReviewsModal(reviews, settings));
  }

  function conversionBenefits(settings) {
    return String(settings.conversionBenefits || defaultSettings.conversionBenefits)
      .split(/\n|\|/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 5);
  }

  function isCheckoutLikePage() {
    return /carrinho|checkout|finalizar|pagamento|pedido/i.test(window.location.pathname + window.location.search);
  }

  function findElementByText(selector, text) {
    const normalizedText = text.toLowerCase();
    return Array.from(document.querySelectorAll(selector)).find((item) => (
      item.textContent || ''
    ).trim().toLowerCase().includes(normalizedText));
  }

  function conversionShouldShow(settings) {
    const isPlatformPage = ['/admin.html', '/login.html', '/avaliar.html'].includes(window.location.pathname);
    const isAdminPreview = window.location.pathname === '/admin.html' && document.getElementById(safeMountId);
    if (isPlatformPage && !isAdminPreview) return false;
    if (settings.conversionEnabled === false) return false;
    if (isCheckoutLikePage()) return false;
    if (settings.productContext) return settings.conversionProduct !== false;
    return settings.conversionHome !== false;
  }

  function placeConversionBlock(block, mount, settings) {
    if (settings.productContext) {
      const proof = document.querySelector('.vr-product-proof');
      if (proof && proof.nextElementSibling !== block) {
        proof.insertAdjacentElement('afterend', block);
        return;
      }

      const anchor = productTrustAnchor();
      if (anchor && anchor.nextElementSibling !== block) {
        anchor.insertAdjacentElement('afterend', block);
        return;
      }
    }

    if (isCheckoutLikePage()) {
      const safeMessage = findElementByText('span, p, div, strong', 'ambiente seguro');
      const safeBox = safeMessage?.closest('section, header, .row, .container, div');
      if (safeBox && safeBox.nextElementSibling !== block) {
        safeBox.insertAdjacentElement('afterend', block);
        return;
      }

      const infoTitle = findElementByText('h1, h2, h3, h4, strong, .titulo, .title, div', 'informações');
      const infoBox = infoTitle?.closest('section, form, div');
      if (infoBox && infoBox.previousElementSibling !== block) {
        infoBox.insertAdjacentElement('beforebegin', block);
        return;
      }

      const target = document.querySelector('main, #main, .checkout, .carrinho, form') || document.body.firstElementChild;
      if (target && target.firstElementChild !== block) {
        target.insertAdjacentElement('afterbegin', block);
        return;
      }
    }

    if (mount && mount.previousElementSibling !== block) {
      mount.insertAdjacentElement('beforebegin', block);
    } else if (!block.parentElement) {
      document.body.appendChild(block);
    }
  }

  function renderConversionBlock(reviews, settings, mount) {
    const existing = document.getElementById(conversionId);
    if (!conversionShouldShow(settings)) {
      existing?.remove();
      return;
    }

    const block = existing || document.createElement('aside');
    block.id = conversionId;
    block.className = `vr-conversion${isCheckoutLikePage() ? ' vr-conversion--checkout' : ''}`;
    block.style.setProperty('--vr-brand', settings.brandColor || defaultSettings.brandColor);
    block.style.setProperty('--vr-title', settings.titleColor || defaultSettings.titleColor);
    block.style.setProperty('--vr-subtitle', settings.subtitleColor || defaultSettings.subtitleColor);
    block.style.setProperty('--vr-font', fontStack(settings.fontFamily));

    const benefits = conversionBenefits(settings);
    const reviewedLabel = reviews.length
      ? `${reviews.length} foto${reviews.length > 1 ? 's' : ''} real${reviews.length > 1 ? 's' : ''} aprovada${reviews.length > 1 ? 's' : ''}`
      : 'Prova social ativa';

    block.innerHTML = `
      <div>
        <p class="vr-conversion__eyebrow">${escapeHtml(reviewedLabel)}</p>
        <h3>${escapeHtml(settings.conversionTitle || defaultSettings.conversionTitle)}</h3>
        <p class="vr-conversion__text">${escapeHtml(settings.conversionText || defaultSettings.conversionText)}</p>
        <div class="vr-conversion__benefits">
          ${benefits.map((item) => `<span class="vr-conversion__pill">${escapeHtml(item)}</span>`).join('')}
        </div>
      </div>
      <div class="vr-conversion__urgency">${escapeHtml(settings.conversionUrgency || defaultSettings.conversionUrgency)}</div>
    `;

    loadWidgetFont(settings.fontFamily);
    placeConversionBlock(block, mount, settings);
  }

  function findCheckoutTotalAnchor() {
    const totalLabel = findElementByText('span, p, strong, div, td, th', 'total');
    return totalLabel?.closest('section, aside, div, table') || totalLabel;
  }

  function renderCheckoutReviews(reviews, settings) {
    const existing = document.getElementById(checkoutReviewsId);
    const visibleReviews = (reviews || []).filter((review) => review.imageUrl).slice(0, 4);
    if (!isCheckoutLikePage() || !visibleReviews.length) {
      existing?.remove();
      return;
    }

    const anchor = findCheckoutTotalAnchor();
    if (!anchor) {
      existing?.remove();
      return;
    }

    const block = existing || document.createElement('aside');
    block.id = checkoutReviewsId;
    block.className = 'vr-checkout-reviews';
    block.style.setProperty('--vr-brand', settings.brandColor || defaultSettings.brandColor);
    block.style.setProperty('--vr-font', fontStack(settings.fontFamily));
    block.innerHTML = `
      <div class="vr-checkout-reviews__head">
        <strong>Clientes aprovaram</strong>
        <span>${visibleReviews.length} fotos reais</span>
      </div>
      <div class="vr-checkout-reviews__grid">
        ${visibleReviews.map((review) => `
          <article class="vr-checkout-review">
            <div class="vr-checkout-review__top">
              <img loading="lazy" src="${escapeHtml(review.imageUrl)}" alt="">
              <div>
                <div class="vr-checkout-review__stars">${stars(review.rating)}</div>
                <div class="vr-checkout-review__product">${escapeHtml(review.productName)}</div>
              </div>
            </div>
            <p class="vr-checkout-review__text">${escapeHtml(review.comment)}</p>
            <div class="vr-checkout-review__customer">${escapeHtml(review.customerName || 'Cliente verificada')}</div>
          </article>
        `).join('')}
      </div>
    `;

    loadWidgetFont(settings.fontFamily);
    if (anchor.nextElementSibling !== block) {
      anchor.insertAdjacentElement('afterend', block);
    }
  }

  function fontStack(fontFamily) {
    const family = String(fontFamily || 'inherit');
    if (family === 'Poppins') return "'Poppins', Arial, sans-serif";
    if (family === 'Montserrat') return "'Montserrat', Arial, sans-serif";
    if (family === 'Playfair Display') return "'Playfair Display', Georgia, serif";
    if (family === 'Georgia') return "Georgia, 'Times New Roman', serif";
    if (family === 'Arial') return 'Arial, Helvetica, sans-serif';
    return 'inherit';
  }

  function loadWidgetFont(fontFamily) {
    const fonts = {
      Poppins: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap',
      Montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap',
      'Playfair Display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&display=swap'
    };
    const href = fonts[fontFamily];
    if (!href || document.querySelector(`link[href="${href}"]`)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function canUseSessionStorage() {
    try {
      window.sessionStorage.setItem('__vr_test', '1');
      window.sessionStorage.removeItem('__vr_test');
      return true;
    } catch {
      return false;
    }
  }

  function socialProofDismissed() {
    if (!canUseSessionStorage()) return false;
    return window.sessionStorage.getItem(socialProofDismissKey) === '1';
  }

  function dismissSocialProof() {
    const toast = document.getElementById(socialProofId);
    if (toast) toast.classList.remove('is-visible');
    if (canUseSessionStorage()) window.sessionStorage.setItem(socialProofDismissKey, '1');
    clearSocialProofTimers();
  }

  function clearSocialProofTimers() {
    if (socialProofTimeout) clearTimeout(socialProofTimeout);
    if (socialProofTimer) clearInterval(socialProofTimer);
    socialProofTimeout = null;
    socialProofTimer = null;
  }

  function removeSocialProofToast() {
    clearSocialProofTimers();
    document.getElementById(socialProofId)?.remove();
  }

  function renderSocialProofToast(reviews, settings) {
    const isPlatformPage = ['/admin.html', '/login.html', '/avaliar.html'].includes(window.location.pathname);
    if (isPlatformPage) return removeSocialProofToast();
    if (isCheckoutLikePage()) return removeSocialProofToast();
    if (settings.socialProofEnabled === false) return removeSocialProofToast();
    if (settings.productContext && settings.socialProofProduct === false) return removeSocialProofToast();
    if (!settings.productContext && settings.socialProofHome === false) return removeSocialProofToast();
    if (!reviews.length || socialProofDismissed()) return removeSocialProofToast();

    let toast = document.getElementById(socialProofId);
    if (!toast) {
      toast = document.createElement('aside');
      toast.id = socialProofId;
      toast.className = 'vr-social-proof';
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }

    toast.style.setProperty('--vr-brand', settings.brandColor || defaultSettings.brandColor);

    const showReview = () => {
      const review = reviews[socialProofIndex % reviews.length];
      socialProofIndex += 1;
      toast.innerHTML = `
        <img loading="lazy" src="${escapeHtml(review.imageUrl)}" alt="">
        <div>
          <p class="vr-social-proof__kicker">${escapeHtml(settings.socialProofLabel || defaultSettings.socialProofLabel)}</p>
          <p class="vr-social-proof__title">${escapeHtml(review.customerName)} avaliou ${escapeHtml(review.productName)}</p>
          <p class="vr-social-proof__text">${escapeHtml(review.comment)}</p>
          <div class="vr-social-proof__stars">${stars(review.rating)}</div>
        </div>
        <button class="vr-social-proof__close" type="button" aria-label="Fechar">×</button>
      `;
      toast.querySelector('.vr-social-proof__close')?.addEventListener('click', dismissSocialProof);
      toast.classList.add('is-visible');
      window.setTimeout(() => toast.classList.remove('is-visible'), 8500);
    };

    if (socialProofTimeout) clearTimeout(socialProofTimeout);
    if (socialProofTimer) clearInterval(socialProofTimer);
    const delay = Math.max(2, Math.min(60, Number(settings.socialProofDelaySeconds || defaultSettings.socialProofDelaySeconds))) * 1000;
    const interval = Math.max(10, Math.min(180, Number(settings.socialProofIntervalSeconds || defaultSettings.socialProofIntervalSeconds))) * 1000;
    socialProofTimeout = window.setTimeout(showReview, delay);
    socialProofTimer = window.setInterval(showReview, interval);
  }

  function render(mount, reviews, settings) {
    placeMount(mount, settings);
    renderConversionBlock(reviews, settings, mount);
    renderProductTrustBadge(reviews, settings);
    renderSocialProofToast(reviews, settings);

    const productContext = settings.productContext || null;
    if (!reviews.length && !productContext) {
      mount.innerHTML = '';
      return;
    }

    const cards = reviews.slice(0, settings.maxReviews).map((review) => `
      <article class="vr-card">
        <img class="vr-card__image" data-vr-card-photo="${escapeHtml(review.id)}" loading="lazy" src="${escapeHtml(review.imageUrl)}" alt="Cliente usando ${escapeHtml(review.productName)}">
        <div class="vr-card__body">
          <div class="vr-card__stars">${stars(review.rating)}</div>
          <p class="vr-card__comment">${escapeHtml(review.comment)}</p>
          <div class="vr-card__product">${escapeHtml(review.productName)}</div>
          <div class="vr-card__customer">${escapeHtml(review.customerName)} \u00b7 ${escapeHtml(review.verifiedLabel || 'cliente verificada')}</div>
        </div>
      </article>
    `).join('');

    const mode = settings.displayMode === 'carousel' ? 'carousel' : 'grid';
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
          ${cards ? `<div class="vr-widget__grid">${cards}</div>` : '<p class="vr-widget__empty">Este produto ainda n\u00e3o tem avalia\u00e7\u00f5es com foto.</p>'}
          <div class="vr-widget__actions">
            ${productContext ? `<a class="vr-widget__button vr-widget__button--ghost" href="${escapeHtml(submitUrl)}">Avaliar este produto</a>` : ''}
            <button class="vr-widget__button" type="button" data-vr-all-reviews>${escapeHtml(settings.buttonText)}</button>
          </div>
        </div>
      </section>
    `;

    const widget = mount.querySelector('.vr-widget');
    widget?.setAttribute('data-mode', mode);
    widget?.setAttribute('data-product', productContext ? 'true' : 'false');
    widget?.setAttribute('data-count', String(reviews.length));
    widget?.style.setProperty('--vr-bg', settings.backgroundColor || defaultSettings.backgroundColor);
    widget?.style.setProperty('--vr-head-bg', settings.headerBackgroundColor || defaultSettings.headerBackgroundColor);
    widget?.style.setProperty('--vr-text', settings.textColor || defaultSettings.textColor);
    widget?.style.setProperty('--vr-kicker', settings.kickerColor || defaultSettings.kickerColor);
    widget?.style.setProperty('--vr-title', settings.titleColor || defaultSettings.titleColor);
    widget?.style.setProperty('--vr-subtitle', settings.subtitleColor || defaultSettings.subtitleColor);
    loadWidgetFont(settings.fontFamily);
    widget?.style.setProperty('--vr-font', fontStack(settings.fontFamily));
    widget?.style.setProperty('--vr-title-size', `${Math.max(20, Math.min(44, Number(settings.titleFontSize || defaultSettings.titleFontSize)))}px`);
    widget?.style.setProperty('--vr-text-size', `${Math.max(12, Math.min(22, Number(settings.textFontSize || defaultSettings.textFontSize)))}px`);

    mount.querySelector('[data-vr-all-reviews]')?.addEventListener('click', () => openAllReviewsModal(reviews, settings));

    mount.querySelectorAll('[data-vr-card-photo]').forEach((image) => {
      image.addEventListener('click', () => {
        const review = reviews.find((item) => String(item.id) === image.dataset.vrCardPhoto);
        if (review) openReviewLightbox(review);
      });
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

  async function load(overrideSettings = null) {
    ensureStyle();
    try {
      const productContext = getProductContext();
      const query = productContext ? `?productSlug=${encodeURIComponent(productContext.slug)}` : '';
      const response = await fetch(`${baseUrl}/api/reviews${query}`, { cache: 'no-store' });
      const data = await response.json();
      const settings = { ...defaultSettings, ...(data.settings || {}), ...(overrideSettings || {}), productContext };
      if (isCheckoutLikePage()) {
        await waitForPageAnchor();
        document.getElementById('verao-checkout-assist')?.remove();
        document.body.classList.remove('vr-checkout-enhanced');
        document.getElementById(conversionId)?.remove();
        renderCheckoutReviews(data.reviews || [], settings);
        renderSocialProofToast(data.reviews || [], settings);
        setTimeout(() => renderCheckoutReviews(data.reviews || [], settings), 1200);
        return;
      }
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

  window.addEventListener('veraoReviewsRefresh', (event) => {
    load(event.detail?.settings || null);
  });
})();
