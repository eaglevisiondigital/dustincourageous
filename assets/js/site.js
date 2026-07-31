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
