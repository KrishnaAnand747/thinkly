// --- 0. INITIALIZATION & GLOBAL EXPOSURE ---
window.handleCredentialResponse = handleCredentialResponse;
window.guestLogin = guestLogin;
window.logout = logout;
window.onClassChange = onClassChange;
window.showDashboard = showDashboard;
window.showLoginAgain = showLoginAgain;

// --- Global Data and Utility Variables ---
let syllabus = {};
let notesData = {}; 
let currentChapter = null;
let currentUser = { name: "Guest", pic: "images/guest-profile.png", type: "Guest" };

function escapeJS(str) {
    return str.replace(/'/g, "\\'");
}

// --- 1. AUTHENTICATION ---
function handleCredentialResponse(response) {
    try {
        const token = response.credential;
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));

        currentUser = { name: payload.name, pic: payload.picture, type: "Google" };
        transitionToApp();
    } catch (e) {
        console.error("Login failed:", e);
    }
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
    document.getElementById("user-name").innerText = currentUser.name;
    document.getElementById("user-pic").src = currentUser.pic;
    document.getElementById("user-area").style.display = 'flex';
    populateClassSelect();
}

function showLoginAgain() {
    document.getElementById("app").classList.add('hidden');
    document.getElementById("loginScreen").classList.remove('hidden');
}

// --- 2. DATA LOADING ---
async function loadContentData() {
    try {
        const response = await fetch('content.json');
        if (!response.ok) throw new Error("Fetch failed");
        const data = await response.json();
        syllabus = data.syllabus || {};
        notesData = data.notes || {};
        console.log("Data loaded successfully");
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
    subArea.innerHTML = '';
    if (!selectedClass || !syllabus[selectedClass]) return;
    
    const subjects = Object.keys(syllabus[selectedClass]);
    subArea.innerHTML = subjects.map(sub => 
        `<button class="subject-btn" onclick="showChapters('${selectedClass}', '${sub}')">
            ${sub.charAt(0).toUpperCase() + sub.slice(1)}
         </button>`).join('');
    if (subjects.length > 0) showChapters(selectedClass, subjects[0]);
}

function showChapters(selectedClass, selectedSubject) {
    const chaptersArea = document.getElementById("chaptersArea");
    const chapters = syllabus[selectedClass][selectedSubject] || [];
    chaptersArea.innerHTML = '<h4>Chapters</h4>';
    chaptersArea.innerHTML += chapters.map(chapter => 
        `<div class="chapter-card" onclick="showChapterContent('${escapeJS(chapter)}')">
            <span>${chapter.replace(/-/g, ' ')}</span>
            <span class="chapter-progress">0%</span>
        </div>`).join('');
}

// --- 3. CONTENT RENDERING (QUIZ & QB FIXES) ---

function showChapterContent(chapterName) {
    currentChapter = chapterName;
    const contentArea = document.getElementById("contentArea");
    contentArea.classList.remove('centered');
    contentArea.innerHTML = `
        <h2>${chapterName.replace(/-/g, ' ')}</h2>
        <div class="content-controls">
            <button class="quiz-btn" onclick="showNotes('${escapeJS(chapterName)}')">View Notes</button>
            <button class="quiz-btn" onclick="startQuiz('${escapeJS(chapterName)}')">Take Quiz</button>
            <button class="quiz-btn" onclick="showQuestionBank('${escapeJS(chapterName)}')">Question Bank</button>
        </div>
        <div id="notesContainer" class="notes-content content-section"></div>
        <div id="quizContainer" class="quiz-area content-section"></div>
        <div id="questionBankContainer" class="qb-area content-section"></div>
    `;
    showNotes(chapterName);
}

async function showQuestionBank(chapterName) {
    const qbArea = document.getElementById("questionBankContainer");
    document.getElementById("notesContainer").innerHTML = "";
    document.getElementById("quizContainer").innerHTML = "";
    qbArea.style.display = 'block';
    qbArea.innerHTML = `<p>Loading Question Bank...</p>`;

    try {
        // Updated path to match your folder: data/questionBank/
        const response = await fetch(`data/questionBank/${chapterName}.json`);
        if (!response.ok) throw new Error("File not found");
        const data = await response.json();
        renderQuestionBank(data, qbArea);
    } catch (err) {
        qbArea.innerHTML = `<p>No Question Bank found at <code>data/questionBank/${chapterName}.json</code></p>`;
    }
}

function renderQuestionBank(data, container) {
    container.innerHTML = "<h3>Question Bank</h3>";
    // Loop through categories like "Very Short Answer (1M)"
    for (const category in data) {
        container.innerHTML += `<h4 style="margin-top:20px; color:var(--primary);">${category}</h4>`;
        data[category].forEach((item, index) => {
            container.innerHTML += `
                <div class="qp-question">
                    <p><strong>Q${index + 1}:</strong> ${item.q}</p>
                    <button class="show-answer-btn" onclick="this.nextElementSibling.classList.toggle('hidden')">Show Answer</button>
                    <div class="qp-answer hidden">
                        <div class="answer-label">Answer:</div>
                        ${item.a}
                    </div>
                </div>`;
        });
    }
}

async function startQuiz(chapterName) {
    const quizDiv = document.getElementById("quizContainer");
    document.getElementById("notesContainer").innerHTML = "";
    document.getElementById("questionBankContainer").innerHTML = "";
    quizDiv.style.display = 'block';
    quizDiv.innerHTML = `<p>🔄 Fetching latest Quiz data...</p>`;

    const cleanName = chapterName.trim();
    // Cache buster ensures you don't keep seeing an old 404 result from the browser cache
    const cb = `?t=${Date.now()}`; 

    // This is the most reliable path format for GitHub Pages
    const targetPath = `data/quizzes/${cleanName}.json${cb}`;

    try {
        console.log("Fetching from:", targetPath);
        const response = await fetch(targetPath);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        // We use your working renderer since the data format matches QB
        renderQuestionBank(data, quizDiv);
        console.log("✅ Quiz loaded successfully");

    } catch (err) {
        console.error("Quiz Fetch failed:", err);
        quizDiv.innerHTML = `
            <div style="padding: 20px; border: 2px solid #dc3545; background: #fff5f5; border-radius: 10px;">
                <h4 style="color: #dc3545; margin-top: 0;">File Access Error</h4>
                <p>GitHub returned a 404 for: <code>${targetPath}</code></p>
                <hr>
                <p><strong>Final Solution:</strong> If the file exists on GitHub, rename it to something simple like <code>quiz1.json</code> and update your <code>content.json</code> to match. This often clears "stuck" paths on GitHub servers.</p>
            </div>
        `;
    }
}
async function showNotes(chapterName) {
    const notesDiv = document.getElementById("notesContainer");
    document.getElementById("quizContainer").innerHTML = "";
    document.getElementById("questionBankContainer").innerHTML = "";
    notesDiv.style.display = 'block';

    if (notesData[chapterName]) {
        try {
            const response = await fetch(notesData[chapterName]);
            notesDiv.innerHTML = await response.text();
        } catch (err) {
            notesDiv.innerHTML = `<p>Error loading notes.</p>`;
        }
    }
}

function showDashboard() {
    const contentArea = document.getElementById("contentArea");
    contentArea.innerHTML = '<h2>Dashboard</h2><p>Your progress tracking will appear here.</p>';
}

document.addEventListener('DOMContentLoaded', loadContentData);