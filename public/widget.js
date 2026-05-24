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
  let carouselTimer = null;
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
    conversionUrgency: 'Oferta por tempo limitado',
    qnaEnabled: true,
    lookbookEnabled: true,
    videoShowcaseEnabled: true,
    videoShowcaseHome: true,
    videoShowcaseProduct: true,
    videoShowcaseTitle: 'Clientes usando em video',
    videoShowcaseSubtitle: 'Veja detalhes reais do caimento antes de comprar.',
    videoShowcaseMax: 6
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

  function isVideoReview(review) {
    return review.mediaType === 'video' || /\.(mp4|mov|m4v|webm)(\?|$)/i.test(String(review.mediaUrl || review.imageUrl || ''));
  }

  function reviewMedia(review, className, options = {}) {
    const url = escapeHtml(review.mediaUrl || review.imageUrl);
    const attrs = options.attributes ? ` ${options.attributes}` : '';
    if (isVideoReview(review)) {
      const controls = options.controls ? ' controls' : '';
      const autoplay = options.autoplay ? ' autoplay loop' : '';
      return `<video class="${className}"${attrs} src="${url}" muted playsinline preload="metadata"${controls}${autoplay}></video>`;
    }

    return `<img class="${className}"${attrs} loading="lazy" src="${url}" alt="Cliente usando ${escapeHtml(review.productName)}">`;
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

      .vr-product-proof__photos img,
      .vr-product-proof__photos video {
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

      .vr-qna {
        --vr-brand: #b0565b;
        --vr-title: #111827;
        --vr-subtitle: #4b5563;
        --vr-font: inherit;
        background: #fff;
        border: 1px solid #f0dddd;
        border-radius: 14px;
        box-sizing: border-box;
        clear: both;
        color: var(--vr-title);
        font-family: var(--vr-font);
        margin: 20px 0;
        max-width: 760px;
        padding: 16px;
      }

      .vr-qna,
      .vr-qna * {
        box-sizing: border-box;
      }

      .vr-qna h3 {
        color: var(--vr-title);
        font-size: 18px;
        margin: 0 0 6px;
      }

      .vr-qna__intro {
        color: var(--vr-subtitle);
        font-size: 13px;
        line-height: 1.45;
        margin: 0 0 14px;
      }

      .vr-qna__list {
        display: grid;
        gap: 10px;
        margin-bottom: 14px;
      }

      .vr-qna__item {
        background: #fffafa;
        border: 1px solid #f3e1e3;
        border-radius: 10px;
        padding: 12px;
      }

      .vr-qna__question,
      .vr-qna__answer {
        font-size: 13px;
        line-height: 1.45;
        margin: 0;
      }

      .vr-qna__question {
        color: var(--vr-title);
        font-weight: 800;
      }

      .vr-qna__answer {
        color: var(--vr-subtitle);
        margin-top: 6px;
      }

      .vr-qna form {
        display: grid;
        gap: 8px;
      }

      .vr-qna input,
      .vr-qna textarea {
        border: 1px solid #ead5d8;
        border-radius: 8px;
        font: inherit;
        min-height: 40px;
        padding: 9px 10px;
        width: 100%;
      }

      .vr-qna textarea {
        resize: vertical;
      }

      .vr-qna button {
        background: var(--vr-brand);
        border: 0;
        border-radius: 999px;
        color: #fff;
        cursor: pointer;
        font: inherit;
        font-size: 13px;
        font-weight: 800;
        justify-self: start;
        padding: 10px 16px;
      }

      .vr-qna__message {
        color: var(--vr-brand);
        font-size: 12px;
        font-weight: 800;
        margin: 0;
      }

      .vr-video-showcase {
        --vr-brand: #b0565b;
        --vr-title: #111827;
        --vr-subtitle: #4b5563;
        --vr-font: inherit;
        background: transparent;
        border: 0;
        border-radius: 0;
        box-shadow: none;
        box-sizing: border-box;
        clear: both;
        color: var(--vr-title);
        font-family: var(--vr-font);
        margin: 12px auto 18px;
        max-width: 1180px;
        padding: 0 14px;
        width: calc(100% - 28px);
      }

      .vr-video-showcase,
      .vr-video-showcase * {
        box-sizing: border-box;
      }

      .vr-video-showcase__head {
        display: none !important;
      }

      .vr-video-showcase__head h3 {
        color: var(--vr-title);
        font-size: 18px;
        line-height: 1.2;
        margin: 0;
      }

      .vr-video-showcase__head p {
        color: var(--vr-subtitle);
        font-size: 13px;
        line-height: 1.4;
        margin: 5px 0 0;
      }

      .vr-video-showcase__tag {
        background: #fff7f7;
        border: 1px solid #f0dddd;
        border-radius: 999px;
        color: var(--vr-brand);
        flex: 0 0 auto;
        font-size: 11px;
        font-weight: 900;
        padding: 7px 10px;
        text-transform: uppercase;
      }

      .vr-video-showcase__track {
        display: flex;
        gap: 14px;
        justify-content: flex-start;
        overflow-x: auto;
        overscroll-behavior-x: contain;
        padding: 4px 2px 10px;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
      }

      .vr-video-card {
        background: transparent;
        border: 0;
        cursor: pointer;
        flex: 0 0 118px;
        max-width: 118px;
        min-width: 118px;
        padding: 0;
        position: relative;
        scroll-snap-align: start;
        text-align: center;
      }

      .vr-video-card video {
        aspect-ratio: 9 / 16;
        background: #f4eeee;
        border: 3px solid #fff;
        border-radius: 18px;
        box-shadow: 0 0 0 2px var(--vr-brand), 0 8px 18px rgba(17, 24, 39, .13);
        display: block;
        object-fit: cover;
        object-position: center top;
        width: 112px;
      }

      .vr-video-card__play {
        align-items: center;
        background: rgba(17, 24, 39, .72);
        border-radius: 999px;
        color: #fff;
        display: inline-flex;
        font-size: 10px;
        font-weight: 900;
        height: 24px;
        justify-content: center;
        left: 50%;
        padding-left: 2px;
        position: absolute;
        top: 88px;
        transform: translate(-50%, -50%);
        width: 24px;
      }

      .vr-video-card__body {
        display: block;
        padding: 8px 0 0;
      }

      .vr-video-card strong {
        color: var(--vr-title);
        display: -webkit-box;
        font-size: 11px;
        line-height: 1.25;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .vr-video-card__customer {
        color: var(--vr-brand);
        display: block;
        font-size: 11px;
        font-weight: 800;
        margin-top: 5px;
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

      .vr-checkout-review img,
      .vr-checkout-review video {
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

      .vr-social-proof img,
      .vr-social-proof video {
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

      .vr-modal-reviews__viewport {
        overflow: hidden;
        width: 100%;
      }

      .vr-modal-reviews__track {
        display: flex;
        gap: 16px;
        overflow-x: auto;
        scroll-behavior: smooth;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
      }

      .vr-modal-reviews__track::-webkit-scrollbar {
        display: none;
      }

      .vr-modal-review {
        border: 1px solid #f0dddd;
        border-radius: 12px;
        flex: 0 0 calc((100% - 16px) / 2);
        overflow: hidden;
        scroll-snap-align: start;
      }

      .vr-modal-review img,
      .vr-modal-review video {
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

      .vr-modal-reviews__controls {
        align-items: center;
        display: flex;
        gap: 14px;
        justify-content: center;
        margin-top: 18px;
      }

      .vr-modal-reviews__nav {
        align-items: center;
        background: #fff;
        border: 1px solid #f0dddd;
        border-radius: 999px;
        color: var(--vr-brand, #b0565b);
        cursor: pointer;
        display: inline-flex;
        font-family: inherit;
        font-size: 24px;
        font-weight: 800;
        height: 42px;
        justify-content: center;
        line-height: 1;
        width: 42px;
      }

      .vr-modal-reviews__dots {
        align-items: center;
        display: inline-flex;
        gap: 7px;
      }

      .vr-modal-reviews__dot {
        background: #d8c7c8;
        border: 0;
        border-radius: 999px;
        cursor: pointer;
        height: 8px;
        padding: 0;
        width: 8px;
      }

      .vr-modal-reviews__dot.is-active {
        background: var(--vr-brand, #b0565b);
        width: 18px;
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

        .vr-video-showcase {
          margin: 8px 0 18px;
          overflow: hidden;
          padding: 0;
          width: 100%;
        }

        .vr-video-showcase__head {
          display: none !important;
        }

        .vr-video-showcase__track {
          gap: 12px;
          justify-content: flex-start;
          margin: 0;
          padding: 3px 14px 8px;
          scroll-padding-left: 14px;
        }

        .vr-video-card {
          flex: 0 0 94px;
          max-width: 94px;
          min-width: 94px;
        }

        .vr-video-card video {
          border-width: 2px;
          border-radius: 14px;
          width: 90px;
        }

        .vr-video-card__play {
          font-size: 8px;
          height: 20px;
          left: 50%;
          top: 72px;
          width: 20px;
        }

        .vr-video-card__body {
          padding-top: 6px;
        }

        .vr-video-card strong {
          display: none;
        }

        .vr-video-card__customer {
          font-size: 10px;
          margin-top: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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

        .vr-product-proof__photos img,
        .vr-product-proof__photos video {
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

        .vr-social-proof img,
        .vr-social-proof video {
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

        .vr-modal-review {
          flex-basis: 100%;
        }

        .vr-modal-reviews__nav {
          height: 38px;
          width: 38px;
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
          ${reviewMedia(review, 'vr-lightbox__image', { controls: true })}
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
    });
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

    const hiddenHeads = Array.from(document.querySelectorAll('.vr-widget__head'));
    hiddenHeads.forEach((head) => {
      head.dataset.vrPreviousDisplay = head.style.display || '';
      head.style.setProperty('display', 'none', 'important');
    });

    lightbox.innerHTML = `
      <div class="vr-lightbox__dialog vr-lightbox__dialog--reviews" role="dialog" aria-modal="true" aria-label="Todas as avalia\u00e7\u00f5es com foto">
        <button class="vr-lightbox__close" type="button" aria-label="Fechar">×</button>
        <section class="vr-modal-reviews" style="--vr-brand: ${escapeHtml(settings.brandColor || defaultSettings.brandColor)};">
          <div class="vr-modal-reviews__viewport">
            <div class="vr-modal-reviews__track" data-vr-modal-track>
              ${visibleReviews.map((review) => `
                <article class="vr-modal-review">
                  ${reviewMedia(review, 'vr-modal-review__media', { controls: true })}
                  <div class="vr-modal-review__body">
                    <div class="vr-modal-review__stars">${stars(review.rating)}</div>
                    <p class="vr-modal-review__text">${escapeHtml(review.comment)}</p>
                    <div class="vr-modal-review__product">${escapeHtml(review.productName)}</div>
                    <div class="vr-modal-review__customer">${escapeHtml(review.customerName)} \u00b7 ${escapeHtml(review.verifiedLabel || 'cliente verificada')}</div>
                  </div>
                </article>
              `).join('')}
            </div>
          </div>
          ${visibleReviews.length > 1 ? `
            <div class="vr-modal-reviews__controls" aria-label="Controle do carrossel de avalia\u00e7\u00f5es">
              <button class="vr-modal-reviews__nav" type="button" data-vr-modal-prev aria-label="Avalia\u00e7\u00e3o anterior">\u2039</button>
              <div class="vr-modal-reviews__dots" data-vr-modal-dots></div>
              <button class="vr-modal-reviews__nav" type="button" data-vr-modal-next aria-label="Pr\u00f3xima avalia\u00e7\u00e3o">\u203a</button>
            </div>
          ` : ''}
        </section>
      </div>
    `;
    lightbox.hidden = false;
    document.body.classList.add('vr-reviews-modal-open');
    const track = lightbox.querySelector('[data-vr-modal-track]');
    const dots = lightbox.querySelector('[data-vr-modal-dots]');
    const prev = lightbox.querySelector('[data-vr-modal-prev]');
    const next = lightbox.querySelector('[data-vr-modal-next]');
    let currentPage = 0;
    let scrollTimer = null;

    const perPage = () => window.matchMedia('(max-width: 640px)').matches ? 1 : 2;
    const pageCount = () => Math.max(1, Math.ceil(visibleReviews.length / perPage()));
    const pageWidth = () => track ? track.clientWidth + 16 : 0;
    const goToPage = (page) => {
      if (!track) return;
      currentPage = Math.max(0, Math.min(page, pageCount() - 1));
      track.scrollTo({ left: currentPage * pageWidth(), behavior: 'smooth' });
      renderDots();
    };
    const renderDots = () => {
      if (!dots) return;
      const total = pageCount();
      currentPage = Math.min(currentPage, total - 1);
      dots.innerHTML = Array.from({ length: total }).map((_, index) => `
        <button class="vr-modal-reviews__dot${index === currentPage ? ' is-active' : ''}" type="button" data-vr-modal-page="${index}" aria-label="Ir para avalia\u00e7\u00f5es ${index + 1}"></button>
      `).join('');
      dots.querySelectorAll('[data-vr-modal-page]').forEach((button) => {
        button.addEventListener('click', () => goToPage(Number(button.dataset.vrModalPage)));
      });
    };
    const onResize = () => {
      renderDots();
      goToPage(currentPage);
    };

    renderDots();
    prev?.addEventListener('click', () => goToPage(currentPage - 1));
    next?.addEventListener('click', () => goToPage(currentPage + 1));
    track?.addEventListener('scroll', () => {
      if (scrollTimer) window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        const nextPage = Math.round(track.scrollLeft / Math.max(1, pageWidth()));
        if (nextPage !== currentPage) {
          currentPage = Math.max(0, Math.min(nextPage, pageCount() - 1));
          renderDots();
        }
      }, 80);
    });
    window.addEventListener('resize', onResize, { passive: true });

    const closeModal = () => {
      lightbox.hidden = true;
      document.body.classList.remove('vr-reviews-modal-open');
      window.removeEventListener('resize', onResize);
      hiddenHeads.forEach((head) => {
        head.style.display = head.dataset.vrPreviousDisplay || '';
        delete head.dataset.vrPreviousDisplay;
      });
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
            ${reviewMedia(review, 'vr-product-proof__media')}
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
              ${reviewMedia(review, 'vr-checkout-review__media')}
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

  async function renderProductQuestions(settings, mount) {
    const existing = document.querySelector('.vr-qna');
    const productContext = settings.productContext;
    if (!productContext || settings.qnaEnabled === false || isCheckoutLikePage()) {
      existing?.remove();
      return;
    }

    const anchor = mount?.querySelector('.vr-widget') || document.querySelector('.vr-widget') || document.querySelector('.vr-product-proof') || productTrustAnchor();
    if (!anchor) return;

    const block = existing || document.createElement('section');
    block.className = 'vr-qna';
    block.style.setProperty('--vr-brand', settings.brandColor || defaultSettings.brandColor);
    block.style.setProperty('--vr-title', settings.titleColor || defaultSettings.titleColor);
    block.style.setProperty('--vr-subtitle', settings.subtitleColor || defaultSettings.subtitleColor);
    block.style.setProperty('--vr-font', fontStack(settings.fontFamily));
    block.innerHTML = `
      <h3>Perguntas sobre este produto</h3>
      <p class="vr-qna__intro">Tire suas duvidas antes de comprar. A resposta aparece aqui depois da loja responder.</p>
      <div class="vr-qna__list"></div>
      <form class="vr-qna__form">
        <input name="customerName" maxlength="80" placeholder="Seu nome">
        <textarea name="question" rows="3" maxlength="500" required placeholder="Digite sua pergunta"></textarea>
        <button type="submit">Enviar pergunta</button>
        <p class="vr-qna__message" aria-live="polite"></p>
      </form>
    `;

    if (anchor.nextElementSibling !== block) {
      anchor.insertAdjacentElement('afterend', block);
    }

    try {
      const response = await fetch(`${baseUrl}/api/questions?productSlug=${encodeURIComponent(productContext.slug)}`, { cache: 'no-store' });
      const data = await response.json();
      const questions = data.questions || [];
      const list = block.querySelector('.vr-qna__list');
      list.innerHTML = questions.slice(0, 6).map((question) => `
        <article class="vr-qna__item">
          <p class="vr-qna__question">P: ${escapeHtml(question.question)}</p>
          <p class="vr-qna__answer">R: ${escapeHtml(question.answer)}</p>
        </article>
      `).join('');
    } catch (error) {
      console.warn('[Ver\u00e3o Reviews] Nao foi possivel carregar perguntas.', error);
    }

    const questionForm = block.querySelector('.vr-qna__form');
    if (questionForm?.dataset.bound === 'true') return;
    if (questionForm) questionForm.dataset.bound = 'true';
    questionForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const message = form.querySelector('.vr-qna__message');
      message.textContent = 'Enviando pergunta...';
      const payload = {
        customerName: form.customerName.value,
        question: form.question.value,
        productName: productContext.name,
        productUrl: productContext.url,
        productSlug: productContext.slug
      };
      const response = await fetch(`${baseUrl}/api/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        message.textContent = data.error || 'Nao foi possivel enviar.';
        return;
      }
      form.reset();
      message.textContent = data.message || 'Pergunta enviada.';
    }, { once: true });
  }

  function videoShowcaseShouldShow(settings, videos) {
    if (settings.videoShowcaseEnabled === false || isCheckoutLikePage()) return false;
    if (!videos.length) return false;
    if (settings.productContext) return settings.videoShowcaseProduct !== false;
    return settings.videoShowcaseHome !== false;
  }

  function placeVideoShowcase(block, mount, settings) {
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

    if (mount && mount.previousElementSibling !== block) {
      mount.insertAdjacentElement('beforebegin', block);
    } else if (!block.parentElement) {
      document.body.appendChild(block);
    }
  }

  function renderVideoShowcase(reviews, settings, mount) {
    const existing = document.querySelector('.vr-video-showcase');
    const maxVideos = Math.max(2, Math.min(12, Number(settings.videoShowcaseMax || defaultSettings.videoShowcaseMax)));
    const videos = (reviews || []).filter(isVideoReview).slice(0, maxVideos);
    if (!videoShowcaseShouldShow(settings, videos)) {
      existing?.remove();
      return;
    }

    const block = existing || document.createElement('section');
    block.className = 'vr-video-showcase';
    block.style.setProperty('--vr-brand', settings.brandColor || defaultSettings.brandColor);
    block.style.setProperty('--vr-title', settings.titleColor || defaultSettings.titleColor);
    block.style.setProperty('--vr-subtitle', settings.subtitleColor || defaultSettings.subtitleColor);
    block.style.setProperty('--vr-font', fontStack(settings.fontFamily));
    block.innerHTML = `
      <div class="vr-video-showcase__track">
        ${videos.map((review, index) => `
          <button class="vr-video-card" type="button" data-vr-video="${index}" aria-label="Abrir video de ${escapeHtml(review.customerName)}">
            ${reviewMedia(review, 'vr-video-card__media', { autoplay: true })}
            <span class="vr-video-card__play">▶</span>
            <span class="vr-video-card__body">
              <strong>${escapeHtml(review.productName)}</strong>
              <span class="vr-video-card__customer">${escapeHtml(review.customerName || 'Cliente')}</span>
            </span>
          </button>
        `).join('')}
      </div>
    `;

    placeVideoShowcase(block, mount, settings);
    block.querySelectorAll('[data-vr-video]').forEach((button) => {
      button.addEventListener('click', () => openReviewLightbox(videos[Number(button.dataset.vrVideo)]));
    });
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
        ${reviewMedia(review, 'vr-social-proof__media')}
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
    renderVideoShowcase(reviews, settings, mount);
    renderSocialProofToast(reviews, settings);

    const productContext = settings.productContext || null;
    if (!reviews.length && !productContext) {
      mount.innerHTML = '';
      return;
    }

    const cards = reviews.slice(0, settings.maxReviews).map((review) => `
      <article class="vr-card">
        ${reviewMedia(review, 'vr-card__image', { attributes: `data-vr-card-photo="${escapeHtml(review.id)}"` })}
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
    let carouselIndex = 0;
    const visibleCardCount = () => {
      if (!track) return 1;
      const cards = Array.from(track.querySelectorAll('.vr-card'));
      const firstCard = cards[0];
      if (!firstCard) return 1;
      const style = window.getComputedStyle(track);
      const gap = parseFloat(style.columnGap || style.gap || '16') || 16;
      const cardWidth = firstCard.getBoundingClientRect().width + gap;
      return Math.max(1, Math.floor((track.clientWidth + gap) / cardWidth));
    };
    const rotateCarousel = (direction) => {
      if (!track) return;
      const cards = Array.from(track.querySelectorAll('.vr-card'));
      const maxIndex = Math.max(0, cards.length - visibleCardCount());
      if (!cards.length || maxIndex < 1) return;

      carouselIndex += direction;
      if (carouselIndex > maxIndex) carouselIndex = 0;
      if (carouselIndex < 0) carouselIndex = maxIndex;

      track.scrollTo({
        left: cards[carouselIndex].offsetLeft - track.offsetLeft,
        behavior: 'smooth'
      });
    };
    prev?.addEventListener('click', () => rotateCarousel(-1));
    next?.addEventListener('click', () => rotateCarousel(1));

    if (mode === 'carousel' && track && track.scrollWidth > track.clientWidth) {
      let paused = false;
      const setPaused = (value) => {
        paused = value;
      };

      track.addEventListener('mouseenter', () => setPaused(true));
      track.addEventListener('mouseleave', () => setPaused(false));
      track.addEventListener('touchstart', () => setPaused(true), { passive: true });
      track.addEventListener('touchend', () => setPaused(false), { passive: true });
      if (carouselTimer) window.clearInterval(carouselTimer);
      carouselTimer = window.setInterval(() => {
        if (!paused && document.visibilityState === 'visible') rotateCarousel(1);
      }, 4500);
    }

    renderProductQuestions(settings, mount);
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
