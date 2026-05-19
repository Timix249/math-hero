import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCPPM8nbmJ5a8zlygf00br7dWtw3-mUNog",
    authDomain: "math-hero-6c5f5.firebaseapp.com",
    projectId: "math-hero-6c5f5",
    storageBucket: "math-hero-6c5f5.firebasestorage.app",
    messagingSenderId: "451348024908",
    appId: "1:451348024908:web:b9c98c21e692fdaedf2ee9"
  };

const firebaseReady = !firebaseConfig.apiKey.includes("PASTE_");
let app, auth, db;
if (firebaseReady) { app = initializeApp(firebaseConfig); auth = getAuth(app); db = getFirestore(app); }

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

let state = {
  lang: localStorage.lang || "ua",
  mode: localStorage.mode || "easy",
  xp: Number(localStorage.xp || 0),
  best: Number(localStorage.best || 0),
  level: Number(localStorage.level || 1),
  streak: Number(localStorage.streak || 0),
  energy: Number(localStorage.energy || 25),
  correct: 0,
  questions: [],
  uid: null,
  name: "Гість"
};

const modes = {
  easy: { label:"🟢 Легкий", min:1, max:30, ops:["+"], xp:5 },
  medium: { label:"🟡 Середній", min:1, max:80, ops:["+","-"], xp:7 },
  hard: { label:"🔴 Складний", min:2, max:12, ops:["×"], xp:10 },
  turbo: { label:"🟣 Turbo", min:1, max:99, ops:["+","-","×"], xp:12 }
};

function saveLocal() {
  for (const k of ["lang","mode","xp","best","level","streak","energy"]) localStorage[k] = state[k];
}

function toast(msg) {
  $("#toast").textContent = msg;
  $("#toast").classList.remove("hidden");
  setTimeout(() => $("#toast").classList.add("hidden"), 1700);
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
  state.best = Math.max(state.best, correct);
  state.xp += gained;
  state.level = Math.max(1, Math.floor(state.xp / 250) + 1);
  if(correct === 20) updateStreak();
  renderQuestions();
  updateUi();
  saveProfile();
  toast(`⭐ +${gained} XP · ✅ ${correct}/20`);
}

function updateStreak(){
  const today = new Date().toISOString().slice(0,10);
  if(localStorage.lastStreak !== today){
    state.streak += 1;
    localStorage.lastStreak = today;
  }
}

function updateUi(){
  const flags = {ua:"🇺🇦", de:"🇩🇪", en:"🇬🇧"};
  $(".duo-chip[data-panel='language']").innerHTML = `${flags[state.lang]} <b id="langScore">6</b>`;
  $("#streakText").textContent = state.streak;
  $("#xpText").textContent = state.xp;
  $("#energyText").textContent = state.energy;
  $("#xpText2").textContent = state.xp;
  $("#levelText").textContent = state.level;
  $("#bestText").textContent = state.best;
  $("#correctText").textContent = state.correct;
  $("#progressText").textContent = state.correct;
  $("#modeName").textContent = modes[state.mode].label;
  $("#profileName").textContent = state.name;
  $("#profileXp").textContent = state.xp;
  $("#profileLevel").textContent = state.level;
  saveLocal();
}

function switchView(id){
  $$(".view").forEach(v=>v.classList.toggle("active", v.id === id));
  $$(".nav-btn").forEach(b=>b.classList.toggle("active", b.dataset.view === id));
  if(id === "leaderView") loadLeaderboard();
}

function openPanel(name){
  const panels = {
    language: ["Мови", `
      <div class="panel-card"><h3>🇺🇦 Українська</h3><p>Поточна мова.</p></div>
      <div class="panel-card"><h3>🇩🇪 Deutsch</h3><p>Перемкнути на німецьку.</p></div>
      <div class="panel-card"><h3>🇬🇧 English</h3><p>Перемкнути на англійську.</p></div>
      <div class="mode-grid">
        <button class="mode-btn" data-lang-panel="ua">🇺🇦 UA</button>
        <button class="mode-btn" data-lang-panel="de">🇩🇪 DE</button>
        <button class="mode-btn" data-lang-panel="en">🇬🇧 EN</button>
      </div>`],
    streak: ["Відрізок", `<div class="panel-card"><h3>🔥 ${state.streak}</h3><p>Тренуйся щодня, щоб збільшити серію.</p></div>`],
    xp: ["XP і рівень", `<div class="panel-card"><h3>⭐ ${state.xp} XP</h3><p>Рівень: ${state.level}</p></div>`],
    energy: ["Енергія", `<div class="panel-card"><h3>⚡ ${state.energy} / 25</h3><p>Енергія для тренування. Пізніше можна відновлювати.</p></div>`],
    mode: ["Режим", `
      <div class="mode-grid">
        <button class="mode-btn ${state.mode==="easy"?"active":""}" data-mode-panel="easy">🟢 Легкий</button>
        <button class="mode-btn ${state.mode==="medium"?"active":""}" data-mode-panel="medium">🟡 Середній</button>
        <button class="mode-btn ${state.mode==="hard"?"active":""}" data-mode-panel="hard">🔴 Складний</button>
        <button class="mode-btn ${state.mode==="turbo"?"active":""}" data-mode-panel="turbo">🟣 Turbo</button>
      </div>`]
  };
  $("#panelTitle").textContent = panels[name][0];
  $("#panelBody").innerHTML = panels[name][1];
  $("#panelDialog").showModal();

  $$("[data-lang-panel]").forEach(btn => btn.onclick = () => {
    state.lang = btn.dataset.langPanel;
    updateUi();
    $("#panelDialog").close();
  });

  $$("[data-mode-panel]").forEach(btn => btn.onclick = () => {
    state.mode = btn.dataset.modePanel;
    newQuestions();
    $("#panelDialog").close();
  });
}

async function saveProfile(){
  if(!firebaseReady || !state.uid) return;
  await setDoc(doc(db, "users", state.uid), {
    name: state.name, xp: state.xp, level: state.level, streak: state.streak,
    best: state.best, energy: state.energy, updatedAt: serverTimestamp()
  }, { merge:true });
}

async function loadProfile(user){
  state.uid = user.uid;
  state.name = user.displayName || user.email || "Math Hero";
  const snap = await getDoc(doc(db, "users", user.uid));
  if(snap.exists()) Object.assign(state, snap.data());
  await saveProfile();
  $("#loginBtn").classList.add("hidden");
  $("#logoutBtn").classList.remove("hidden");
  updateUi();
}

async function loadLeaderboard(){
  if(!firebaseReady){ $("#leaderboardList").innerHTML = "<p>Firebase config ще не вставлений.</p>"; return; }
  const q = query(collection(db, "users"), orderBy("xp","desc"), limit(20));
  const snap = await getDocs(q);
  let rank = 1;
  $("#leaderboardList").innerHTML = snap.docs.map(d=>{
    const u = d.data();
    return `<div class="leader-row"><span>${rank++}. ${u.name || "Player"}</span><b>${u.xp || 0} XP</b></div>`;
  }).join("") || "<p>Ще немає гравців.</p>";
}

$$("[data-panel]").forEach(btn => btn.addEventListener("click", () => openPanel(btn.dataset.panel)));
$$(".nav-btn").forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));
$("#newBtn").addEventListener("click", newQuestions);
$("#continueBtn").addEventListener("click", () => document.querySelector(".game-card").scrollIntoView({behavior:"smooth"}));
$("#checkBtn").addEventListener("click", checkAnswers);
$("#closePanel").onclick = () => $("#panelDialog").close();
$("#shareBtn").onclick = () => navigator.share ? navigator.share({title:"Math Hero",text:"Тренуй математику!"}) : toast("Поділись посиланням");
$("#loginBtn").onclick = () => $("#authDialog").showModal();
$("#logoutBtn").onclick = async () => { if(auth) await signOut(auth); location.reload(); };
$("#closeAuth").onclick = () => $("#authDialog").close();

$("#registerBtn").onclick = async () => {
  if(!firebaseReady) return toast("Firebase config ще не вставлений");
  await createUserWithEmailAndPassword(auth, $("#emailInput").value, $("#passwordInput").value);
  $("#authDialog").close();
};
$("#emailLoginBtn").onclick = async () => {
  if(!firebaseReady) return toast("Firebase config ще не вставлений");
  await signInWithEmailAndPassword(auth, $("#emailInput").value, $("#passwordInput").value);
  $("#authDialog").close();
};
$("#googleLoginBtn").onclick = async () => {
  if(!firebaseReady) return toast("Firebase config ще не вставлений");
  await signInWithPopup(auth, new GoogleAuthProvider());
  $("#authDialog").close();
};

if(firebaseReady) onAuthStateChanged(auth, user => user ? loadProfile(user) : updateUi());
newQuestions();
updateUi();

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
