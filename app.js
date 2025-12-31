// --- 0. INITIALIZATION & GLOBAL EXPOSURE ---
window.handleCredentialResponse = handleCredentialResponse;
window.guestLogin = guestLogin;
window.logout = logout;
window.onClassChange = onClassChange;
window.showDashboard = showDashboard;
window.showLoginAgain = showLoginAgain;
window.toggleQBAnswer = toggleQBAnswer; 

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
        <div id="notesContainer" class="notes-content content-section"></div>
        <div id="quizContainer" class="quiz-area content-section"></div>
        <div id="questionBankContainer" class="qb-area content-section"></div>
    `;
    showNotes(chapterName);
}

// --- 4. QUESTION BANK (UPDATED WITH IMAGE SUPPORT) ---
async function showQuestionBank(chapterName) {
    const qbArea = document.getElementById("questionBankContainer");
    document.getElementById("notesContainer").innerHTML = "";
    document.getElementById("quizContainer").innerHTML = "";
    qbArea.style.display = 'block';
    qbArea.innerHTML = `<p>Loading Question Bank...</p>`;

    try {
        const response = await fetch(`data/questionBank/${chapterName.trim()}.json`);
        if (!response.ok) throw new Error("File not found");
        const data = await response.json();
        renderQuestionBank(data, qbArea);
    } catch (err) {
        qbArea.innerHTML = `<p>No Question Bank found at <code>data/questionBank/${chapterName}.json</code></p>`;
    }
}

function renderQuestionBank(data, container) {
    container.innerHTML = `<h3 style="color:var(--primary); border-bottom:2px solid #eee; padding-bottom:10px;">Question Bank</h3>`;
    for (const category in data) {
        container.innerHTML += `<h4 style="margin-top:25px; color:var(--secondary); text-decoration:underline;">${category}</h4>`;
        data[category].forEach((item, index) => {
            // Check if diagram exists in JSON
            const qImageHTML = item.image ? 
                `<img src="${item.image}" style="display:block; max-width:100%; height:auto; border-radius:8px; margin:12px 0; border:1px solid #ddd;">` : "";

            const qWrapper = document.createElement('div');
            qWrapper.style = "margin-bottom: 15px; padding: 15px; border-radius: 8px; background: #fff; border: 1px solid #eaeaea; box-shadow: 0 2px 4px rgba(0,0,0,0.02);";
            qWrapper.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 15px;">
                    <div style="flex: 1;">
                        <p style="margin: 0;"><strong>Q${index + 1}:</strong> ${item.q}</p>
                        ${qImageHTML}
                    </div>
                    <button class="show-answer-btn" 
                            style="white-space: nowrap; padding: 6px 14px; background: var(--primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600;"
                            onclick="toggleQBAnswer(this)">
                        Show Answer
                    </button>
                </div>
                <div class="qp-answer hidden" 
                     style="margin-top: 12px; padding: 12px; background: #f0f7ff; border-left: 4px solid var(--primary); color: #004085; border-radius: 4px;">
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

// --- 5. INTERACTIVE QUIZ & PROGRESS (UPDATED WITH IMAGE SUPPORT) ---
function saveProgress(chapterName, score, total) {
    const key = getProgressKey();
    let progress = JSON.parse(localStorage.getItem(key)) || {};
    const percentage = Math.round((score / total) * 100);
    
    if (!progress[chapterName] || percentage > progress[chapterName].percent) {
        progress[chapterName] = {
            percent: percentage,
            score: score,
            total: total,
            date: new Date().toLocaleDateString()
        };
        localStorage.setItem(key, JSON.stringify(progress));
    }
}

async function startQuiz(chapterName) {
    const quizDiv = document.getElementById("quizContainer");
    document.getElementById("notesContainer").innerHTML = "";
    document.getElementById("questionBankContainer").innerHTML = "";
    quizDiv.style.display = 'block';
    quizDiv.innerHTML = `<p>Loading Quiz...</p>`;

    try {
        const response = await fetch(`data/quizzes/${chapterName.trim()}.json`);
        if (!response.ok) throw new Error("Quiz file not found");
        const questions = await response.json();
        renderInteractiveQuiz(questions, quizDiv, chapterName);
    } catch (err) {
        quizDiv.innerHTML = `<p style="color:red;">Error: Could not load quiz for ${chapterName}.</p>`;
    }
}

function renderInteractiveQuiz(questions, container, chapterName) {
    container.innerHTML = `<h2 style="text-align:center; margin-bottom:20px; color:var(--primary);">Interactive Quiz</h2>`;
    questions.forEach((item, index) => {
        // Check if diagram exists in JSON
        const imageHTML = item.image ? 
            `<img src="${item.image}" style="display:block; max-width:100%; height:auto; border-radius:8px; margin:15px 0; border:1px solid #eee;">` : "";

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

// --- 6. NOTES & DASHBOARD ---
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
        ${count > 0 ? `<button onclick="if(confirm('Clear progress for ${currentUser.name}?')){localStorage.removeItem('${key}'); showDashboard();}" 
                        style="margin-top:20px; color:#dc3545; border:none; background:none; cursor:pointer;">Reset My Stats</button>` : ''}`;
}

function showLoginAgain() {
    document.getElementById("app").classList.add('hidden');
    document.getElementById("loginScreen").classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', loadContentData);