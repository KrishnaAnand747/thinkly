// Mint Glass Edition app.js (Fixed and Reverted)
let syllabus = {}, notes = {}, quizzes = {}; // practiceQP removed
let currentUser = null;
const CLIENT_ID = "852025843203-5goe3ipsous490292fqa4mh17p03h0br.apps.googleusercontent.com";

async function loadContentJson(){
  try{
    // Ensure fetch is successful and data is parsed
    const res = await fetch("content.json");
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    
    // Assign data to global variables. practiceQP removed.
    syllabus = data.syllabus || {};
    notes = data.notes || {};
    quizzes = data.quizzes || {};
    
    // Crucial: Call the population function after data is ready
    populateClassSelect(); 
  }catch(e){
    console.error("Failed to load content.json or parse data", e);
    // Display error to the user if content loading fails
    document.getElementById("chaptersArea").innerHTML = "<p style='color:red;'>Error loading content: Check console.</p>";
  }
}

function populateClassSelect(){
  const sel = document.getElementById("classSelect");
  // Reset the dropdown content
  sel.innerHTML = '<option value="">-- Select Class --</option>'; 
  
  // Loop through the keys ("9", "10") in the globally loaded syllabus object
  for(const cls in syllabus){
    // Check if the property is directly on the object (good practice)
    if (syllabus.hasOwnProperty(cls)) {
        const opt = document.createElement("option"); 
        opt.value = cls; 
        opt.textContent = "Class " + cls;
        sel.appendChild(opt);
    }
  }
}

// UI helpers
function onClassChange(){
  const cls = document.getElementById("classSelect").value;
  document.getElementById("chaptersArea").innerHTML = "";
  document.getElementById("subjectButtons").innerHTML = "";
  if(!cls) return;
  const sb = document.getElementById("subjectButtons");
  sb.innerHTML = `<button class="subject-btn" onclick="showChapters('${cls}', 'math')">Math</button>
                  <button class="subject-btn" onclick="showChapters('${cls}', 'science')">Science</button>`;
}

function showChapters(cls, subject){
  const list = syllabus[cls][subject] || [];
  const area = document.getElementById("chaptersArea");
  area.innerHTML = "";
  list.forEach(ch => {
    const b = document.createElement("button"); b.className="chapter-btn"; b.textContent = ch;
    b.onclick = ()=> showChapterContent(ch);
    area.appendChild(b);
  });
}

function showChapterContent(chapterName){
  const contentArea = document.getElementById("contentArea");
  contentArea.classList.remove('centered');
  
  // Removed Practice Questions button
  contentArea.innerHTML = `<h2>${chapterName}</h2>
    <div style="margin-top:12px">
      <button class="quiz-btn" onclick="showNotes('${escapeJS(chapterName)}')">View Notes</button>
      <button class="quiz-btn" onclick="startQuiz('${escapeJS(chapterName)}')">Take Quiz</button>
    </div>
    <div id="notes" class="content-section"></div>
    <div id="quiz" class="content-section"></div>
    `;
}

function escapeJS(s){ return s.replace(/'/g,"\'"); }

function showNotes(chapterName){
  const notesDiv = document.getElementById("notes"); const quizDiv = document.getElementById("quiz"); // qpDiv removed
  quizDiv.innerHTML = ""; // qpDiv.innerHTML removed
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
  const notesDiv = document.getElementById("notes"); const quizDiv = document.getElementById("quiz"); // qpDiv removed
  notesDiv.innerHTML=""; // qpDiv.innerHTML removed
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

// showPracticeQP functions removed here

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

// Dashboard
function showDashboard(){
  const key = currentUser ? currentUser.email : 'guest';
  const data = getProgressForUserEmail(key);
  
  let html = "<div class='card'><h3>Progress Dashboard</h3>";
  
  const chapters = Object.keys(data);
  if (chapters.length === 0) {
      html += "<p>You haven't completed any quizzes yet. Take a quiz to start tracking your progress!</p>";
  } else {
      html += `<table class='dashboard-table'>
                  <tr style='text-align:left'><th>Chapter</th><th>Best Score</th><th>Last Attempt</th></tr>`;
      
      for(const ch in data){ 
          const bestScore = data[ch].bestScore;
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
  document.getElementById("dashboard").style.display = 'block';
  document.getElementById("dashboard").innerHTML = html; 
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
  document.getElementById('user-area').style.display = 'flex';
  document.getElementById('user-name').textContent = currentUser.name || 'User';
  document.getElementById('user-pic').src = currentUser.picture || 'https://via.placeholder.com/80x80?text=G';
  document.getElementById('loginToggle').style.display = 'none';
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
    contentArea.classList.add('centered');
    contentArea.innerHTML = `<h3>Welcome to Thinkly</h3><p>Choose a chapter from the left. Sign in to save progress to your account.</p>`;
  } 
}

// init
window.addEventListener('DOMContentLoaded', async ()=>{
  await loadContentJson();
  const splash = document.getElementById('splash');
  const login = document.getElementById('loginScreen');
  setTimeout(()=>{ splash.style.transition='opacity 0.5s ease'; splash.style.opacity='0'; setTimeout(()=>{ splash.classList.add('hidden'); login.classList.remove('hidden'); login.style.opacity='1'; },520); },900);
}); 
// *** The extra '}' has been removed from the end of the file. ***
