// ================= TABS =================
const tabs = document.querySelectorAll('.tab');
tabs.forEach(t => t.addEventListener('click', () => activateTab(t.dataset.tab)));
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  const map = { '1':'dork','2':'recon','3':'image','4':'hub','5':'archive' };
  if (map[e.key]) activateTab(map[e.key]);
});
function activateTab(name) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.page').forEach(p =>
    p.classList.toggle('active', p.id === 'page-' + name));
  if (name === 'archive') renderHistory();
}

// ================= THEME TINT =================
const themeBtn = document.getElementById('theme-toggle');
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('tint-light');
  localStorage.setItem('osint-tint', document.body.classList.contains('tint-light') ? 'light' : 'dark');
});
if (localStorage.getItem('osint-tint') === 'light') document.body.classList.add('tint-light');

// ================= DORK FORGE =================
function buildDork() {
  const v = id => document.getElementById(id).value.trim();
  const parts = [];
  if (v('d-domain')) parts.push(`site:${v('d-domain')}`);
  if (v('d-inurl')) parts.push(`inurl:${v('d-inurl')}`);
  if (v('d-intitle')) parts.push(`intitle:"${v('d-intitle')}"`);
  if (v('d-filetype')) parts.push(`filetype:${v('d-filetype')}`);
  if (v('d-phrase')) parts.push(`"${v('d-phrase')}"`);
  if (v('d-keyword')) parts.push(v('d-keyword'));
  v('d-exclude').split(',').map(s => s.trim()).filter(Boolean).forEach(w => parts.push(`-${w}`));
  const q = parts.join(' ');
  document.getElementById('dork-result').textContent = q || 'site:';
  return q;
}
document.querySelectorAll('#page-dork input, #page-dork select')
  .forEach(el => el.addEventListener('input', buildDork));

function runDork(engine = 'google') {
  const q = buildDork();
  if (!q) return;
  const url =
    engine === 'bing'   ? `https://www.bing.com/search?q=${encodeURIComponent(q)}` :
    engine === 'duck'   ? `https://duckduckgo.com/?q=${encodeURIComponent(q)}` :
    engine === 'yandex' ? `https://yandex.com/search/?text=${encodeURIComponent(q)}` :
    `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  window.open(url, '_blank');
}
function copyDork() { navigator.clipboard.writeText(buildDork()); }

function preset(type) {
  const set = (id, v) => document.getElementById(id).value = v;
  ['d-domain','d-filetype','d-phrase','d-exclude','d-inurl','d-intitle','d-keyword']
    .forEach(id => set(id, ''));
  const P = {
    directory: { 'd-intitle':'index of' },
    config:    { 'd-filetype':'env', 'd-keyword':'DB_PASSWORD' },
    login:     { 'd-intitle':'login' },
    docs:      { 'd-filetype':'pdf', 'd-keyword':'confidential' },
    cameras:   { 'd-intitle':'webcam', 'd-keyword':'live' },
    backups:   { 'd-filetype':'bak', 'd-inurl':'backup' },
    uploads:   { 'd-inurl':'uploads', 'd-intitle':'upload' },
    passwords: { 'd-filetype':'txt', 'd-phrase':'password list' },
  };
  if (P[type]) Object.entries(P[type]).forEach(([k, v]) => set(k, v));
  buildDork();
}

// ================= SAVED DORKS =================
function getHistory() {
  try { return JSON.parse(localStorage.getItem('osint-dorks') || '[]'); }
  catch { return []; }
}
function updateBadge() {
  document.getElementById('hist-badge').textContent = getHistory().length;
}
function renderHistory() {
  const hist = getHistory();
  const box = document.getElementById('dork-history');
  updateBadge();
  if (!hist.length) {
    box.innerHTML = '<div class="empty-state">[ no saved dorks — forge one and hit "save ⤓" ]</div>';
    return;
  }
  box.innerHTML = '';
  hist.forEach((d, i) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const q = document.createElement('span');
    q.className = 'q';
    q.textContent = d.q;
    const date = document.createElement('span');
    date.className = 'date';
    date.textContent = new Date(d.date).toLocaleString();
    q.appendChild(date);
    const btns = document.createElement('span');
    btns.className = 'btns';
    btns.innerHTML =
      `<button onclick="openDork(${i})">▶</button>` +
      `<button onclick="copyDorkAt(${i})">copy</button>` +
      `<button class="btn-danger" onclick="delDork(${i})">✕</button>`;
    item.append(q, btns);
    box.appendChild(item);
  });
}
function saveDork() {
  const q = buildDork();
  if (!q || q === 'site:') return;
  const hist = getHistory();
  if (!hist.some(h => h.q === q)) {
    hist.unshift({ q, date: new Date().toISOString() });
    localStorage.setItem('osint-dorks', JSON.stringify(hist.slice(0, 100)));
    updateBadge();
  }
}
function delDork(i) {
  const hist = getHistory(); hist.splice(i, 1);
  localStorage.setItem('osint-dorks', JSON.stringify(hist));
  renderHistory();
}
function openDork(i) {
  window.open(`https://www.google.com/search?q=${encodeURIComponent(getHistory()[i].q)}`, '_blank');
}
function copyDorkAt(i) { navigator.clipboard.writeText(getHistory()[i].q); }
function exportDorks() {
  const blob = new Blob([JSON.stringify(getHistory(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'osint-dorks-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
}
function clearHistory() {
  if (!confirm('Wipe all saved dorks?')) return;
  localStorage.removeItem('osint-dorks');
  renderHistory();
}
updateBadge();

// ================= TARGET RECON =================
const TARGET_TOOLS = {
  '🌐 domain / web': [
    { name:'WHOIS', desc:'registration data', url:t=>`https://who.is/whois/${t}` },
    { name:'crt.sh', desc:'subdomains via CT logs', url:t=>`https://crt.sh/?q=%25.${t}` },
    { name:'urlscan.io', desc:'scan history', url:t=>`https://urlscan.io/domain/${t}` },
    { name:'Wayback', desc:'archived snapshots', url:t=>`https://web.archive.org/web/*/${t}` },
    { name:'DNSDumpster', desc:'dns recon', url:t=>`https://dnsdumpster.com/?q=${t}` },
    { name:'SecurityTrails', desc:'historical dns', url:t=>`https://securitytrails.com/domain/${t}/dns` },
    { name:'BuiltWith', desc:'tech stack', url:t=>`https://builtwith.com/${t}` },
    { name:'Hunter.io', desc:'emails on domain', url:t=>`https://hunter.io/search/${t}` },
  ],
  '🖥 infrastructure / ip': [
    { name:'Shodan', desc:'exposed services', url:t=>`https://www.shodan.io/search?query=${t}` },
    { name:'Censys', desc:'host intel', url:t=>`https://search.censys.io/search?resource=hosts&q=${t}` },
    { name:'FOFA', desc:'global asset search', url:t=>`https://fofa.info/result?qbase64=${btoa(t)}` },
    { name:'ZoomEye', desc:'device search', url:t=>`https://www.zoomeye.org/searchResult?q=${t}` },
    { name:'Netlas', desc:'internet assets', url:t=>`https://app.netlas.io/responses/?q=${t}` },
    { name:'IPinfo', desc:'geolocation / asn', url:t=>`https://ipinfo.io/${t}` },
    { name:'AbuseIPDB', desc:'abuse reports', url:t=>`https://www.abuseipdb.com/check/${t}` },
    { name:'GreyNoise', desc:'scan activity', url:t=>`https://viz.greynoise.io/ip/${t}` },
    { name:'VirusTotal', desc:'reputation', url:t=>`https://www.virustotal.com/gui/domain/${t}` },
    { name:'RIPEstat', desc:'network data', url:t=>`https://stat.ripe.net/${t}` },
  ],
  '👤 social / usernames': [
    { name:'WhatsMyName', desc:'600+ sites', url:t=>`https://whatsmyname.app/?q=${t}` },
    { name:'Namechk', desc:'username check', url:t=>`https://namechk.com/${t}` },
    { name:'X / Twitter', desc:'live posts', url:t=>`https://x.com/search?q=${t}&f=live` },
    { name:'Instagram', desc:'profile', url:t=>`https://www.instagram.com/${t}/` },
    { name:'Reddit', desc:'posts & comments', url:t=>`https://www.reddit.com/search/?q=${t}` },
    { name:'LinkedIn', desc:'people', url:t=>`https://www.linkedin.com/search/results/all/?keywords=${t}` },
    { name:'Facebook', desc:'search', url:t=>`https://www.facebook.com/search/top?q=${t}` },
    { name:'GitHub', desc:'code & profiles', url:t=>`https://github.com/search?q=${t}&type=code` },
    { name:'TikTok', desc:'profile', url:t=>`https://www.tiktok.com/@${t}` },
    { name:'Telegram', desc:'profile', url:t=>`https://t.me/${t}` },
    { name:'YouTube', desc:'channels', url:t=>`https://www.youtube.com/results?search_query=${t}` },
    { name:'Pinterest', desc:'profile', url:t=>`https://www.pinterest.com/${t}/` },
  ],
  '📧 email / breaches': [
    { name:'HaveIBeenPwned', desc:'breach check', url:t=>`https://haveibeenpwned.com/account/${t}` },
    { name:'DeHashed', desc:'leak search', url:t=>`https://dehashed.com/search?query=${t}` },
    { name:'LeakIX', desc:'leaked services', url:t=>`https://leakix.net/search?q=${t}` },
    { name:'IntelligenceX', desc:'leak archive', url:t=>`https://intelx.io/?s=${t}` },
    { name:'EPIEOS', desc:'email footprint', url:t=>`https://epieos.com/?q=${t}` },
    { name:'EmailRep', desc:'reputation', url:t=>`https://emailrep.io/${t}` },
    { name:'Gravatar', desc:'avatar lookup', url:t=>`https://www.gravatar.com/${t}` },
  ],
  '📍 geolocation': [
    { name:'Google Maps', desc:'location', url:t=>`https://www.google.com/maps/search/${t}` },
    { name:'OSM', desc:'open map', url:t=>`https://www.openstreetmap.org/search?query=${t}` },
    { name:'Google Earth', desc:'satellite', url:t=>`https://earth.google.com/web/search/${t}` },
    { name:'Yandex Maps', desc:'street view (good coverage)', url:t=>`https://yandex.com/maps/?text=${t}` },
  ],
  '🔍 general': [
    { name:'Google', desc:'web', url:t=>`https://www.google.com/search?q=${t}` },
    { name:'DuckDuckGo', desc:'web', url:t=>`https://duckduckgo.com/?q=${t}` },
    { name:'Bing', desc:'web', url:t=>`https://www.bing.com/search?q=${t}` },
    { name:'Yandex', desc:'web', url:t=>`https://yandex.com/search/?text=${t}` },
    { name:'Wayback CDX', desc:'full url index', url:t=>`https://web.archive.org/cdx/search/cdx?url=${t}*` },
  ],
};

const catWrap = document.getElementById('osint-categories');
Object.entries(TARGET_TOOLS).forEach(([cat, tools]) => {
  const h = document.createElement('div');
  h.className = 'cat-title';
  h.textContent = cat;
  catWrap.appendChild(h);
  const grid = document.createElement('div');
  grid.className = 'tool-grid';
  tools.forEach(tool => {
    const a = document.createElement('a');
    a.className = 'tool-btn';
    a.target = '_blank';
    a.innerHTML = `<b>${tool.name}</b><small>${tool.desc}</small>`;
    a.addEventListener('click', e => {
      const t = document.getElementById('target').value.trim();
      if (t) { e.preventDefault(); window.open(tool.url(encodeURIComponent(t)), '_blank'); }
      else { e.preventDefault(); document.getElementById('target').focus(); }
    });
    grid.appendChild(a);
  });
  catWrap.appendChild(grid);
});

// ================= IMAGE LAB =================
const IMAGE_TOOLS = [
  { name:'Google Lens', desc:'reverse image', url:u=>`https://lens.google.com/uploadbyurl?url=${u}` },
  { name:'Yandex Images', desc:'strong face/object match', url:u=>`https://yandex.com/images/search?rpt=imageview&url=${u}` },
  { name:'TinEye', desc:'first seen / copies', url:u=>`https://tineye.com/search?url=${u}` },
  { name:'Bing Visual', desc:'reverse image', url:u=>`https://www.bing.com/images/search?q=imgurl:${u}&view=detailv2&iss=sbi` },
  { name:'Baidu Images', desc:'cn coverage', url:u=>`https://graph.baidu.com/pcpage/index?tpl_from=pc&image_url=${u}` },
  { name:'Karma Decay', desc:'reddit reposts', url:u=>`http://karmadecay.com/search?q=${u}` },
  { name:'Metadata2Go', desc:'EXIF viewer', url:()=>'https://www.metadata2go.com' },
  { name:'Fotoforensics', desc:'error level analysis', url:()=>'https://fotoforensics.com/' },
  { name:'Jeffrey EXIF Viewer', desc:'full EXIF dump', url:u=>`http://exif.regex.info/exif.cgi?referer=${u}` },
];
const imgWrap = document.getElementById('image-tools');
IMAGE_TOOLS.forEach(tool => {
  const a = document.createElement('a');
  a.className = 'tool-btn';
  a.target = '_blank';
  a.innerHTML = `<b>${tool.name}</b><small>${tool.desc}</small>`;
  a.addEventListener('click', e => {
    const u = document.getElementById('imgurl').value.trim();
    if (u) { e.preventDefault(); window.open(tool.url(encodeURIComponent(u)), '_blank'); }
    else { e.preventDefault(); document.getElementById('imgurl').focus(); }
  });
  imgWrap.appendChild(a);
});

// ================= LINK HUB =================
const HUB_LINKS = [
  ['Google Dorks DB (GHDB)','exploit-db.com/google-hacking-database','https://www.exploit-db.com/google-hacking-database'],
  ['OSINT Framework','osintframework.com','https://osintframework.com/'],
  ['Bellingcat Toolkit','bellingcat.gitbook.io/toolkit','https://bellingcat.gitbook.io/toolkit'],
  ['OSINT Combine','osintcombine.com/tools','https://www.osintcombine.com/tools'],
  ['IntelTechniques','inteltechniques.com/tools','https://www.inteltechniques.com/tools/'],
  ['Shodan','shodan.io','https://www.shodan.io/'],
  ['Censys Search','search.censys.io','https://search.censys.io/'],
  ['FOFA','fofa.info','https://fofa.info/'],
  ['ZoomEye','zoomeye.org','https://www.zoomeye.org/'],
  ['Netlas','app.netlas.io','https://app.netlas.io/'],
  ['IntelligenceX','intelx.io','https://intelx.io/'],
  ['HaveIBeenPwned','haveibeenpwned.com','https://haveibeenpwned.com/'],
  ['DeHashed','dehashed.com','https://dehashed.com/'],
  ['EPIEOS','epieos.com','https://epieos.com/'],
  ['Sentinel Hub EO','apps.sentinel-hub.com','https://apps.sentinel-hub.com/eo-browser/'],
  ['FlightRadar24','flightradar24.com','https://www.flightradar24.com/'],
  ['MarineTraffic','marinetraffic.com','https://www.marinetraffic.com/'],
  ['SunCalc','suncalc.org','https://www.suncalc.org/'],
];
const hub = document.getElementById('hub-grid');
HUB_LINKS.forEach(([name, host, url]) => {
  const a = document.createElement('a');
  a.className = 'hub-card'; a.href = url; a.target = '_blank';
  a.innerHTML = `<b>${name}</b><small>${host}</small>`;
  hub.appendChild(a);
});
