/* Dutti Pet's — tienda estática. Los datos comerciales proceden del Word. */
(() => {
  'use strict';
  const WAPP='51931847867';
  const CATALOG=Array.isArray(window.DUTTI_PRODUCTOS)?window.DUTTI_PRODUCTOS:[];
  const FALLBACK='img/imagen-pendiente.webp';
  const $=(s,root=document)=>root.querySelector(s);
  const $$=(s,root=document)=>[...root.querySelectorAll(s)];
  const esc=(s)=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const money=v=>'S/ '+Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
  const normalized=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  // FOTO AUTOMÁTICA: para fichas sin imagen del Word, busca en img/productos
  // un archivo con nombre `faltante-<id>.webp`. Si aún no existe, muestra el marcador habitual.
  // Así se pueden subir las imágenes por tandas, SIN volver a editar el JavaScript.
  const rutaFotoNueva=p=>p?.id?`img/productos/faltante-${p.id}.webp`:FALLBACK;
  const imageFor=p=>p?.fotoPrincipalPdf||p?.imagenes?.[0]||rutaFotoNueva(p);
  // Fotos de las variantes: se almacenan en img/productos/ con un código estable.
  // Las imágenes principales EXISTENTES no se tocan; solo aplica a productos con opciones.
  const tieneOpcionesDeFoto=p=>(p.sabores?.length||0)>1||(p.variantes?.length||0)>1||(p.colores?.length||0)>1;
  const rutaVariante=(p,flavor,variant,color)=>{
    const name=[p.id,normalized(flavor),normalized(variant?.label),normalized(color)].join('|');
    let hash=2166136261;
    for(let i=0;i<name.length;i++)hash=Math.imul(hash^name.charCodeAt(i),16777619);
    const slug=normalized(flavor||variant?.label||color||'opcion').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,36)||'opcion';
    return `img/productos/v-${p.id}-${slug}-${(hash>>>0).toString(16).padStart(8,'0')}.webp`;
  };
  // Foto verificada del catálogo original, solo si coincide el sabor y peso.
  // Nunca se usa una fotografía de otro sabor como reemplazo.
  const fotoOriginalExacta=(p,flavor,variant)=>{
    const selected=normalized(flavor);
    const label=normalized(variant?.label||'');
    const photos=p.fotosPorOpcion||[];
    const matching=photos.filter(x=>normalized(x.sabor||'')===selected);
    if(!matching.length)return null;
    const noSize=matching.find(x=>!x.presentacion);
    if(noSize)return noSize;
    // Por ejemplo '85 gr' y '85 g' se consideran la misma presentación.
    const compact=t=>normalized(t).replace(/\b(grs?|gramos?)\b/g,'g').replace(/\s+/g,'');
    const match=matching.find(x=>compact(label).includes(compact(x.presentacion)));
    return match||null;
  };
  const fotoElegida=(p,flavor,variant,color)=>{
    if(!tieneOpcionesDeFoto(p))return {url:imageFor(p),respaldo:FALLBACK,original:null,variable:false};
    const original=fotoOriginalExacta(p,flavor,variant);
    return {url:rutaVariante(p,flavor,variant,color),respaldo:original?.foto||FALLBACK,original,variable:true};
  };
  const photoForSelected=(p,flavor,variant,color='')=>fotoElegida(p,flavor,variant,color).url;
  const establecerImagen=(node,chosen)=>{
    let tries=0;
    node.onerror=function(){
      if(tries++===0 && chosen.respaldo && chosen.respaldo!==chosen.url){this.src=chosen.respaldo;return}
      this.onerror=null;this.src=FALLBACK;this.alt='Imagen pendiente de esta presentación';
    };
    node.src=chosen.url;
  };
  const minPrice=p=>p.variantes?.length?Math.min(...p.variantes.map(v=>v.price)):null;
  const categoryIcons={
    'Alimento húmedo para gatos':'🐱','Alimento húmedo para perros':'🐶','Alimento seco para gatos':'🥣',
    'Alimento seco para perros':'🦴','Snacks para gatos':'🐈','Snacks para perros':'🍖',
    'Camas y colchonetas':'🛏️','Areneros':'🪣','Transportadoras':'🧳','Platos y comederos':'🍽️',
    'Juguetes y rascadores':'🧸','Cepillos y accesorios':'🪮','Higiene y baños':'🫧',
    'Shampoo y colonias':'🧴','Salud y veterinaria':'💚'
  };
  const groups=[
    {label:'Alimentos',ico:'🥣',categories:['Alimento húmedo para gatos','Alimento húmedo para perros','Alimento seco para gatos','Alimento seco para perros']},
    {label:'Premios y snacks',ico:'🦴',categories:['Snacks para gatos','Snacks para perros']},
    {label:'Camas y descanso',ico:'🛏️',categories:['Camas y colchonetas']},
    {label:'Juguetes',ico:'🧸',categories:['Juguetes y rascadores']},
    {label:'Accesorios',ico:'🦮',categories:['Areneros','Transportadoras','Platos y comederos','Cepillos y accesorios']},
    {label:'Higiene y cuidado',ico:'🫧',categories:['Higiene y baños','Shampoo y colonias']},
    {label:'Salud',ico:'💚',categories:['Salud y veterinaria']}
  ];
  const state={pet:'Todos',category:'Todas',query:'',sort:'default',limit:24,current:null,variant:0,flavor:'',color:'',qty:1,cart:loadCart()};
  const categories=[...new Set(CATALOG.map(p=>p.categoria))];
  let toastTimeout;
  function loadCart(){try {let v=JSON.parse(localStorage.getItem('dutti-cart-v1')||'[]');return Array.isArray(v)?v.filter(x=>x&&typeof x.price==='number'&&x.qty>0):[]}catch{return []}}
  function saveCart(){try{localStorage.setItem('dutti-cart-v1',JSON.stringify(state.cart))}catch{} updateCartUI()}
  function waUrl(message){return `https://wa.me/${WAPP}?text=${encodeURIComponent(message)}`}
  function toast(message){const e=$('#toast');e.textContent=message;e.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>e.classList.remove('show'),2900)}
  function lock(){document.body.classList.toggle('lock',!!$('.modal:not([hidden]), .cart-drawer:not([hidden])'))}
  function openPanel(id){closeAll();$('#backdrop').hidden=false;$('#'+id).hidden=false;lock()}
  function closeAll(){['productModal','cartDrawer','checkoutModal','backdrop'].forEach(id=>$('#'+id).hidden=true);lock()}
  const mainHero=CATALOG.find(p=>p.categoria==='Alimento húmedo para gatos'&&p.imagenes.length);
  const bedHero=CATALOG.find(p=>p.categoria==='Camas y colchonetas'&&p.imagenes.length);
  $('#heroPhoto1').src=mainHero?imageFor(mainHero):FALLBACK;
  $('#heroPhoto2').src=bedHero?imageFor(bedHero):FALLBACK;
  $('#year').textContent=new Date().getFullYear();
  // Category shortcuts: never invent a product. Toys without reliable labels/prices are excluded from sellable catalog.
  const tileWrap=$('#categoryTiles');
  tileWrap.innerHTML=groups.map(g=>{
    const n=CATALOG.filter(p=>g.categories.includes(p.categoria)).length;
    return `<button type="button" class="category-tile reveal" data-group="${esc(g.label)}"><span class="tile-arrow">↗</span><span class="tile-icon">${g.ico}</span><div><h3>${esc(g.label)}</h3><p>${n?n+' productos documentados':'Consultar modelos'}</p></div></button>`;
  }).join('');
  tileWrap.addEventListener('click',e=>{
    const b=e.target.closest('[data-group]');if(!b)return;
    const g=groups.find(x=>x.label===b.dataset.group);if(!g)return;
    if(g.label==='Juguetes'){location.href='galeria.html?categoria='+encodeURIComponent('Juguetes y rascadores');return;}
    state.pet='Todos';state.category=g.categories.length===1?g.categories[0]:'GRUPO:'+g.label;state.query='';state.limit=24;
    $('#productSearch').value='';updateActive();renderProducts();$('#catalogo').scrollIntoView({behavior:'smooth'});
  });
  const catFilter=$('#categoryFilter');
  catFilter.innerHTML=[`<button class="cat-chip active" data-category="Todas">Todas las categorías</button>`,...categories.map(c=>`<button class="cat-chip" data-category="${esc(c)}">${categoryIcons[c]||'🐾'} ${esc(c)}</button>`)].join('');
  catFilter.addEventListener('click',e=>{const btn=e.target.closest('[data-category]');if(!btn)return;state.category=btn.dataset.category;state.limit=24;updateActive();renderProducts()});
  $$('.pet').forEach(b=>b.addEventListener('click',()=>{state.pet=b.dataset.pet;state.limit=24;updateActive();renderProducts()}));
  $('#productSort').addEventListener('change',e=>{state.sort=e.target.value;renderProducts()});
  $('#productSearch').addEventListener('input',e=>{state.query=e.target.value.trim();state.limit=24;renderProducts()});
  $('#searchTop').addEventListener('click',()=>{$('#catalogo').scrollIntoView({behavior:'smooth'});setTimeout(()=>$('#productSearch').focus(),300)});
  $('#resetFilters').addEventListener('click',()=>{state.pet='Todos';state.category='Todas';state.query='';state.sort='default';state.limit=24;$('#productSearch').value='';$('#productSort').value='default';updateActive();renderProducts()});
  $('#showMore').addEventListener('click',()=>{state.limit+=24;renderProducts()});
  function updateActive(){ $$('.pet').forEach(b=>b.classList.toggle('active',b.dataset.pet===state.pet)); $$('.cat-chip').forEach(b=>b.classList.toggle('active',b.dataset.category===state.category)); }
  function filtered(){
    let data=CATALOG.filter(p=>{
      const gp=state.category.startsWith('GRUPO:')?groups.find(g=>g.label===state.category.slice(6)):null;
      const catOK=state.category==='Todas'||p.categoria===state.category||gp?.categories.includes(p.categoria);
      const petOK=state.pet==='Todos'||p.mascota===state.pet||p.mascota==='Ambos';
      const queryOK=!state.query||normalized([p.nombre,p.categoria,p.descripcion,(p.sabores||[]).join(' ')].join(' ')).includes(normalized(state.query));
      return catOK&&petOK&&queryOK;
    });
    switch(state.sort){case 'price-asc':data.sort((a,b)=>(minPrice(a)??Infinity)-(minPrice(b)??Infinity));break;
      case 'price-desc':data.sort((a,b)=>(minPrice(b)??-1)-(minPrice(a)??-1));break;
      case 'name':data.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));break;
      default:data.sort((a,b)=>Number(!!b.variantes.length)-Number(!!a.variantes.length)||Number(!!b.imagenes.length)-Number(!!a.imagenes.length)); }
    return data;
  }
  function renderProducts(){
    const data=filtered();
    $('#catalogCount').textContent=`${data.length} producto${data.length===1?'':'s'} en el catálogo`;
    $('#emptyState').hidden=!!data.length;$('#showMore').hidden=data.length<=state.limit;
    $('#productsGrid').innerHTML=data.slice(0,state.limit).map((p,i)=>{
      const price=minPrice(p);const hasPhoto=p.imagenes.length>0;
      return `<article class="product-card" style="animation-delay:${Math.min(i%12,11)*24}ms"><button class="product-image" type="button" data-open="${esc(p.id)}" aria-label="Ver ${esc(p.nombre)}"><img loading="lazy" src="${esc(imageFor(p))}" alt="${esc(hasPhoto?'Foto del catálogo: '+p.nombre:'Imagen del producto: '+p.nombre)}" onerror="this.onerror=null;this.src='img/imagen-pendiente.webp';this.alt='Fotografía pendiente';"><span class="product-tag ${price===null?'no-price':''}">${price===null?'Precio por consultar':p.variantes.length>1?'Variantes disponibles':p.mascota==='Gatos'?'Para gatitos':'Para engreídos'}</span></button><div class="product-body"><span class="product-cat">${esc(p.categoria)}</span><h3 class="product-name">${esc(p.nombre)}</h3><p class="product-description">${esc(p.descripcion||'Ver detalles, características y opciones del artículo.')}</p><div class="product-footer"><div><span class="price-caption">${price===null?'Información comercial':'Desde'}</span><strong class="product-price">${price===null?'Consultar':money(price)}</strong></div><button class="btn-product ${price===null?'consult':''}" type="button" data-open="${esc(p.id)}" aria-label="${price===null?'Consultar':'Elegir opciones'} para ${esc(p.nombre)}">${price===null?'↗':'+'}</button></div></div></article>`;
    }).join('');
  }
  $('#productsGrid').addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b)showProduct(b.dataset.open)});
  function showProduct(id){
    const p=CATALOG.find(x=>x.id===id);if(!p)return;
    state.current=p;state.variant=0;state.qty=1;state.flavor=p.sabores?.[0]||'';state.color=p.colores?.[0]||'';
    $('#modalName').textContent=p.nombre;$('#modalCategory').textContent=p.categoria;$('#modalDescription').textContent=p.descripcion||'Consulta las características y disponibilidad del artículo.';
    const modalImg=$('#modalImage');
    modalImg.onerror=function(){this.onerror=null;this.src=FALLBACK;this.alt='Fotografía pendiente de incorporar';};
    modalImg.alt='Foto real de '+p.nombre;
    refreshFlavorSelect(p,0);
    refreshProductPhoto();
    $('#variantWrap').hidden=!p.variantes?.length;$('#variantSelect').innerHTML=(p.variantes||[]).map((v,i)=>`<option value="${i}">${esc(v.label)} — ${money(v.price)}</option>`).join('');
    $('#colorWrap').hidden=!p.colores?.length;$('#colorSelect').innerHTML=(p.colores||[]).map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    $('#attrWrap').textContent=[...(p.atributos||[]),p.notaVariantes||'',p.notaRevisionPdf||''].filter(Boolean).join(' · ');
    $('#addCart').hidden=!p.variantes?.length;$('#consultProduct').hidden=!!p.variantes?.length;
    $('#qtyValue').textContent='1';updateModalPrice();openPanel('productModal');
  }
  function refreshFlavorSelect(p,selectedVariant){
    const vl=p.variantes?.[selectedVariant]?.label||'';
    const sets=p.saboresPorTamanio||null;
    const selected=sets?Object.keys(sets).find(key=>vl.includes(key)):null;
    const flavors=selected?sets[selected]:(p.sabores||[]);
    $('#flavorWrap').hidden=!flavors.length;
    const previouslySelected=state.flavor;
    $('#flavorSelect').innerHTML=flavors.map(f=>`<option value="${esc(f)}">${esc(f)}</option>`).join('');
    const next=flavors.includes(previouslySelected)?previouslySelected:(flavors[0]||'');
    state.flavor=next;$('#flavorSelect').value=next;
  }
  function refreshProductPhoto(){
    const p=state.current;if(!p)return;
    const v=p.variantes?.[state.variant];
    const chosen=fotoElegida(p,state.flavor,v,state.color);
    const target=$('#modalImage');
    target.alt='Fotografía de '+p.nombre+(state.flavor?' — '+state.flavor:'');
    establecerImagen(target,chosen);
    if(chosen.variable){
      // Nunca mostrar en miniaturas fotografías de otros sabores/tamaños.
      $('#modalThumbs').innerHTML='';state.modalPhotos=[];
      $('#modalImageNote').textContent=chosen.original
        ?'Imagen de esta variante: foto cargada o, si falta, fotografía documentada del catálogo.'
        :'La foto de esta presentación está codificada. Si aún falta, se mostrará «Imagen pendiente».';
      return;
    }
    // Las fichas de producto individual conservan su galería original.
    const extras=[...(p.imagenes||[]),...(p.fotosAdicionalesPdf||[])];
    const thumbs=[chosen.url,...extras].filter((value,idx,arr)=>arr.indexOf(value)===idx).slice(0,12);
    $('#modalThumbs').innerHTML=thumbs.length>1?thumbs.map((photo,i)=>`<button type="button" data-thumb="${i}" class="${i===0?'active':''}" aria-label="Ver imagen ${i+1}"><img src="${esc(photo)}" alt="Vista ${i+1}" loading="lazy"></button>`).join(''):'';
    state.modalPhotos=thumbs;
    $('#modalImageNote').textContent='Fotografías originales del catálogo Dutti Pet’s.';
  }
  function updateModalPrice(){
    if(!state.current)return;
    const v=state.current.variantes?.[state.variant];
    $('#modalPrice').textContent=v?money(v.price):'Por consultar';
    $('#modalSubtotal').textContent=v?money(v.price*state.qty):'Por confirmar';
    $('#qtyValue').textContent=state.qty;
  }
  $('#modalThumbs').addEventListener('click',e=>{
    const b=e.target.closest('[data-thumb]');if(!b||!state.current)return;
    $('#modalImage').src=(state.modalPhotos||[])[Number(b.dataset.thumb)]||FALLBACK;
    $$('#modalThumbs button').forEach(el=>el.classList.toggle('active',el===b));
  });
  $('#flavorSelect').addEventListener('change',e=>{state.flavor=e.target.value;refreshProductPhoto();});
  $('#variantSelect').addEventListener('change',e=>{state.variant=Number(e.target.value);refreshFlavorSelect(state.current,state.variant);updateModalPrice();refreshProductPhoto()});
  $('#colorSelect').addEventListener('change',e=>{state.color=e.target.value;refreshProductPhoto()});
  $('#qtyDown').addEventListener('click',()=>{state.qty=Math.max(1,state.qty-1);updateModalPrice()});
  $('#qtyUp').addEventListener('click',()=>{state.qty=Math.min(99,state.qty+1);updateModalPrice()});
  $('#addCart').addEventListener('click',()=>{
    const p=state.current,v=p?.variantes?.[state.variant];if(!v)return;
    const flavor=p.sabores?.length?$('#flavorSelect').value:'';
    const color=p.colores?.length?$('#colorSelect').value:'';
    const key=[p.id,v.label,flavor,color].join('|');
    const existing=state.cart.find(x=>x.key===key);
    if(existing)existing.qty=Math.min(999,existing.qty+state.qty);
    else state.cart.push({key,id:p.id,nombre:p.nombre,categoria:p.categoria,variant:v.label,flavor,color,price:v.price,qty:state.qty,photo:photoForSelected(p,flavor,v,color),photoFallback:fotoElegida(p,flavor,v,color).respaldo,veterinario:p.veterinario});
    saveCart();closeAll();toast('¡Producto agregado al carrito! 🐾');
  });
  $('#consultProduct').addEventListener('click',()=>{
    const p=state.current;if(!p)return;
    window.open(waUrl(`Hola Dutti Pet's 🐾, quisiera consultar la disponibilidad y el precio de: ${p.nombre}.`),'_blank','noopener');
  });
  function updateCartUI(){
    const n=state.cart.reduce((sum,x)=>sum+x.qty,0);
    $('#cartCount').textContent=n>99?'99+':n;
    $('#drawerCount').textContent=`(${n})`;
    $('#cartTotal').textContent=money(cartTotal());
    $('#checkoutTotal').textContent=money(cartTotal());
    $('#openCheckout').disabled=!state.cart.length;
    $('#cartItems').innerHTML=state.cart.length?state.cart.map((x,i)=>`<div class="cart-row"><img alt="${esc(x.nombre)}" src="${esc(x.photo||FALLBACK)}" onerror="if(this.dataset.retry!=='1'){this.dataset.retry='1';this.src='${esc(x.photoFallback||FALLBACK)}'}else{this.onerror=null;this.src='img/imagen-pendiente.webp'}"><div class="cart-item-info"><h4>${esc(x.nombre)}</h4><small class="cart-variant">${esc([x.variant,x.flavor,x.color].filter(Boolean).join(' · '))}</small><div class="cart-item-bottom"><strong>${money(x.price*x.qty)}</strong><div class="mini-qty"><button data-cart-action="minus" data-index="${i}" aria-label="Disminuir">−</button><b>${x.qty}</b><button data-cart-action="plus" data-index="${i}" aria-label="Aumentar">+</button></div></div><button class="remove-item" data-cart-action="remove" data-index="${i}">Eliminar ×</button></div></div>`).join(''):`<div class="cart-empty"><span>🛒</span><h3>Tu carrito está esperando</h3><p>Agrega productos y aquí verás todo el detalle de tu pedido.</p><button class="button btn-orange" id="keepShopping">Explorar catálogo</button></div>`;
  }
  function cartTotal(){return state.cart.reduce((s,x)=>s+x.price*x.qty,0)}
  $('#cartItems').addEventListener('click',e=>{
    if(e.target.id==='keepShopping'){closeAll();$('#catalogo').scrollIntoView({behavior:'smooth'});return}
    const b=e.target.closest('[data-cart-action]');if(!b)return;
    const i=Number(b.dataset.index);if(!state.cart[i])return;
    if(b.dataset.cartAction==='remove')state.cart.splice(i,1);
    if(b.dataset.cartAction==='minus'){state.cart[i].qty--;if(state.cart[i].qty<1)state.cart.splice(i,1)}
    if(b.dataset.cartAction==='plus')state.cart[i].qty=Math.min(999,state.cart[i].qty+1);
    saveCart();
  });
  $('#openCart').addEventListener('click',()=>{updateCartUI();openPanel('cartDrawer')});
  $('#closeCart').addEventListener('click',closeAll);$('#closeProduct').addEventListener('click',closeAll);$('#closeCheckout').addEventListener('click',closeAll);
  $('#backdrop').addEventListener('click',closeAll);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});
  $('#openCheckout').addEventListener('click',()=>{if(!state.cart.length)return;$('#checkoutTotal').textContent=money(cartTotal());openPanel('checkoutModal')});
  $('#deliveryType').addEventListener('change',e=>{
    const delivery=e.target.value==='delivery';$('#addressWrap').hidden=!delivery;$('#addressInput').required=delivery;
  });
  $('#checkoutForm').addEventListener('submit',e=>{
    e.preventDefault();if(!state.cart.length){toast('Agrega productos antes de finalizar');return}
    const name=$('#clientName').value.trim(),pet=$('#petName').value.trim(),phone=$('#clientPhone').value.trim();
    const delivery=$('#deliveryType').value==='delivery';const address=$('#addressInput').value.trim();
    if(!name||!pet||!phone||(delivery&&!address)){toast('Completa los datos obligatorios');return}
    const orderLines=state.cart.map((x,i)=>{
      let details=[x.variant,x.flavor&&`Sabor/variedad: ${x.flavor}`,x.color&&`Color: ${x.color}`].filter(Boolean).join(' | ');
      return `${i+1}. *${x.nombre}*\n   ${details}\n   Cantidad: ${x.qty} × ${money(x.price)} = *${money(x.price*x.qty)}*`;
    });
    const vet=state.cart.some(x=>x.veterinario)?'\n⚠️ Contiene productos veterinarios: confirmar su uso y requisitos con el establecimiento.\n':'';
    const message=`🐾 *NUEVO PEDIDO — DUTTI PET'S*\n\n👤 *Cliente:* ${name}\n🐶🐱 *Mascota:* ${pet}\n📱 *Teléfono:* ${phone}\n🚚 *Modalidad:* ${delivery?'Delivery':'Recojo en tienda'}\n${delivery?'📍 *Dirección:* '+address:'📍 *Punto de recojo:* Por coordinar'}\n💳 *Pago preferido:* ${$('#paymentMethod').value}\n\n🛒 *DETALLE DEL PEDIDO*\n\n${orderLines.join('\n\n')}\n\n💰 *TOTAL DE PRODUCTOS: ${money(cartTotal())}*\n${delivery?'🚚 Costo de envío por confirmar.\n':''}${vet}${$('#orderNotes').value.trim()?'📝 *Indicaciones:* '+$('#orderNotes').value.trim()+'\n':''}\nPor favor, confirmen stock, total final y datos de pago. ¡Gracias!`;
    window.open(waUrl(message),'_blank','noopener');
    // Do not clear the cart automatically: the customer might not have completed WhatsApp sending.
    toast('Se preparó tu pedido para enviarlo por WhatsApp');
  });
  $('#header')&&window.addEventListener('scroll',()=>$('#header').classList.toggle('scrolled',window.scrollY>15),{passive:true});
  if('IntersectionObserver' in window){const ob=new IntersectionObserver(entries=>{for(const en of entries)if(en.isIntersecting){en.target.classList.add('visible');ob.unobserve(en.target)}},{threshold:.08});$$('.reveal').forEach(el=>ob.observe(el))}else $$('.reveal').forEach(el=>el.classList.add('visible'));
  // For product cards data may be incomplete in the document: no fabricated price or size.
  updateActive();renderProducts();updateCartUI();
})();
