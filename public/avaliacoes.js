const grid = document.querySelector('#reviewsGrid');
const averageRating = document.querySelector('#averageRating');
const totalReviews = document.querySelector('#totalReviews');

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

async function loadReviews() {
  const response = await fetch('/api/reviews', { cache: 'no-store' });
  const data = await response.json();
  const reviews = data.reviews || [];
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
    : 0;

  averageRating.textContent = average.toFixed(1);
  totalReviews.textContent = reviews.length;

  grid.innerHTML = reviews.map((review) => `
    <article class="review-card">
      <img src="${escapeHtml(review.imageUrl)}" alt="Cliente usando ${escapeHtml(review.productName)}">
      <div class="review-card__body">
        <div class="review-card__stars">${stars(review.rating)}</div>
        <p class="review-card__comment">${escapeHtml(review.comment)}</p>
        <div class="review-card__product">${escapeHtml(review.productName)}</div>
        <div class="review-card__customer">${escapeHtml(review.customerName)} · ${escapeHtml(review.verifiedLabel || 'cliente verificada')}</div>
      </div>
    </article>
  `).join('') || '<p class="empty">Ainda não há avaliações aprovadas para exibir.</p>';
}

loadReviews().catch(() => {
  grid.innerHTML = '<p class="empty">Não foi possível carregar as avaliações agora.</p>';
});
