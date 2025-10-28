// App logic: loads content.json, handles login, guest, notes, quiz & practice QP
let syllabus = {}, notes = {}, quizzes = {}, practiceQP = {};
let currentUser = null; // {name,email,picture}
const CLIENT_ID = "852025843203-5goe3ipsous490292fqa4mh17p03h0br.apps.googleusercontent.com";

// ---- Init ----
async function loadContentJson(){
  try{
    const res = await fetch("content.json");
    const data = await res.json();
    syllabus = data.syllabus || {};
    notes = data.notes || {};
    quizzes = data.quizzes || {};
    practiceQP = data.practiceQP || {};
    populateClassSelect();
  }catch(e){
    console.error("Failed to load content.json", e);
  }
}

function populateClassSelect(){
  const sel = document.getElementById("classSelect");
  sel.innerHTML = '<option value="">-- Select Class --</option>';
  for(const cls in syllabus){
    const opt = document.createElement("option"); opt.value = cls; opt.textContent = "Class " + cls;
    sel.appendChild(opt);
  }
}

// ---- UI helpers ----
function onClassChange(){
  const cls = document.getElementById("classSelect").value;
  document.getElementById("chaptersArea").innerHTML = "";
  document.getElementById("subjectButtons").innerHTML = "";
  if(!cls) return;
  const sb = document.getElementById("subjectButtons");
  sb.innerHTML = `<button class="subject-btn" onclick="showChapters('math')">Math</button>
                  <button class="subject-btn" onclick="showChapters('science')">Science</button>`;
}

function showChapters(subject){
  const cls = document.getElementById("classSelect").value;
  if(!cls) return alert("Select class first");
  const list = syllabus[cls][subject] || [];
  const area = document.getElementById("chaptersArea");
  area.innerHTML = "";
  list.forEach(ch => {
    const b = document.createElement("button"); b.className="chapter-btn"; b.textContent = ch;
    b.onclick = ()=> showChapterContent(ch);
    area.appendChild(b);
  });
}

// ---- Chapter view ----
function showChapterContent(chapterName){
  const contentArea = document.getElementById("contentArea");
  contentArea.innerHTML = `<div class="card"><h2>${chapterName}</h2>
    <div style="margin-top:12px">
      <button class="quiz-btn" onclick="showNotes('${escapeJS(chapterName)}')">View Notes 📘</button>
      <button class="quiz-btn" onclick="startQuiz('${escapeJS(chapterName)}')">Take Quiz 📝</button>
      <button class="quiz-btn" onclick="showPracticeQP('${escapeJS(chapterName)}')">Practice Questions 🧮</button>
    </div>
    <div id="notes" class="content-section"></div>
    <div id="quiz" class="content-section"></div>
    <div id="practiceQP" class="content-section"></div>
    </div>`;
}

function escapeJS(s){ return s.replace(/'/g,"\\'"); }

// ---- Notes ----
function showNotes(chapterName){
  const notesDiv = document.getElementById("notes");
  const quizDiv = document.getElementById("quiz");
  const qpDiv = document.getElementById("practiceQP");
  quizDiv.innerHTML = ""; qpDiv.innerHTML = "";
  const content = notes[chapterName];
  if(!content){ notesDiv.innerHTML = "<p>Notes coming soon.</p>"; return; }
  if(typeof content === "string" && content.endsWith(".html")){
    fetch(content).then(r=>r.text()).then(txt=> notesDiv.innerHTML = txt).catch(()=>notesDiv.innerHTML="<p>Unable to load notes.</p>");
  } else {
    notesDiv.innerHTML = content;
  }
}

// ---- Quiz ----
function startQuiz(chapterName){
  const notesDiv = document.getElementById("notes");
  const quizDiv = document.getElementById("quiz");
  const qpDiv = document.getElementById("practiceQP");
  notesDiv.innerHTML = ""; qpDiv.innerHTML = "";
  const questions = quizzes[chapterName] || [];
  if(questions.length === 0){ quizDiv.innerHTML = "<p>No quiz available.</p>"; return; }
  let html = "<h4>Quiz</h4>";
  questions.forEach((q,i)=>{
    html += `<div class="quiz-question"><p><b>Q${i+1}.</b> ${q.q}</p>`;
    q.options.forEach((opt,j)=> html += `<label class="quiz-option"><input type="radio" name="q${i}" value="${j}"> ${opt}</label>`);
    html += "</div>";
  });
  html += `<button class="quiz-btn" onclick="submitQuiz('${escapeJS(chapterName)}')">Submit</button>`;
  quizDiv.innerHTML = html;
}

function submitQuiz(chapterName){
  const questions = quizzes[chapterName] || [];
  let score = 0, feedback = "";
  questions.forEach((q,i)=>{
    const sel = document.querySelector(`input[name="q${i}"]:checked`);
    const val = sel ? parseInt(sel.value) : null;
    const ok = val === q.answer;
    if(ok) score++;
    feedback += `<div class="${ok? 'correct':'wrong'}" style="margin:10px 0;padding:10px;border-radius:8px;background:rgba(255,255,255,0.04);color:white">
      <p><b>Q${i+1}.</b> ${q.q}</p>
      <p>Your answer: ${sel ? q.options[val] : 'Not answered'}</p>
      <p>Correct answer: ${q.options[q.answer]}</p>
      <p style="opacity:0.9">${q.explanation || ''}</p>
    </div>`;
  });
  const percent = Math.round((score / questions.length)*100);
  saveProgressForCurrentUser(chapterName, percent);
  document.getElementById("quiz").innerHTML = `<div class="card"><h4>Result: ${score}/${questions.length} (${percent}%)</h4>${feedback}</div>`;
}

// ---- Practice QP ----
function showPracticeQP(chapterName){
  const notesDiv = document.getElementById("notes");
  const quizDiv = document.getElementById("quiz");
  const qpDiv = document.getElementById("practiceQP");
  notesDiv.innerHTML = ""; quizDiv.innerHTML = "";
  const list = practiceQP[chapterName] || [];
  if(list.length === 0){ qpDiv.innerHTML = "<p>No practice questions.</p>"; return; }
  let html = "<h4>Practice Question Paper</h4><ol>";
  list.forEach(q=> html += `<li>${q.q} <small style="color:#ddd">[${q.marks}m]</small></li>`);
  html += "</ol>";
  qpDiv.innerHTML = html;
}

// ---- Progress storage per user ----
function getProgressForUserEmail(email){
  try{
    return JSON.parse(localStorage.getItem(`progress_${email}`) || "{}");
  }catch(e){ return {}; }
}
function saveProgressForUserEmail(email, obj){
  localStorage.setItem(`progress_${email}`, JSON.stringify(obj));
}
function saveProgressForCurrentUser(chapter, percent){
  const key = currentUser ? currentUser.email : 'guest';
  const data = getProgressForUserEmail(key);
  data[chapter] = data[chapter] || { bestScore:0 };
  if(percent > data[chapter].bestScore) data[chapter].bestScore = percent;
  data[chapter].last = new Date().toISOString();
  saveProgressForUserEmail(key, data);
}

// ---- Dashboard ----
function showDashboard(){
  const key = currentUser ? currentUser.email : 'guest';
  const data = getProgressForUserEmail(key);
  let html = "<div class='card'><h3>Progress Dashboard</h3><table style='width:100%;border-collapse:collapse'><tr style='text-align:left'><th>Chapter</th><th>Best</th><th>Last</th></tr>";
  for(const ch in data){
    html += `<tr><td style='padding:8px'>${ch}</td><td style='padding:8px'>${data[ch].bestScore}%</td><td style='padding:8px'>${data[ch].last.split('T')[0]}</td></tr>`;
  }
  html += "</table></div>";
  document.getElementById("dashboard").innerHTML = html;
  document.getElementById("dashboard").style.display = 'block';
}

// ---- Login / Logout ----
function openLoginPanel(){ document.getElementById("loginPanel").classList.add("open"); }
function closeLoginPanel(){ document.getElementById("loginPanel").classList.remove("open"); }

function handleCredentialResponse(response){
  try{
    const payload = parseJwt(response.credential);
    currentUser = {name: payload.name, email: payload.email, picture: payload.picture};
    onUserSignedIn();
  }catch(e){ console.error("Invalid credential", e); }
}

function guestLogin(){ currentUser = {name:"Guest", email:"guest"}; onUserSignedIn(); }

function onUserSignedIn(){
  document.getElementById("user-area").style.display = 'flex';
  document.getElementById("user-name").textContent = currentUser.name || 'User';
  document.getElementById("user-pic").src = currentUser.picture || 'https://via.placeholder.com/80x80?text=G';
  document.getElementById("loginToggle").style.display = 'none';
  closeLoginPanel();
  // load user's stored progress into runtime as needed (we read per-user on demand)
}

// minimal JWT parser for Google id token
function parseJwt (token){
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

function logout(){
  if(currentUser){
    // keep user progress persisted in localStorage (it is already saved per user)
    currentUser = null;
    document.getElementById("user-area").style.display = 'none';
    document.getElementById("loginToggle").style.display = 'inline-block';
    // clear UI
    document.getElementById("contentArea").innerHTML = `<div class="card centered"><h3>Welcome to Thinkly</h3><p>Choose a chapter from the left. Sign in to save progress to your account.</p></div>`;
  }
}

// ---- Init on page load ----
window.addEventListener('DOMContentLoaded', async ()=>{
  // show splash for ~1.5s then auto-open login panel
  await loadContentJson();
  setTimeout(()=>{
    document.getElementById("splash").style.display = 'none';
    openLoginPanel();
  },1500);
});
