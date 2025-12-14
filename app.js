// --- Global Data and Utility Variables ---
// Note: These will be populated by loadContentData()
let syllabus = {};
let notesData = {}; 
let currentChapter = null;
// CRITICAL FIX: Update default picture path to local file
let currentUser = { name: "Guest", pic: "images/guest-profile.png", type: "Guest" };

// Utility function for safe string passing to onclick handlers
function escapeJS(str) {
    return str.replace(/'/g, "\\'");
}

// --- 1. AUTHENTICATION AND TRANSITIONS ---

function handleCredentialResponse(response) {
    // This function is called by the Google Sign-In script
    try {
        // Decode the ID token (simplified)
        const token = response.credential;
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));

        currentUser = {
            name: payload.name,
            pic: payload.picture,
            type: "Google"
        };
        document.getElementById('loginMessage').style.display = 'none';
        transitionToApp();
    } catch (e) {
        console.error("Google login failed:", e);
        document.getElementById('loginMessage').innerText = "Sign-in failed. Please try again.";
        document.getElementById('loginMessage').style.display = 'block';
    }
}

function guestLogin() {
    // CRITICAL FIX: Update default picture path to local file
    currentUser = { name: "Guest", pic: "images/guest-profile.png", type: "Guest" }; 
    transitionToApp();
}

function logout() {
    currentUser = { name: "Guest", pic: "images/guest-profile.png", type: "Guest" };
    document.getElementById("app").classList.add('hidden');
    document.getElementById("loginScreen").classList.remove('hidden');
    
    // Clear the main content and reset selections upon logout
    document.getElementById("classSelect").value = "";
    onClassChange();
    
    // Update top bar for logged-out state
    document.getElementById("user-area").style.display = 'none';
    document.getElementById("loginToggle").style.display = 'block';
}

function transitionToApp() {
    document.getElementById("splash").classList.add('hidden');
    document.getElementById("loginScreen").classList.add('hidden');
    document.getElementById("app").classList.remove('hidden');
    
    // Update top bar UI
    document.getElementById("user-name").innerText = currentUser.name;
    document.getElementById("user-pic").src = currentUser.pic;
    document.getElementById("user-area").style.display = 'flex';
    document.getElementById("loginToggle").style.display = 'none';

    // Initialize content after login
    populateClassSelect();
}

function showLoginAgain() {
    document.getElementById("app").classList.add('hidden');
    document.getElementById("loginScreen").classList.remove('hidden');
}


// --- 2. DATA LOADING AND INITIAL UI SETUP ---

async function loadContentData() {
    try {
        const response = await fetch('content.json');
        const data = await response.json();
        
        // Store data globally
        syllabus = data.syllabus;
        notesData = data.notes;
        
        // Hide splash screen and show login screen after data is ready
        document.getElementById("splash").classList.add('hidden');
        document.getElementById("loginScreen").classList.remove('hidden');
    } catch (error) {
        console.error("Error loading content.json:", error);
        document.getElementById("splash").innerHTML = '<h1>Error loading content.</h1><p>Check the console for details.</p>';
    }
}

function populateClassSelect() {
    const classSelect = document.getElementById("classSelect");
    
    if (!classSelect) return;

    // Clear existing options, keeping the default
    classSelect.innerHTML = '<option value="">-- Select Class --</option>';

    const classes = Object.keys(syllabus).sort();
    classSelect.innerHTML += classes.map(c => `<option value="${c}">Class ${c}</option>`).join('');

    // Restore or set initial state (e.g., select the first class if available)
    if (classes.length > 0) {
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
    
    if (!classSelect || !subjectButtonsArea) return;

    const selectedClass = classSelect.value;
    
    // Clear chapters and main content area when class changes
    subjectButtonsArea.innerHTML = '';
    document.getElementById("chaptersArea").innerHTML = '<h4>Chapters</h4><p>Select a Subject.</p>';
    renderMainContent(null); // CRITICAL: Clear main content

    if (!selectedClass || !syllabus[selectedClass]) return;
    
    const subjects = Object.keys(syllabus[selectedClass]);
    
    // Render subject buttons/links
    subjectButtonsArea.innerHTML = subjects.map(sub => 
        `<button class="subject-btn" onclick="showChapters('${selectedClass}', '${sub}')">
            ${sub.charAt(0).toUpperCase() + sub.slice(1)}
         </button>`).join('');
    
    // Auto-select the first subject if available
    if (subjects.length > 0) {
        showChapters(selectedClass, subjects[0]);
    }
}


function showChapters(selectedClass, selectedSubject) {
    const chaptersArea = document.getElementById("chaptersArea");
    
    if (!chaptersArea || !syllabus[selectedClass] || !syllabus[selectedClass][selectedSubject]) {
        chaptersArea.innerHTML = '<h4>Chapters</h4><p>No chapters found.</p>';
        return;
    }

    const chapters = syllabus[selectedClass][selectedSubject];
    
    chaptersArea.innerHTML = '<h4>Chapters</h4>';
    
    chaptersArea.innerHTML += chapters.map(chapter => 
        `<div class="chapter-card" onclick="showChapterContent('${escapeJS(chapter)}')">
            <span>${chapter.replace(/-/g, ' ')}</span>
            <span class="chapter-progress">0%</span>
        </div>`).join('');
        
    // Clear main content area
    renderMainContent(null);
}

// --- 4. MODULAR CONTENT RENDERING (STABILITY CORE) ---

/**
 * Manages the visibility and default content of the main content area.
 * @param {string|null} mode - 'chapterControls', 'dashboard', or null (for welcome/clear).
 */
function renderMainContent(mode) {
    const contentArea = document.getElementById("contentArea");
    
    if (!contentArea) return;

    // Reset all content areas by default
    contentArea.innerHTML = '';
    contentArea.classList.remove('centered'); 

    if (mode === 'chapterControls') {
        // showChapterContent will inject the controls next.
        return;
    } 
    
    if (mode === 'dashboard') {
        contentArea.innerHTML = '<h2>Your Learning Dashboard</h2><div id="dashboardContent"></div>';
        return;
    }

    // Default: Show welcome message (or clear)
    contentArea.innerHTML = `
        <div class="centered-message">
            <h3>Welcome to Thinkly</h3>
            <p>Choose a class and subject on the left, then select a chapter to begin.</p>
        </div>
    `;
    contentArea.classList.add('centered');
}

function showChapterContent(chapterName) {
    currentChapter = chapterName;
    
    // 1. Clear and set up the main content area for controls
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
    
    // Automatically load notes content when the chapter is first selected
    showNotes(chapterName);
}


// --- 5. CONTENT LOADING FUNCTIONS ---

async function showNotes(chapterName) {
    const notesDiv = document.getElementById("notesContainer");
    const quizDiv = document.getElementById("quizContainer");
    const qbArea = document.getElementById("questionBankContainer");
    
    // CRITICAL FIX: Ensure only the notes container is active
    quizDiv.innerHTML = "";
    qbArea.innerHTML = "";
    notesDiv.style.display = 'block';

    if (notesData[chapterName]) {
        const filePath = notesData[chapterName];
        notesDiv.innerHTML = `<h4>Loading Notes for ${chapterName.replace(/-/g, ' ')}...</h4>`;
        
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const htmlContent = await response.text();
            notesDiv.innerHTML = htmlContent;
        } catch (error) {
            notesDiv.innerHTML = `<p style="color:red;">Failed to load notes: <a href="${filePath}" target="_blank">Check File Path</a></p>`;
            console.error(`Error fetching file: ${filePath}`, error);
        }
    } else {
        notesDiv.innerHTML = `<p>No notes path found in content.json for this chapter.</p>`;
    }
}

function startQuiz(chapterName) {
    const notesDiv = document.getElementById("notesContainer");
    const quizDiv = document.getElementById("quizContainer");
    const qbArea = document.getElementById("questionBankContainer");
    
    // CRITICAL FIX: Ensure only the quiz container is active
    notesDiv.innerHTML = "";
    qbArea.innerHTML = "";
    quizDiv.style.display = 'block';

    // --- QUIZ MOCKUP ---
    quizDiv.innerHTML = `
        <h3>Quiz for ${chapterName.replace(/-/g, ' ')}</h3>
        <p>This is a placeholder for the Quiz component.</p>
        <button class="quiz-btn">Start Quiz</button>
    `;
}

function showQuestionBank(chapterName) {
    const notesDiv = document.getElementById("notesContainer");
    const quizDiv = document.getElementById("quizContainer");
    const qbArea = document.getElementById("questionBankContainer");
    
    // CRITICAL FIX: Ensure only the question bank container is active
    notesDiv.innerHTML = "";
    quizDiv.innerHTML = "";
    qbArea.style.display = 'block';

    // --- QUESTION BANK MOCKUP ---
    qbArea.innerHTML = `
        <h3>Question Bank for ${chapterName.replace(/-/g, ' ')}</h3>
        <p>This is a placeholder for the Question Bank component.</p>
        <div class="qp-controls">
            <label for="qbCategorySelect">Filter:</label>
            <select id="qbCategorySelect">
                <option>All</option>
                <option>MCQ</option>
                <option>Short Answer</option>
            </select>
        </div>
        <div class="qp-question">
            <p>Example Question: What is the formula for calculating the volume of a sphere?</p>
            <button class="show-answer-btn" onclick="alert('Answer: V = 4/3 * pi * r^3')">Show Answer</button>
        </div>
    `;
}

function showDashboard() {
    // Show the dashboard view
    renderMainContent('dashboard'); 
    const dashboardContent = document.getElementById("dashboardContent");
    
    // --- DASHBOARD MOCKUP ---
    dashboardContent.innerHTML = `
        <p>This area will display your quiz scores and chapter progress.</p>
        <table class="dashboard-table">
            <thead>
                <tr>
                    <th>Subject</th>
                    <th>Last Score</th>
                    <th>Progress</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Polynomials</td>
                    <td>8/10</td>
                    <td>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: 80%;"></div>
                            <span class="score-text">80%</span>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    `;
}

// --- 6. DOCUMENT READY LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    loadContentData();
});