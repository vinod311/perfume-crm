'use strict';
const KEY='scentbook:data:v1',SKEY='scentbook:settings:v1';
const TYPES=['Order','Query','Dispatch','Sample','Follow-up'];
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const today=()=>new Date().toISOString().slice(0,10);
const fmt=d=>d?new Date(d+'T00:00').toLocaleDateString(undefined,{day:'numeric',month:'short'}):'';
function load(k,def){try{const v=JSON.parse(localStorage.getItem(k));return v??def}catch(e){return def}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){toast('Storage full. Export a backup.');return false}}
let data=load(KEY,{customers:[]}),set=load(SKEY,{pin:'',wa:''});
if(!Array.isArray(data.customers))data={customers:[]};
let ui={tab:'customers',q:'',type:'All',open:null,unlocked:!set.pin},deferred=null;
const persist=()=>save(KEY,data);
function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}
async function hash(p){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('scentbook'+p));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const waLink=p=>'https://wa.me/'+String(p||'').replace(/\D/g,'');
const pending=c=>(c.acts||[]).filter(a=>!a.done&&a.due);
const nextDue=c=>pending(c).map(a=>a.due).sort()[0];

function render(){
  const app=$('#app');
  try{
    if(!ui.unlocked){app.innerHTML=lockView();bindLock();return}
    app.innerHTML=(ui.open?detailView():ui.tab==='customers'?homeView():ui.tab==='follow'?followView():settingsView())+(ui.open?'':navView());
    bind();
  }catch(e){console.error(e);app.innerHTML='<div class="empty">Something went wrong.<div class="btns" style="justify-content:center"><button class="btn" onclick="location.reload()">Reload</button></div></div>'}
}
const ico={c:'<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 4a4 4 0 0 1 0 8M22 21c0-3-2-5-4-5.5"/></svg>',f:'<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>',s:'<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.3l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2.2-1.3L14 3h-4l-.4 2.5A7 7 0 0 0 7.4 6.8l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.6l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2.2 1.3L10 21h4l.4-2.5a7 7 0 0 0 2.2-1.3l2.3 1 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z"/></svg>'};
const navView=()=>`<nav><div>${[['customers','Customers',ico.c],['follow','Follow-ups',ico.f],['settings','Settings',ico.s]].map(([k,l,i])=>`<button data-tab="${k}" class="${ui.tab===k?'on':''}">${i}${l}</button>`).join('')}</div></nav>`;
const head=(sub)=>`<header><div class="brand"><img src="icons/icon-192.png" alt="">Scentbook<span class="sp"></span>${sub||''}</div>`;

function matches(c,q){if(!q)return true;q=q.toLowerCase();return [c.name,c.company,c.phone,c.city,c.notes].some(x=>(x||'').toLowerCase().includes(q))||(c.acts||[]).some(a=>(a.text||'').toLowerCase().includes(q)||a.type.toLowerCase().includes(q))}
function homeView(){
  let l=data.customers.filter(c=>matches(c,ui.q));
  if(ui.type!=='All')l=l.filter(c=>(c.acts||[]).some(a=>a.type===ui.type&&!a.done));
  l.sort((a,b)=>(nextDue(a)||'9').localeCompare(nextDue(b)||'9')||a.name.localeCompare(b.name));
  return head()+`<div class="search"><span>🔍</span><input id="q" type="search" placeholder="Search name, phone, order…" value="${esc(ui.q)}" autocomplete="off"></div></header>
  <div class="chips">${['All',...TYPES].map(t=>`<button class="chip ${ui.type===t?'on':''}" data-type="${t}">${t==='All'?'All':t+' open'}</button>`).join('')}</div>
  <div class="list">${l.length?l.map(cardView).join(''):`<div class="empty">${data.customers.length?'No match found.':'No customers yet.<br>Tap + to add your first one.'}</div>`}</div>
  <button class="fab" id="addc" aria-label="Add customer">+</button>`}
function cardView(c){const d=nextDue(c),n=pending(c).length;
  return `<div class="card row" data-open="${c.id}"><div class="av">${esc((c.name||'?')[0].toUpperCase())}</div><div class="grow"><div class="t">${esc(c.name)}</div><div class="s">${esc([c.company,c.city].filter(Boolean).join(' · ')||c.phone||'')}</div></div>${n?`<span class="badge ${d<today()?'due':''}">${n} open${d?' · '+fmt(d):''}</span>`:''}</div>`}
function followView(){
  const all=[];data.customers.forEach(c=>pending(c).forEach(a=>all.push({c,a})));
  all.sort((x,y)=>x.a.due.localeCompare(y.a.due));
  return head()+`<div style="height:2px"></div></header><div class="list">${all.length?all.map(({c,a})=>`<div class="card"><div class="row" data-open="${c.id}"><div class="grow"><div class="t">${esc(c.name)}</div><div class="s"><span class="tag">${a.type}</span>${esc(a.text)}</div></div><span class="badge ${a.due<today()?'due':''}">${a.due<today()?'Overdue · ':''}${fmt(a.due)}</span></div><div class="btns"><button class="btn alt" data-done="${c.id}|${a.id}">Mark done</button></div></div>`).join(''):'<div class="empty">All caught up.</div>'}</div>`}
function detailView(){
  const c=data.customers.find(x=>x.id===ui.open);if(!c){ui.open=null;return homeView()}
  const acts=(c.acts||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
  return `<header><div class="brand"><button class="icon" id="back" aria-label="Back" style="color:#fff">←</button><span class="grow t">${esc(c.name)}</span><button class="icon" id="editc" aria-label="Edit">✎</button></div>
  <div class="s" style="color:#CDBFD9;margin:8px 0 0 8px">${esc([c.company,c.city].filter(Boolean).join(' · '))}</div></header>
  <div class="pad"><div class="card">${c.phone?`<div class="btns" style="margin:0 0 8px"><a class="btn" href="tel:${esc(c.phone)}" style="text-decoration:none">Call</a><a class="btn alt" target="_blank" rel="noopener" href="${waLink(c.phone)}" style="text-decoration:none">WhatsApp</a></div><div class="s">${esc(c.phone)}</div>`:'<div class="s">No phone added</div>'}${c.notes?`<p style="margin-top:8px">${esc(c.notes)}</p>`:''}</div>
  <div class="h2" style="margin-top:18px">Activity</div>
  <div class="btns" style="margin:0 0 12px">${TYPES.map(t=>`<button class="chip" data-add="${t}">+ ${t}</button>`).join('')}</div>
  <div class="list" style="padding:0">${acts.length?acts.map(a=>`<div class="card"><div class="row" data-edit="${a.id}"><div class="grow"><div><span class="tag">${a.type}</span><span class="s">${fmt(a.date)}</span></div><div style="margin-top:4px">${esc(a.text)}</div></div>${a.due?`<span class="badge ${a.done?'done':a.due<today()?'due':''}">${a.done?'Done':fmt(a.due)}</span>`:''}</div></div>`).join(''):'<div class="empty">Nothing logged yet.</div>'}</div></div>`}
function settingsView(){
  return head()+`<div style="height:2px"></div></header><div class="pad">
  <div class="card"><div class="h2">Backup</div><div class="s">${data.customers.length} customers saved on this device</div><div class="btns"><button class="btn" id="exj">Export backup</button><button class="btn alt" id="exc">Export CSV</button><button class="btn alt" id="imp">Import</button></div><input type="file" id="file" accept=".json,application/json" hidden></div>
  <div class="card" style="margin-top:12px"><div class="h2">Privacy lock</div><div class="s">${set.pin?'PIN is on':'Protect the app with a PIN'}</div><div class="btns"><button class="btn" id="pin">${set.pin?'Change PIN':'Set PIN'}</button>${set.pin?'<button class="btn alt" id="lockn">Lock now</button><button class="btn red" id="nopin">Remove PIN</button>':''}</div></div>
  <div class="card" style="margin-top:12px"><div class="h2">WhatsApp number</div><input id="wa" inputmode="tel" placeholder="+91 98765 43210" value="${esc(set.wa)}"><div class="btns"><button class="btn" id="savewa">Save number</button></div><div class="note">Saved for the future. Live message sync needs the WhatsApp Business API and a small server. See README.</div></div>
  <div class="card" style="margin-top:12px"><div class="h2">Install</div><div class="btns"><button class="btn" id="inst">Install app</button></div></div>
  <div class="card" style="margin-top:12px"><div class="h2">Delete everything</div><div class="btns"><button class="btn red" id="wipe">Delete all data</button></div></div></div>`}
function lockView(){return `<div class="lock"><div><img src="icons/icon-192.png" alt=""><h2 style="margin-top:14px">Scentbook</h2><input id="lp" type="password" inputmode="numeric" maxlength="8" placeholder="PIN" autocomplete="off"><div id="le" class="s" style="color:#F3B6AE;min-height:20px"></div><button class="btn" id="unl" style="background:var(--gold)">Unlock</button></div></div>`}

function modal(html){const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="sheet">${html}</div>`;m.addEventListener('click',e=>{if(e.target===m)m.remove()});document.body.appendChild(m);return m}
function customerForm(c){c=c||{};const m=modal(`<h3>${c.id?'Edit customer':'New customer'}</h3><label>Name *</label><input id="f-name" value="${esc(c.name)}"><label>Company</label><input id="f-co" value="${esc(c.company)}"><label>Phone</label><input id="f-ph" inputmode="tel" value="${esc(c.phone)}"><label>City</label><input id="f-city" value="${esc(c.city)}"><label>Notes</label><textarea id="f-notes">${esc(c.notes)}</textarea><div class="btns"><button class="btn" id="ok">Save</button>${c.id?'<button class="btn red" id="del">Delete</button>':''}<button class="btn alt" id="x">Cancel</button></div>`);
  m.querySelector('#x').onclick=()=>m.remove();
  m.querySelector('#ok').onclick=()=>{const name=m.querySelector('#f-name').value.trim();if(!name)return toast('Enter a name');
    const v={name,company:m.querySelector('#f-co').value.trim(),phone:m.querySelector('#f-ph').value.trim(),city:m.querySelector('#f-city').value.trim(),notes:m.querySelector('#f-notes').value.trim()};
    if(c.id)Object.assign(c,v);else{data.customers.push({id:uid(),acts:[],...v})}
    persist();m.remove();render();toast('Saved')};
  const d=m.querySelector('#del');if(d)d.onclick=()=>{if(confirm('Delete '+c.name+' and all their activity?')){data.customers=data.customers.filter(x=>x.id!==c.id);ui.open=null;persist();m.remove();render();toast('Deleted')}}}
function actForm(c,type,a){a=a||{type,date:today(),text:'',due:''};
  const m=modal(`<h3>${a.id?'Edit':'New'} ${esc(a.type)}</h3><label>Type</label><select id="a-type">${TYPES.map(t=>`<option ${t===a.type?'selected':''}>${t}</option>`).join('')}</select><label>Details</label><textarea id="a-text" placeholder="Product, quantity, tracking no…">${esc(a.text)}</textarea><label>Date</label><input id="a-date" type="date" value="${a.date}"><label>Follow-up date</label><input id="a-due" type="date" value="${a.due||''}">${a.id?`<label><input type="checkbox" id="a-done" style="width:auto" ${a.done?'checked':''}> Done</label>`:''}<div class="btns"><button class="btn" id="ok">Save</button>${a.id?'<button class="btn red" id="del">Delete</button>':''}<button class="btn alt" id="x">Cancel</button></div>`);
  m.querySelector('#x').onclick=()=>m.remove();
  m.querySelector('#ok').onclick=()=>{const text=m.querySelector('#a-text').value.trim();if(!text)return toast('Add some details');
    const v={type:m.querySelector('#a-type').value,text,date:m.querySelector('#a-date').value||today(),due:m.querySelector('#a-due').value,done:m.querySelector('#a-done')?.checked||false};
    c.acts=c.acts||[];if(a.id)Object.assign(a,v);else c.acts.push({id:uid(),...v});persist();m.remove();render();toast('Saved')};
  const d=m.querySelector('#del');if(d)d.onclick=()=>{if(confirm('Delete this entry?')){c.acts=c.acts.filter(x=>x.id!==a.id);persist();m.remove();render()}}}

function download(name,text,type){const u=URL.createObjectURL(new Blob([text],{type}));const l=document.createElement('a');l.href=u;l.download=name;l.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
const csvCell=v=>{v=String(v??'');if(/^[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'};
function validData(d){return d&&Array.isArray(d.customers)&&d.customers.every(c=>c&&typeof c.name==='string')}

function bind(){
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ui.tab=b.dataset.tab;render()});
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{ui.open=b.dataset.open;scrollTo(0,0);render()});
  document.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{ui.type=b.dataset.type;render()});
  document.querySelectorAll('[data-done]').forEach(b=>b.onclick=()=>{const[cid,aid]=b.dataset.done.split('|');const a=data.customers.find(x=>x.id===cid)?.acts.find(x=>x.id===aid);if(a){a.done=true;persist();render()}});
  const q=$('#q');if(q)q.oninput=()=>{ui.q=q.value;const p=q.selectionStart;render();const n=$('#q');n.focus();n.setSelectionRange(p,p)};
  const on=(id,f)=>{const e=$(id);if(e)e.onclick=f};
  on('#addc',()=>customerForm());
  on('#back',()=>{ui.open=null;render()});
  const cur=()=>data.customers.find(x=>x.id===ui.open);
  on('#editc',()=>customerForm(cur()));
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>actForm(cur(),b.dataset.add));
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>actForm(cur(),'',cur().acts.find(x=>x.id===b.dataset.edit)));
  on('#exj',()=>download('scentbook-backup-'+today()+'.json',JSON.stringify(data,null,2),'application/json'));
  on('#exc',()=>{const r=[['Customer','Company','Phone','City','Type','Details','Date','Follow-up','Done']];data.customers.forEach(c=>{if(!(c.acts||[]).length)r.push([c.name,c.company,c.phone,c.city]);(c.acts||[]).forEach(a=>r.push([c.name,c.company,c.phone,c.city,a.type,a.text,a.date,a.due,a.done?'Yes':'No']))});download('scentbook-'+today()+'.csv',r.map(x=>x.map(csvCell).join(',')).join('\n'),'text/csv')});
  on('#imp',()=>$('#file').click());
  const f=$('#file');if(f)f.onchange=()=>{const file=f.files[0];if(!file)return;const rd=new FileReader();rd.onload=()=>{try{const d=JSON.parse(rd.result);if(!validData(d))throw 0;if(confirm('Replace current data with '+d.customers.length+' customers from this file?')){data=d;persist();render();toast('Imported')}}catch(e){toast('Not a valid Scentbook backup')}};rd.readAsText(file)};
  on('#pin',async()=>{const p=prompt('Choose a PIN (4-8 digits)');if(p===null)return;if(!/^\d{4,8}$/.test(p))return toast('Use 4 to 8 digits');set.pin=await hash(p);save(SKEY,set);render();toast('PIN set')});
  on('#nopin',()=>{if(confirm('Remove PIN?')){set.pin='';save(SKEY,set);render()}});
  on('#lockn',()=>{ui.unlocked=false;render()});
  on('#savewa',()=>{set.wa=$('#wa').value.trim();save(SKEY,set);toast('Saved')});
  on('#inst',async()=>{if(deferred){deferred.prompt();deferred=null}else toast('In Chrome: menu ⋮ → Install app')});
  on('#wipe',()=>{if(confirm('Delete ALL customers and activity? This cannot be undone.')&&prompt('Type DELETE to confirm')==='DELETE'){data={customers:[]};persist();render();toast('All data deleted')}});
}
function bindLock(){const go=async()=>{if(await hash($('#lp').value)===set.pin){ui.unlocked=true;render()}else{$('#le').textContent='Wrong PIN';$('#lp').value=''}};$('#unl').onclick=go;$('#lp').onkeydown=e=>{if(e.key==='Enter')go()}}

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e});
window.addEventListener('error',e=>console.error(e.error||e.message));
window.addEventListener('unhandledrejection',e=>console.error(e.reason));
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
render();
