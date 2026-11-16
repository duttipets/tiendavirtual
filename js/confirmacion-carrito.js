(() => {
  'use strict';
  const dialog=document.getElementById('duttiCartSuccess');
  if(!dialog||typeof dialog.showModal!=='function')return;
  const close=()=>{if(dialog.open)dialog.close();};
  window.DUTTI_CART_CONFIRM=(name)=>{
    document.getElementById('duttiCartSuccessName').textContent=name;
    if(!dialog.open)dialog.showModal();
    document.body.classList.add('dutti-cart-success-open');
  };
  dialog.addEventListener('close',()=>document.body.classList.remove('dutti-cart-success-open'));
  document.getElementById('duttiContinueShopping').addEventListener('click',close);
  document.getElementById('duttiConfirmOrder').addEventListener('click',()=>{close();document.getElementById('openCheckout').click();});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
})();
