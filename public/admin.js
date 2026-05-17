const form = document.querySelector('#reviewForm');
const settingsForm = document.querySelector('#settingsForm');
const message = document.querySelector('#formMessage');
const settingsMessage = document.querySelector('#settingsMessage');
const reviewsList = document.querySelector('#reviewsList');
const refreshButton = document.querySelector('#refreshButton');
const logoutButton = document.querySelector('#logoutButton');
const reviewSearch = document.querySelector('#reviewSearch');
const reviewFilter = document.querySelector('#reviewFilter');
const metricTotal = document.querySelector('#metricTotal');
const metricPending = document.querySelector('#metricPending');
const metricActive = document.querySelector('#metricActive');
const metricRating = document.querySelector('#metricRating');

let allReviews = [];

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function stars(count) {
  return '\u2605\u2605\u2605\u2605\u2605'.slice(0, count) + '\u2606\u2606\u2606\u2606\u2606'.slice(0, 5 - count);
}

function reviewStatus(review) {
  if (review.status === 'pending') return 'pendente';
  if (review.status === 'rejected') return 'reprovada';
  return review.active ? 'ativo' : 'oculto';
}

function isApproved(review) {
  return review.status !== 'pending' && review.status !== 'rejected';
}

function isVisible(review) {
  return isApproved(review) && review.active;
}

function statusClass(review) {
  if (review.status === 'pending') return 'status-pending';
  if (review.status === 'rejected') return 'status-rejected';
  return review.active ? 'status-active' : 'status-hidden';
}

async function fetchAdmin(url, options = {}) {
  const response = await fetch(url, options);
  if (response.status === 401) {
    window.location.href = '/login.html';
    throw new Error('unauthorized');
  }
  return response;
}

function updateMetrics() {
  const approved = allReviews.filter(isApproved);
  const active = allReviews.filter(isVisible);
  const pending = allReviews.filter((review) => review.status === 'pending');
  const average = approved.length
    ? approved.reduce((sum, review) => sum + Number(review.rating || 0), 0) / approved.length
    : 0;

  metricTotal.textContent = allReviews.length;
  metricPending.textContent = pending.length;
  metricActive.textContent = active.length;
  metricRating.textContent = average.toFixed(1);
}

function matchesFilter(review, filter) {
  if (filter === 'pending') return review.status === 'pending';
  if (filter === 'approved') return isApproved(review);
  if (filter === 'active') return isVisible(review);
  if (filter === 'hidden') return isApproved(review) && !review.active;
  if (filter === 'rejected') return review.status === 'rejected';
  return true;
}

function renderReviews() {
  const search = normalize(reviewSearch?.value || '');
  const filter = reviewFilter?.value || 'all';
  const filteredReviews = allReviews.filter((review) => {
    const text = normalize([
      review.customerName,
      review.productName,
      review.comment,
      review.verifiedLabel
    ].join(' '));

    return matchesFilter(review, filter) && (!search || text.includes(search));
  });

  reviewsList.innerHTML = filteredReviews.map((review) => `
    <article class="admin-review" data-active="${review.active}">
      <img src="${escapeHtml(review.imageUrl)}" alt="">
      <div>
        <h3>${escapeHtml(review.customerName)}</h3>
        <strong>${escapeHtml(review.productName)}</strong>
        <div class="review-meta">
          <span class="stars">${stars(Number(review.rating || 0))}</span>
          <span class="status-pill ${statusClass(review)}">${reviewStatus(review)}</span>
        </div>
        ${review.productUrl ? `<p><a href="${escapeHtml(review.productUrl)}" target="_blank" rel="noopener">Ver produto</a></p>` : ''}
        <p>${escapeHtml(review.comment)}</p>
      </div>
      <div class="actions">
        ${review.status === 'pending' ? `<button class="ghost" type="button" data-approve="${review.id}">Aprovar</button>` : ''}
        <button class="ghost" type="button" data-edit="${review.id}">Editar</button>
        <button class="ghost" type="button" data-toggle="${review.id}">${review.active ? 'Ocultar' : 'Mostrar'}</button>
        ${review.status === 'pending' ? `<button class="ghost danger" type="button" data-reject="${review.id}">Reprovar</button>` : ''}
        <button class="ghost danger" type="button" data-delete="${review.id}">Excluir</button>
      </div>
      <form class="edit-review" data-edit-form="${review.id}" hidden>
        <label>
          Nome
          <input name="customerName" value="${escapeHtml(review.customerName)}">
        </label>
        <label>
          Produto
          <input name="productName" value="${escapeHtml(review.productName)}">
        </label>
        <label class="wide">
          Link do produto
          <input name="productUrl" value="${escapeHtml(review.productUrl || '')}">
        </label>
        <label>
          Nota
          <select name="rating">
            ${[5, 4, 3, 2, 1].map((rating) => `<option value="${rating}" ${Number(review.rating) === rating ? 'selected' : ''}>${rating} estrela${rating > 1 ? 's' : ''}</option>`).join('')}
          </select>
        </label>
        <label>
          Selo
          <input name="verifiedLabel" value="${escapeHtml(review.verifiedLabel)}">
        </label>
        <label class="wide">
          Comentario
          <textarea name="comment" rows="3">${escapeHtml(review.comment)}</textarea>
        </label>
        <button class="button" type="button" data-save-edit="${review.id}">Salvar edicao</button>
      </form>
    </article>
  `).join('') || '<p class="message">Nenhuma avaliacao encontrada.</p>';
}

async function loadReviews() {
  const response = await fetchAdmin('/api/admin/reviews');
  const data = await response.json();
  allReviews = data.reviews || [];
  updateMetrics();
  renderReviews();
}

async function loadSettings() {
  const response = await fetchAdmin('/api/admin/settings');
  const data = await response.json();
  const settings = data.settings;
  settingsForm.title.value = settings.title;
  settingsForm.kicker.value = settings.kicker;
  settingsForm.subtitle.value = settings.subtitle;
  settingsForm.kickerColor.value = settings.kickerColor || '#b0565b';
  settingsForm.titleColor.value = settings.titleColor || '#111827';
  settingsForm.subtitleColor.value = settings.subtitleColor || '#4b5563';
  settingsForm.buttonText.value = settings.buttonText;
  settingsForm.buttonUrl.value = settings.buttonUrl;
  settingsForm.brandColor.value = settings.brandColor;
  settingsForm.backgroundColor.value = settings.backgroundColor || '#fff7f7';
  settingsForm.headerBackgroundColor.value = settings.headerBackgroundColor || '#f4f6f5';
  settingsForm.textColor.value = settings.textColor || '#222222';
  settingsForm.displayMode.value = settings.displayMode || 'grid';
  settingsForm.maxReviews.value = settings.maxReviews;
  settingsForm.hideNativeHomeReviews.checked = Boolean(settings.hideNativeHomeReviews);
  settingsForm.socialProofEnabled.checked = settings.socialProofEnabled !== false;
  settingsForm.socialProofHome.checked = settings.socialProofHome !== false;
  settingsForm.socialProofProduct.checked = settings.socialProofProduct !== false;
  settingsForm.socialProofLabel.value = settings.socialProofLabel || 'Cliente real aprovou';
  settingsForm.socialProofDelaySeconds.value = settings.socialProofDelaySeconds || 6;
  settingsForm.socialProofIntervalSeconds.value = settings.socialProofIntervalSeconds || 26;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = 'Salvando...';

  const formData = new FormData(form);
  const response = await fetchAdmin('/api/admin/reviews', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    message.textContent = data.error || 'Nao foi possivel salvar.';
    return;
  }

  form.reset();
  form.active.checked = true;
  form.verifiedLabel.value = 'cliente verificada';
  message.textContent = 'Avaliacao salva.';
  await loadReviews();
  window.dispatchEvent(new Event('veraoReviewsRefresh'));
});

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  settingsMessage.textContent = 'Salvando configuracao...';
  const formData = new FormData(settingsForm);
  const payload = Object.fromEntries(formData.entries());
  payload.hideNativeHomeReviews = settingsForm.hideNativeHomeReviews.checked;
  payload.socialProofEnabled = settingsForm.socialProofEnabled.checked;
  payload.socialProofHome = settingsForm.socialProofHome.checked;
  payload.socialProofProduct = settingsForm.socialProofProduct.checked;
  payload.maxReviews = Number(payload.maxReviews);
  payload.displayMode = settingsForm.displayMode.value;
  payload.socialProofDelaySeconds = Number(payload.socialProofDelaySeconds);
  payload.socialProofIntervalSeconds = Number(payload.socialProofIntervalSeconds);

  const response = await fetchAdmin('/api/admin/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    settingsMessage.textContent = 'Nao foi possivel salvar a configuracao.';
    return;
  }

  settingsMessage.textContent = 'Configuracao salva.';
  window.dispatchEvent(new Event('veraoReviewsRefresh'));
});

reviewsList.addEventListener('click', async (event) => {
  const editId = event.target.dataset.edit;
  const saveEditId = event.target.dataset.saveEdit;
  const toggleId = event.target.dataset.toggle;
  const deleteId = event.target.dataset.delete;
  const approveId = event.target.dataset.approve;
  const rejectId = event.target.dataset.reject;

  if (editId) {
    const editForm = reviewsList.querySelector(`[data-edit-form="${editId}"]`);
    editForm.hidden = !editForm.hidden;
  }

  if (saveEditId) {
    const editForm = reviewsList.querySelector(`[data-edit-form="${saveEditId}"]`);
    const formData = new FormData(editForm);
    const payload = Object.fromEntries(formData.entries());
    payload.rating = Number(payload.rating);

    await fetchAdmin(`/api/admin/reviews/${saveEditId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    await loadReviews();
    window.dispatchEvent(new Event('veraoReviewsRefresh'));
  }

  if (toggleId) {
    const card = event.target.closest('.admin-review');
    const isActive = card.dataset.active === 'true';
    await fetchAdmin(`/api/admin/reviews/${toggleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !isActive, status: 'approved' })
    });
    await loadReviews();
    window.dispatchEvent(new Event('veraoReviewsRefresh'));
  }

  if (approveId) {
    await fetchAdmin(`/api/admin/reviews/${approveId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' })
    });
    await loadReviews();
    window.dispatchEvent(new Event('veraoReviewsRefresh'));
  }

  if (rejectId) {
    await fetchAdmin(`/api/admin/reviews/${rejectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', active: false })
    });
    await loadReviews();
    window.dispatchEvent(new Event('veraoReviewsRefresh'));
  }

  if (deleteId && confirm('Excluir esta avaliacao?')) {
    await fetchAdmin(`/api/admin/reviews/${deleteId}`, { method: 'DELETE' });
    await loadReviews();
    window.dispatchEvent(new Event('veraoReviewsRefresh'));
  }
});

logoutButton.addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

reviewSearch?.addEventListener('input', renderReviews);
reviewFilter?.addEventListener('change', renderReviews);
refreshButton.addEventListener('click', loadReviews);

await loadSettings();
await loadReviews();
