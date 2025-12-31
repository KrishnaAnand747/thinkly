// --- 0. INITIALIZATION & GLOBAL EXPOSURE ---
window.handleCredentialResponse = handleCredentialResponse;
window.guestLogin = guestLogin;
window.logout = logout;
window.onClassChange = onClassChange;
window.showDashboard = showDashboard;
window.showLoginAgain = showLoginAgain;
window.toggleQBAnswer = toggleQBAnswer; 
window.loadSubTopic = loadSubTopic; // Exposed for onclick

let syllabus = {};
let notesData = {}; 
let currentUser = { name: "Guest", pic: "images/guest-profile.png", type: "Guest" };

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
        </div>`).join('');
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
    const selectedClass = document.getElementById("classSelect").value;
    const selectedSubject = "Science"; // Adjust this based on your dynamic logic if needed
    
    // Hide others
    document.getElementById("quizContainer").style.display = "none";
    document.getElementById("questionBankContainer").style.display = "none";
    notesDiv.style.display = 'block';

    // The path to the chapter folder
    const chapterPath = `data/notes/Class-${selectedClass}/${selectedSubject}/${chapterName.trim()}`;

    try {
        const configResp = await fetch(`${chapterPath}/config.json`);
        if (!configResp.ok) throw new Error("No subtopics config found");
        const config = await configResp.json();

        notesDiv.innerHTML = `
            <div class="subtopic-nav" style="display: flex; overflow-x: auto; gap: 10px; padding: 10px 0; margin-bottom: 20px; border-bottom: 2px solid #eee; -webkit-overflow-scrolling: touch;">
                ${config.topics.map(t => `
                    <button class="sub-btn" onclick="loadSubTopic('${chapterPath}/${t.file}', this)" 
                            style="white-space: nowrap; padding: 8px 18px; border-radius: 20px; border: 1.5px solid var(--primary); background: #fff; color: var(--primary); font-weight: 600; cursor: pointer;">
                        ${t.title}
                    </button>
                `).join('')}
            </div>
            <div id="subTopicDisplay" class="subtopic-content" style="line-height:1.6;">
                <p>Loading sub-topic...</p>
            </div>
        `;

        // Load first topic by default
        if(config.topics.length > 0) {
            const firstBtn = notesDiv.querySelector('.sub-btn');
            loadSubTopic(`${chapterPath}/${config.topics[0].file}`, firstBtn);
        }

    } catch (err) {
        notesDiv.innerHTML = `<p style="padding:20px; color:#666;">Detailed sub-topics for this chapter are coming soon.</p>`;
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

// --- 5. QUESTION BANK & QUIZ (Updated with Image Support) ---
async function showQuestionBank(chapterName) {
    const qbArea = document.getElementById("questionBankContainer");
    document.getElementById("notesContainer").style.display = "none";
    document.getElementById("quizContainer").style.display = "none";
    qbArea.style.display = 'block';
    qbArea.innerHTML = `<p>Loading Question Bank...</p>`;

    try {
        const response = await fetch(`data/questionBank/${chapterName.trim()}.json`);
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

    try {
        const response = await fetch(`data/quizzes/${chapterName.trim()}.json`);
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
    submitBtn.style = "display: block; width: 100%; padding: 15px; background: #28a745; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer;";
    submitBtn.onclick = () => {
        let score = 0;
        questions.forEach((item, index) => {
            const selected = document.querySelector(`input[name="q${index}"]:checked`);
            const feedback = document.getElementById(`feedback-${index}`);
            feedback.classList.remove('hidden');
            if (selected && selected.value === item.a) {
                score++;
                feedback.style.background = "#d4edda";
                feedback.innerHTML = `✅ Correct!`;
            } else {
                feedback.style.background = "#f8d7da";
                feedback.innerHTML = `❌ Incorrect. Answer: ${item.a}`;
            }
        });
        saveProgress(chapterName, score, questions.length);
        const summary = document.createElement('div');
        summary.style = "text-align: center; font-size: 1.2rem; font-weight: bold; margin-top: 20px; padding: 15px; background: #eef6ff; border-radius: 10px;";
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
    const key = getProgressKey();
    const progress = JSON.parse(localStorage.getItem(key)) || {};
    let rowsHTML = "";
    let count = 0;
    
    for (const [chapter, data] of Object.entries(progress)) {
        count++;
        rowsHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 15px;">${chapter.replace(/-/g, ' ')}</td>
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

    contentArea.innerHTML = `
        <h2 style="color:var(--secondary); margin-bottom:20px;">Performance: ${currentUser.name}</h2>
        <div style="display:flex; gap:15px; margin-bottom:30px; flex-wrap:wrap;">
            <div style="background:var(--primary); color:white; padding:20px; border-radius:15px; flex:1; text-align:center;">
                <h3 style="margin:0; font-size:2rem;">${count}</h3>
                <p style="margin:0;">Quizzes Completed</p>
            </div>
        </div>
        <div class="content-section" style="padding:0; overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; text-align:left; background:white;">
                <thead style="background:#f8f9fa;">
                    <tr>
                        <th style="padding:15px;">Chapter</th>
                        <th style="padding:15px;">Progress</th>
                        <th style="padding:15px;">Best Score</th>
                        <th style="padding:15px;">Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHTML || '<tr><td colspan="4" style="padding:30px; text-align:center;">No quiz data for this account.</td></tr>'}
                </tbody>
            </table>
        </div>
        ${count > 0 ? `<button onclick="if(confirm('Clear progress for ${currentUser.name}?')){localStorage.removeItem('${key}'); showDashboard();}" style="margin-top:20px; color:#dc3545; border:none; background:none; cursor:pointer;">Reset My Stats</button>` : ''}`;
}

function showLoginAgain() {
    document.getElementById("app").classList.add('hidden');
    document.getElementById("loginScreen").classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', loadContentData);