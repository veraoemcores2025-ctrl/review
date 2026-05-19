const grid = document.querySelector('#lookbookGrid');

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

function isVideo(review) {
  return review.mediaType === 'video' || /\.(mp4|mov|m4v|webm)(\?|$)/i.test(String(review.mediaUrl || review.imageUrl || ''));
}

function media(review) {
  const url = escapeHtml(review.mediaUrl || review.imageUrl);
  if (isVideo(review)) return `<video src="${url}" controls playsinline preload="metadata"></video>`;
  return `<img src="${url}" alt="Cliente usando ${escapeHtml(review.productName)}" loading="lazy">`;
}

async function loadLookbook() {
  grid.innerHTML = '<p>Carregando fotos reais...</p>';
  const response = await fetch('/api/lookbook', { cache: 'no-store' });
  const data = await response.json();
  const reviews = data.reviews || [];

  if (!reviews.length) {
    grid.innerHTML = '<p>Nenhuma foto aprovada ainda.</p>';
    return;
  }

  grid.innerHTML = reviews.map((review) => `
    <article class="lookbook-card">
      ${review.productUrl ? `<a href="${escapeHtml(review.productUrl)}">` : ''}
        ${media(review)}
        <div class="lookbook-card__body">
          <div class="lookbook-card__stars">${stars(review.rating)}</div>
          <p>${escapeHtml(review.comment)}</p>
          <strong>${escapeHtml(review.productName)}</strong>
          <span>${escapeHtml(review.customerName)} · ${escapeHtml(review.verifiedLabel || 'cliente verificada')}</span>
        </div>
      ${review.productUrl ? '</a>' : ''}
    </article>
  `).join('');
}

loadLookbook().catch(() => {
  grid.innerHTML = '<p>Nao foi possivel carregar o lookbook agora.</p>';
});
