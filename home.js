/* ============ VOSLOS WEARS — Storefront Logic ============ */
const SUPABASE_URL = 'https://mszbhlmijufschossfcj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zemJobG1panVmc2Nob3NzZmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4ODQ2MjksImV4cCI6MjA5NTQ2MDYyOX0.J1pWMpHVbRJzjIV6HrbR-0LcCe09J8yuE_WMuuYOkqo';
const WA_NUMBER = '916235758161';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
  products: [],
  filter: { cat: 'all', gender: 'all', search: '' },
  sort: 'newest',
  current: null,
  selectedSize: null,
  selectedColor: null,
  qty: 1,
};

/* ===== Fetch ===== */
async function loadProducts(){
  const { data, error } = await sb.from('products').select('*').order('created_at', { ascending:false });
  if(error){ console.error(error); render([]); return; }
  state.products = data || [];
  render();
}

/* ===== Render Grid ===== */
function render(){
  const grid = document.getElementById('product-grid');
  const empty = document.getElementById('empty-state');
  let items = [...state.products];

  // filter
  if(state.filter.cat !== 'all'){
    items = items.filter(p => (p.category||'').toLowerCase() === state.filter.cat);
  }
  if(state.filter.gender !== 'all'){
    items = items.filter(p => {
      const g = (p.gender||'both').toLowerCase();
      return g === state.filter.gender || g === 'both';
    });
  }
  if(state.filter.search){
    const q = state.filter.search.toLowerCase();
    items = items.filter(p => (p.name||'').toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q));
  }

  // sort
  switch(state.sort){
    case 'az': items.sort((a,b)=>a.name.localeCompare(b.name)); break;
    case 'za': items.sort((a,b)=>b.name.localeCompare(a.name)); break;
    case 'low': items.sort((a,b)=>a.rate-b.rate); break;
    case 'high': items.sort((a,b)=>b.rate-a.rate); break;
    default: items.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  }

  document.getElementById('prod-count').textContent = items.length;

  if(items.length === 0){
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  grid.innerHTML = items.map((p,i)=>{
    const hasStrike = p.strike_rate && p.strike_rate > p.rate;
    return `
      <div class="product-card ${hasStrike ? 'on-sale' : ''}" data-id="${p.id}" style="animation-delay:${i*40}ms">
        <div class="img-wrap">
          <img src="${p.image_url}" alt="${escapeHtml(p.name)}" loading="lazy" />
          ${hasStrike ? '' : ''}
          <div class="quick">QUICK VIEW</div>
        </div>
        <div class="info">
          <div class="p-name">${escapeHtml(p.name)}</div>
          <div class="p-price">
            ${hasStrike ? `<span class="p-strike">Rs. ${p.strike_rate.toLocaleString('en-IN')}.00</span>` : ''}
            <span class="p-current">Rs. ${p.rate.toLocaleString('en-IN')}.00</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.product-card').forEach(card=>{
    card.addEventListener('click', ()=>openProduct(card.dataset.id));
  });
}

function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ===== Modal ===== */
function openProduct(id){
  const p = state.products.find(x=>x.id===id);
  if(!p) return;
  state.current = p;
  state.selectedSize = null;
  state.selectedColor = null;
  state.qty = 1;

  const allImages = [p.image_url, ...(p.images||[])].filter(Boolean);
  document.getElementById('m-main-img').src = allImages[0];
  document.getElementById('m-name').textContent = p.name;

  const hasStrike = p.strike_rate && p.strike_rate > p.rate;
  document.getElementById('m-strike').textContent = hasStrike ? `Rs. ${p.strike_rate.toLocaleString('en-IN')}.00` : '';
  document.getElementById('m-price').textContent = `Rs. ${p.rate.toLocaleString('en-IN')}.00`;
  document.getElementById('m-sale-tag').style.display = hasStrike ? 'inline-block' : 'none';
  document.getElementById('m-sale').style.display = hasStrike ? 'inline-block' : 'none';
  document.getElementById('m-desc').textContent = p.description || '';

  // thumbs
  const thumbs = document.getElementById('m-thumbs');
  thumbs.innerHTML = allImages.map((src,i)=>`<img src="${src}" data-i="${i}" class="${i===0?'active':''}" alt="thumb" />`).join('');
  thumbs.querySelectorAll('img').forEach(t=>{
    t.addEventListener('click', ()=>{
      document.getElementById('m-main-img').src = t.src;
      thumbs.querySelectorAll('img').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
    });
  });

  // sizes
  const sizeGroup = document.getElementById('m-size-group');
  const sizesEl = document.getElementById('m-sizes');
  if(p.sizes && p.sizes.length){
    sizeGroup.style.display = 'block';
    sizesEl.innerHTML = p.sizes.map(s=>`<button class="opt" data-size="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('');
    sizesEl.querySelectorAll('.opt').forEach(b=>{
      b.addEventListener('click', ()=>{
        sizesEl.querySelectorAll('.opt').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        state.selectedSize = b.dataset.size;
      });
    });
  } else sizeGroup.style.display = 'none';

  // colors
  const colorGroup = document.getElementById('m-color-group');
  const colorsEl = document.getElementById('m-colors');
  if(p.colors && p.colors.length){
    colorGroup.style.display = 'block';
    colorsEl.innerHTML = p.colors.map(c=>`<button class="opt" data-color="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
    colorsEl.querySelectorAll('.opt').forEach(b=>{
      b.addEventListener('click', ()=>{
        colorsEl.querySelectorAll('.opt').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        state.selectedColor = b.dataset.color;
      });
    });
  } else colorGroup.style.display = 'none';

  document.getElementById('qty-input').value = 1;
  document.getElementById('product-modal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal(){
  document.getElementById('product-modal').hidden = true;
  document.body.style.overflow = '';
}

/* ===== WhatsApp order ===== */
function sendWhatsApp(){
  const p = state.current;
  if(!p) return;

  if(p.sizes && p.sizes.length && !state.selectedSize){
    alert('Please select a size');return;
  }
  if(p.colors && p.colors.length && !state.selectedColor){
    alert('Please select a color');return;
  }

  const qty = state.qty || 1;
  const total = p.rate * qty;

  let msg = `*🛒 NEW ORDER — VOSLOS WEARS*\n\n`;
  msg += `*Product:* ${p.name}\n`;
  msg += `*Category:* ${p.category || '-'}\n`;
  msg += `*Price:* Rs. ${p.rate.toLocaleString('en-IN')}\n`;
  if(state.selectedSize) msg += `*Size:* ${state.selectedSize}\n`;
  if(state.selectedColor) msg += `*Color:* ${state.selectedColor}\n`;
  msg += `*Quantity:* ${qty}\n`;
  msg += `*Total:* Rs. ${total.toLocaleString('en-IN')}\n\n`;
  msg += `*Image:* ${p.image_url}\n\n`;
  msg += `I want to order this product. Please confirm.`;

  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

/* ===== UI events ===== */
function initEvents() {
  document.getElementById('mobile-close').addEventListener('click', closeMobileNav);
  // category chips
  document.getElementById('cat-chips').addEventListener('click', e=>{
    const b = e.target.closest('.chip'); if(!b) return;
    document.querySelectorAll('#cat-chips .chip').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    state.filter.cat = b.dataset.cat;
    render();
  });
  document.getElementById('gender-chips').addEventListener('click', e=>{
    const b = e.target.closest('.chip'); if(!b) return;
    document.querySelectorAll('#gender-chips .chip').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    state.filter.gender = b.dataset.gender;
    render();
  });

  document.getElementById('sort-by').addEventListener('change', e=>{
    state.sort = e.target.value; render();
  });

  // nav-link filters
  document.querySelectorAll('.nav-link').forEach(l=>{
    l.addEventListener('click', e=>{
      if(l.dataset.filterCat){
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));
        l.classList.add('active');
        state.filter.cat = l.dataset.filterCat;
        // sync chip
        document.querySelectorAll('#cat-chips .chip').forEach(c=>{
          c.classList.toggle('active', c.dataset.cat===state.filter.cat);
        });
        render();
        document.getElementById('products').scrollIntoView({behavior:'smooth'});
        closeMobileNav();
      } else if(l.dataset.filterGender){
        e.preventDefault();
        state.filter.gender = l.dataset.filterGender;
        document.querySelectorAll('#gender-chips .chip').forEach(c=>{
          c.classList.toggle('active', c.dataset.gender===state.filter.gender);
        });
        render();
        document.getElementById('products').scrollIntoView({behavior:'smooth'});
        closeMobileNav();
      } else {
        closeMobileNav();
      }
    });
  });

  // search
  const sb2 = document.getElementById('search-bar');
  document.getElementById('search-btn').addEventListener('click', ()=>{
    sb2.classList.toggle('open');
    if(sb2.classList.contains('open')) document.getElementById('search-input').focus();
  });
  document.getElementById('search-close').addEventListener('click', ()=>{
    sb2.classList.remove('open');
    document.getElementById('search-input').value='';
    state.filter.search=''; render();
  });
  document.getElementById('search-input').addEventListener('input', e=>{
    state.filter.search = e.target.value; render();
  });

  // mobile menu
  document.getElementById('menu-btn').addEventListener('click', ()=>{
    document.getElementById('menu-btn').classList.toggle('open');
    document.getElementById('main-nav').classList.toggle('open');
  });

  // modal close
  document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click', closeModal));
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });

  // qty
  document.getElementById('qty-dec').addEventListener('click', ()=>{
    state.qty = Math.max(1, state.qty-1);
    document.getElementById('qty-input').value = state.qty;
  });
  document.getElementById('qty-inc').addEventListener('click', ()=>{
    state.qty += 1;
    document.getElementById('qty-input').value = state.qty;
  });
  document.getElementById('qty-input').addEventListener('input', e=>{
    state.qty = Math.max(1, parseInt(e.target.value)||1);
  });

  document.getElementById('wa-order').addEventListener('click', sendWhatsApp);
}

function closeMobileNav(){
  document.getElementById('menu-btn').classList.remove('open');
  document.getElementById('main-nav').classList.remove('open');
}

/* ===== Init ===== */
initEvents();
loadProducts();