// --- 0. INITIALIZATION & GLOBAL EXPOSURE ---
window.handleCredentialResponse = handleCredentialResponse;
window.guestLogin = guestLogin;
window.logout = logout;
window.onClassChange = onClassChange;
window.showDashboard = showDashboard;
window.showLoginAgain = showLoginAgain;
window.toggleQBAnswer = toggleQBAnswer;
window.loadSubTopic = loadSubTopic; // Exposed for onclick
window.startReading = startReading;
window.stopReading = stopReading;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.startAssessment = startAssessment;
window.exitExam = exitExam;
window.submitExam = submitExam;


let syllabus = {};
let notesData = {}; 
let currentUser = { name: "Guest", pic: "images/guest-profile.png", type: "Guest", uid: null };
let selectedSubject = '';
let examActive = false;
let examQuestions = [];
let examTimer = 1200; // 20 minutes
let examTimerInterval = null;
let examSubjectId = '';
let firebaseApp = null;
let db = null;

function escapeJS(str) {
    return str.replace(/'/g, "\\'");
}

function getProgressKey() {
    const sanitizedName = currentUser.name.replace(/\s+/g, '_');
    return `studentProgress_${sanitizedName}`;
}

// --- 1. AUTHENTICATION ---
function handleCredentialResponse(response) {
    try {
        const token = response.credential;
        const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        currentUser = { name: payload.name, pic: payload.picture, type: "Google", uid: payload.sub };
        initFirebase();
        transitionToApp();
    } catch (e) {
        console.error("Login failed:", e);
    }
}

function initFirebase() {
    if (currentUser.type !== 'Google' || !window.firebaseModules) return;
    const firebaseConfig = {
        // REPLACE WITH YOUR FIREBASE CONFIG
        apiKey: "your-api-key",
        authDomain: "your-project.firebaseapp.com",
        projectId: "your-project-id",
        storageBucket: "your-project.appspot.com",
        messagingSenderId: "123456789",
        appId: "your-app-id"
    };
    firebaseApp = window.firebaseModules.initializeApp(firebaseConfig);
    db = window.firebaseModules.getFirestore(firebaseApp);
    console.log('Firebase initialized');
}

function guestLogin() {
    currentUser = { name: "Guest", pic: "images/guest-profile.png", type: "Guest" }; 
    transitionToApp();
}

function logout() {
    document.getElementById("app").classList.add('hidden');
    document.getElementById("loginScreen").classList.remove('hidden');
}

function transitionToApp() {
    document.getElementById("splash").classList.add('hidden');
    document.getElementById("loginScreen").classList.add('hidden');
    document.getElementById("app").classList.remove('hidden');
    
    // Update User Info in Topbar
    document.getElementById("user-name").innerText = currentUser.name;
    document.getElementById("user-pic").src = currentUser.pic;
    document.getElementById("user-area").style.display = 'flex';

    // Inject the Large Welcome Image into the Content Area
    const contentArea = document.getElementById("contentArea");
    contentArea.classList.add('centered'); // Keeps it centered
    
    contentArea.innerHTML = `
        <div class="post-login-welcome" style="max-width: 600px; width: 100%;">
            <h2 style="color: var(--primary); margin-bottom: 5px;">Ready to learn, ${currentUser.name}?</h2>
            <p style="color: var(--text-medium); margin-bottom: 25px;">Select a class and subject from the sidebar to begin your journey.</p>
            
            <div class="welcome-hero-container" style="background: white; padding: 15px; border-radius: 20px; box-shadow: var(--shadow-subtle); border: 1px solid var(--border-light);">
                <img src="images/Thinkly_Welcome.png" alt="Welcome to Thinkly" 
                     style="width: 100%; height: auto; border-radius: 12px; display: block;">
            </div>
            
            <div class="welcome-footer-hint" style="margin-top: 25px; padding: 10px 20px; background: #8B4513; color: white; border-radius: 10px; display: inline-block; font-size: 0.9rem;">
                <p style="margin:0;">💡 <strong>Tip:</strong> Your progress is automatically saved as a ${currentUser.type} user.</p>
            </div>
        </div>
    `;

    populateClassSelect();
}

// --- 2. DATA LOADING ---
async function loadContentData() {
    try {
        const response = await fetch('content.json');
        if (!response.ok) throw new Error("Fetch failed");
        const data = await response.json();
        syllabus = data.syllabus || {};
        notesData = data.notes || {};
    } catch (error) {
        console.error("Error loading content.json:", error);
    } finally {
        document.getElementById("splash").classList.add('hidden');
        document.getElementById("loginScreen").classList.remove('hidden');
    }
}

function populateClassSelect() {
    const classSelect = document.getElementById("classSelect");
    if (!classSelect) return;
    classSelect.innerHTML = '<option value="">-- Select Class --</option>';
    const classes = Object.keys(syllabus).sort((a, b) => a - b);
    if (classes.length > 0) {
        classSelect.innerHTML += classes.map(c => `<option value="${c}">Class ${c}</option>`).join('');
        classSelect.value = classes[0];
        onClassChange();
    }
}

function onClassChange() {
    const selectedClass = document.getElementById("classSelect").value;
    const subArea = document.getElementById("subjectButtons");
    const assessmentBtn = document.getElementById("btn-assessment");
    subArea.innerHTML = '';
    assessmentBtn.disabled = true;
    assessmentBtn.style.opacity = '0.5';
    selectedSubject = '';
    if (!selectedClass || !syllabus[selectedClass]) return;
    
    const subjects = Object.keys(syllabus[selectedClass]);
    subArea.innerHTML = subjects.map(sub =>
        `<button class="subject-btn" onclick="onSubjectSelect('${selectedClass}', '${sub}', this)">
            ${sub.charAt(0).toUpperCase() + sub.slice(1)}
         </button>`).join('');
    if (subjects.length > 0) onSubjectSelect(selectedClass, subjects[0], subArea.querySelector('.subject-btn'));
}

function onSubjectSelect(selectedClass, sub, btn) {
    selectedSubject = sub;
    document.querySelectorAll('.subject-btn').forEach(b => b.style.background = 'var(--secondary)');
    btn.style.background = 'var(--primary)';
    showChapters(selectedClass, sub);
    document.getElementById("btn-assessment").disabled = false;
    document.getElementById("btn-assessment").style.opacity = '1';
}

function onSubjectSelect(selectedClass, sub, btn) {
    selectedSubject = sub;
    document.querySelectorAll('.subject-btn').forEach(b => b.style.background = 'var(--secondary)');
    btn.style.background = 'var(--primary)';
    showChapters(selectedClass, sub);
    document.getElementById("btn-assessment").disabled = false;
    document.getElementById("btn-assessment").style.opacity = '1';
}

function showChapters(selectedClass, selectedSubject) {
    const chaptersArea = document.getElementById("chaptersArea");
    const chapters = syllabus[selectedClass][selectedSubject] || [];
    chaptersArea.innerHTML = '<h4>Chapters</h4>';
    chaptersArea.innerHTML += chapters.map(chapter => 
        `<div class="chapter-card" onclick="showChapterContent('${escapeJS(chapter)}')">
            <span>${chapter.replace(/-/g, ' ')}</span>
        </div>`).join('');
}

function toKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase();
}

async function startAssessment() {
    if (!selectedSubject) {
        alert('Please select a subject first.');
        return;
    }
    
    // Use first chapter as subject_id proxy - safe path
    const selectedClass = document.getElementById("classSelect").value.toLowerCase().replace(/\s+/g, '-');
    const firstChapter = syllabus[selectedClass][selectedSubject][0];
    examSubjectId = firstChapter.trim().toLowerCase().replace(/\s+/g, '-');
    
    document.getElementById('sidebar').style.display = 'none';
    document.querySelector('.main').style.display = 'none';
    document.getElementById('sidebarOverlay').style.display = 'none';
    document.getElementById('examMode').classList.remove('hidden');
    document.getElementById('exam-subject-title').textContent = selectedSubject.charAt(0).toUpperCase() + selectedSubject.slice(1);
    
    examActive = true;
    examTimer = 1200;
    
    try {
        // Load quizzes for MCQ (like view quiz) + QB for other
        const safeExamId = examSubjectId.toLowerCase().replace(/\s+/g, '-');
        const quizResponse = await fetch(`data/quizzes/${safeExamId}.json`);
        const mcqQuestions = await quizResponse.json();
        
        const qbResponse = await fetch(`data/questionBank/${safeExamId}.json`);
        const qbData = await qbResponse.json();
        const otherQuestions = [];
        for (const cat in qbData) {
            otherQuestions.push(...qbData[cat]);
        }
        
        // 10 MCQ + 10 other
        const mcqs = mcqQuestions.slice(0, 10);
        const others = otherQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);
        examQuestions = [...mcqs, ...others];
        renderExam();
        startExamTimer();
    } catch (err) {
        console.error('Failed to load questions:', err);
        document.getElementById('exam-questions').innerHTML = '<p>Error loading assessment. <button onclick="exitExam()">Try Again</button></p>';
    }
}

function renderExam() {
    const container = document.getElementById('exam-questions');
    container.innerHTML = examQuestions.map((q, i) => {
        let optionsHtml = '';
        const imageHtml = q.image ? `<img src="${q.image}" style="max-width:100%; height:auto; border-radius:8px; margin:15px 0;" onclick="openModal('${q.image}')">` : '';
        
        if (q.options) {
            // MCQ from quizzes
            optionsHtml = q.options.map(opt => `
                <label style="display: block; padding: 10px; margin: 5px 0; border: 1px solid #eee; border-radius: 8px; cursor: pointer;">
                    <input type="radio" name="examq${i}" value="${opt}" style="margin-right: 10px;"> ${opt}
                </label>
            `).join('');
        } else {
            // Short answer from QB
            optionsHtml = `<textarea name="examq${i}" placeholder="Enter your answer" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; resize:vertical; min-height:80px;"></textarea>`;
        }
        
        return `
            <div class="exam-question">
                <h3>Question ${i+1}</h3>
                <p>${q.q}</p>
                ${imageHtml}
                <div class="exam-options">
                    ${optionsHtml}
                </div>
            </div>
        `;
    }).join('');
}

function startExamTimer() {
    document.getElementById('exam-timer').textContent = '20:00';
    examTimerInterval = setInterval(() => {
        examTimer--;
        const min = Math.floor(examTimer / 60).toString().padStart(2, '0');
        const sec = (examTimer % 60).toString().padStart(2, '0');
        document.getElementById('exam-timer').textContent = `${min}:${sec}`;
        if (document.querySelector('.timer-countdown').style.color !== 'red' && examTimer <= 300) {
            document.querySelector('.timer-countdown').style.color = 'orange';
        }
        if (examTimer <= 60) {
            document.querySelector('.timer-countdown').style.color = 'red';
        }
        if (examTimer <= 0) {
            clearInterval(examTimerInterval);
            submitExam(true); // auto-submit
        }
    }, 1000);
}

function exitExam() {
    if (examTimerInterval) clearInterval(examTimerInterval);
    examActive = false;
    document.getElementById('examMode').classList.add('hidden');
    document.getElementById('sidebar').style.display = '';
    document.querySelector('.main').style.display = '';
    document.getElementById('sidebarOverlay').style.display = '';
    showDashboard();
}

async function submitExam(auto = false) {
    if (examTimerInterval) clearInterval(examTimerInterval);
    let score = 0;
    const totalQuestions = examQuestions.length;
    
    for (let i = 0; i < totalQuestions; i++) {
        const q = examQuestions[i];
        const radios = document.querySelectorAll(`input[name="examq${i}"]:checked`);
        const textarea = document.querySelector(`textarea[name="examq${i}"]`);
        
        if (q.options) {
            // MCQ: exact match
            const selectedRadio = radios[0];
            if (selectedRadio && selectedRadio.value === q.a) {
                score++;
            }
        } else {
            // Short answer: substring match (case-insensitive)
            if (textarea && textarea.value.trim().toLowerCase().includes(q.a.toLowerCase())) {
                score++;
            }
        }
    }
    
    const percent = Math.round((score / totalQuestions) * 100);
    document.getElementById('exam-questions').innerHTML = `
        <div class="exam-summary">
            <h2>Assessment Complete!</h2>
            <div class="exam-score">${score}/${totalQuestions}</div>
            <p>${percent}% Score</p>
            <button onclick="exitExam()" style="margin-top:20px; padding:12px 24px; background:var(--primary); color:white; border:none; border-radius:8px; font-size:1.1rem; cursor:pointer;">Back to Dashboard</button>
        </div>
    `;
    
    // Save result
    const result = {
        score: score,
        total: examQuestions.length,
        percent: percent,
        timestamp: new Date().toISOString(),
        subject: examSubjectId
    };
    
    if (currentUser.uid && db) {
        try {
            await window.firebaseModules.setDoc(window.firebaseModules.doc(db, 'users', currentUser.uid, 'assessments', examSubjectId), result);
            console.log('Saved to Firebase');
        } catch (e) {
            console.error('Firebase save failed:', e);
        }
    } else {
        // Save locally
        const localKey = `assessment_${examSubjectId}`;
        const localResults = JSON.parse(localStorage.getItem(localKey) || '[]');
        localResults.push(result);
        localStorage.setItem(localKey, JSON.stringify(localResults));
    }
    
    if (auto) alert('Time up! Exam submitted.');
}

// --- 3. CONTENT RENDERING ---
function showChapterContent(chapterName) {
    const contentArea = document.getElementById("contentArea");
    contentArea.classList.remove('centered');
    contentArea.innerHTML = `
        <h2>${chapterName.replace(/-/g, ' ')}</h2>
        <div class="content-controls">
            <button class="quiz-btn" onclick="showNotes('${escapeJS(chapterName)}')">View Notes</button>
            <button class="quiz-btn" onclick="startQuiz('${escapeJS(chapterName)}')">Take Quiz</button>
            <button class="quiz-btn" onclick="showQuestionBank('${escapeJS(chapterName)}')">Question Bank</button>
        </div>
        <div id="notesContainer" class="notes-content content-section" style="display:none;"></div>
        <div id="quizContainer" class="quiz-area content-section" style="display:none;"></div>
        <div id="questionBankContainer" class="qb-area content-section" style="display:none;"></div>
    `;
    showNotes(chapterName);
}

// --- 4. NEW: SUB-TOPIC NOTES LOGIC ---
async function showNotes(chapterName) {
    const notesDiv = document.getElementById("notesContainer");
    const selectedClassValue = document.getElementById("classSelect").value;
    
    // Use global selectedSubject first, fallback to UI
    let selectedSubjectFinal = selectedSubject;
    if (!selectedSubjectFinal) {
        const subArea = document.getElementById("subjectButtons");
        const activeBtn = subArea ? subArea.querySelector('.subject-btn:nth-child(1)') || subArea.querySelector('.subject-btn') : null;
        selectedSubjectFinal = activeBtn ? activeBtn.textContent.trim() : "Science";
    }
    
    // Paths match EXACT folder structure: Class-10/Science/acids-bases-and-salts/
    const classFolder = `Class-${selectedClassValue}`;
    const subjectFolder = selectedSubjectFinal;
    const chapterFolder = chapterName.trim();
    
    // Hide other sections
    document.getElementById("quizContainer").style.display = "none";
    document.getElementById("questionBankContainer").style.display = "none";
    notesDiv.style.display = 'block';

    const chapterPath = `data/notes/${classFolder}/${subjectFolder}/${chapterFolder}`;

    try {
        const configResp = await fetch(`${chapterPath}/config.json`);
        if (!configResp.ok) throw new Error("No config.json found");
        const config = await configResp.json();

        notesDiv.innerHTML = `
            <div class="subtopic-nav" style="display: flex; overflow-x: auto; gap: 10px; padding: 10px 0; margin-bottom: 20px; border-bottom: 2px solid #eee;">
                ${config.topics.map(t => `
                    <button class="sub-btn" onclick="loadSubTopic('${chapterPath}/${t.file}', this)">
                        ${t.title}
                    </button>
                `).join('')}
            </div>
            <button id="readAloudBtn" class="read-aloud-btn" onclick="startReading()">🔊 Read Aloud</button>
            <div id="subTopicDisplay" class="subtopic-content">
                <p>Loading sub-topic...</p>
            </div>
            <div id="teacherAvatar" class="teacher-avatar hidden">
                <div class="avatar-face">👩‍🏫</div>
            </div>
        `;

        if(config.topics.length > 0) {
            const firstBtn = notesDiv.querySelector('.sub-btn');
            loadSubTopic(`${chapterPath}/${config.topics[0].file}`, firstBtn);
        }

    } catch (err) {
        console.error("Notes error:", chapterPath, err);
        notesDiv.innerHTML = `<p style="padding:20px; color:#666;">📚 Notes for "${chapterName}" coming soon!<br><small>Class: ${selectedClassValue} | Subject: ${selectedSubjectFinal}</small></p>`;
    }
}

async function loadSubTopic(filePath, btn) {
    const display = document.getElementById("subTopicDisplay");
    
    // UI Feedback: Highlight active button
    document.querySelectorAll('.sub-btn').forEach(b => {
        b.style.background = "#fff";
        b.style.color = "var(--primary)";
    });
    btn.style.background = "var(--primary)";
    btn.style.color = "#fff";

    try {
        const response = await fetch(filePath);
        display.innerHTML = await response.text();
        
        // Auto-handle diagram zoom
        display.querySelectorAll('img').forEach(img => {
            img.style.cursor = "zoom-in";
            img.onclick = function() { openModal(this.src); };
        });
    } catch (err) {
        display.innerHTML = `<p>Error loading content.</p>`;
    }
}

function openModal(src) {
    const modal = document.createElement('div');
    modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:2000; display:flex; justify-content:center; align-items:center; cursor:zoom-out;";
    modal.innerHTML = `<img src="${src}" style="max-width:95%; max-height:90%; border-radius:5px;">`;
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
}

// --- 4.5. TEXT-TO-SPEECH & AVATAR LOGIC ---
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;

function startReading() {
    const display = document.getElementById("subTopicDisplay");
    const text = display.textContent || display.innerText;
    const avatar = document.getElementById("teacherAvatar");
    const btn = document.getElementById("readAloudBtn");

    if (!text.trim()) {
        alert("No text to read.");
        return;
    }

    if (speechSynthesis.speaking) {
        stopReading();
        return;
    }

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.rate = 0.8; // Slightly slower for clarity
    currentUtterance.pitch = 1;
    currentUtterance.volume = 1;

    currentUtterance.onstart = () => {
        avatar.classList.remove('hidden');
        avatar.classList.add('speaking');
        btn.innerText = "🔊 Stop Reading";
        btn.style.background = "#dc3545";
        btn.style.color = "#fff";
        btn.setAttribute('onclick', 'stopReading()');
    };

    currentUtterance.onend = () => {
        stopReading();
    };

    currentUtterance.onerror = () => {
        stopReading();
    };

    speechSynthesis.speak(currentUtterance);
}

function stopReading() {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    const avatar = document.getElementById("teacherAvatar");
    const btn = document.getElementById("readAloudBtn");
    avatar.classList.add('hidden');
    avatar.classList.remove('speaking');
    btn.innerText = "🔊 Read Aloud";
    btn.style.background = "#fff";
    btn.style.color = "#28a745";
    btn.setAttribute('onclick', 'startReading()');
    currentUtterance = null;
}

function selectAvatar(avatar) {
    localStorage.setItem('selectedTeacherAvatar', avatar);
    const avatarFace = document.querySelector('.avatar-face');
    if (avatarFace) {
        avatarFace.textContent = avatar;
    }
    // Optional: Add visual feedback for selected avatar
    const avatarIcons = document.querySelectorAll('.avatar-icons button');
    avatarIcons.forEach(btn => {
        if (btn.textContent === avatar) {
            btn.style.background = 'rgba(139, 69, 19, 0.2)';
            btn.style.borderRadius = '8px';
        } else {
            btn.style.background = 'none';
        }
    });
}



// --- 5. QUESTION BANK & QUIZ (Updated with Image Support) ---
async function showQuestionBank(chapterName) {
    const qbArea = document.getElementById("questionBankContainer");
    document.getElementById("notesContainer").style.display = "none";
    document.getElementById("quizContainer").style.display = "none";
    qbArea.style.display = 'block';
    qbArea.innerHTML = `<p>Loading Question Bank...</p>`;

    const safeChapterName = chapterName.trim().toLowerCase().replace(/\s+/g, '-');
    try {
        const response = await fetch(`data/questionBank/${safeChapterName}.json`);
        const data = await response.json();
        renderQuestionBank(data, qbArea);
    } catch (err) {
        qbArea.innerHTML = `<p>No Question Bank found for ${chapterName}.</p>`;
    }
}

function renderQuestionBank(data, container) {
    container.innerHTML = `<h3 style="color:var(--primary); border-bottom:2px solid #eee; padding-bottom:10px;">Question Bank</h3>`;
    for (const category in data) {
        container.innerHTML += `<h4 style="margin-top:25px; color:var(--secondary); text-decoration:underline;">${category}</h4>`;
        data[category].forEach((item, index) => {
            const qImageHTML = item.image ? `<img src="${item.image}" onclick="openModal(this.src)" style="display:block; max-width:100%; height:auto; border-radius:8px; margin:10px 0; border:1px solid #ddd; cursor:zoom-in;">` : "";
            const qWrapper = document.createElement('div');
            qWrapper.style = "margin-bottom: 15px; padding: 15px; border-radius: 8px; background: #fff; border: 1px solid #eaeaea; box-shadow: 0 2px 4px rgba(0,0,0,0.02);";
            qWrapper.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 15px;">
                    <div style="flex:1;">
                        <p style="margin: 0;"><strong>Q${index + 1}:</strong> ${item.q}</p>
                        ${qImageHTML}
                    </div>
                    <button class="show-answer-btn" style="white-space: nowrap; padding: 6px 14px; background: var(--primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600;" onclick="toggleQBAnswer(this)">Show Answer</button>
                </div>
                <div class="qp-answer hidden" style="margin-top: 12px; padding: 12px; background: #f0f7ff; border-left: 4px solid var(--primary); color: #004085; border-radius: 4px;">
                    <strong style="color:var(--primary);">Answer:</strong> ${item.a}
                </div>`;
            container.appendChild(qWrapper);
        });
    }
}

function toggleQBAnswer(btn) {
    const answerDiv = btn.parentElement.nextElementSibling;
    if (answerDiv.classList.contains('hidden')) {
        answerDiv.classList.remove('hidden');
        btn.innerText = "Hide Answer";
        btn.style.background = "#6c757d";
    } else {
        answerDiv.classList.add('hidden');
        btn.innerText = "Show Answer";
        btn.style.background = "var(--primary)";
    }
}

async function startQuiz(chapterName) {
    const quizDiv = document.getElementById("quizContainer");
    document.getElementById("notesContainer").style.display = "none";
    document.getElementById("questionBankContainer").style.display = "none";
    quizDiv.style.display = 'block';
    quizDiv.innerHTML = `<p>Loading Quiz...</p>`;

    const safeChapterName = chapterName.trim().toLowerCase().replace(/\s+/g, '-');
    try {
        const response = await fetch(`data/quizzes/${safeChapterName}.json`);
        const questions = await response.json();
        renderInteractiveQuiz(questions, quizDiv, chapterName);
    } catch (err) {
        quizDiv.innerHTML = `<p style="color:red;">Error loading quiz.</p>`;
    }
}

function renderInteractiveQuiz(questions, container, chapterName) {
    container.innerHTML = `<h2 style="text-align:center; margin-bottom:20px; color:var(--primary);">Interactive Quiz</h2>`;
    questions.forEach((item, index) => {
        const imageHTML = item.image ? `<img src="${item.image}" onclick="openModal(this.src)" style="display:block; max-width:100%; height:auto; border-radius:8px; margin:15px 0; border:1px solid #eee; cursor:zoom-in;">` : "";
        const qCard = document.createElement('div');
        qCard.style = "background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 12px; margin-bottom: 20px;";
        qCard.innerHTML = `
            <p style="font-weight: 600;">Q${index + 1}: ${item.q}</p>
            ${imageHTML}
            <div class="options-group">${item.options.map(opt => `
                <label style="display: block; padding: 10px; margin: 5px 0; border: 1px solid #eee; border-radius: 8px; cursor: pointer;">
                    <input type="radio" name="q${index}" value="${opt}" style="margin-right: 10px;"> ${opt}
                </label>`).join('')}</div>
            <div id="feedback-${index}" class="hidden" style="margin-top: 15px; padding: 12px; border-radius: 8px;"></div>`;
        container.appendChild(qCard);
    });

    const submitBtn = document.createElement('button');
    submitBtn.innerText = "Check My Answers";
    submitBtn.style = "display: block; width: 100%; padding: 15px; background: #8B4513; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer;";
    submitBtn.onclick = () => {
        let score = 0;
        questions.forEach((item, index) => {
            const selected = document.querySelector(`input[name="q${index}"]:checked`);
            const feedback = document.getElementById(`feedback-${index}`);
            feedback.classList.remove('hidden');
        if (selected && selected.value === item.a) {
            score++;
            feedback.style.background = "#d4edda";
            feedback.innerHTML = `✅ Correct! Explanation: ${item.explanation}`;
        } else {
            feedback.style.background = "#f8d7da";
            feedback.innerHTML = `❌ Incorrect. Answer: ${item.a}. Explanation: ${item.explanation}`;
        }
        });
        saveProgress(chapterName, score, questions.length);
        const summary = document.createElement('div');
        summary.style = "text-align: center; font-size: 1.2rem; font-weight: bold; margin-top: 20px; padding: 15px; background: #333333; color: white; border-radius: 10px;";
        summary.innerHTML = `Your Score: ${score} / ${questions.length}`;
        container.prepend(summary);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    container.appendChild(submitBtn);
}

function saveProgress(chapterName, score, total) {
    const key = getProgressKey();
    let progress = JSON.parse(localStorage.getItem(key)) || {};
    const percentage = Math.round((score / total) * 100);
    if (!progress[chapterName] || percentage > progress[chapterName].percent) {
        progress[chapterName] = { percent: percentage, score: score, total: total, date: new Date().toLocaleDateString() };
        localStorage.setItem(key, JSON.stringify(progress));
    }
}

// --- 6. DASHBOARD & UI HELPERS ---
function showDashboard() {
    const contentArea = document.getElementById("contentArea");
    const quizKey = getProgressKey();
    const quizProgress = JSON.parse(localStorage.getItem(quizKey)) || {};
    
    // Load assessments - FIXED to avoid duplicates
    const assessmentRows = [];
    const seenResults = new Set();
    
    // Scan all localStorage for assessment_* keys
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('assessment_')) {
            try {
                const results = JSON.parse(localStorage.getItem(key) || '[]');
                results.forEach(result => {
                    const id = result.timestamp + result.subject; // unique per result
                    if (!seenResults.has(id)) {
                        seenResults.add(id);
                        assessmentRows.push({
                            type: 'Assessment',
                            name: result.subject.replace(/-/g, ' ').toUpperCase(),
                            score: result.score,
                            total: result.total,
                            percent: result.percent,
                            date: new Date(result.timestamp).toLocaleDateString(),
                            timestamp: result.timestamp
                        });
                    }
                });
            } catch (e) {
                console.error('Error parsing assessment key:', key, e);
            }
        }
    });
    
    // Sort assessments by date
    assessmentRows.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
    
    let quizRowsHTML = "";
    let quizCount = 0;
    for (const [chapter, data] of Object.entries(quizProgress)) {
        quizCount++;
        quizRowsHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 15px;">📚 ${chapter.replace(/-/g, ' ')}</td>
                <td style="padding: 15px;">
                    <div style="background:#eee; border-radius:10px; height:10px; width:100%; max-width:150px;">
                        <div style="background:var(--primary); height:10px; border-radius:10px; width:${data.percent}%"></div>
                    </div>
                    <span style="font-size:0.8rem;">${data.percent}%</span>
                </td>
                <td style="padding: 15px; font-weight:bold;">${data.score} / ${data.total}</td>
                <td style="padding: 15px; color:#666; font-size:0.85rem;">${data.date}</td>
            </tr>`;
    }

    let assessmentRowsHTML = "";
    assessmentRows.forEach(row => {
        assessmentRowsHTML += `
            <tr style="border-bottom: 1px solid #eee; background: rgba(139,69,19,0.05);">
                <td style="padding: 15px;"><strong>🎯 ${row.name}</strong></td>
                <td style="padding: 15px;">
                    <div style="background:#eee; border-radius:10px; height:10px; width:100%; max-width:150px;">
                        <div style="background:var(--secondary); height:10px; border-radius:10px; width:${row.percent}%"></div>
                    </div>
                    <span style="font-size:0.8rem;">${row.percent}%</span>
                </td>
                <td style="padding: 15px; font-weight:bold; color:var(--secondary);">${row.score} / ${row.total}</td>
                <td style="padding: 15px; color:#666; font-size:0.85rem;">${row.date}</td>
            </tr>`;
    });

    const totalAssessments = assessmentRows.length;

    contentArea.innerHTML = `
        <h2 style="color:var(--secondary); margin-bottom:20px;">Performance: ${currentUser.name}</h2>
        <div style="display:flex; gap:15px; margin-bottom:30px; flex-wrap:wrap;">
            <div style="background:var(--primary); color:white; padding:20px; border-radius:15px; flex:1; text-align:center;">
                <h3 style="margin:0; font-size:2rem;">${quizCount}</h3>
                <p style="margin:0;">Quizzes</p>
            </div>
            <div style="background:var(--secondary); color:white; padding:20px; border-radius:15px; flex:1; text-align:center;">
                <h3 style="margin:0; font-size:2rem;">${totalAssessments}</h3>
                <p style="margin:0;">Assessments</p>
            </div>
        </div>
        
        ${quizRowsHTML ? `
        <h3 style="color:var(--primary); margin:20px 0 10px 0;">📚 Quiz Results</h3>
        <div class="content-section" style="padding:0; overflow-x:auto; margin-bottom:30px;">
            <table style="width:100%; border-collapse:collapse; text-align:left; background:white;">
                <thead style="background:#f8f9fa;">
                    <tr>
                        <th style="padding:15px;">Chapter</th>
                        <th style="padding:15px;">Progress</th>
                        <th style="padding:15px;">Score</th>
                        <th style="padding:15px;">Date</th>
                    </tr>
                </thead>
                <tbody>${quizRowsHTML}</tbody>
            </table>
        </div>
        ` : ''}
        
        ${assessmentRowsHTML ? `
        <h3 style="color:var(--secondary); margin:20px 0 10px 0;">🎯 Assessment Results</h3>
        <div class="content-section" style="padding:0; overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; text-align:left; background:white;">
                <thead style="background:rgba(139,69,19,0.1);">
                    <tr>
                        <th style="padding:15px;">Subject</th>
                        <th style="padding:15px;">Progress</th>
                        <th style="padding:15px;">Score</th>
                        <th style="padding:15px;">Date</th>
                    </tr>
                </thead>
                <tbody>${assessmentRowsHTML}</tbody>
            </table>
        </div>
        ` : ''}
        
        ${quizCount + totalAssessments > 0 ? `<button onclick="if(confirm('Clear all progress for ${currentUser.name}?')){localStorage.removeItem('${quizKey}'); for(let i=0;i<100;i++) localStorage.removeItem('assessment_'+i); showDashboard();}" style="margin-top:20px; color:#dc3545; border:none; background:none; cursor:pointer;">Reset All Stats</button>` : ''}
    `;
}

function showLoginAgain() {
    document.getElementById("app").classList.add('hidden');
    document.getElementById("loginScreen").classList.remove('hidden');
}

// --- 7. SIDEBAR TOGGLE FOR MOBILE ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburgerBtn');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && sidebar.classList.contains('active')) {
        closeSidebar();
    } else {
        sidebar.classList.add('active');
        hamburger.classList.add('active');
        if (overlay) overlay.classList.add('active');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburgerBtn');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.remove('active');
    if (hamburger) hamburger.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

// --- 8. RIGHT SIDEBAR UTILITIES ---

// Clock functionality
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById('clock').textContent = timeString;
}

// Timer functionality
let timerInterval;
let timerSeconds = 0;
let isTimerRunning = false;

function startTimer() {
    if (!isTimerRunning) {
        isTimerRunning = true;
        timerInterval = setInterval(() => {
            timerSeconds++;
            updateTimerDisplay();
        }, 1000);
    }
}

// Auto-start timer on page load
document.addEventListener('DOMContentLoaded', () => {
    startTimer();
});

function stopTimer() {
    if (isTimerRunning) {
        isTimerRunning = false;
        clearInterval(timerInterval);
    }
}

function resetTimer() {
    stopTimer();
    timerSeconds = 0;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const hours = Math.floor(timerSeconds / 3600);
    const minutes = Math.floor((timerSeconds % 3600) / 60);
    const seconds = timerSeconds % 60;
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('header-timer').textContent = timeString;
}

// Sticky notes functionality
function loadNotes() {
    const notes = JSON.parse(localStorage.getItem('stickyNotes') || '[]');
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = '';
    notes.forEach((note, index) => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.innerHTML = `
            <textarea rows="3" placeholder="Write your note here..." oninput="saveNotes()">${note}</textarea>
            <button class="delete-note" onclick="deleteNote(${index})">×</button>
        `;
        notesList.appendChild(noteItem);
    });
}

function addNote() {
    const notes = JSON.parse(localStorage.getItem('stickyNotes') || '[]');
    notes.push('');
    localStorage.setItem('stickyNotes', JSON.stringify(notes));
    loadNotes();
}

function deleteNote(index) {
    const notes = JSON.parse(localStorage.getItem('stickyNotes') || '[]');
    notes.splice(index, 1);
    localStorage.setItem('stickyNotes', JSON.stringify(notes));
    loadNotes();
}

function saveNotes() {
    const noteItems = document.querySelectorAll('.note-item textarea');
    const notes = Array.from(noteItems).map(textarea => textarea.value);
    localStorage.setItem('stickyNotes', JSON.stringify(notes));
}

// Initialize utilities when app loads
function initializeUtilities() {
    updateClock();
    setInterval(updateClock, 1000);
    updateTimerDisplay();
    loadNotes();
}

document.addEventListener('DOMContentLoaded', loadContentData);

// Initialize utilities after transition to app
const originalTransitionToApp = transitionToApp;
transitionToApp = function() {
    originalTransitionToApp();
    initializeUtilities();
};
