import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,GoogleAuthProvider,signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore,doc,getDoc,setDoc,collection,query,orderBy,limit,getDocs,serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {apiKey:"PASTE_YOUR_API_KEY",authDomain:"PASTE_YOUR_PROJECT.firebaseapp.com",projectId:"PASTE_YOUR_PROJECT_ID",storageBucket:"PASTE_YOUR_PROJECT.appspot.com",messagingSenderId:"PASTE_SENDER_ID",appId:"PASTE_APP_ID"};
const firebaseReady = !firebaseConfig.apiKey.includes("PASTE_");
let fb, auth, db;
if (firebaseReady) { fb = initializeApp(firebaseConfig); auth = getAuth(fb); db = getFirestore(fb); }

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
let state = {lang:localStorage.lang||"ua", xp:Number(localStorage.xp||0), gems:Number(localStorage.gems||0), streak:Number(localStorage.streak||0), energy:Number(localStorage.energy||25), level:Number(localStorage.level||1), uid:null, name:"Гість", questions:[], index:0, answer:"", badges:JSON.parse(localStorage.badges||"[]")};

function saveLocal(){["lang","xp","gems","streak","energy","level"].forEach(k=>localStorage[k]=state[k]);localStorage.badges=JSON.stringify(state.badges);}
function toast(msg){$("#toast").textContent=msg;$("#toast").classList.remove("hidden");setTimeout(()=>$("#toast").classList.add("hidden"),1600);}
function updateUI(){
  const map={ua:["🇺🇦","6"],de:["🇩🇪","6"],en:["🇬🇧","6"]};
  document.querySelector(".top-stat[data-panel='language']").innerHTML=`${map[state.lang][0]} <b id="topLang">${map[state.lang][1]}</b>`;
  $("#topStreak").textContent=state.streak; $("#topGems").textContent=state.gems; $("#topEnergy").textContent=state.energy;
  $("#levelLeft").textContent=state.level; $("#levelRight").textContent=state.level+1; $("#levelBar").style.width=Math.min(100,(state.xp%250)/250*100)+"%";
  $("#ratingText").textContent=`Твій рівень математики — ${state.level}`;
  $("#profileName").textContent=state.name; $("#profileXp").textContent=state.xp; $("#profileLevel").textContent=state.level;
  $$(".course[data-lang]").forEach(b=>b.classList.toggle("active",b.dataset.lang===state.lang));
  $("#badges").innerHTML=["🚀","👑","⚡","💎","🔥"].map((x,i)=>`<div class="badge ${state.badges[i]?"on":""}">${x}</div>`).join("");
  saveLocal();
}
function switchScreen(id){$$(".screen").forEach(s=>s.classList.toggle("active",s.id===id));$$(".nav").forEach(b=>b.classList.toggle("active",b.dataset.screen===id));if(id==="rank")loadLeaderboard();}
function panel(title,body){$("#panelTitle").textContent=title;$("#panelMoney").textContent=`💎 ${state.gems}`;$("#panelBody").innerHTML=body;$("#panelDialog").showModal();}
function openPanel(name){
 const panels={
  language:["Курс",`<div class="panel-card"><h3>🇺🇦 Математика</h3><p>Перемикання курсів як у Duolingo.</p></div><div class="panel-card"><h3>➕ Додати курс</h3><p>Дроби, множення, геометрія.</p></div>`],
  streak:["Відрізок",`<div class="panel-card"><h3>${state.streak} 🔥</h3><p>Тренуйся щодня, щоб зберігати серію.</p></div>`],
  gems:["Магазин",`<div class="panel-card"><h3>💎 ${state.gems}</h3><p>Самоцвіти для бонусів.</p></div><div class="panel-card"><h3>🧊 Замороження відрізка</h3><p>1 день — 425 💎</p></div>`],
  energy:["Енергія",`<div class="panel-card"><h3>⚡ ${state.energy}/25</h3><p>Енергія витрачається на тренування.</p></div><div class="panel-card"><h3>SUPER ∞</h3><p>Нескінченна енергія.</p></div>`],
  addCourse:["Курс",`<div class="panel-card"><h3>➕ Новий курс</h3><p>Легкий, середній, складний, турбо будуть сховані тут.</p></div>`],
  level:["Рівень",`<div class="panel-card"><h3>Рівень ${state.level}</h3><p>Кожні 250 XP відкривають новий рівень.</p></div>`],
  bonus:["Денний бонус",`<div class="panel-card"><h3>🔥 x2 XP</h3><p>Це тепер сховано тут, а не займає головний екран.</p></div>`],
  shop:["Магазин",`<div class="panel-card"><h3>🛒 Бонуси</h3><p>Енергія, самоцвіти, скрині, замороження.</p></div>`]
 };
 panel(...panels[name]);
}
function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function makeQuestions(mode="easy"){
 state.questions=Array.from({length:20},()=>{let a=rand(2,40),b=rand(2,30);let ops=mode==="easy"?["+"]:mode==="medium"?["+","-"]:["+","-","×"];let op=ops[rand(0,ops.length-1)];if(op==="-"){if(b>a)[a,b]=[b,a];return{text:`${a} - ${b} =`,answer:a-b};}if(op==="×"){a=rand(2,12);b=rand(2,12);return{text:`${a} × ${b} =`,answer:a*b};}return{text:`${a} + ${b} =`,answer:a+b};});
 state.index=0; state.answer=""; renderGame(); $("#gameDialog").showModal();
}
function renderGame(){let q=state.questions[state.index];$("#gameBar").style.width=(state.index/20*100)+"%";$("#questionText").textContent=q.text+" ?";$("#answerText").textContent=state.answer||" ";$("#gameCount").textContent=`${state.index} / 20`;}
function submitAnswer(){let q=state.questions[state.index];if(Number(state.answer)===q.answer){state.xp+=10;state.gems+=2;state.badges[0]=true;state.index++;state.answer="";if(state.index>=20){state.level=Math.floor(state.xp/250)+1;$("#gameDialog").close();toast("🏆 Готово! +200 XP");saveProfile();updateUI();return;}}else{state.energy=Math.max(0,state.energy-1);toast("❌ Спробуй ще");state.answer="";}renderGame();updateUI();}
async function saveProfile(){if(!firebaseReady||!state.uid)return;await setDoc(doc(db,"users",state.uid),{name:state.name,xp:state.xp,gems:state.gems,level:state.level,streak:state.streak,energy:state.energy,badges:state.badges,updatedAt:serverTimestamp()},{merge:true});}
async function loadProfile(user){state.uid=user.uid;state.name=user.displayName||user.email||"Math Hero";let snap=await getDoc(doc(db,"users",user.uid));if(snap.exists())Object.assign(state,snap.data());await saveProfile();$("#loginBtn").classList.add("hidden");$("#logoutBtn").classList.remove("hidden");updateUI();}
async function loadLeaderboard(){if(!firebaseReady){$("#leaderboard").innerHTML="<p class='page-text'>Firebase config ще не вставлений.</p>";return;}let snap=await getDocs(query(collection(db,"users"),orderBy("xp","desc"),limit(20)));let n=1;$("#leaderboard").innerHTML=snap.docs.map(d=>{let u=d.data();return`<button class="list-card"><span>${n++}</span><b>${u.name||"Player"}</b><em>${u.xp||0} XP</em></button>`;}).join("")||"<p class='page-text'>Ще немає гравців.</p>";}
$$(".nav").forEach(b=>b.onclick=()=>switchScreen(b.dataset.screen));
$$("[data-panel]").forEach(b=>b.onclick=()=>openPanel(b.dataset.panel));
$$(".course[data-lang]").forEach(b=>b.onclick=()=>{state.lang=b.dataset.lang;updateUI();});
$$("[data-start]").forEach(b=>b.onclick=()=>makeQuestions(b.dataset.start));
$("#closePanel").onclick=()=>$("#panelDialog").close(); $("#closeGame").onclick=()=>$("#gameDialog").close(); $("#restartGame").onclick=()=>makeQuestions("easy");
$("#shareBtn").onclick=()=>navigator.share?navigator.share({title:"Math Hero",text:"Тренуй математику!"}):toast("Поділись посиланням");
$("#loginBtn").onclick=()=>$("#authDialog").showModal(); $("#logoutBtn").onclick=async()=>{if(auth)await signOut(auth);location.reload();}; $("#closeAuth").onclick=()=>$("#authDialog").close();
$$(".keypad button").forEach(btn=>btn.onclick=()=>{let key=btn.dataset.key||btn.textContent;if(key==="back")state.answer=state.answer.slice(0,-1);else if(key==="ok")submitAnswer();else state.answer+=key;renderGame();});
$("#registerBtn").onclick=async()=>{if(!firebaseReady)return toast("Firebase config не вставлений");await createUserWithEmailAndPassword(auth,$("#email").value,$("#password").value);$("#authDialog").close();};
$("#emailLoginBtn").onclick=async()=>{if(!firebaseReady)return toast("Firebase config не вставлений");await signInWithEmailAndPassword(auth,$("#email").value,$("#password").value);$("#authDialog").close();};
$("#googleLoginBtn").onclick=async()=>{if(!firebaseReady)return toast("Firebase config не вставлений");await signInWithPopup(auth,new GoogleAuthProvider());$("#authDialog").close();};
if(firebaseReady)onAuthStateChanged(auth,user=>user?loadProfile(user):updateUI());
updateUI();
if("serviceWorker"in navigator){navigator.serviceWorker.register("./sw.js").catch(()=>{});}
