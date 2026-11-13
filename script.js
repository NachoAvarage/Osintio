// ================= THEME TOGGLE =================
const themeBtn = document.getElementById('theme-toggle');
function applyTheme(t) {
  document.body.classList.toggle('light', t === 'light');
  themeBtn.textContent = t === 'light' ? '☀️' : '🌙';
  localStorage.setItem('osint-theme', t);
}
applyTheme(localStorage.getItem('osint-theme') || 'dark');
themeBtn.addEventListener('click', () =>
  applyTheme(document.body.classList.contains('light') ? 'dark' : 'light'));

// ================= DORK GENERATOR =================
function buildDork() {
  const parts = [];
  const domain = document.getElementById('d-domain').value.trim();
  const keyword = document.getElementById('d-keyword').value.trim();
  const filetype = document.getElementById('d-filetype').value;
  const phrase = document.getElementById('d-phrase').value.trim();
  const exclude = document.getElementById('d-exclude').value.trim();
  const inurl = document.getElementById('d-inurl').value.trim();
  const intitle = document.getElementById('d-intitle').value.trim();

  if (domain) parts.push(`site:${domain}`);
  if (inurl) parts.push(`inurl:${inurl}`);
  if (intitle) parts.push(`intitle:"${intitle}"`);
  if (filetype) parts.push(`filetype:${filetype}`);
  if (phrase) parts.push(`"${phrase}"`);
  if (keyword) parts.push(keyword);
  exclude.split(',').map(s => s.trim()).filter(Boolean)
    .forEach(w => parts.push(`-${w}`));

  const q = parts.join(' ');
  document.getElementById('dork-result').textContent = q || 'site:';
  return q;
}

document.querySelectorAll('#dork-tool input, #dork-tool select')
  .forEach(el => el.addEventListener('input', buildDork));

function runDork(engine = 'google') {
  const q = buildDork();
  if (!q) return;
  const url =
    engine === 'bing' ? `https://www.bing.com/search?q=${encodeURIComponent(q)}` :
    engine === 'duck' ? `https://duckduckgo.com/?q=${encodeURIComponent(q)}` :
    engine === 'yandex' ? `https://yandex.com/search/?text=${encodeURIComponent(q)}` :
    `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  window.open(url, '_blank');
}

function copyDork() { navigator.clipboard.writeText(buildDork()); }

function preset(type) {
  const set = (id, v) => document.getElementById(id).value = v;
  ['d-filetype','d-phrase','d-exclude','d-inurl','d-intitle','d-keyword']
    .forEach(id => set(id, ''));
  if (type === 'directory') { set('d-intitle','index of'); }
  if (type === 'config')    { set('d-filetype','env'); set('d-keyword','DB_PASSWORD'); }
  if (type === 'login')     { set('d-intitle','login'); }
  if (type === 'docs')      { set('d-filetype','pdf'); set('d-keyword','confidential'); }
  if (type === 'cameras')   { set('d-intitle','webcam'); set('d-keyword','live'); }
  if (type === 'backups')   { set('d-filetype','bak'); set('d-inurl','backup'); }
  if (type === 'uploads')   { set('d-inurl','uploads'); set('d-intitle','upload'); }
  if (type === 'passwords') { set('d-filetype','txt'); set('d-phrase','password list'); }
  buildDork();
}

// ================= DORK HISTORY (localStorage + JSON export) =================
function getHistory() {
  try { return JSON.parse(localStorage.getItem('osint-dorks') || '[]'); }
  catch { return []; }
}
function renderHistory() {
  const hist = getHistory();
  const box = document.getElementById('dork-history');
  if (!hist.length) { box.innerHTML = ''; return; }
  box.innerHTML = '<h3>Saved dorks (' + hist.length + ')</h3>';
  hist.forEach((d, i) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `<span>${d.q.replace(/</g,'&lt;')}</span>
      <span class="btns">
        <button onclick="openDork(${i})">▶</button>
        <button class="danger" onclick="delDork(${i})">✕</button>
      </span>`;
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
    renderHistory();
  }
}
function delDork(i) {
  const hist = getHistory();
  hist.splice(i, 1);
  localStorage.setItem('osint-dorks', JSON.stringify(hist));
  renderHistory();
}
function openDork(i) {
  const q = getHistory()[i].q;
  window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
}
function exportDorks() {
  const blob = new Blob([JSON.stringify(getHistory(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'osint-dorks-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
}
function clearHistory() {
  if (confirm('Delete all saved dorks?')) {
    localStorage.removeItem('osint-dorks');
    renderHistory();
  }
}
renderHistory();
buildDork();

// ================= OSINT TARGET LAUNCHER (categorized) =================
const TARGET_TOOLS = {
  '🌐 Domain / Web': [
    { name:'WHOIS', desc:'Domain registration', url:t=>`https://who.is/whois/${t}` },
    { name:'crt.sh', desc:'Subdomains via certs', url:t=>`https://crt.sh/?q=%25.${t}` },
    { name:'urlscan.io', desc:'URL scans & history', url:t=>`https://urlscan.io/domain/${t}` },
    { name:'Wayback Machine', desc:'Archived history', url:t=>`https://web.archive.org/web/*/${t}` },
    { name:'DNSDumpster', desc:'DNS recon', url:t=>`https://dnsdumpster.com/?q=${t}` },
    { name:'SecurityTrails', desc:'Historical DNS', url:t=>`https://securitytrails.com/domain/${t}/dns` },
    { name:'BuiltWith', desc:'Tech stack', url:t=>`https://builtwith.com/${t}` },
    { name:'Hunter.io', desc:'Emails on domain', url:t=>`https://hunter.io/search/${t}` },
  ],
  '🖥 Infrastructure / IP': [
    { name:'Shodan', desc:'Exposed services', url:t=>`https://www.shodan.io/search?query=${t}` },
    { name:'Censys', desc:'Host intelligence', url:t=>`https://search.censys.io/search?resource=hosts&q=${t}` },
    { name:'FOFA', desc:'Global cyberspace', url:t=>`https://fofa.info/result?qbase64=${btoa(t)}` },
    { name:'ZoomEye', desc:'Device search', url:t=>`https://www.zoomeye.org/searchResult?q=${t}` },
    { name:'Netlas', desc:'Internet assets', url:t=>`https://app.netlas.io/responses/?q=${t}` },
    { name:'IPinfo', desc:'IP geolocation', url:t=>`https://ipinfo.io/${t}` },
    { name:'AbuseIPDB', desc:'IP abuse reports', url:t=>`https://www.abuseipdb.com/check/${t}` },
    { name:'GreyNoise', desc:'IP scan data', url:t=>`https://viz.greynoise.io/ip/${t}` },
    { name:'VirusTotal', desc:'Reputation / passive DNS', url:t=>`https://www.virustotal.com/gui/domain/${t}` },
    { name:'RIPEstat', desc:'Network info', url:t=>`https://stat.ripe.net/${t}` },
  ],
  '👤 Social Media / Usernames': [
    { name:'WhatsMyName', desc:'Username across 600+ sites', url:t=>`https://whatsmyname.app/?q=${t}` },
    { name:'Namechk', desc:'Username check', url:t=>`https://namechk.com/${t}` },
    { name:'Sherlock web', desc:'Username OSINT list', url:()=>'https://github.com/sherlock-project/sherlock' },
    { name:'X / Twitter', desc:'Search tweets', url:t=>`https://x.com/search?q=${t}&f=live` },
    { name:'Instagram', desc:'Profile lookup', url:t=>`https://www.instagram.com/${t}/` },
    { name:'Reddit', desc:'Posts & comments', url:t=>`https://www.reddit.com/search/?q=${t}` },
    { name:'LinkedIn', desc:'People search', url:t=>`https://www.linkedin.com/search/results/all/?keywords=${t}` },
    { name:'Facebook', desc:'Profile search', url:t=>`https://www.facebook.com/search/top?q=${t}` },
    { name:'GitHub', desc:'Code / profiles', url:t=>`https://github.com/search?q=${t}&type=code` },
    { name:'TikTok', desc:'Profile lookup', url:t=>`https://www.tiktok.com/@${t}` },
    { name:'Telegram', desc:'Profile lookup', url:t=>`https://t.me/${t}` },
    { name:'YouTube', desc:'Channels & videos', url:t=>`https://www.youtube.com/results?search_query=${t}` },
  ],
  '📧 Email / Breach Data': [
    { name:'HaveIBeenPwned', desc:'Breach check', url:t=>`https://haveibeenpwned.com/account/${t}` },
    { name:'DeHashed', desc:'Leak search', url:t=>`https://dehashed.com/search?query=${t}` },
    { name:'LeakIX', desc:'Leaked services', url:t=>`https://leakix.net/search?q=${t}` },
    { name:'Hunter.io', desc:'Email finder', url:t=>`https://hunter.io/search/${t}` },
    { name:'IntelligenceX', desc:'Leak archive', url:t=>`https://intelx.io/?s=${t}` },
    { name:'EPIEOS', desc:'Email/phone footprint', url:t=>`https://epieos.com/?q=${t}` },
    { name:'EmailRep', desc:'Email reputation', url:t=>`https://emailrep.io/${t}` },
  ],
  '📍 Geolocation / Maps': [
    { name:'Google Maps', desc:'Location search', url:t=>`https://www.google.com/maps/search/${t}` },
    { name:'OpenStreetMap', desc:'Free map lookup', url:t=>`https://www.openstreetmap.org/search?query=${t}` },
    { name:'Google Earth', desc:'Satellite / historical', url:t=>`https://earth.google.com/web/search/${t}` },
    { name:'Sentinel Hub', desc:'Satellite imagery', url:()=>'https://apps.sentinel-hub.com/eo-browser/' },
    { name:'SunCalc', desc:'Sun position (geolocate photos)', url:()=>'https://www.suncalc.org/' },
    { name:'Overpass Turbo', desc:'OSM data queries', url:()=>'https://overpass-turbo.eu/' },
    { name:'FlightRadar24', desc:'Live aircraft', url:()=>'https://www.flightradar24.com/' },
    { name:'MarineTraffic', desc:'Ship tracking', url:()=>'https://www.marinetraffic.com/' },
  ],
  '🔍 General Search': [
    { name:'Google', desc:'General search', url:t=>`https://www.google.com/search?q=${t}` },
    { name:'DuckDuckGo', desc:'Private search', url:t=>`https://duckduckgo.com/?q=${t}` },
    { name:'Bing', desc:'General search', url:t=>`https://www.bing.com/search?q=${t}` },
    { name:'Yandex', desc:'Image/face strong', url:t=>`https://yandex.com/search/?text=${t}` },
    { name:'Wayback CDX', desc:'Full URL archive', url:t=>`https://web.archive.org/cdx/search/cdx?url=${t}*` },
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
    a.innerHTML = `${tool.name}<small>${tool.desc}</small>`;
    a.addEventListener('click', e => {
      const t = document.getElementById('target').value.trim();
      if (t) { e.preventDefault(); window.open(tool.url(encodeURIComponent(t)), '_blank'); }
    });
    grid.appendChild(a);
  });
  catWrap.appendChild(grid);
});

// ================= LINK HUB =================
const HUB_LINKS = [
  ['Google Dorks DB (GHDB)','https://www.exploit-db.com/google-hacking-database'],
  ['OSINT Framework','https://osintframework.com/'],
  ['IntelTechniques','https://www.inteltechniques.com/tools/'],
  ['Bellingcat Toolkit','https://bellingcat.gitbook.io/toolkit'],
  ['OSINT Combine','https://www.osintcombine.com/tools'],
  ['IntelX','https://intelx.io/'],
  ['LeakIX','https://leakix.net/'],
  ['FOFA','https://fofa.info/'],
  ['ZoomEye','https://www.zoomeye.org/'],
  ['Netlas','https://app.netlas.io/'],
  ['Shodan','https://www.shodan.io/'],
  ['HaveIBeenPwned','https://haveibeenpwned.com/'],
  ['DeHashed','https://dehashed.com/'],
  ['EPIEOS','https://epieos.com/'],
  ['Sentinel Hub EO Browser','https://apps.sentinel-hub.com/eo-browser/'],
  ['FlightRadar24','https://www.flightradar24.com/'],
];
const hub = document.getElementById('hub-grid');
HUB_LINKS.forEach(([name,url]) => {
  const a = document.createElement('a');
  a.className = 'hub-card'; a.href = url; a.target = '_blank';
  a.innerHTML = `${name}<small>${url.replace('https://','').slice(0,30)}</small>`;
  hub.appendChild(a);
});
