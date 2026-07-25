const $=id=>document.getElementById(id),KEY='tahjod-v4';
let s=JSON.parse(localStorage.getItem(KEY)||'null')||{version:4,cycle:1,completed:{},history:[],cycles:[],next:1,showCount:4,lastBackup:null};
function save(){localStorage.setItem(KEY,JSON.stringify(s))}
function localDay(iso=new Date().toISOString()){let d=new Date(iso);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function fmt(iso){return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'medium'}).format(new Date(iso))}
function coverage(){return Object.keys(s.completed).length}
function pct(){return coverage()/240*100}
function tonightCount(){let d=localDay();return s.history.filter(x=>x.cycle===s.cycle&&localDay(x.time)===d).length}
function sequence(n=s.showCount){return Array.from({length:n},(_,i)=>((s.next-1+i)%240)+1)}
function complete(q){
 if(q!==s.next&&!confirm(`Quarter ${q} is not the next sequential Rubʿ (Quarter ${s.next}). Complete it anyway?`))return;
 let now=new Date().toISOString(),repeat=!!s.completed[q];if(!repeat)s.completed[q]=now;
 s.history.push({quarter:q,time:now,cycle:s.cycle,repeat});
 if(q===s.next)s.next=q%240+1;
 if(coverage()===240){
   s.cycles.push({cycle:s.cycle,completedAt:now,startedAt:s.history.find(x=>x.cycle===s.cycle)?.time||now});
   save();render();
   setTimeout(()=>{if(confirm(`Alhamdulillah — Quran Revision Cycle ${s.cycle} completed at ${fmt(now)}.\n\nStart the next Quran cycle now?`)){s.cycle++;s.completed={};s.next=1;save();render()}},50);return;
 }
 save();render();
}
function portions(){
 return sequence().map(q=>{let done=s.completed[q];return `<div class="portion ${done?'donebox':''}"><div class="row"><div><b>Rubʿ ${q}</b><div class="sub">Juz ${Math.floor((q-1)/8)+1} • Hizb ${Math.floor((q-1)/4)+1}</div>${done?`<div class="sub">Completed ${fmt(done)}</div>`:''}</div>${done?'<span class="pill">Completed ✓</span>':`<button class="btn primary" onclick="complete(${q})">Complete</button>`}</div></div>`}).join('')
}
function render(){
 let p=pct(),c=coverage();$('pct').textContent=p.toFixed(1)+'%';$('bar').style.width=p+'%';$('progressText').textContent=`${c} / 240 Rubʿ completed • Cycle ${s.cycle}`;$('count').textContent=c;$('next').textContent=s.next;$('tonight').textContent=tonightCount();$('cycle').textContent=s.cycle;$('currentPortions').innerHTML=portions();$('quranPct').textContent=p.toFixed(1)+'% completed';
 $('grid').innerHTML=Array.from({length:240},(_,i)=>i+1).map(q=>`<button class="q ${s.completed[q]?'done':''}" onclick="detail(${q})">${q}</button>`).join('');
 $('hist').innerHTML=s.history.slice().reverse().map(h=>`<div><b>Rubʿ ${h.quarter}</b> • ${fmt(h.time)} • Cycle ${h.cycle}${h.repeat?' • repeat':''}</div>`).join('')||'<p class="sub">No revision recorded yet.</p>';
 $('cycles').innerHTML=s.cycles.slice().reverse().map(x=>`<div class="portion"><b>Quran Cycle ${x.cycle} — 100%</b><div class="sub">Completed ${fmt(x.completedAt)}</div></div>`).join('')||'<p class="sub">No full Quran cycle completed yet.</p>';
 $('showCount').value=s.showCount;$('nextInput').value=s.next;$('backupStatus').innerHTML=s.lastBackup?`Last backup created: <b>${fmt(s.lastBackup)}</b>`:'No backup created yet. Create one and save it to Google Drive.';
}
function detail(q){let logs=s.history.filter(x=>x.quarter===q).reverse();$('detail').innerHTML=`<h3>Rubʿ ${q}</h3><p>Current cycle: <b>${s.completed[q]?'Completed':'Not completed'}</b></p>${s.completed[q]?`<p class="sub">Completed: ${fmt(s.completed[q])}</p>`:''}<p class="sub">All recorded completions: ${logs.length}</p>${logs.slice(0,10).map(x=>`<div class="portion">${fmt(x.time)} • Cycle ${x.cycle}${x.repeat?' • repeat':''}</div>`).join('')}`}
function createBackup(){
 let now=new Date().toISOString();s.lastBackup=now;save();
 let payload={app:'Tahjod',backupVersion:1,createdAt:now,data:s},blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');
 a.href=URL.createObjectURL(blob);a.download=`Tahjod-Backup-${localDay(now)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);render();
}
function restore(file){
 let r=new FileReader();r.onload=()=>{try{let x=JSON.parse(r.result),data=x.app==='Tahjod'?x.data:x;if(!data||typeof data.cycle!=='number'||!data.history||!data.completed)throw Error();if(!confirm('Restore this Tahjod backup? Current local progress will be replaced.'))return;s=data;save();render();alert('Tahjod backup restored successfully.')}catch(e){alert('This is not a valid Tahjod backup file.')}};r.readAsText(file);
}
$('moreBtn').onclick=()=>{s.showCount=Math.min(20,s.showCount+2);save();render()};
$('saveBtn').onclick=()=>{s.showCount=Math.max(1,Math.min(20,+$('showCount').value||4));s.next=Math.max(1,Math.min(240,+$('nextInput').value||1));save();render()};
$('backupBtn').onclick=createBackup;$('restoreInput').onchange=e=>{if(e.target.files[0])restore(e.target.files[0]);e.target.value=''};
$('resetBtn').onclick=()=>{if(confirm('Delete all Quran revision progress, timestamps and cycle history from this device?')){localStorage.removeItem(KEY);location.reload()}};
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab,.view').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.v).classList.add('active')});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');window.complete=complete;window.detail=detail;render();