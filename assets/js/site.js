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
