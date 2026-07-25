const $=x=>document.getElementById(x),KEY='tahjod-v3';
let s=JSON.parse(localStorage.getItem(KEY)||'null')||{cycle:1,completed:{},history:[],cycles:[],plans:{},perDay:6,next:1};
const day=d=>{let x=d||new Date();return new Date(x.getTime()-x.getTimezoneOffset()*60000).toISOString().slice(0,10)}
const fmt=iso=>new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(iso));
function save(){localStorage.setItem(KEY,JSON.stringify(s))}
function makePlan(date,start=s.next){let arr=[];for(let i=0;i<s.perDay;i++)arr.push(((start-1+i)%240)+1);s.plans[date]={quarters:arr,created:new Date().toISOString()};save();return arr}
function getPlan(){return s.plans[day()]?.quarters||makePlan(day())}
function coverage(){return Object.keys(s.completed).length}
function complete(q){
 let now=new Date().toISOString(),already=!!s.completed[q];
 if(!already)s.completed[q]=now;
 s.history.push({quarter:q,time:now,cycle:s.cycle,date:day(),repeat:already});
 let p=getPlan(),idx=p.indexOf(q);if(idx>=0){let remaining=p.filter(x=>!s.completed[x]);}
 s.next=q%240+1;
 if(coverage()===240){s.cycles.push({cycle:s.cycle,completedAt:now});alert('Quran Revision Cycle Completed — 100%');s.cycle++;s.completed={};s.next=1;s.plans={};}
 save();render();
}
function planHTML(){
 let p=getPlan();return p.map(q=>{let t=s.completed[q];return `<div class="item ${t?'done':''}"><div class="row"><div><b>Quarter ${q}</b><div class="sub">Rubʿ al-Hizb ${q} • Juz ${Math.floor((q-1)/8)+1}</div>${t?`<div class="sub">Completed: ${fmt(t)}</div>`:''}</div>${t?'<span class="pill">Complete ✓</span>':`<button class="btn primary" onclick="complete(${q})">Complete</button>`}</div></div>`}).join('')
}
function render(){
 let c=coverage(),pct=(c/240*100),p=getPlan(),doneToday=p.filter(q=>!!s.completed[q]).length,tp=p.length?doneToday/p.length*100:0;
 $('heroPct').textContent=`${pct.toFixed(1)}% of the Holy Quran`;$('heroBar').style.width=pct+'%';$('heroText').textContent=`${c} / 240 quarters completed • Cycle ${s.cycle}`;
 $('coverage').textContent=pct.toFixed(1)+'%';$('todayPct').textContent=Math.round(tp)+'%';$('completed').textContent=c;$('nextQ').textContent=s.next;$('dateTitle').textContent=new Intl.DateTimeFormat(undefined,{dateStyle:'full'}).format(new Date());$('plan').innerHTML=planHTML();
 $('quarterGrid').innerHTML=Array.from({length:240},(_,i)=>i+1).map(q=>`<button class="q ${s.completed[q]?'done':''}" onclick="detail(${q})">${q}</button>`).join('');
 $('historyList').innerHTML=s.history.slice().reverse().map(h=>`<div><b>Quarter ${h.quarter}</b> • ${fmt(h.time)} • Cycle ${h.cycle}${h.repeat?' • repeat':''}</div>`).join('')||'<p class="sub">No completions yet.</p>';
 $('cycles').innerHTML=s.cycles.slice().reverse().map(c=>`<div class="item"><b>Cycle ${c.cycle}</b><div class="sub">100% completed ${fmt(c.completedAt)}</div></div>`).join('')||'<p class="sub">No full Quran cycle completed yet.</p>';
 $('perDay').value=s.perDay;$('startQ').value=s.next;
}
function detail(q){let logs=s.history.filter(h=>h.quarter===q).reverse();$('detail').innerHTML=`<h3>Quarter ${q}</h3><p>Current cycle: <b>${s.completed[q]?'Completed':'Not completed'}</b></p>${s.completed[q]?`<p class="sub">First completion this cycle: ${fmt(s.completed[q])}</p>`:''}<p class="sub">Total recorded completions: ${logs.length}</p>${logs.slice(0,5).map(h=>`<div class="item">${fmt(h.time)} • Cycle ${h.cycle}</div>`).join('')}`}
$('tomorrowBtn').onclick=()=>{let d=new Date();d.setDate(d.getDate()+1);let k=day(d);if(s.plans[k]&&!confirm('Tomorrow already has a plan. Replace it?'))return;makePlan(k,s.next);alert('Tomorrow’s plan prepared: '+s.plans[k].quarters.map(x=>'Q'+x).join(', '))};
$('saveSettings').onclick=()=>{s.perDay=Math.max(1,Math.min(20,+$('perDay').value||6));s.next=Math.max(1,Math.min(240,+$('startQ').value||1));delete s.plans[day()];save();render()};
$('exportBtn').onclick=()=>{let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(s,null,2)],{type:'application/json'}));a.download='tahjod-progress.json';a.click()};
$('resetBtn').onclick=()=>{if(confirm('Delete all Tahjod progress and history?')){localStorage.removeItem(KEY);location.reload()}};
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab,.view').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.v).classList.add('active')});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');window.complete=complete;window.detail=detail;render();