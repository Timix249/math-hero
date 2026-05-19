import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection,
  query, orderBy, limit, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* 1) Firebase Console öffnen
   2) Project settings > Web App
   3) Deine Config hier einfügen */
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};

const firebaseReady = !firebaseConfig.apiKey.includes("PASTE_");
let app, auth, db;
if (firebaseReady) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const i18n = {
  ua:{welcome:"Вітаю",level:"Рівень",todayProgress:"Сьогодні",dailyBonus:"Денний бонус",dailyBonusText:"Зроби 20 завдань без помилок і отримай додатковий XP.",continue:"Продовжити",modes:"Режим",easy:"Легкий",medium:"Середній",hard:"Складний",tasks:"Завдання",newTasks:"Нові завдання",check:"Перевірити",home:"Головна",games:"Ігри",rank:"Ранг",leaderboard:"Лідерборд",friends:"Друзі",friendsText:"Пізніше: запрошуй друзів і змагайся.",share:"Поділитися",profile:"Профіль",achievements:"Досягнення"},
  de:{welcome:"Willkommen",level:"Level",todayProgress:"Heute",dailyBonus:"Tagesbonus",dailyBonusText:"Schaffe 20 Aufgaben ohne Fehler und bekomme Extra-XP.",continue:"Weiter",modes:"Modus",easy:"Leicht",medium:"Mittel",hard:"Schwer",tasks:"Aufgaben",newTasks:"Neue Aufgaben",check:"Prüfen",home:"Home",games:"Spiele",rank:"Rang",leaderboard:"Rangliste",friends:"Freunde",friendsText:"Später: Freunde einladen und gegeneinander rechnen.",share:"Teilen",profile:"Profil",achievements:"Erfolge"},
  en:{welcome:"Welcome",level:"Level",todayProgress:"Today",dailyBonus:"Daily bonus",dailyBonusText:"Complete 20 tasks without mistakes and get extra XP.",continue:"Continue",modes:"Mode",easy:"Easy",medium:"Medium",hard:"Hard",tasks:"Tasks",newTasks:"New tasks",check:"Check",home:"Home",games:"Games",rank:"Rank",leaderboard:"Leaderboard",friends:"Friends",friendsText:"Later: invite friends and compete.",share:"Share",profile:"Profile",achievements:"Achievements"}
};

let state = {
  lang: localStorage.getItem("lang") || "ua",
  mode: localStorage.getItem("mode") || "easy",
  xp: Number(localStorage.getItem("xp") || 0),
  level: Number(localStorage.getItem("level") || 1),
  streak: Number(localStorage.getItem("streak") || 0),
  correct: 0,
  questions: [],
  uid: null,
  name: "Gast",
  badges: JSON.parse(localStorage.getItem("badges") || "[]")
};

const modes = {
  easy: { label:"🟢 Leicht", min:1, max:30, ops:["+"], xp:5 },
  medium: { label:"🟡 Mittel", min:1, max:80, ops:["+","-"], xp:7 },
  hard: { label:"🔴 Schwer", min:2, max:12, ops:["×"], xp:10 },
  turbo: { label:"🟣 Turbo", min:1, max:99, ops:["+","-","×"], xp:12 }
};

function t(key){ return i18n[state.lang]?.[key] || i18n.de[key] || key; }
function applyLang(){
  $$("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
  $$(".lang-btn").forEach(b => b.classList.toggle("active", b.dataset.lang === state.lang));
  $("#modeName").textContent = modes[state.mode].label;
}
function toast(msg){
  $("#toast").textContent = msg;
  $("#toast").classList.remove("hidden");
  setTimeout(()=>$("#toast").classList.add("hidden"), 1900);
}
function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

function makeQuestion(){
  const m = modes[state.mode];
  const op = m.ops[rand(0,m.ops.length-1)];
  let a = rand(m.min,m.max), b = rand(m.min,m.max), answer;
  if(op === "+") answer = a + b;
  if(op === "-"){ if(b>a) [a,b]=[b,a]; answer = a - b; }
  if(op === "×") answer = a * b;
  return { text:`${a} ${op} ${b} =`, answer, user:"", status:"" };
}
function newQuestions(){
  state.questions = Array.from({length:20}, makeQuestion);
  state.correct = 0;
  renderQuestions();
  updateUi();
}
function renderQuestions(){
  $("#questions").innerHTML = state.questions.map((q,i)=>`
    <div class="question-card ${q.status}">
      <div class="question-text">${i+1}) ${q.text}</div>
      <input class="answer" inputmode="numeric" data-index="${i}" value="${q.user ?? ""}" />
    </div>`).join("");
  $$(".answer").forEach(input=>{
    input.addEventListener("input", e => {
      state.questions[Number(e.target.dataset.index)].user = e.target.value.trim();
    });
  });
}
function checkAnswers(){
  let correct = 0, gained = 0;
  state.questions.forEach(q=>{
    const ok = Number(q.user) === q.answer;
    q.status = ok ? "correct" : "wrong";
    if(ok){ correct++; gained += modes[state.mode].xp; }
  });
  state.correct = correct;
  if(correct === 20) { gained += 50; unlockBadge("perfect"); updateStreak(); }
  if(correct >= 10) unlockBadge("ten");
  addXp(gained);
  renderQuestions();
  updateUi();
  saveProfile();
  toast(`⭐ +${gained} XP · ✅ ${correct}/20`);
}
function addXp(amount){
  state.xp += amount;
  state.level = Math.max(1, Math.floor(state.xp / 250) + 1);
  localStorage.setItem("xp", state.xp);
  localStorage.setItem("level", state.level);
}
function updateStreak(){
  const today = new Date().toISOString().slice(0,10);
  const last = localStorage.getItem("lastStreak");
  if(last !== today){
    state.streak += 1;
    localStorage.setItem("streak", state.streak);
    localStorage.setItem("lastStreak", today);
  }
}
function unlockBadge(id){
  if(!state.badges.includes(id)){
    state.badges.push(id);
    localStorage.setItem("badges", JSON.stringify(state.badges));
  }
}
function updateUi(){
  $("#xpText").textContent = state.xp;
  $("#levelText").textContent = state.level;
  $("#streakText").textContent = state.streak;
  $("#correctText").textContent = state.correct;
  const pct = Math.round((state.correct/20)*100);
  $("#progressText").textContent = pct + "%";
  $("#progressBar").style.width = pct + "%";
  $("#profileName").textContent = state.name;
  $("#profileXp").textContent = state.xp;
  $("#profileLevel").textContent = state.level;
  renderBadges();
  renderWeek();
}
function renderBadges(){
  const all = [
    ["ten","⚡","10 richtig"],
    ["perfect","👑","Perfekt"],
    ["streak3","🔥","3 Tage"],
    ["level5","💎","Level 5"]
  ];
  $("#badges").innerHTML = all.map(b=>`<div class="badge ${state.badges.includes(b[0]) ? "unlocked":""}" title="${b[2]}">${b[1]}</div>`).join("");
}
function renderWeek(){
  const days = ["Mo","Di","Mi","Do","Fr","Sa","So"];
  $("#weekRow").innerHTML = days.map((d,i)=>`<div class="day ${i < Math.min(state.streak,7) ? "active":""}">${d}</div>`).join("");
}
function switchView(id){
  $$(".view").forEach(v=>v.classList.toggle("active", v.id === id));
  $$(".nav-btn").forEach(b=>b.classList.toggle("active", b.dataset.view === id));
  if(id === "leaderView") loadLeaderboard();
}

async function saveProfile(){
  if(!firebaseReady || !state.uid) return;
  await setDoc(doc(db, "users", state.uid), {
    name: state.name, xp: state.xp, level: state.level, streak: state.streak,
    badges: state.badges, updatedAt: serverTimestamp()
  }, { merge:true });
}
async function loadProfile(user){
  state.uid = user.uid;
  state.name = user.displayName || user.email || "Math Hero";
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if(snap.exists()){
    const d = snap.data();
    state.xp = d.xp ?? state.xp;
    state.level = d.level ?? state.level;
    state.streak = d.streak ?? state.streak;
    state.badges = d.badges ?? state.badges;
  } else {
    await setDoc(ref, {name:state.name, xp:state.xp, level:state.level, streak:state.streak, badges:state.badges, createdAt:serverTimestamp()});
  }
  $("#loginBtn").classList.add("hidden");
  $("#logoutBtn").classList.remove("hidden");
  updateUi();
}
async function loadLeaderboard(){
  if(!firebaseReady){ $("#leaderboardList").innerHTML = "<p>Firebase Config fehlt.</p>"; return; }
  const q = query(collection(db, "users"), orderBy("xp","desc"), limit(20));
  const snap = await getDocs(q);
  let rank = 1;
  $("#leaderboardList").innerHTML = snap.docs.map(d=>{
    const u = d.data();
    return `<div class="leader-row"><span>${rank++}. ${u.name || "Player"}</span><b>${u.xp || 0} XP</b></div>`;
  }).join("") || "<p>Noch keine Spieler.</p>";
}

$$(".lang-btn").forEach(btn=>btn.addEventListener("click",()=>{
  state.lang = btn.dataset.lang; localStorage.setItem("lang", state.lang); applyLang();
}));
$$(".mode-btn").forEach(btn=>btn.addEventListener("click",()=>{
  state.mode = btn.dataset.mode; localStorage.setItem("mode", state.mode);
  $$(".mode-btn").forEach(b=>b.classList.remove("active")); btn.classList.add("active");
  $("#modeName").textContent = modes[state.mode].label; newQuestions();
}));
$$(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.view)));
$("#newBtn").addEventListener("click", newQuestions);
$("#continueBtn").addEventListener("click", ()=>document.querySelector(".game-card").scrollIntoView({behavior:"smooth"}));
$("#checkBtn").addEventListener("click", checkAnswers);
$("#themeBtn").addEventListener("click",()=>{ document.body.classList.toggle("dark"); localStorage.setItem("dark", document.body.classList.contains("dark")); });
$("#settingsBtn").addEventListener("click",()=>toast("⚙️ Settings kommen später"));
$("#shareBtn").addEventListener("click",()=>navigator.share ? navigator.share({title:"Math Hero",text:"Trainiere Mathe mit mir!"}) : toast("Link kopieren"));
$("#loginBtn").addEventListener("click",()=>$("#authDialog").showModal());
$("#logoutBtn").addEventListener("click", async()=>{ if(auth) await signOut(auth); location.reload(); });

$("#registerBtn").addEventListener("click", async()=>{
  if(!firebaseReady) return toast("Firebase Config fehlt");
  await createUserWithEmailAndPassword(auth, $("#emailInput").value, $("#passwordInput").value);
  $("#authDialog").close();
});
$("#emailLoginBtn").addEventListener("click", async()=>{
  if(!firebaseReady) return toast("Firebase Config fehlt");
  await signInWithEmailAndPassword(auth, $("#emailInput").value, $("#passwordInput").value);
  $("#authDialog").close();
});
$("#googleLoginBtn").addEventListener("click", async()=>{
  if(!firebaseReady) return toast("Firebase Config fehlt");
  await signInWithPopup(auth, new GoogleAuthProvider());
  $("#authDialog").close();
});

if(localStorage.getItem("dark")==="true") document.body.classList.add("dark");
applyLang();
newQuestions();
updateUi();

if(firebaseReady){
  onAuthStateChanged(auth, user => user ? loadProfile(user) : updateUi());
} else {
  toast("Demo-Modus: Firebase Config einfügen");
}

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
