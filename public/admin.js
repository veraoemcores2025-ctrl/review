const form = document.querySelector('#reviewForm');
const settingsForm = document.querySelector('#settingsForm');
const message = document.querySelector('#formMessage');
const settingsMessage = document.querySelector('#settingsMessage');
const reviewsList = document.querySelector('#reviewsList');
const refreshButton = document.querySelector('#refreshButton');
const logoutButton = document.querySelector('#logoutButton');

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function stars(count) {
  return '★★★★★'.slice(0, count) + '☆☆☆☆☆'.slice(0, 5 - count);
}

async function fetchAdmin(url, options = {}) {
  const response = await fetch(url, options);
  if (response.status === 401) {
    window.location.href = '/login.html';
    throw new Error('unauthorized');
  }
  return response;
}

async function loadReviews() {
  const response = await fetchAdmin('/api/admin/reviews');
  const data = await response.json();

  reviewsList.innerHTML = data.reviews.map((review) => `
    <article class="admin-review" data-active="${review.active}">
      <img src="${escapeHtml(review.imageUrl)}" alt="">
      <div>
        <h3>${escapeHtml(review.customerName)}</h3>
        <strong>${escapeHtml(review.productName)}</strong>
        <p>${stars(review.rating)} · ${review.active ? 'ativo' : 'oculto'}</p>
        <p>${escapeHtml(review.comment)}</p>
      </div>
      <div class="actions">
        <button class="ghost" type="button" data-edit="${review.id}">Editar</button>
        <button class="ghost" type="button" data-toggle="${review.id}">${review.active ? 'Ocultar' : 'Mostrar'}</button>
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
          Comentário
          <textarea name="comment" rows="3">${escapeHtml(review.comment)}</textarea>
        </label>
        <button class="button" type="button" data-save-edit="${review.id}">Salvar edição</button>
      </form>
    </article>
  `).join('') || '<p class="message">Nenhuma avaliação cadastrada ainda.</p>';
}

async function loadSettings() {
  const response = await fetchAdmin('/api/admin/settings');
  const data = await response.json();
  const settings = data.settings;
  settingsForm.title.value = settings.title;
  settingsForm.kicker.value = settings.kicker;
  settingsForm.subtitle.value = settings.subtitle;
  settingsForm.buttonText.value = settings.buttonText;
  settingsForm.buttonUrl.value = settings.buttonUrl;
  settingsForm.brandColor.value = settings.brandColor;
  settingsForm.maxReviews.value = settings.maxReviews;
  settingsForm.hideNativeHomeReviews.checked = Boolean(settings.hideNativeHomeReviews);
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
    message.textContent = data.error || 'Não foi possível salvar.';
    return;
  }

  form.reset();
  form.active.checked = true;
  form.verifiedLabel.value = 'cliente verificada';
  message.textContent = 'Avaliação salva.';
  await loadReviews();
  window.dispatchEvent(new Event('veraoReviewsRefresh'));
});

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  settingsMessage.textContent = 'Salvando configuração...';
  const formData = new FormData(settingsForm);
  const payload = Object.fromEntries(formData.entries());
  payload.hideNativeHomeReviews = settingsForm.hideNativeHomeReviews.checked;
  payload.maxReviews = Number(payload.maxReviews);

  const response = await fetchAdmin('/api/admin/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    settingsMessage.textContent = 'Não foi possível salvar a configuração.';
    return;
  }

  settingsMessage.textContent = 'Configuração salva.';
  window.dispatchEvent(new Event('veraoReviewsRefresh'));
});

reviewsList.addEventListener('click', async (event) => {
  const editId = event.target.dataset.edit;
  const saveEditId = event.target.dataset.saveEdit;
  const toggleId = event.target.dataset.toggle;
  const deleteId = event.target.dataset.delete;

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
      body: JSON.stringify({ active: !isActive })
    });
    await loadReviews();
    window.dispatchEvent(new Event('veraoReviewsRefresh'));
  }

  if (deleteId && confirm('Excluir esta avaliação?')) {
    await fetchAdmin(`/api/admin/reviews/${deleteId}`, { method: 'DELETE' });
    await loadReviews();
    window.dispatchEvent(new Event('veraoReviewsRefresh'));
  }
});

logoutButton.addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

refreshButton.addEventListener('click', loadReviews);
await loadSettings();
await loadReviews();
