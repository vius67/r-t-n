const $=s=>document.querySelector(s);
const store={get:(k,f)=>window.Store.get(k,f),set:(k,v)=>window.Store.set(k,v)};
const newId=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const todayKey=()=>{const d=new Date();return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()};
const nice=()=>new Date().toLocaleDateString("en-AU",{day:"numeric",month:"short"});
const tickSVG='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#04121f" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const STRENGTH={
 A:{name:"Strength X",ex:[
   {n:"Chest press",rx:"3 × 8–10",w:true},{n:"Lat pulldown",rx:"3 × 8–10",w:true},
   {n:"Bulgarian split squat",rx:"3 × 8 each"},{n:"Single-leg calf raise",rx:"3 × 15 each"},{n:"Plank",rx:"3 × 40s",unit:"s"}]},
 B:{name:"Strength Y",ex:[
   {n:"Push-ups",rx:"3 sets, 2 short of failure"},{n:"Lat pulldown",rx:"3 × 10",w:true},{n:"Pec deck",rx:"2 × 12",w:true},
   {n:"Step-ups",rx:"3 × 10 each"},{n:"Single-leg glute bridge",rx:"3 × 12 each"},{n:"Side plank",rx:"2 × 30s each",unit:"s"}]}
};
const PLAN=[
 {t:"Easy run",k:"Relaxed. You should be able to talk the whole time.",i:[["Easy run","30–35 min"],["Relaxed strides","6 × 100m"]]},
 {t:"Intervals",k:"Hard day. Run each 400m at your goal 1500m pace.",i:[["Warm-up jog","10 min"],["400m at goal pace, 90s jog between","6 reps"],["Cool-down jog","10 min"]]},
 {t:"Strength X",s:"A",k:"Add reps first. Add weight once every set reaches the top of the range.",i:[["Strength X (log it in Strength)","~40 min"],["Optional easy jog","20 min"]]},
 {t:"Easy run",k:"Keep it truly easy so Friday feels good.",i:[["Easy run","30–40 min"]]},
 {t:"Tempo",k:"Hard day. Comfortably hard: a few words at a time, not full sentences.",i:[["Warm-up jog","10 min"],["Tempo run","15–20 min"],["Cool-down jog","10 min"]]},
 {t:"Strength Y",s:"B",k:"Quality reps. Stop each push-up set 2 reps before you can't do more.",i:[["Strength Y (log it in Strength)","~40 min"]]},
 {t:"Long run",k:"The slowest run of the week. Time on your feet is the goal.",i:[["Long easy run","45–60 min"]]}
];
const SKIN={
 am:{name:"Morning",i:["Rinse or gentle cleanser","Light moisturiser","Sunscreen SPF 50+","Lip balm"]},
 pm:{name:"Night",i:["Gentle cleanser (after training too)","Light moisturiser","Lip balm","Hands off face, no picking"]}
};
const STRETCH={
 pre:{name:"Before runs",sub:"Dynamic warm-up, about 5 min. Keep moving, no holding.",i:[
   ["Leg swings, forward and back","10 each leg"],["Leg swings, side to side","10 each leg"],
   ["Walking lunges","10 each leg"],["High knees","20m"],["Butt kicks","20m"],["A-skips","2 × 20m"]]},
 post:{name:"After runs",sub:"Static stretches, about 8 min. Hold still and breathe slowly.",i:[
   ["Calf stretch against a wall","30s each"],["Standing hamstring stretch","30s each"],
   ["Kneeling hip flexor lunge","30s each"],["Standing quad stretch","30s each"],
   ["Figure-4 glute stretch, lying down","30s each"],["Child's pose","45s"]]}
};
const FLIP=[
 {t:"Level 1: Foundations",k:"Build the jump and body control first. Most failed backflips come from not jumping high enough.",i:[
   "10 tuck jumps in a row, knees to chest","Hollow body hold for 30s","5 backward rolls on grass or a mat","Squat jumps landing softly and quietly"]},
 {t:"Level 2: The set",k:"A backflip goes up first, then over. Throwing back early is the most common mistake.",i:[
   "Jump straight up with arms driving overhead, landing on the same spot","Same jump, then pull knees to chest at the top","Keep eyes forward on take-off, not tipping your head back"]},
 {t:"Level 3: Learn with a coach",k:"Take this part to a gymnastics, parkour or tricking class. They have foam pits, soft mats and trained spotters.",i:[
   "Book a class and tell the coach you're working on a back tuck","Back tuck on a trampoline or tumble track with a coach","Spotted back tuck on a soft mat","Back tuck into a foam pit or off a raised mat"]},
 {t:"Level 4: On your own",k:"Only move on once your coach says you're consistent.",i:[
   "Unspotted back tuck on a soft mat, 10 clean in a row","Back tuck on soft grass with a mat nearby"]}
];
const WEEKLY=["Change pillowcase","Shave or trim moustache clean","Wash gym towel and headband"];

let tab=store.get("tab","daily");
let runDay=(new Date().getDay()+6)%7;
let sSel=PLAN[runDay].s||"A";
let ticks=store.get("ticks",{});

function skinState(){let s=store.get("skin",{date:"",t:{},streak:0,last:""});
  if(s.date!==todayKey()){s={...s,date:todayKey(),t:{}};store.set("skin",s)} return s}
let mSel=store.get("mSel","stretch");
function stretchState(){let s=store.get("stretch",{date:"",t:{}});
  if(s.date!==todayKey()){s={date:todayKey(),t:{}};store.set("stretch",s)} return s}
function stretchTotal(){return STRETCH.pre.i.length+STRETCH.post.i.length}
function skinTotal(){return SKIN.am.i.length+SKIN.pm.i.length}
function dayDone(i){return PLAN[i].i.every((_,j)=>ticks[i+"-"+j])}

function setRing(p){$("#arc").style.strokeDashoffset=194.8*(1-p);$("#ringv").textContent=Math.round(p*100)+"%"}
function header(){
  const d=(new Date().getDay()+6)%7, s=skinState();
  const skinDone=Object.values(s.t).filter(Boolean).length;
  const runDoneN=PLAN[d].i.filter((_,j)=>ticks[d+"-"+j]).length;
  const stDone=Object.values(stretchState().t).filter(Boolean).length;
  setRing((runDoneN+skinDone+stDone)/(PLAN[d].i.length+skinTotal()+stretchTotal()));
  const titles={daily:"Daily",run:"Run",strength:"Strength",skin:"Skin & grooming",moves:"Stretch & backflip",progress:"Progress"};
  $("#title").textContent=titles[tab];
  $("#subtitle").textContent=`${DAYS[d]}: ${PLAN[d].t} · skin ${skinDone}/${skinTotal()} · stretch ${stDone}/${stretchTotal()}`;
}
function rowHTML(id,name,rx,on){return `<li class="row${on?" on":""}"><button class="check" role="checkbox" aria-checked="${on}" aria-label="${esc(name)}" data-id="${id}">${tickSVG}</button><span class="name">${esc(name)}</span>${rx?`<span class="rx">${esc(rx)}</span>`:""}</li>`}

function viewDaily(){
  const d=(new Date().getDay()+6)%7, p=PLAN[d], sk=skinState(), st=stretchState();
  const block=(step,title,sub,rows,extra="")=>`<section class="card glass"><p class="step">${step}</p><h3>${title}</h3>${sub?`<p class="sub">${sub}</p>`:""}<ul class="list">${rows}</ul>${extra}</section>`;
  const runRows=p.i.map(([n,rx],j)=>rowHTML("r"+d+"-"+j,n,rx,ticks[d+"-"+j])).join("");
  const isRun=!p.s;
  let out=block("Morning","Skin","",SKIN.am.i.map((n,j)=>rowHTML("sam"+j,n,"",sk.t["am"+j])).join(""));
  if(isRun) out+=block("Before training","Warm-up",STRETCH.pre.sub,STRETCH.pre.i.map(([n,rx],j)=>rowHTML("tpre"+j,n,rx,st.t["pre"+j])).join(""));
  out+=block("Training",p.t,p.k,runRows,p.s?`<p class="foot"><button class="btn primary" data-go="${p.s}">Log ${p.t} sets</button></p>`:"");
  out+=block("After training","Stretch",STRETCH.post.sub,STRETCH.post.i.map(([n,rx],j)=>rowHTML("tpost"+j,n,rx,st.t["post"+j])).join(""));
  out+=block("Night","Skin","",SKIN.pm.i.map((n,j)=>rowHTML("spm"+j,n,"",sk.t["pm"+j])).join(""));
  return out+`<p class="tip glass">Eat protein at every meal and aim for 8–9 hours of sleep tonight.</p>`;
}
function viewRun(){
  const p=PLAN[runDay];
  return `<div class="pills glass" role="group" aria-label="Day">${PLAN.map((_,i)=>`<button class="pill${dayDone(i)?" done":""}" aria-pressed="${i===runDay}" data-day="${i}">${DAYS[i].slice(0,3)}</button>`).join("")}</div>
  <section class="card glass"><h2>${p.t}</h2><p class="sub">${DAYS[runDay]}</p>
  <ul class="list">${p.i.map(([n,rx],j)=>rowHTML("r"+runDay+"-"+j,n,rx,ticks[runDay+"-"+j])).join("")}</ul>
  <p class="tip">${p.k}</p>
  ${p.s?`<p class="foot"><button class="btn primary" data-go="${p.s}">Open ${p.t}</button></p>`:""}</section>
  <p class="foot"><button class="btn" id="resetWeek">Start a new week</button></p>`;
}
function viewStrength(){
  const s=STRENGTH[sSel], logs=store.get("lifts",{});
  return `<div class="pills glass" role="group" aria-label="Workout">${Object.keys(STRENGTH).map(k=>`<button class="pill" aria-pressed="${k===sSel}" data-s="${k}">${STRENGTH[k].name}</button>`).join("")}</div>
  <section class="card glass"><h2>${s.name}</h2><p class="sub">Log your best set of each. Beat it next time.</p>
  ${s.ex.map((e,i)=>{const L=logs[e.n]||[], last=L[L.length-1];
    const lastTxt=last?`Last: ${last.w?last.w+" kg × ":""}${last.r}${e.unit||" reps"} · ${last.d}`:"No sets logged yet";
    return `<div class="ex"><div class="ex-head"><b>${e.n}</b><span class="rx">${e.rx}</span></div>
    <div class="ex-last">${lastTxt}</div>
    <form data-ex="${i}">${e.w?`<input name="w" type="number" step="0.5" min="0" max="300" placeholder="kg" aria-label="${e.n} weight in kg">`:""}
    <input name="r" type="number" min="1" max="300" placeholder="${e.unit?"seconds":"reps"}" aria-label="${e.n} ${e.unit?"seconds":"reps"}">
    <button class="btn">Log</button></form><p class="err"></p></div>`}).join("")}
  <p class="tip">Getting bigger needs three things together: lifting that gets gradually harder, eating enough with protein at every meal, and 8–9 hours of sleep.</p></section>`;
}
function viewSkin(){
  const s=skinState(), w=store.get("weekly",{});
  const done=Object.values(s.t).filter(Boolean).length;
  return `<div class="streak"><div class="chip glass">${s.streak||0} days <span>streak</span></div><div class="chip glass">${done}/${skinTotal()} <span>today</span></div></div>
  <div class="two">${Object.entries(SKIN).map(([k,g])=>`<section class="card glass"><h3>${g.name}</h3>
  <ul class="list">${g.i.map((n,j)=>rowHTML("s"+k+j,n,"",s.t[k+j])).join("")}</ul></section>`).join("")}</div>
  <section class="card glass"><h3>Weekly</h3><ul class="list">${WEEKLY.map((n,j)=>rowHTML("w"+j,n,"",w[j])).join("")}</ul>
  <p class="foot"><button class="btn" id="resetWeekly">Clear weekly list</button></p></section>
  <section class="card glass"><h3>Keep in mind</h3>
  <p class="sub" style="margin:0">Haircut and shape-up every 4–6 weeks. Drink water through the day. Shower soon after training. Give any new product 6–8 weeks before judging it, and see a GP if breakouts get painful or leave marks.</p></section>`;
}
function viewMoves(){
  const tabs=`<div class="pills glass" role="group" aria-label="Moves">${[["stretch","Stretching"],["flip","Backflip"]].map(([k,n])=>`<button class="pill" aria-pressed="${k===mSel}" data-m="${k}">${n}</button>`).join("")}</div>`;
  if(mSel==="stretch"){const s=stretchState();
    return tabs+Object.entries(STRETCH).map(([k,g])=>`<section class="card glass"><h3>${g.name}</h3><p class="sub">${g.sub}</p>
    <ul class="list">${g.i.map(([n,rx],j)=>rowHTML("t"+k+j,n,rx,s.t[k+j])).join("")}</ul></section>`).join("")+
    `<p class="tip glass">Stretch to a gentle pull, never pain, and don't bounce. Doing this every day matters far more than pushing deep. You'll notice real change in 3–4 weeks.</p>`}
  const f=store.get("flip",{});
  return tabs+`<section class="card glass warn"><h3>Stay safe</h3><p class="sub" style="margin:0">Never try a flip on hard ground, when you're tired, or without a spotter until a coach clears you. Landing on your head or neck can cause serious injury, so learn Level 3 in a class.</p></section>`+
  FLIP.map((L,li)=>{const n=L.i.filter((_,j)=>f[li+"-"+j]).length;
    return `<section class="card glass"><h3>${L.t} <span class="lvl-count">${n}/${L.i.length}</span></h3><p class="sub">${L.k}</p>
    <ul class="list">${L.i.map((x,j)=>rowHTML("f"+li+"-"+j,x,"",f[li+"-"+j])).join("")}</ul></section>`}).join("");
}
function viewProgress(){
  return `<div class="two">
  <section class="card glass"><h3>1500m</h3><div class="stat" id="b1500">—</div>
  <form id="f1500" style="display:flex;gap:8px"><input id="i1500" placeholder="5:12" inputmode="decimal" aria-label="1500m time"><button class="btn primary">Log</button></form>
  <p class="err" id="e1500"></p><ul class="entries" id="l1500"></ul></section>
  <section class="card glass"><h3>Push-ups, one set</h3><div class="stat" id="bpu">—</div>
  <form id="fpu" style="display:flex;gap:8px"><input id="ipu" type="number" min="1" max="200" placeholder="15" aria-label="Push-ups"><button class="btn primary">Log</button></form>
  <p class="err" id="epu"></p><ul class="entries" id="lpu"></ul></section></div>
  <p class="tip glass">Time-trial your 1500m every 4 weeks and retest push-ups every 2. Progress shows over months, not days.</p>`;
}
const fmtT=v=>Math.floor(v/60)+":"+(v%60).toFixed(1).padStart(4,"0").replace(/\.0$/,"");
function wireLog(key,f,i,l,b,e,parse,fmt,better,msg){
  const draw=()=>{const a=store.get(key,[]);
    $(l).innerHTML=a.length?a.slice().reverse().slice(0,8).map(x=>`<li><span>${fmt(x.v)}</span><span>${x.d}</span></li>`).join(""):"<li>Nothing logged yet.</li>";
    $(b).textContent=a.length?fmt(a.reduce((p,c)=>better(c.v,p.v)?c:p).v):"—"};
  $(f).onsubmit=ev=>{ev.preventDefault();const v=parse($(i).value.trim());
    if(v===null){$(e).textContent=msg;return}$(e).textContent="";
    const a=store.get(key,[]);a.push({id:newId(),v,d:nice()});store.set(key,a);$(i).value="";draw()};
  draw();
}

function render(){
  store.set("tab",tab);
  document.querySelectorAll(".dock button").forEach(x=>x.setAttribute("aria-current",x.dataset.tab===tab));
  const v=$("#view");
  v.innerHTML=`<div class="view">${{daily:viewDaily,run:viewRun,strength:viewStrength,skin:viewSkin,moves:viewMoves,progress:viewProgress}[tab]()}</div>`;
  header();
  v.querySelectorAll("[data-day]").forEach(x=>x.onclick=()=>{runDay=+x.dataset.day;render()});
  v.querySelectorAll("[data-m]").forEach(x=>x.onclick=()=>{mSel=x.dataset.m;store.set("mSel",mSel);render()});
  v.querySelectorAll("[data-s]").forEach(x=>x.onclick=()=>{sSel=x.dataset.s;render()});
  v.querySelectorAll("[data-go]").forEach(x=>x.onclick=()=>{sSel=x.dataset.go;tab="strength";render();scrollTo(0,0)});
  v.querySelectorAll(".check").forEach(x=>x.onclick=()=>{
    const id=x.dataset.id;
    if(id[0]==="r"){const k=id.slice(1);ticks[k]=!ticks[k];store.set("ticks",ticks)}
    else if(id[0]==="s"){const s=skinState(),k=id.slice(1);s.t[k]=!s.t[k];
      const all=Object.values(s.t).filter(Boolean).length===skinTotal();
      if(all&&s.last!==todayKey()){const y=new Date();y.setDate(y.getDate()-1);
        const yk=y.getFullYear()+"-"+(y.getMonth()+1)+"-"+y.getDate();
        s.streak=s.last===yk?(s.streak||0)+1:1;s.last=todayKey()}
      store.set("skin",s)}
    else if(id[0]==="t"){const s=stretchState(),k=id.slice(1);s.t[k]=!s.t[k];store.set("stretch",s)}
    else if(id[0]==="f"){const f=store.get("flip",{}),k=id.slice(1);f[k]=!f[k];store.set("flip",f)}
    else{const w=store.get("weekly",{}),k=id.slice(1);w[k]=!w[k];store.set("weekly",w)}
    render()});
  const rw=$("#resetWeek"); if(rw) rw.onclick=()=>{ticks={};store.set("ticks",ticks);render()};
  const rk=$("#resetWeekly"); if(rk) rk.onclick=()=>{store.set("weekly",{});render()};
  v.querySelectorAll("form[data-ex]").forEach(f=>f.onsubmit=ev=>{ev.preventDefault();
    const e=STRENGTH[sSel].ex[+f.dataset.ex], err=f.nextElementSibling;
    const r=parseInt(f.r.value,10), w=e.w?parseFloat(f.w.value):null;
    if(!(r>0)||(e.w&&!(w>=0))){err.textContent=e.w?"Enter the weight and reps.":"Enter a number.";return}
    const logs=store.get("lifts",{});(logs[e.n]=logs[e.n]||[]).push({id:newId(),w,r,d:nice()});store.set("lifts",logs);render()});
  if(tab==="progress"){
    wireLog("t1500","#f1500","#i1500","#l1500","#b1500","#e1500",
      s=>{const m=s.match(/^(\d{1,2}):([0-5]\d)(?:\.(\d))?$/);return m?+m[1]*60+ +m[2]+(m[3]?+m[3]/10:0):null},
      fmtT,(a,b)=>a<b,"Enter a time like 5:12.");
    wireLog("pushups","#fpu","#ipu","#lpu","#bpu","#epu",
      s=>{const n=parseInt(s,10);return n>0&&n<=200?n:null},v=>v+" reps",(a,b)=>a>b,"Enter a whole number.");
  }
}
document.querySelectorAll(".dock button").forEach(x=>x.onclick=()=>{tab=x.dataset.tab;render();scrollTo(0,0)});
window.rerender=render;

/* ---------- account + sync UI ---------- */
const authSheet=$("#authSheet"), acctSheet=$("#acctSheet"), pill=$("#syncPill");
let signUpMode=false, lastStatus="";

function setPill(text,bad){
  if(!text){pill.hidden=true;return}
  pill.hidden=false; pill.textContent=text; pill.classList.toggle("bad",!!bad);
}
function showAuth(show){authSheet.hidden=!show; if(show) $("#authEmail").focus()}
function paintAccount(){
  const u=window.Store.user();
  const b=$("#acctBtn"), i=$("#acctInitial");
  if(u){i.textContent=(u.email||"?")[0].toUpperCase(); b.classList.remove("out")}
  else {i.textContent="+"; b.classList.add("out")}
}
function authMode(up){
  signUpMode=up;
  $("#authTitle").textContent=up?"Create an account":"Sign in";
  $("#authGo").textContent=up?"Create account":"Sign in";
  $("#authPass").autocomplete=up?"new-password":"current-password";
  $("#authSwap").textContent=up?"I already have an account":"Create an account instead";
  $("#authErr").textContent="";
}
$("#authSwap").onclick=()=>authMode(!signUpMode);
$("#authSkip").onclick=()=>{window.Store.localOnly.set(true);showAuth(false);setPill("Saving on this device only")};
$("#acctBtn").onclick=()=>{
  if(window.Store.user()){$("#acctWho").textContent="Signed in as "+window.Store.user().email;acctSheet.hidden=false}
  else {window.Store.localOnly.set(false);authMode(false);showAuth(true)}
};
$("#acctClose").onclick=()=>acctSheet.hidden=true;
$("#acctSync").onclick=()=>{acctSheet.hidden=true;window.Store.auth.syncNow()};
$("#acctOut").onclick=()=>{acctSheet.hidden=true;window.Store.auth.signOut()};
$("#authForm").onsubmit=e=>{
  e.preventDefault();
  const email=$("#authEmail").value.trim(), pass=$("#authPass").value, err=$("#authErr"), go=$("#authGo");
  if(pass.length<8){err.textContent="Use at least 8 characters.";return}
  err.textContent=""; go.disabled=true; go.textContent="Just a sec…";
  const p=signUpMode?window.Store.auth.signUp(email,pass):window.Store.auth.signIn(email,pass);
  p.then(r=>{
    go.disabled=false; authMode(signUpMode);
    if(r.error){err.textContent=r.error.message;return}
    if(signUpMode&&r.data&&r.data.user&&!r.data.session){
      err.textContent="Check your email to confirm, then sign in.";authMode(false);return}
    showAuth(false);
  }).catch(e2=>{go.disabled=false;authMode(signUpMode);err.textContent=e2.message});
};

window.Store.onChange(status=>{
  lastStatus=status; paintAccount();
  if(status==="unconfigured"){setPill("Add your Supabase keys in config.js to sync");return}
  if(status==="no-lib"){setPill("Couldn't load Supabase — you're offline, saving locally");return}
  if(status.startsWith("error:")){setPill(status.slice(6),true);return}
  if(status==="signed-out"){
    setPill(window.Store.localOnly.get()?"Saving on this device only":"");
    if(!window.Store.localOnly.get()) showAuth(true);
    return;
  }
  if(status==="signed-in"||status==="synced"){showAuth(false);setPill("");render()}
  if(status==="syncing")setPill("Syncing…");
  if(status==="saving")setPill("Saving…");
  if(status==="saved"){setPill("Saved");setTimeout(()=>{if(lastStatus==="saved")setPill("")},1200)}
});

render();
window.Store.start();
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
