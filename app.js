// --- 0. INITIALIZATION & GLOBAL EXPOSURE ---

// Expose these to the window so the global HTML handlers can see them
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

// Utility function for safe string passing to onclick handlers
function escapeJS(str) {
    return str.replace(/'/g, "\\'");
}

// --- 1. AUTHENTICATION AND TRANSITIONS ---

function handleCredentialResponse(response) {
    try {
        const token = response.credential;
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));

        currentUser = {
            name: payload.name,
            pic: payload.picture,
            type: "Google"
        };
        
        console.log("Authenticated as:", currentUser.name);
        document.getElementById('loginMessage').style.display = 'none';
        transitionToApp();
    } catch (e) {
        console.error("Google login decoding failed:", e);
        document.getElementById('loginMessage').innerText = "Sign-in failed. Please try again.";
        document.getElementById('loginMessage').style.display = 'block';
    }
}

function guestLogin() {
    currentUser = { name: "Guest", pic: "images/guest-profile.png", type: "Guest" }; 
    transitionToApp();
}

function logout() {
    currentUser = { name: "Guest", pic: "images/guest-profile.png", type: "Guest" };
    document.getElementById("app").classList.add('hidden');
    document.getElementById("loginScreen").classList.remove('hidden');
    
    document.getElementById("classSelect").value = "";
    onClassChange();
    
    document.getElementById("user-area").style.display = 'none';
    document.getElementById("loginToggle").style.display = 'block';
}

function transitionToApp() {
    // Hide both splash and login
    document.getElementById("splash").classList.add('hidden');
    document.getElementById("loginScreen").classList.add('hidden');
    document.getElementById("app").classList.remove('hidden');
    
    // Update top bar UI
    document.getElementById("user-name").innerText = currentUser.name;
    document.getElementById("user-pic").src = currentUser.pic;
    document.getElementById("user-area").style.display = 'flex';
    document.getElementById("loginToggle").style.display = 'none';

    populateClassSelect();
}

function showLoginAgain() {
    document.getElementById("app").classList.add('hidden');
    document.getElementById("loginScreen").classList.remove('hidden');
}

// --- 2. DATA LOADING AND INITIAL UI SETUP ---

async function loadContentData() {
    const splash = document.getElementById("splash");
    const loginScreen = document.getElementById("loginScreen");

    try {
        // Fetch the data
        const response = await fetch('content.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        syllabus = data.syllabus || {};
        notesData = data.notes || {};
        
        console.log("Data loaded successfully");
    } catch (error) {
        console.error("Error loading content.json:", error);
        const loginMsg = document.getElementById("loginMessage");
        if(loginMsg) {
            loginMsg.innerText = "Error: Library data could not be loaded. Please refresh.";
            loginMsg.style.display = 'block';
        }
    } finally {
        // CRITICAL: Always move past the splash screen, even if data failed
        if (splash) splash.classList.add('hidden');
        if (loginScreen) loginScreen.classList.remove('hidden');
    }
}

function populateClassSelect() {
    const classSelect = document.getElementById("classSelect");
    if (!classSelect) return;

    classSelect.innerHTML = '<option value="">-- Select Class --</option>';
    const classes = Object.keys(syllabus).sort((a, b) => a - b);
    
    if (classes.length > 0) {
        classSelect.innerHTML += classes.map(c => `<option value="${c}">Class ${c}</option>`).join('');
        // Optional: Auto-select first class
        classSelect.value = classes[0];
        onClassChange();
    } else {
        renderMainContent(null);
    }
}

// --- 3. SELECTION AND CHAPTER LOGIC ---

function onClassChange() {
    const classSelect = document.getElementById("classSelect");
    const subjectButtonsArea = document.getElementById("subjectButtons");
    const chaptersArea = document.getElementById("chaptersArea");
    
    if (!classSelect || !subjectButtonsArea) return;

    const selectedClass = classSelect.value;
    subjectButtonsArea.innerHTML = '';
    if (chaptersArea) chaptersArea.innerHTML = '<h4>Chapters</h4><p>Select a Subject.</p>';
    renderMainContent(null);

    if (!selectedClass || !syllabus[selectedClass]) return;
    
    const subjects = Object.keys(syllabus[selectedClass]);
    subjectButtonsArea.innerHTML = subjects.map(sub => 
        `<button class="subject-btn" onclick="showChapters('${selectedClass}', '${sub}')">
            ${sub.charAt(0).toUpperCase() + sub.slice(1)}
         </button>`).join('');
    
    if (subjects.length > 0) {
        showChapters(selectedClass, subjects[0]);
    }
}

function showChapters(selectedClass, selectedSubject) {
    const chaptersArea = document.getElementById("chaptersArea");
    if (!chaptersArea) return;

    const chapters = syllabus[selectedClass][selectedSubject] || [];
    chaptersArea.innerHTML = '<h4>Chapters</h4>';
    
    if (chapters.length === 0) {
        chaptersArea.innerHTML += '<p>No chapters found.</p>';
    } else {
        chaptersArea.innerHTML += chapters.map(chapter => 
            `<div class="chapter-card" onclick="showChapterContent('${escapeJS(chapter)}')">
                <span>${chapter.replace(/-/g, ' ')}</span>
                <span class="chapter-progress">0%</span>
            </div>`).join('');
    }
    renderMainContent(null);
}

// --- 4. CONTENT RENDERING ---

function renderMainContent(mode) {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;

    contentArea.innerHTML = '';
    contentArea.classList.remove('centered'); 

    if (mode === 'chapterControls') return; 
    
    if (mode === 'dashboard') {
        contentArea.innerHTML = '<h2>Your Learning Dashboard</h2><div id="dashboardContent"></div>';
        return;
    }

    contentArea.innerHTML = `
        <div class="centered-message">
            <h3>Welcome to Thinkly</h3>
            <p>Choose a class and subject on the left to begin learning.</p>
        </div>
    `;
    contentArea.classList.add('centered');
}

function showChapterContent(chapterName) {
    currentChapter = chapterName;
    renderMainContent('chapterControls'); 

    const contentArea = document.getElementById("contentArea");
    const displayName = chapterName.replace(/-/g, ' ');

    contentArea.innerHTML = `
        <h2>${displayName}</h2>
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

async function showNotes(chapterName) {
    const notesDiv = document.getElementById("notesContainer");
    const quizDiv = document.getElementById("quizContainer");
    const qbArea = document.getElementById("questionBankContainer");
    
    if (!notesDiv) return;
    if (quizDiv) quizDiv.innerHTML = "";
    if (qbArea) qbArea.innerHTML = "";
    notesDiv.style.display = 'block';

    if (notesData[chapterName]) {
        const filePath = notesData[chapterName];
        notesDiv.innerHTML = `<p>Loading notes...</p>`;
        
        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error("File not found");
            const htmlContent = await response.text();
            notesDiv.innerHTML = htmlContent;
        } catch (error) {
            notesDiv.innerHTML = `<p style="color:red;">Failed to load notes. Please verify the file exists at: <code>${filePath}</code></p>`;
        }
    } else {
        notesDiv.innerHTML = `<p>No notes available for this chapter.</p>`;
    }
}

function startQuiz(chapterName) {
    document.getElementById("notesContainer").innerHTML = "";
    document.getElementById("questionBankContainer").innerHTML = "";
    const quizDiv = document.getElementById("quizContainer");
    quizDiv.style.display = 'block';
    quizDiv.innerHTML = `<h3>Quiz: ${chapterName.replace(/-/g, ' ')}</h3><p>Quiz module coming soon!</p>`;
}

function showQuestionBank(chapterName) {
    document.getElementById("notesContainer").innerHTML = "";
    document.getElementById("quizContainer").innerHTML = "";
    const qbArea = document.getElementById("questionBankContainer");
    qbArea.style.display = 'block';
    qbArea.innerHTML = `<h3>Question Bank: ${chapterName.replace(/-/g, ' ')}</h3><p>Question library coming soon!</p>`;
}

function showDashboard() {
    renderMainContent('dashboard'); 
    document.getElementById("dashboardContent").innerHTML = `<p>Track your progress and scores here.</p>`;
}

// --- 5. DOCUMENT READY ---
document.addEventListener('DOMContentLoaded', () => {
    loadContentData();
});