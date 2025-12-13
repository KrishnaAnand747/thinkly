// Mint Glass Edition app.js (updated)
let syllabus = {}, notes = {}, quizzes = {}, practiceQP = {};
let currentUser = null;
const CLIENT_ID = "852025843203-5goe3ipsous490292fqa4mh17p03h0br.apps.googleusercontent.com";

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

// UI helpers
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

// Chapter content (FIXED ALIGNMENT & CARD NESTING)
function showChapterContent(chapterName){
  const contentArea = document.getElementById("contentArea");
  contentArea.classList.remove('centered'); // FIX: Ensure left-alignment
  
  // Removed redundant outer <div class="card"> from innerHTML. The #contentArea is already a card.
  contentArea.innerHTML = `<h2>${chapterName}</h2>
    <div style="margin-top:12px">
      <button class="quiz-btn" onclick="showNotes('${escapeJS(chapterName)}')">View Notes</button>
      <button class="quiz-btn" onclick="startQuiz('${escapeJS(chapterName)}')">Take Quiz</button>
      <button class="quiz-btn" onclick="showPracticeQP('${escapeJS(chapterName)}')">Practice Questions</button>
    </div>
    <div id="notes" class="content-section"></div>
    <div id="quiz" class="content-section"></div>
    <div id="practiceQP" class="content-section"></div>`;
}

function escapeJS(s){ return s.replace(/'/g,"\'"); }

function showNotes(chapterName){
  const notesDiv = document.getElementById("notes"); const quizDiv = document.getElementById("quiz"); const qpDiv = document.getElementById("practiceQP");
  quizDiv.innerHTML = ""; qpDiv.innerHTML = "";
  const content = notes[chapterName];
  if(!content){ notesDiv.innerHTML = "<p>Notes coming soon.</p>"; return; }
  if(typeof content === "string" && content.endsWith(".html")){
    fetch(content)
      .then(r => {
          if (!r.ok) throw new Error("File not found: " + content);
          return r.text();
      })
      .then(txt=> notesDiv.innerHTML = txt)
      .catch(()=>notesDiv.innerHTML="<p>Unable to load notes. Check console for error.</p>");
  } else { notesDiv.innerHTML = content; }
}

function startQuiz(chapterName){
  const notesDiv = document.getElementById("notes"); const quizDiv = document.getElementById("quiz"); const qpDiv = document.getElementById("practiceQP");
  notesDiv.innerHTML=""; qpDiv.innerHTML="";
  const questions = quizzes[chapterName] || [];
  if(questions.length===0){ quizDiv.innerHTML="<p>No quiz available.</p>"; return; }
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
    feedback += `<div style="margin:10px 0;padding:10px;border-radius:8px;background:rgba(0,0,0,0.03)"><p><b>Q${i+1}.</b> ${q.q}</p><p>Your: ${sel? q.options[val]:'Not answered'}</p><p>Correct: ${q.options[q.answer]}</p><p style="opacity:0.9">${q.explanation||''}</p></div>`;
  });
  const percent = Math.round((score / questions.length)*100);
  saveProgressForCurrentUser(chapterName, percent);
  document.getElementById("quiz").innerHTML = `<div class="card"><h4>Result: ${score}/${questions.length} (${percent}%)</h4>${feedback}</div>`;
}

function showPracticeQP(chapterName){
  const notesDiv = document.getElementById("notes");
  const quizDiv = document.getElementById("quiz");
  const qpDiv = document.getElementById("practiceQP");
  notesDiv.innerHTML=""; quizDiv.innerHTML="";
  
  const list = practiceQP[chapterName] || [];
  
  let html = `<div class="qp-header"><h4>Practice Questions (Assessment)</h4><p>This is a model question paper for **${chapterName}**.</p></div>`;
  
  if(list.length===0){
     html += "<p>No practice questions available for this chapter.</p>";
  } else {
    // Using the nicer qp-question formatting from previous steps (assuming CSS is updated)
    list.forEach((q, index) => {
      html += `<div class="qp-question">
                 <div class="qp-marks">[${q.marks} Marks]</div>
                 <p><strong>Q${index + 1}.</strong> ${q.q}</p>
               </div>`;
    });
  }
  
  // Re-adding the AI button framework (but skipping the full function implementation)
  html += `<div class="qp-footer">
             <button class="quiz-btn" onclick="alert('This feature is coming soon!')">
               🔄 Generate More Questions (AI)
             </button>
             <div class="hint">Note: This feature is not yet fully implemented.</div>
           </div>`;

  qpDiv.innerHTML = html;
}

// Placeholder for the AI function to prevent errors when the button is clicked
function generateMorePracticeQP(chapterName) {
    alert(`AI generation for ${chapterName} is not yet active. Check back later!`);
}

// Progress per user
function getProgressForUserEmail(email){ try{ return JSON.parse(localStorage.getItem(`progress_${email}`) || "{}"); }catch(e){ return {}; } }
function saveProgressForUserEmail(email,obj){ localStorage.setItem(`progress_${email}`, JSON.stringify(obj)); }
function saveProgressForCurrentUser(chapter,percent){
  const key = currentUser ? currentUser.email : 'guest';
  const data = getProgressForUserEmail(key);
  data[chapter] = data[chapter] || {bestScore:0};
  if(percent > data[chapter].bestScore) data[chapter].bestScore = percent;
  data[chapter].last = new Date().toISOString();
  saveProgressForUserEmail(key,data);
}

// Dashboard (UPDATED with Progress Bars)
function showDashboard(){
  const key = currentUser ? currentUser.email : 'guest';
  const data = getProgressForUserEmail(key);
  
  let html = "<div class='card'><h3>Progress Dashboard</h3>";
  
  // Check if there is any data to show
  const chapters = Object.keys(data);
  if (chapters.length === 0) {
      html += "<p>You haven't completed any quizzes yet. Take a quiz to start tracking your progress!</p>";
  } else {
      html += `<table class='dashboard-table'>
                  <tr style='text-align:left'><th>Chapter</th><th>Best Score</th><th>Last Attempt</th></tr>`;
      
      for(const ch in data){ 
          const bestScore = data[ch].bestScore;
          // Format date nicely
          const lastDate = new Date(data[ch].last).toLocaleDateString();
          
          html += `<tr>
                      <td class='chapter-name-cell'>${ch}</td>
                      <td class='score-cell'>
                          <div class='progress-bar-container'>
                              <div class='progress-bar' style='width: ${bestScore}%;'></div>
                              <span class='score-text'>${bestScore}%</span>
                          </div>
                      </td>
                      <td style='padding:8px'>${lastDate}</td>
                  </tr>`;
      }
      html += "</table>";
  }
  
  html += "</div>"; 
  document.getElementById("dashboard").innerHTML = html; 
  document.getElementById("dashboard").style.display = 'block';
}

// Login/Logout & transitions
function handleCredentialResponse(response){
  try{
    const payload = parseJwt(response.credential);
    currentUser = {name: payload.name, email: payload.email, picture: payload.picture};
    onUserSignedIn();
  }catch(e){ console.error("Invalid credential", e); }
}

function guestLogin(){ currentUser = {name:'Guest', email:'guest'}; onUserSignedIn(); }

function onUserSignedIn(){
  // show header user area
  document.getElementById('user-area').style.display = 'flex';
  document.getElementById('user-name').textContent = currentUser.name || 'User';
  document.getElementById('user-pic').src = currentUser.picture || 'https://via.placeholder.com/80x80?text=G';
  document.getElementById('loginToggle').style.display = 'none';
  // fade out login and show app quickly (snappy 0.5s)
  const login = document.getElementById('loginScreen');
  const app = document.getElementById('app');
  login.style.transition = 'opacity 0.5s ease'; login.style.opacity = '0';
  setTimeout(()=>{ login.classList.add('hidden'); app.classList.remove('hidden'); app.style.opacity = '0'; app.style.transition = 'opacity 0.5s ease'; setTimeout(()=> app.style.opacity = '1',20); },520);
}

function showLoginAgain(){
  const login = document.getElementById('loginScreen');
  const app = document.getElementById('app');
  app.style.opacity = '0'; setTimeout(()=>{ app.classList.add('hidden'); login.classList.remove('hidden'); login.style.opacity = '1'; },520);
}

function parseJwt(token){ const base64Url = token.split('.')[1]; const base64 = base64Url.replace(/-/g,'+').replace(/_/g,'/'); const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c){ return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')); return JSON.parse(jsonPayload); }

function logout(){ 
  if(currentUser){ 
    currentUser = null; 
    document.getElementById('user-area').style.display = 'none'; 
    document.getElementById('loginToggle').style.display = 'inline-block'; 
    document.getElementById('dashboard').style.display='none'; 
    document.getElementById('dashboard').innerHTML=''; 
    
    const contentArea = document.getElementById('contentArea');
    contentArea.classList.add('centered'); // FIX: Re-add centered class for the welcome message
    contentArea.innerHTML = `<h3>Welcome to Thinkly</h3><p>Choose a chapter from the left. Sign in to save progress to your account.</p>`;
  } 
}

// init
window.addEventListener('DOMContentLoaded', async ()=>{
  await loadContentJson();
  // show spinner then reveal login (spinner fades to login)
  const splash = document.getElementById('splash');
  const login = document.getElementById('loginScreen');
  setTimeout(()=>{ splash.style.transition='opacity 0.5s ease'; splash.style.opacity='0'; setTimeout(()=>{ splash.classList.add('hidden'); login.classList.remove('hidden'); login.style.opacity='1'; },520); },900);
});
