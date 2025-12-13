// Mint Glass Edition app.js (Fixed)
let syllabus = {}, notes = {}, quizzes = {}, practiceQP = {};
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
    
    // Assign data to global variables
    syllabus = data.syllabus || {};
    notes = data.notes || {};
    quizzes = data.quizzes || {};
    practiceQP = data.practiceQP || {};
    
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

// showPracticeQP (UPDATED for Section Combo Box)
function showPracticeQP(chapterName){
  const notesDiv = document.getElementById("notes");
  const quizDiv = document.getElementById("quiz");
  const qpDiv = document.getElementById("practiceQP");
  notesDiv.innerHTML=""; quizDiv.innerHTML="";
  
  const sections = practiceQP[chapterName];
  
  let html = `<div class="qp-header">
                <h4>CBSE Practice Question Paper: ${chapterName}</h4>
                <p>Select a section below to view questions and model answers aligned with the board pattern.</p>
              </div>`;
  
  if(!sections || Object.keys(sections).length === 0){
     html += "<p>No sectional practice questions available for this chapter.</p>";
  } else {
    // 1. Generate the Section Select Dropdown
    const sectionKeys = Object.keys(sections);
    
    html += `<div class="qp-controls">
                <label for="qpSectionSelect">Select Question Section:</label>
                <select id="qpSectionSelect" onchange="showQPSection('${escapeJS(chapterName)}', this.value)">`;
    
    html += `<option value="" disabled selected>-- Choose a Section --</option>`;
    
    sectionKeys.forEach(key => {
        html += `<option value="${escapeJS(key)}">${key}</option>`;
    });

    html += `</select></div>`;
    
    // 2. Add container for questions (will be populated on change)
    html += `<div id="qp-section-content" class="content-section">
                <p>Please select a section from the dropdown above to view the questions.</p>
             </div>`;
  }
  
  // Placeholder for future AI button
  html += `<div class="qp-footer">
             <button class="quiz-btn" onclick="alert('AI generation is coming soon!')">
               🔄 Generate New Practice Set (AI)
             </button>
           </div>`;

  qpDiv.innerHTML = html;
}

// NEW FUNCTION: showQPSection
function showQPSection(chapterName, sectionKey) {
    const qpContentDiv = document.getElementById('qp-section-content');
    const sections = practiceQP[chapterName];
    
    if (!sections || !sections[sectionKey]) {
        qpContentDiv.innerHTML = `<p>Error: Could not load questions for section ${sectionKey}.</p>`;
        return;
    }

    const questions = sections[sectionKey];
    
    let html = `<h4>Section: ${sectionKey}</h4>`;
    
    questions.forEach((q, index) => {
        // Find the marks from the section key (e.g., '2 Marks')
        const marksMatch = sectionKey.match(/(\d+)\sMarks|(\d+)\smark/i);
        const marks = marksMatch ? (marksMatch[1] || marksMatch[2]) : '';

        // Safely check for an answer property before displaying button
        const hasAnswer = q.a && q.a.trim().length > 0;
        const answerHtml = hasAnswer ? 
            `<button class="show-answer-btn" data-target="answer-${sectionKey.replace(/\s/g, '-')}-${index}">Show Answer</button>
             <div id="answer-${sectionKey.replace(/\s/g, '-')}-${index}" class="qp-answer hidden">
                 <p class="answer-label">Model Answer:</p>
                 <p>${q.a}</p>
             </div>` : `<p class="hint" style="margin-top:10px;">Model answer coming soon.</p>`;


        html += `<div class="qp-question">
                    <div class="qp-marks">${marks ? `[${marks} Marks]` : ''}</div>
                    <p><strong>Q${index + 1}.</strong> ${q.q}</p>
                    ${answerHtml}
                 </div>`;
    });
    
    qpContentDiv.innerHTML = html;

    // Attach event listeners to the new buttons ONLY if they exist
    qpContentDiv.querySelectorAll('.show-answer-btn').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const answerDiv = document.getElementById(targetId);
            const isHidden = answerDiv.classList.toggle('hidden');
            this.textContent = isHidden ? 'Show Answer' : 'Hide Answer';
        });
    });
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
