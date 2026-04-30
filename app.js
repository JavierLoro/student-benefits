// ---- LANGUAGE ----
let lang = (() => {
  const stored = localStorage.getItem('lang');
  if (stored === 'es' || stored === 'en') return stored;
  return (navigator.language || '').startsWith('en') ? 'en' : 'es';
})();

function t(key) { return T[lang][key] ?? T.es[key] ?? key; }

function tr(entry, field) {
  return (lang === 'en' && entry.en?.[field]) ? entry.en[field] : entry[field];
}

function setLang(l) {
  lang = l;
  localStorage.setItem('lang', l);
  document.documentElement.lang = l;
  document.getElementById('lang-toggle-es').classList.toggle('active', l === 'es');
  document.getElementById('lang-toggle-en').classList.toggle('active', l === 'en');
  applyLangToUI();
  render();
}

function applyLangToUI() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if ('i18nHtml' in el.dataset) el.innerHTML = t(key);
    else el.textContent = t(key);
  });
  document.getElementById('search').placeholder = t('search_placeholder');
}

// ---- SORT ----
let sortKey = "util", sortDir = 1;

function sort(k) {
  if (sortKey === k) sortDir *= -1;
  else { sortKey = k; sortDir = 1; }
  document.querySelectorAll("th").forEach(th => th.classList.remove("active"));
  document.querySelectorAll(".sort-arrow").forEach(s => s.textContent = "↕");
  const th = document.getElementById("th-" + k);
  const sa = document.getElementById("sa-" + k);
  if (th) th.classList.add("active");
  if (sa) sa.textContent = sortDir === 1 ? "↑" : "↓";
  render();
}

// ---- DRAWER (mobile) ----
function openDrawer() {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("drawer-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("drawer-overlay").classList.remove("open");
  document.body.style.overflow = "";
}

// ---- FILTERS ----
function getCheckedByAttr(attr) {
  return [...document.querySelectorAll(`.cb-item[data-${attr}] input:checked`)].map(el => el.value);
}

function resetFilters() {
  document.getElementById("search").value = "";
  document.querySelectorAll(".cb-item input[type=checkbox]").forEach(cb => cb.checked = false);
  document.querySelectorAll(".cb-item").forEach(el => el.classList.remove("checked"));
  activeChip = null;
  ["total","free","credits","disc","high"].forEach(id => {
    const el = document.getElementById("chip-" + id);
    if (el) el.classList.remove("active-chip","dimmed");
  });
  render();
}

function removeFilter(attr, value) {
  const cb = document.querySelector(`.cb-item[data-${attr}="${value}"] input`);
  if (cb) { cb.checked = false; cb.closest(".cb-item").classList.remove("checked"); }
  render();
}

let activeChip = null;

function filterStat(chip) {
  if (activeChip === chip || chip === "total") {
    activeChip = null;
    resetFilters();
    return;
  }
  resetFilters();
  activeChip = chip;
  const map = {free:["price","Gratis"], credits:["price","Saldo gratuito"], disc:["price","Descuento"], high:["util","Alta"]};
  if (map[chip]) {
    const [attr, val] = map[chip];
    const cb = document.querySelector(`.cb-item[data-${attr}="${val}"] input`);
    if (cb) { cb.checked = true; cb.closest(".cb-item").classList.add("checked"); }
  }
  ["total","free","credits","disc","high"].forEach(id => {
    const el = document.getElementById("chip-" + id);
    if (!el) return;
    el.classList.remove("active-chip","dimmed");
    if (activeChip) { el.classList.add(id === activeChip ? "active-chip" : "dimmed"); }
  });
  render();
}

// ---- RENDER ----
function render() {
  const q      = document.getElementById("search").value.toLowerCase().trim();
  const cats   = getCheckedByAttr("cat");
  const prices = getCheckedByAttr("price");
  const utils  = getCheckedByAttr("util");

  document.querySelectorAll(".cb-item").forEach(el => {
    const cb = el.querySelector("input");
    el.classList.toggle("checked", cb && cb.checked);
  });

  const catLabel = cat => t('cat_' + cat);

  let rows = DATA.filter(r => {
    if (q) {
      const name = tr(r, 'name') || r.name;
      const nota = tr(r, 'nota') || r.nota;
      const desc = tr(r, 'desc') || r.desc || '';
      const via  = tr(r, 'via')  || r.via;
      if (![name, nota, via, desc, catLabel(r.cat)].some(s => s.toLowerCase().includes(q))) return false;
    }
    if (cats.length   && !cats.includes(r.cat))    return false;
    if (prices.length && !prices.includes(r.price)) return false;
    if (utils.length  && !utils.includes(r.util))  return false;
    return true;
  });

  rows.sort((a, b) => {
    if (sortKey === "util") return ((UTIL_ORDER[a.util] ?? 9) - (UTIL_ORDER[b.util] ?? 9)) * sortDir;
    const va = sortKey === 'name' ? (tr(a,'name') || a.name) : (a[sortKey] ?? '');
    const vb = sortKey === 'name' ? (tr(b,'name') || b.name) : (b[sortKey] ?? '');
    return va.localeCompare(vb) * sortDir;
  });

  // Stats bar (always full dataset counts)
  document.getElementById("sTotal").textContent  = rows.length;
  document.getElementById("sGratis").textContent = DATA.filter(r => r.price === "Gratis").length;
  document.getElementById("sCred").textContent   = DATA.filter(r => r.price === "Saldo gratuito").length;
  document.getElementById("sDesc").textContent   = DATA.filter(r => r.price === "Descuento").length;
  document.getElementById("sAlta").textContent   = DATA.filter(r => r.util === "Alta").length;

  // Sidebar counts
  const catCounts   = {dev:0,cloud:0,design:0,media:0,edu:0,tools:0,domain:0};
  const priceCounts = {"Gratis":0,"Saldo gratuito":0,"Descuento":0};
  const utilCounts  = {"Alta":0,"Media":0,"Baja":0};
  DATA.forEach(r => {
    catCounts[r.cat]     = (catCounts[r.cat]     || 0) + 1;
    priceCounts[r.price] = (priceCounts[r.price] || 0) + 1;
    utilCounts[r.util]   = (utilCounts[r.util]   || 0) + 1;
  });
  Object.entries(catCounts).forEach(([k,v])   => { const el=document.getElementById("cnt-"+k);   if(el) el.textContent=v; });
  Object.entries(priceCounts).forEach(([k,v]) => {
    const id = k === "Saldo gratuito" ? "cnt-Saldo" : "cnt-"+k;
    const el = document.getElementById(id); if(el) el.textContent=v;
  });
  Object.entries(utilCounts).forEach(([k,v])  => { const el=document.getElementById("cnt-"+k);   if(el) el.textContent=v; });

  // Result count
  document.getElementById("resultCount").textContent =
    rows.length === DATA.length
      ? `${rows.length} ${t('result_all')}`
      : `${rows.length} ${t('result_of')} ${DATA.length} ${t('result_all')}`;

  // Active filter tags
  const af = document.getElementById("active-filters");
  const priceLabels = t('price_labels');
  const utilLabels  = t('util_labels');
  const tags = [
    ...cats.map(v   => `<span class="filter-tag" onclick="removeFilter('cat','${v}')">${t('tag_cat')}: ${catLabel(v)} <span class="x">×</span></span>`),
    ...prices.map(v => `<span class="filter-tag" onclick="removeFilter('price','${v.replace(/'/g,"\\'")}')">` + t('tag_price') + ': ' + priceLabels[v] + ` <span class="x">×</span></span>`),
    ...utils.map(v  => `<span class="filter-tag" onclick="removeFilter('util','${v}')">${t('tag_util')}: ${utilLabels[v]} <span class="x">×</span></span>`),
  ];
  if (q) tags.unshift(`<span class="filter-tag" onclick="document.getElementById('search').value='';render()">${t('tag_search')}: "${q}" <span class="x">×</span></span>`);
  af.innerHTML = tags.join("");

  // Desktop table
  const tbody = document.getElementById("tbody");
  if (!rows.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${t('empty')}</td></tr>`;
    document.getElementById("cards-list").innerHTML = "";
    return;
  }

  const utilClass = {Alta:"u-alta", Media:"u-media", Baja:"u-baja"};

  tbody.innerHTML = rows.map((r, i) => {
    const name  = tr(r, 'name') || r.name;
    const nota  = tr(r, 'nota');
    const via   = tr(r, 'via');
    const time  = tr(r, 'time');
    const pLabel = priceLabels[r.price];
    return `
    <tr class="row-${r.cat}" style="animation-delay:${Math.min(i*0.02,0.3)}s" onclick="window.open('${r.url}','_blank')">
      <td class="td-name"><img class="td-logo" src="https://www.google.com/s2/favicons?domain=${r.logo}&sz=32" alt="" loading="lazy" onerror="this.style.display='none'">${name}<svg class="link-icon" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7M7.5 1H11m0 0v3.5M11 1 5.5 6.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></td>
      <td class="td-nota">${nota}</td>
      <td><span class="tag ${CAT_CLASS[r.cat]}">${CAT_ICON[r.cat] ?? ''} ${catLabel(r.cat)}</span></td>
      <td><span class="${utilClass[r.util]}"><span class="u-dot"></span>${utilLabels[r.util]}</span></td>
      <td><span class="tag ${PRICE_CLASS[r.price]}">${PRICE_ICON[r.price] ?? ''} ${pLabel}</span></td>
      <td class="td-via">${via}</td>
      <td class="td-time">${time}</td>
    </tr>`;
  }).join("");

  // Mobile cards
  const cardsList = document.getElementById("cards-list");
  if (cardsList) {
    cardsList.innerHTML = rows.map((r, i) => {
      const name  = tr(r, 'name') || r.name;
      const nota  = tr(r, 'nota');
      const pLabel = priceLabels[r.price];
      return `
      <div class="card row-${r.cat}" style="animation-delay:${Math.min(i*0.02,0.3)}s" onclick="window.open('${r.url}','_blank')">
        <div class="card-header">
          <img class="card-logo" src="https://www.google.com/s2/favicons?domain=${r.logo}&sz=32" alt="" loading="lazy" onerror="this.style.display='none'">
          <div class="card-name">${name}</div>
          <span class="card-arrow">↗</span>
        </div>
        <div class="card-nota">${nota}</div>
        <div class="card-tags">
          <span class="tag ${CAT_CLASS[r.cat]}">${CAT_ICON[r.cat] ?? ''} ${catLabel(r.cat)}</span>
          <span class="tag ${PRICE_CLASS[r.price]}">${PRICE_ICON[r.price] ?? ''} ${pLabel}</span>
          <span class="${utilClass[r.util]}"><span class="u-dot"></span>${utilLabels[r.util]}</span>
        </div>
      </div>`;
    }).join("");
  }

  // FAB badge count
  const fabCount = document.getElementById("fab-count");
  if (fabCount) {
    const total = cats.length + prices.length + utils.length + (q ? 1 : 0);
    fabCount.textContent = total > 0 ? total : "";
  }
}

// ---- INIT ----
document.getElementById('lang-toggle-es').classList.toggle('active', lang === 'es');
document.getElementById('lang-toggle-en').classList.toggle('active', lang === 'en');
document.documentElement.lang = lang;
applyLangToUI();
render();
