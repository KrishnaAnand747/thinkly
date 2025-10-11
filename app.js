let syllabus = {};
let notes = {};
let quizzes = {};
let practiceQP = {};

async function loadContent() {
  const response = await fetch("content.json");
  const data = await response.json();
  syllabus = data.syllabus;
  notes = data.notes;
  quizzes = data.quizzes;
  practiceQP = data.practiceQP || {};
}

function getProgress() {
  return JSON.parse(localStorage.getItem("quizProgress") || "{}");
}

function saveProgress(progress) {
  localStorage.setItem("quizProgress", JSON.stringify(progress));
}

function goHome() {
  document.querySelector(".main").style.display = "flex";
  document.getElementById("dashboard").style.display = "none";
}

function showSubjects() {
  const selectedClass = document.getElementById("classSelect").value;
  let html = "";
  if (selectedClass) {
    html += `<button class="subject-btn" onclick="showChapters('math')">📐 Math</button>`;
    html += `<button class="subject-btn" onclick="showChapters('science')">🔬 Science</button>`;
  }
  document.getElementById("subjects").innerHTML = html;
  document.getElementById("chapters").innerHTML = "";
}

function showChapters(subject) {
  const selectedClass = document.getElementById("classSelect").value;
  const chapters = syllabus[selectedClass][subject];
  const progress = getProgress();

  let html = "<h3>Chapters</h3>";
  chapters.forEach(ch => {
    let status = "";
    if (progress[ch]) {
      status =
        progress[ch].bestScore >= 80
          ? `<span class="status completed">⭐ Completed</span>`
          : `<span class="status in-progress">🔄 In Progress</span>`;
    }
    html += `<button class="chapter-btn" onclick="showChapterContent('${ch}')">${ch}</button>${status}`;
  });
  document.getElementById("chapters").innerHTML = html;
}

// ----------- MAIN CHAPTER VIEW -------------
function showChapterContent(chapterName) {
  const contentDiv = document.getElementById("chapterContent");
  contentDiv.innerHTML = `
    <h2>${chapterName}</h2>
    <div class="chapter-buttons">
      <button class="quiz-btn" onclick="showNotes('${chapterName}')">View Notes 📘</button>
      <button class="quiz-btn" onclick="startQuiz('${chapterName}')">Take Quiz 📝</button>
      <button class="quiz-btn" onclick="showPracticeQP('${chapterName}')">Practice Questions 🧮</button>
    </div>
    <div id="notes" class="content-section"></div>
    <div id="quiz" class="content-section"></div>
    <div id="practiceQP" class="content-section"></div>
  `;
}

// ----------- NOTES -------------
function showNotes(chapterName) {
  const notesDiv = document.getElementById("notes");
  const quizDiv = document.getElementById("quiz");
  const qpDiv = document.getElementById("practiceQP");

  // Hide other sections when notes are shown
  quizDiv.innerHTML = "";
  qpDiv.innerHTML = "";

  const content = notes[chapterName];
  if (!content) {
    notesDiv.innerHTML = `<p>📖 Notes for this chapter are coming soon!</p>`;
    return;
  }

  if (content.endsWith(".html")) {
    fetch(content)
      .then(res => res.text())
      .then(html => (notesDiv.innerHTML = html))
      .catch(() => (notesDiv.innerHTML = "<p>Unable to load notes.</p>"));
  } else {
    notesDiv.innerHTML = content;
  }
}

// ----------- QUIZ -------------
function startQuiz(chapterName) {
  const notesDiv = document.getElementById("notes");
  const quizDiv = document.getElementById("quiz");
  const qpDiv = document.getElementById("practiceQP");

  // Clear other sections
  notesDiv.innerHTML = "";
  qpDiv.innerHTML = "";

  const questions = quizzes[chapterName] || [];
  if (questions.length === 0) {
    quizDiv.innerHTML = "<p>No quiz available yet.</p>";
    return;
  }

  let html = "<h4>Quiz</h4>";
  questions.forEach((q, i) => {
    html += `<div class="quiz-question"><p><b>Q${i + 1}:</b> ${q.q}</p>`;
    q.options.forEach((opt, j) => {
      html += `<label class="quiz-option"><input type="radio" name="q${i}" value="${j}"> ${opt}</label>`;
    });
    html += "</div>";
  });
  html += `<button class="quiz-btn" onclick="submitQuiz('${chapterName}')">Submit Quiz</button>`;
  quizDiv.innerHTML = html;
}

function submitQuiz(chapterName) {
  const quizDiv = document.getElementById("quiz");
  const questions = quizzes[chapterName] || [];
  let score = 0,
    feedback = "";

  questions.forEach((q, i) => {
    const selected = document.querySelector(`input[name="q${i}"]:checked`);
    const isCorrect = selected && parseInt(selected.value) === q.answer;
    if (isCorrect) score++;
    feedback += `<div class="quiz-question ${isCorrect ? "correct" : "wrong"}">
        <p><b>Q${i + 1}:</b> ${q.q}</p>
        <p>Your Answer: ${selected ? q.options[selected.value] : "Not answered"}</p>
        <p>Correct Answer: ${q.options[q.answer]}</p>
        <p><i>Explanation: ${q.explanation}</i></p>
      </div>`;
  });

  const percent = Math.round((score / questions.length) * 100);
  const progress = getProgress();
  if (!progress[chapterName] || percent > progress[chapterName].bestScore) {
    progress[chapterName] = { bestScore: percent };
    saveProgress(progress);
  }

  quizDiv.innerHTML = `
    <div class="result">You scored ${score}/${questions.length} (${percent}%).</div>
    ${feedback}
  `;
}

// ----------- PRACTICE QUESTIONS -------------
function showPracticeQP(chapterName) {
  const notesDiv = document.getElementById("notes");
  const quizDiv = document.getElementById("quiz");
  const qpDiv = document.getElementById("practiceQP");

  // Clear other sections
  notesDiv.innerHTML = "";
  quizDiv.innerHTML = "";

  const questions = practiceQP[chapterName] || [];
  if (questions.length === 0) {
    qpDiv.innerHTML = "<p>No practice questions available yet.</p>";
    return;
  }

  let html = "<h4>Practice Question Paper</h4><ol>";
  questions.forEach(q => {
    html += `<li>${q.q} <span style="color:gray">[${q.marks} marks]</span></li>`;
  });
  html += "</ol>";
  qpDiv.innerHTML = html;
}

// ----------- DASHBOARD -------------
function showDashboard() {
  document.querySelector(".main").style.display = "none";
  document.getElementById("dashboard").style.display = "block";

  const progress = getProgress();
  let html = "<table><tr><th>Chapter</th><th>Best Score</th><th>Status</th></tr>";
  for (let chapter in progress) {
    const best = progress[chapter].bestScore;
    const status = best >= 80 ? "✅ Completed" : "⏳ In Progress";
    html += `<tr><td>${chapter}</td><td>${best}%</td><td>${status}</td></tr>`;
  }
  html += "</table>";
  document.getElementById("progressTable").innerHTML =
    html || "<p>No progress yet. Start a quiz!</p>";
}

window.onload = loadContent;
