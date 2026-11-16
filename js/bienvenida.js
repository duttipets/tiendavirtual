/* Bienvenida Dutti: una vez por pestaña/sesión, sin interferir con el carrito. */
(() => {
  'use strict';
  const dialog=document.getElementById('duttiWelcome');
  if(!dialog||typeof dialog.showModal!=='function')return;
  const key='dutti-welcome-v1';
  try{if(sessionStorage.getItem(key))return;}catch{}
  let previousFocus=null;
  const remember=()=>{try{sessionStorage.setItem(key,'1');}catch{}};
  const close=()=>{if(dialog.open)dialog.close();};
  dialog.querySelectorAll('[data-welcome-close]').forEach(button=>button.addEventListener('click',close));
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close();});
  dialog.addEventListener('close',()=>{remember();document.body.classList.remove('dutti-welcome-open');if(previousFocus instanceof HTMLElement)previousFocus.focus({preventScroll:true});});
  document.getElementById('duttiWelcomeStart').addEventListener('click',()=>{close();const catalog=document.getElementById('catalogo');if(catalog){catalog.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});const search=document.getElementById('productSearch');if(search)search.focus({preventScroll:true});}});
  const show=()=>{if(document.querySelector('.modal:not([hidden]),.cart-drawer:not([hidden])'))return;previousFocus=document.activeElement;dialog.showModal();document.body.classList.add('dutti-welcome-open');remember();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
})();
