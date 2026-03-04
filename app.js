
// Premium client-side search + RSS news aggregator (no build step)

// --- Search (Fuse.js) ---
const searchInput = document.getElementById("searchInput");
const resultsEl = document.getElementById("searchResults");

async function loadIndex(){
  const res = await fetch("/search-index.json");
  return await res.json();
}

let fuse, indexData;

async function initSearch(){
  try{
    indexData = await loadIndex();
    // Load Fuse dynamically
    await new Promise((resolve,reject)=>{
      const s=document.createElement("script");
      s.src="https://cdn.jsdelivr.net/npm/fuse.js@6.6.2";
      s.onload=resolve; s.onerror=reject;
      document.head.appendChild(s);
    });
    fuse = new Fuse(indexData, {
      keys:["title","excerpt","tags","content"],
      includeScore:true,
      threshold:0.35,
      ignoreLocation:true,
      minMatchCharLength:2
    });
  }catch(e){
    console.warn("Search init failed", e);
  }
}

function renderResults(items){
  if(!resultsEl) return;
  if(!items || items.length===0){
    resultsEl.innerHTML = `<div class="panel"><div class="small">No matches yet. Try “policy-as-code”, “knowledge graph”, or “HITL”.</div></div>`;
    return;
  }
  const top = items.slice(0,8);
  resultsEl.innerHTML = top.map(r=>{
    const p=r.item;
    const tags = (p.tags||[]).slice(0,3).map(t=>`<span class="tag">${t}</span>`).join(" ");
    return `
      <div class="card postCard">
        <div class="postMeta">${tags} <span>•</span> <span>${p.readingTime}</span></div>
        <a href="${p.url}"><h3>${p.title}</h3></a>
        <p>${p.excerpt}</p>
      </div>
    `;
  }).join("");
}

async function wireSearch(){
  await initSearch();
  if(!searchInput || !fuse) return;
  renderResults([]);
  searchInput.addEventListener("input", ()=>{
    const q = searchInput.value.trim();
    if(q.length<2){ renderResults([]); return; }
    const res = fuse.search(q);
    renderResults(res);
  });
}

// --- AI News (RSS via rss2json) ---
const newsEl = document.getElementById("aiNews");
const feeds = [
  {name:"MIT Technology Review — AI", url:"https://www.technologyreview.com/topic/artificial-intelligence/feed/"},
  {name:"VentureBeat — AI", url:"https://venturebeat.com/category/ai/feed/"},
  {name:"NVIDIA Blog — AI", url:"https://blogs.nvidia.com/blog/category/deep-learning/feed/"},
  {name:"Google DeepMind Blog", url:"https://deepmind.google/blog/rss.xml"},
];

async function fetchFeed(feed){
  const api = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feed.url);
  const res = await fetch(api);
  const data = await res.json();
  if(!data || !data.items) return [];
  return data.items.slice(0,3).map(item=>({
    title:item.title,
    link:item.link,
    pubDate:item.pubDate,
    source:feed.name,
    desc:(item.description||"").replace(/<[^>]*>/g,"").slice(0,160)
  }));
}

function renderNews(items){
  if(!newsEl) return;
  if(!items || items.length===0){
    newsEl.innerHTML = `<div class="panel"><div class="small">News feed unavailable right now (RSS provider rate limits happen). Refresh later.</div></div>`;
    return;
  }
  newsEl.innerHTML = `
    <div class="newsGrid">
      ${items.slice(0,8).map(n=>`
        <div class="newsItem">
          <a href="${n.link}" target="_blank" rel="noreferrer">${n.title}</a>
          <p>${n.source} • ${n.pubDate}</p>
          <p>${n.desc}${n.desc.length>=160?"…":""}</p>
        </div>
      `).join("")}
    </div>
    <div class="small" style="margin-top:10px;color:var(--muted)">
      Feeds: ${feeds.map(f=>f.name).join(" • ")}
    </div>
  `;
}

async function initNews(){
  try{
    const all = (await Promise.all(feeds.map(fetchFeed))).flat();
    all.sort((a,b)=> new Date(b.pubDate) - new Date(a.pubDate));
    renderNews(all);
  }catch(e){
    console.warn("News init failed", e);
    renderNews([]);
  }
}

// Mermaid theme
function initMermaid(){
  if(!window.mermaid) return;
  mermaid.initialize({
    startOnLoad:true,
    theme:"dark",
    themeVariables:{
      darkMode:true,
      primaryColor:"#0b1220",
      primaryTextColor:"#e5e7eb",
      primaryBorderColor:"#334155",
      lineColor:"#60a5fa",
      secondaryColor:"#111827",
      tertiaryColor:"#0b1220",
      fontFamily:"ui-sans-serif, system-ui"
    }
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  wireSearch();
  initNews();
  initMermaid();
});
