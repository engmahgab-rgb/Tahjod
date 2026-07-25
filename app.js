const $=id=>document.getElementById(id),KEY='tahjod-v2';
const PRAYERS=[['Fajr',2],['Dhuhr',2],['Asr',0],['Maghrib',2],['Isha',0],['Tahajjud / Qiyam',4],['Witr',0],['Sunnah / Nafl',0]];
let state=JSON.parse(localStorage.getItem(KEY)||'null')||{strategy:'Recent + Old / Spaced Revision',quarterStatus:{},strength:{},transitions:{},weakAyahs:{},history:[],rotation:1,prayers:Object.fromEntries(PRAYERS.map(([p,r])=>[p,{enabled:r>0,rakahs:r,portion:'1'}])),today:null};
const RUB=Array.from({length:240},(_,i)=>({id:i+1,juz:Math.floor(i/8)+1,hizb:Math.floor(i/4)+1}));
function save(){localStorage.setItem(KEY,JSON.stringify(state))} function today(){return new Date().toISOString().slice(0,10)}
function status(q){return state.quarterStatus[q]||'none'} function eligible(){return RUB.filter(q=>status(q.id)==='memorized')}
function strength(q){return state.strength[q]??50}
function lastReview(q){return state.history.filter(h=>h.quarter===q&&h.status==='recited').at(-1)}
function dueScore(q){let last=lastReview(q),days=last?Math.max(0,(Date.now()-new Date(last.date))/86400000):99;return (100-strength(q))+Math.min(days,60)}
function pick(n){
 let e=eligible(); if(!e.length)return[];
 if(state.strategy==='Weakest First') return e.sort((a,b)=>strength(a.id)-strength(b.id)).slice(0,n);
 if(state.strategy==='Spaced Repetition') return e.sort((a,b)=>dueScore(b.id)-dueScore(a.id)).slice(0,n);
 if(state.strategy==='Sequential'){let e2=e.sort((a,b)=>a.id-b.id),s=e2.findIndex(x=>x.id>=state.rotation);if(s<0)s=0;return Array.from({length:Math.min(n,e2.length)},(_,i)=>e2[(s+i)%e2.length])}
 let recent=e.slice().sort((a,b)=>b.id-a.id),old=e.slice().sort((a,b)=>dueScore(b.id)-dueScore(a.id)),out=[];
 while(out.length<n&&(recent.length||old.length)){let x=out.length%2?old.shift():recent.shift();if(x&&!out.some(y=>y.id===x.id))out.push(x)}
 return out;
}
function generate(){
 let slots=[];Object.entries(state.prayers).forEach(([p,c])=>{if(c.enabled)for(let r=1;r<=c.rakahs;r++)slots.push({prayer:p,rakah:r,portion:c.portion})});
 let picks=pick(slots.length);
 state.today={date:today(),assignments:slots.map((s,i)=>({...s,quarter:picks.length?picks[i%picks.length].id:null,status:'planned'}))};
 if(picks.length)state.rotation=picks.at(-1).id%240+1;save();render();
}
function portionLabel(a){let p=a.portion;return p==='.25'?'¼ quarter':p==='.5'?'½ quarter':p==='2'?'2 quarters':p==='custom'?'Custom portion':'1 quarter'}
function planHTML(compact=false){
 if(!state.today||state.today.date!==today())return '<div class="notice">No plan generated today. First mark your memorized quarters in Settings, then generate the plan.</div>';
 let groups={};state.today.assignments.forEach(a=>(groups[a.prayer]??=[]).push(a));
 return Object.entries(groups).map(([p,arr])=>`<div class="card prayer"><div class="row"><h3>${p}</h3><span class="pill">${arr.filter(x=>x.status==='recited').length}/${arr.length}</span></div>${arr.map(a=>`<div class="rakah"><b>Rakʿah ${a.rakah}</b> ${a.quarter?`<span class="pill">Quarter ${a.quarter}</span>`:'<span class="pill">No eligible memorized quarter</span>'}<div class="sub">${a.quarter?`Juz ${Math.floor((a.quarter-1)/8)+1} • ${portionLabel(a)}`:'Mark Quran as memorized in Settings.'}</div>${compact?'':`<div class="actions"><button class="btn" onclick="prepare(${a.quarter||0})">Prepare</button></div>`}</div>`).join('')}</div>`).join('');
}
function prepare(q){if(!q)return;alert(`Prepare Quarter ${q}\n\nUse your preferred Quran/mushaf to Read, Listen, Repeat and Practice before Salah.\n\nNo interaction is needed during prayer.`)}
function pending(){return state.today?.assignments.filter(a=>a.quarter&&a.status==='planned')||[]}
function afterHTML(){return pending().map((a,i)=>`<div class="rakah"><b>${a.prayer} • Rakʿah ${a.rakah} • Quarter ${a.quarter}</b><div class="actions"><button class="btn" onclick="rate(${i},'Again')">Again</button><button class="btn" onclick="rate(${i},'Difficult')">Difficult</button><button class="btn" onclick="rate(${i},'Good')">Good</button><button class="btn" onclick="rate(${i},'Easy')">Easy</button><button class="btn" onclick="different(${i})">Different Quran</button></div></div>`).join('')||'<p class="sub">No unrecorded assignments.</p>'}
function rate(i,r){
 let a=pending()[i];if(!a)return;let mistake='';
 if(r==='Again'||r==='Difficult') mistake=prompt('Mistake type: Ayah / Transition / Beginning / Middle / End / Forgot completely')||'';
 a.status='recited';a.rating=r;let d={Again:-18,Difficult:-8,Good:6,Easy:12}[r];state.strength[a.quarter]=Math.max(0,Math.min(100,strength(a.quarter)+d));
 if(/transition/i.test(mistake)){let t=prompt('Enter transition, e.g. 2:26 → 2:27')||`Quarter ${a.quarter} transition`;state.transitions[t]=(state.transitions[t]||0)+1}
 if(/^ayah$/i.test(mistake)){let ay=prompt('Enter Ayah, e.g. 2:27');if(ay)state.weakAyahs[ay]=(state.weakAyahs[ay]||0)+1}
 state.history.push({date:new Date().toISOString(),source:'prayer',prayer:a.prayer,rakah:a.rakah,quarter:a.quarter,rating:r,mistake,status:'recited'});save();render();
}
function different(i){let a=pending()[i];if(!a)return;a.status='different';state.history.push({date:new Date().toISOString(),source:'prayer',prayer:a.prayer,rakah:a.rakah,quarter:a.quarter,status:'different Quran recited'});save();render()}
function renderSettings(){
 $('prayerSettings').innerHTML=Object.entries(state.prayers).map(([p,c])=>`<div><label>${p}</label><select onchange="setPrayer('${p.replaceAll("'","\\'")}','enabled',this.value)"><option value="1" ${c.enabled?'selected':''}>Enabled</option><option value="0" ${!c.enabled?'selected':''}>Disabled</option></select></div><div><label>Rakʿahs / portion</label><div class="row"><input type="number" min="0" max="20" value="${c.rakahs}" onchange="setPrayer('${p.replaceAll("'","\\'")}','rakahs',this.value)"><select onchange="setPrayer('${p.replaceAll("'","\\'")}','portion',this.value)"><option value=".25" ${c.portion==='.25'?'selected':''}>¼ quarter</option><option value=".5" ${c.portion==='.5'?'selected':''}>½ quarter</option><option value="1" ${c.portion==='1'?'selected':''}>1 quarter</option><option value="2" ${c.portion==='2'?'selected':''}>2 quarters</option><option value="custom" ${c.portion==='custom'?'selected':''}>Custom</option></select></div></div>`).join('');
}
function setPrayer(p,k,v){state.prayers[p][k]=k==='enabled'?v==='1':k==='rakahs'?+v:v;save()}
function renderQuarters(){$('quarterGrid').innerHTML=RUB.map(q=>`<button class="q ${status(q.id)==='memorized'?'mem':status(q.id)==='partial'?'partial':''} ${strength(q.id)<45?'weak':''}" onclick="qDetail(${q.id})">${q.id}</button>`).join('')}
function qDetail(n){let h=state.history.filter(x=>x.quarter===n);$('qDetail').innerHTML=`<h3>Quarter ${n}</h3><p class="sub">Juz ${Math.floor((n-1)/8)+1} • Hizb ${Math.floor((n-1)/4)+1}</p><p>Status: <b>${status(n)}</b><br>Memory strength: <b>${strength(n)}%</b><br>Times revised: <b>${h.filter(x=>x.status==='recited').length}</b></p><p class="sub">Exact Surah/Ayah boundaries are intentionally not fabricated. Add verified Rubʿ metadata later without embedding Quran text.</p>`}
function renderWeak(){
 let q=Object.entries(state.strength).filter(([_,s])=>s<45).sort((a,b)=>a[1]-b[1]),t=Object.entries(state.transitions).sort((a,b)=>b[1]-a[1]),a=Object.entries(state.weakAyahs).sort((x,y)=>y[1]-x[1]);
 $('weakList').innerHTML=[...q.map(([x,s])=>`<div class="rakah"><b>Quarter ${x}</b> — strength ${s}%</div>`),...a.map(([x,n])=>`<div class="rakah"><b>Ayah ${x}</b> — difficulty ${n} time${n!==1?'s':''}</div>`),...t.map(([x,n])=>`<div class="rakah"><b>Transition ${x}</b> — failed ${n} time${n!==1?'s':''}</div>`)].join('')||'<p class="sub">No weak items identified yet.</p>';
 $('history').innerHTML=state.history.slice().reverse().slice(0,40).map(h=>`<div>${h.date.slice(0,10)} • ${h.prayer||'Revision'} ${h.rakah?'R'+h.rakah:''} • Q${h.quarter||'—'} • ${h.rating||h.status}${h.mistake?' • '+h.mistake:''}</div>`).join('')||'<p class="sub">No revision history yet.</p>';
}
function render(){
 $('todayPlan').innerHTML=planHTML(true);$('fullPlan').innerHTML=planHTML();$('afterPrayer').innerHTML=afterHTML();$('strategy').value=state.strategy;
 $('mMem').textContent=eligible().length;$('mPrayer').textContent=state.today?.date===today()?state.today.assignments.filter(a=>a.quarter).length:0;$('mDue').textContent=eligible().filter(q=>dueScore(q.id)>80).length;$('mWeak').textContent=Object.values(state.strength).filter(x=>x<45).length+Object.keys(state.transitions).length+Object.keys(state.weakAyahs).length;
 renderSettings();renderQuarters();renderWeak();
}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab,.view').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.v).classList.add('active')});
$('generate').onclick=()=>{state.strategy=$('strategy').value;generate()};
$('saveQuarter').onclick=()=>{let q=Math.max(1,Math.min(240,+$('markQuarter').value)),s=$('markStatus').value;if(s==='none')delete state.quarterStatus[q];else state.quarterStatus[q]=s;save();render()};
$('exportData').onclick=()=>{let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='tahjod-progress.json';a.click()};
$('reset').onclick=()=>{if(confirm('Reset all Tahjod progress on this device?')){localStorage.removeItem(KEY);location.reload()}};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');render();