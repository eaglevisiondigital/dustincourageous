const toggle = document.querySelector('.menu-toggle');
const links = document.querySelector('.navlinks');
if (toggle && links) toggle.addEventListener('click', () => links.classList.toggle('open'));

document.querySelectorAll('[data-preorder]').forEach(el => {
  el.addEventListener('click', e => {
    const target = document.querySelector('#preorder');
    if (target) {
      e.preventDefault();
      target.scrollIntoView({behavior:'smooth',block:'center'});
    }
  });
});


// Book story popups
let activeBookModal = null;
let lastBookModalTrigger = null;

function openBookModal(id, trigger) {
  const modal = document.getElementById(id);
  if (!modal) return;
  lastBookModalTrigger = trigger || null;
  activeBookModal = modal;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  const closeButton = modal.querySelector('.book-modal-close');
  if (closeButton) closeButton.focus({preventScroll:true});
}

function closeBookModal(modal = activeBookModal) {
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  activeBookModal = null;
  if (lastBookModalTrigger) lastBookModalTrigger.focus({preventScroll:true});
  lastBookModalTrigger = null;
}

document.querySelectorAll('[data-book-modal]').forEach(button => {
  button.addEventListener('click', () => openBookModal(button.dataset.bookModal, button));
});

document.querySelectorAll('[data-modal-close]').forEach(button => {
  button.addEventListener('click', () => closeBookModal(button.closest('.book-modal')));
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && activeBookModal) closeBookModal();
});


// Book One interactive preview
let activePreviewModal = null;
let previewLastTrigger = null;
let previewIndex = 0;
let previewSlides = [];
let previewTouchStartX = 0;

function hydratePreviewImage(slide) {
  if (!slide) return;
  const image = slide.querySelector('img[data-preview-src]');
  if (!image || image.dataset.loaded === 'true') return;
  image.src = image.dataset.previewSrc;
  image.dataset.loaded = 'true';
}

function renderPreview(index) {
  if (!activePreviewModal) return;
  previewSlides = Array.from(activePreviewModal.querySelectorAll('[data-preview-slide]'));
  previewIndex = Math.max(0, Math.min(index, previewSlides.length - 1));
  hydratePreviewImage(previewSlides[previewIndex]);
  hydratePreviewImage(previewSlides[previewIndex + 1]);
  previewSlides.forEach((slide, i) => {
    slide.hidden = i !== previewIndex;
    slide.classList.toggle('is-active', i === previewIndex);
    if (i === previewIndex) slide.scrollTop = 0;
  });
  const current = activePreviewModal.querySelector('[data-preview-current]');
  const total = activePreviewModal.querySelector('[data-preview-total]');
  if (current) current.textContent = String(previewIndex + 1);
  if (total) total.textContent = String(previewSlides.length);
  const prev = activePreviewModal.querySelector('[data-preview-prev]');
  const next = activePreviewModal.querySelector('[data-preview-next]');
  if (prev) prev.disabled = previewIndex === 0;
  if (next) next.disabled = previewIndex === previewSlides.length - 1;
  activePreviewModal.querySelectorAll('.preview-dot').forEach((dot, i) => {
    dot.classList.toggle('is-active', i === previewIndex);
    dot.setAttribute('aria-current', i === previewIndex ? 'true' : 'false');
  });
}

function buildPreviewDots(modal) {
  const holder = modal.querySelector('[data-preview-dots]');
  const slides = Array.from(modal.querySelectorAll('[data-preview-slide]'));
  if (!holder || holder.children.length) return;
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'preview-dot';
    dot.setAttribute('aria-label', `Go to preview page ${i + 1}`);
    dot.addEventListener('click', () => renderPreview(i));
    holder.appendChild(dot);
  });
}

function openPreviewModal(id, trigger) {
  const modal = document.getElementById(id);
  if (!modal) return;
  activePreviewModal = modal;
  previewLastTrigger = trigger || null;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  buildPreviewDots(modal);
  renderPreview(0);
  const close = modal.querySelector('.preview-close');
  if (close) close.focus({preventScroll:true});
}

function closePreviewModal() {
  if (!activePreviewModal) return;
  activePreviewModal.hidden = true;
  document.body.classList.remove('modal-open');
  activePreviewModal = null;
  if (previewLastTrigger) previewLastTrigger.focus({preventScroll:true});
  previewLastTrigger = null;
}

document.querySelectorAll('[data-book-preview]').forEach(button => {
  button.addEventListener('click', () => openPreviewModal(button.dataset.bookPreview, button));
});
document.querySelectorAll('[data-preview-close]').forEach(button => {
  button.addEventListener('click', closePreviewModal);
});
document.querySelectorAll('[data-preview-prev]').forEach(button => {
  button.addEventListener('click', () => renderPreview(previewIndex - 1));
});
document.querySelectorAll('[data-preview-next]').forEach(button => {
  button.addEventListener('click', () => renderPreview(previewIndex + 1));
});
document.querySelectorAll('[data-preview-stage]').forEach(stage => {
  stage.addEventListener('touchstart', e => { previewTouchStartX = e.changedTouches[0].screenX; }, {passive:true});
  stage.addEventListener('touchend', e => {
    const delta = e.changedTouches[0].screenX - previewTouchStartX;
    if (Math.abs(delta) < 45) return;
    renderPreview(previewIndex + (delta < 0 ? 1 : -1));
  }, {passive:true});
});

document.addEventListener('keydown', event => {
  if (!activePreviewModal) return;
  if (event.key === 'Escape') closePreviewModal();
  if (event.key === 'ArrowRight') renderPreview(previewIndex + 1);
  if (event.key === 'ArrowLeft') renderPreview(previewIndex - 1);
});
