const form = document.querySelector('#publicReviewForm');
const message = document.querySelector('#publicReviewMessage');
const params = new URLSearchParams(window.location.search);

form.productName.value = params.get('productName') || '';
form.productUrl.value = params.get('productUrl') || '';
form.productSlug.value = params.get('productSlug') || '';

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = 'Enviando avaliação...';

  const response = await fetch('/api/reviews/submit', {
    method: 'POST',
    body: new FormData(form)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    message.textContent = data.error || 'Não foi possível enviar sua avaliação.';
    return;
  }

  form.reset();
  const reward = data.reward?.text
    ? ` ${data.reward.text}${data.reward.coupon ? ` Cupom: ${data.reward.coupon}` : ''}`
    : '';
  message.textContent = `${data.message || 'Avaliação enviada para aprovação.'}${reward}`;
});
