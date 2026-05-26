const form = document.querySelector('#reviewForm');
const videoForm = document.querySelector('#videoForm');
const settingsForm = document.querySelector('#settingsForm');
const message = document.querySelector('#formMessage');
const videoFormMessage = document.querySelector('#videoFormMessage');
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
const conversionPreview = document.querySelector('#conversionPreview');
const groupForm = document.querySelector('#groupForm');
const groupMessage = document.querySelector('#groupMessage');
const groupsList = document.querySelector('#groupsList');
const questionsList = document.querySelector('#questionsList');
const refreshQuestionsButton = document.querySelector('#refreshQuestionsButton');
const panels = document.querySelectorAll('[data-panel]');
const panelButtons = document.querySelectorAll('[data-open-panel]');

let allReviews = [];
let allGroups = [];
let allQuestions = [];
let previewTimer = null;

function openPanel(panelName, updateHash = true) {
  const validPanel = [...panels].some((panel) => panel.dataset.panel === panelName);
  const nextPanel = validPanel ? panelName : 'overview';

  panels.forEach((panel) => {
    panel.hidden = panel.dataset.panel !== nextPanel;
  });

  panelButtons.forEach((button) => {
    button.classList.toggle('is-active', button.classList.contains('nav-item') && button.dataset.openPanel === nextPanel);
  });

  if (updateHash) {
    window.history.replaceState(null, '', `#${nextPanel}`);
  }
}

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

function isVideoReview(review) {
  return review.mediaType === 'video' || /\.(mp4|mov|m4v|webm)(\?|$)/i.test(String(review.mediaUrl || review.imageUrl || ''));
}

function reviewMedia(review, className = '') {
  const url = escapeHtml(review.mediaUrl || review.imageUrl);
  if (isVideoReview(review)) {
    return `<video class="${className}" src="${url}" muted playsinline preload="metadata"></video>`;
  }

  return `<img class="${className}" src="${url}" alt="">`;
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

function settingsPayloadFromForm() {
  const formData = new FormData(settingsForm);
  const payload = Object.fromEntries(formData.entries());
  payload.hideNativeHomeReviews = settingsForm.hideNativeHomeReviews.checked;
  payload.socialProofEnabled = settingsForm.socialProofEnabled.checked;
  payload.socialProofHome = settingsForm.socialProofHome.checked;
  payload.socialProofProduct = settingsForm.socialProofProduct.checked;
  payload.conversionEnabled = settingsForm.conversionEnabled.checked;
  payload.conversionHome = settingsForm.conversionHome.checked;
  payload.conversionProduct = settingsForm.conversionProduct.checked;
  payload.conversionCheckout = settingsForm.conversionCheckout.checked;
  payload.orderBumpEnabled = settingsForm.orderBumpEnabled.checked;
  payload.expressShippingEnabled = settingsForm.expressShippingEnabled.checked;
  payload.rewardEnabled = settingsForm.rewardEnabled.checked;
  payload.qnaEnabled = settingsForm.qnaEnabled.checked;
  payload.lookbookEnabled = settingsForm.lookbookEnabled.checked;
  payload.videoShowcaseEnabled = settingsForm.videoShowcaseEnabled.checked;
  payload.videoShowcaseHome = settingsForm.videoShowcaseHome.checked;
  payload.videoShowcaseProduct = settingsForm.videoShowcaseProduct.checked;
  payload.conversionBenefits = String(payload.conversionBenefits || '')
    .split(/\n|\|/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join('|');
  payload.maxReviews = Number(payload.maxReviews);
  payload.displayMode = settingsForm.displayMode.value;
  payload.titleFontSize = Number(payload.titleFontSize);
  payload.textFontSize = Number(payload.textFontSize);
  payload.socialProofDelaySeconds = Number(payload.socialProofDelaySeconds);
  payload.socialProofIntervalSeconds = Number(payload.socialProofIntervalSeconds);
  payload.videoShowcaseMax = Number(payload.videoShowcaseMax);
  return payload;
}

function updatePreviewFromForm() {
  updateConversionPreview();
  if (previewTimer) window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('veraoReviewsRefresh', {
      detail: { settings: settingsPayloadFromForm() }
    }));
  }, 180);
}

function benefitsFromFormText(value) {
  return String(value || '')
    .split(/\n|\|/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function updateConversionPreview() {
  if (!conversionPreview || !settingsForm.conversionTitle) return;
  const title = settingsForm.conversionTitle.value || 'Compra segura na Verao em Cores';
  const text = settingsForm.conversionText.value || 'Fotos reais, atendimento proximo e pagamento protegido para comprar com confianca.';
  const urgency = settingsForm.conversionUrgency.value || 'Oferta por tempo limitado';
  const benefits = benefitsFromFormText(settingsForm.conversionBenefits.value || 'Compra segura|Fotos reais de clientes|Pagamento protegido|Atendimento no WhatsApp');

  conversionPreview.querySelector('strong').textContent = title;
  conversionPreview.querySelector('p').textContent = text;
  conversionPreview.querySelector('em').textContent = urgency;
  conversionPreview.querySelector('.conversion-preview-card__pills').innerHTML = benefits
    .map((item) => `<span>${escapeHtml(item)}</span>`)
    .join('');
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
      ${reviewMedia(review, 'admin-review__media')}
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

function renderGroups() {
  groupsList.innerHTML = allGroups.map((group) => `
    <article class="simple-item">
      <div>
        <h3>${escapeHtml(group.name || group.mainSlug)}</h3>
        <p><strong>Principal:</strong> ${escapeHtml(group.mainSlug)}</p>
        <p><strong>Relacionados:</strong> ${escapeHtml((group.relatedSlugs || []).join(', '))}</p>
      </div>
      <div class="actions">
        <button class="ghost danger" type="button" data-delete-group="${escapeHtml(group.id)}">Excluir</button>
      </div>
    </article>
  `).join('') || '<p class="message">Nenhum grupo criado ainda.</p>';
}

async function loadGroups() {
  const response = await fetchAdmin('/api/admin/groups');
  const data = await response.json();
  allGroups = data.groups || [];
  renderGroups();
}

function questionStatus(question) {
  if (question.status === 'answered') return 'respondida';
  if (question.status === 'rejected') return 'oculta';
  return 'pendente';
}

function renderQuestions() {
  questionsList.innerHTML = allQuestions.map((question) => `
    <article class="simple-item simple-item--stack">
      <div>
        <h3>${escapeHtml(question.productName || question.productSlug)}</h3>
        <p><strong>${escapeHtml(question.customerName || 'Cliente')}</strong> perguntou:</p>
        <p>${escapeHtml(question.question)}</p>
        <span class="status-pill ${question.status === 'answered' ? 'status-active' : question.status === 'rejected' ? 'status-rejected' : 'status-pending'}">${questionStatus(question)}</span>
      </div>
      <form class="answer-form" data-question-form="${escapeHtml(question.id)}">
        <label class="wide">
          Resposta
          <textarea name="answer" rows="3">${escapeHtml(question.answer || '')}</textarea>
        </label>
        <div class="actions">
          <button class="button" type="button" data-answer-question="${escapeHtml(question.id)}">Salvar resposta</button>
          <button class="ghost" type="button" data-hide-question="${escapeHtml(question.id)}">${question.active ? 'Ocultar' : 'Mostrar'}</button>
          <button class="ghost danger" type="button" data-delete-question="${escapeHtml(question.id)}">Excluir</button>
        </div>
      </form>
    </article>
  `).join('') || '<p class="message">Nenhuma pergunta recebida ainda.</p>';
}

async function loadQuestions() {
  const response = await fetchAdmin('/api/admin/questions');
  const data = await response.json();
  allQuestions = data.questions || [];
  renderQuestions();
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
  settingsForm.fontFamily.value = settings.fontFamily || 'inherit';
  settingsForm.titleFontSize.value = settings.titleFontSize || 28;
  settingsForm.textFontSize.value = settings.textFontSize || 15;
  settingsForm.displayMode.value = settings.displayMode || 'grid';
  settingsForm.maxReviews.value = settings.maxReviews;
  settingsForm.hideNativeHomeReviews.checked = Boolean(settings.hideNativeHomeReviews);
  settingsForm.socialProofEnabled.checked = settings.socialProofEnabled !== false;
  settingsForm.socialProofHome.checked = settings.socialProofHome !== false;
  settingsForm.socialProofProduct.checked = settings.socialProofProduct !== false;
  settingsForm.socialProofLabel.value = settings.socialProofLabel || 'Cliente real aprovou';
  settingsForm.socialProofDelaySeconds.value = settings.socialProofDelaySeconds || 6;
  settingsForm.socialProofIntervalSeconds.value = settings.socialProofIntervalSeconds || 26;
  settingsForm.conversionEnabled.checked = settings.conversionEnabled !== false;
  settingsForm.conversionHome.checked = settings.conversionHome !== false;
  settingsForm.conversionProduct.checked = settings.conversionProduct !== false;
  settingsForm.conversionCheckout.checked = Boolean(settings.conversionCheckout);
  settingsForm.conversionTitle.value = settings.conversionTitle || 'Compra segura na Verao em Cores';
  settingsForm.conversionText.value = settings.conversionText || 'Fotos reais, atendimento proximo e pagamento protegido para comprar com confianca.';
  settingsForm.conversionBenefits.value = String(settings.conversionBenefits || 'Compra segura|Fotos reais de clientes|Pagamento protegido|Atendimento no WhatsApp').split('|').join('\n');
  settingsForm.conversionUrgency.value = settings.conversionUrgency || 'Oferta por tempo limitado';
  settingsForm.orderBumpEnabled.checked = Boolean(settings.orderBumpEnabled);
  settingsForm.orderBumpTitle.value = settings.orderBumpTitle || 'Complete seu look';
  settingsForm.orderBumpText.value = settings.orderBumpText || 'Adicione uma peca queridinha com desconto antes de finalizar.';
  settingsForm.orderBumpProductName.value = settings.orderBumpProductName || '';
  settingsForm.orderBumpPrice.value = settings.orderBumpPrice || '';
  settingsForm.orderBumpComparePrice.value = settings.orderBumpComparePrice || '';
  settingsForm.orderBumpImageUrl.value = settings.orderBumpImageUrl || '';
  settingsForm.orderBumpProductUrl.value = settings.orderBumpProductUrl || '';
  settingsForm.orderBumpButtonText.value = settings.orderBumpButtonText || 'Adicionar ao pedido';
  settingsForm.expressShippingEnabled.checked = Boolean(settings.expressShippingEnabled);
  settingsForm.expressShippingTitle.value = settings.expressShippingTitle || 'Frete expresso';
  settingsForm.expressShippingText.value = settings.expressShippingText || 'Seu pedido entra em prioridade para separacao e envio imediato.';
  settingsForm.expressShippingBadge.value = settings.expressShippingBadge || 'Envio imediato';
  settingsForm.expressShippingDeadline.value = settings.expressShippingDeadline || 'Postagem em ate 24h uteis';
  settingsForm.rewardEnabled.checked = settings.rewardEnabled !== false;
  settingsForm.rewardCoupon.value = settings.rewardCoupon || 'VERAO10';
  settingsForm.rewardText.value = settings.rewardText || 'Obrigado por enviar sua foto ou video. Use o cupom VERAO10 na proxima compra.';
  settingsForm.qnaEnabled.checked = settings.qnaEnabled !== false;
  settingsForm.lookbookEnabled.checked = settings.lookbookEnabled !== false;
  settingsForm.videoShowcaseEnabled.checked = settings.videoShowcaseEnabled !== false;
  settingsForm.videoShowcaseHome.checked = settings.videoShowcaseHome !== false;
  settingsForm.videoShowcaseProduct.checked = settings.videoShowcaseProduct !== false;
  settingsForm.videoShowcaseTitle.value = settings.videoShowcaseTitle || 'Clientes usando em video';
  settingsForm.videoShowcaseSubtitle.value = settings.videoShowcaseSubtitle || 'Veja detalhes reais do caimento antes de comprar.';
  settingsForm.videoShowcaseMax.value = settings.videoShowcaseMax || 6;
  updateConversionPreview();
  updatePreviewFromForm();
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

videoForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  videoFormMessage.textContent = 'Salvando video...';

  const formData = new FormData(videoForm);
  const response = await fetchAdmin('/api/admin/reviews', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    videoFormMessage.textContent = data.error || 'Nao foi possivel salvar o video.';
    return;
  }

  videoForm.reset();
  videoFormMessage.textContent = 'Video salvo e aprovado.';
  await loadReviews();
  window.dispatchEvent(new Event('veraoReviewsRefresh'));
});

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  settingsMessage.textContent = 'Salvando configuracao...';
  const payload = settingsPayloadFromForm();

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
  updatePreviewFromForm();
});

groupForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  groupMessage.textContent = 'Salvando grupo...';
  const payload = Object.fromEntries(new FormData(groupForm).entries());
  const response = await fetchAdmin('/api/admin/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    groupMessage.textContent = data.error || 'Nao foi possivel salvar o grupo.';
    return;
  }

  groupForm.reset();
  groupMessage.textContent = 'Grupo salvo.';
  await loadGroups();
  window.dispatchEvent(new Event('veraoReviewsRefresh'));
});

groupsList?.addEventListener('click', async (event) => {
  const deleteId = event.target.dataset.deleteGroup;
  if (deleteId && confirm('Excluir este grupo de produtos?')) {
    await fetchAdmin(`/api/admin/groups/${deleteId}`, { method: 'DELETE' });
    await loadGroups();
    window.dispatchEvent(new Event('veraoReviewsRefresh'));
  }
});

questionsList?.addEventListener('click', async (event) => {
  const answerId = event.target.dataset.answerQuestion;
  const hideId = event.target.dataset.hideQuestion;
  const deleteId = event.target.dataset.deleteQuestion;

  if (answerId) {
    const answer = questionsList.querySelector(`[data-question-form="${answerId}"] textarea`)?.value || '';
    await fetchAdmin(`/api/admin/questions/${answerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer })
    });
    await loadQuestions();
  }

  if (hideId) {
    const question = allQuestions.find((item) => item.id === hideId);
    await fetchAdmin(`/api/admin/questions/${hideId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !question?.active, status: question?.active ? 'rejected' : (question?.answer ? 'answered' : 'pending') })
    });
    await loadQuestions();
  }

  if (deleteId && confirm('Excluir esta pergunta?')) {
    await fetchAdmin(`/api/admin/questions/${deleteId}`, { method: 'DELETE' });
    await loadQuestions();
  }
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
refreshQuestionsButton?.addEventListener('click', loadQuestions);
settingsForm.addEventListener('input', updatePreviewFromForm);
settingsForm.addEventListener('change', updatePreviewFromForm);
panelButtons.forEach((button) => {
  button.addEventListener('click', () => openPanel(button.dataset.openPanel));
});

await loadSettings();
await loadReviews();
await loadGroups();
await loadQuestions();
openPanel(window.location.hash.replace('#', '') || 'overview', false);
