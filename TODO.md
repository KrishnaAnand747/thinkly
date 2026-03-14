# Thinkly Assessment Feature Implementation Plan

## Approved Plan Steps (Breakdown)

### 1. Update index.html ✅
- [x] Add #btn-assessment button after #subjectButtons in sidebar
- [x] Add #examMode full-screen container after .container with timer, questions area, submit btn
- [x] Add Firebase SDK script in head

### 2. Update style.css ✅
- [x] Add styles for #examMode (full-screen, clean)
- [x] Add .exam-question, .timer-countdown, .exam-submit styles
- [x] Responsive exam mode

### 3. Update app.js ✅ (major changes)
- [x] Add global state: selectedSubject, examActive, examQuestions, examTimer=1200
- [x] Modify onClassChange(): show #btn-assessment, disable init
- [x] Add startAssessment(): hide UI, load QB JSON by subject_kebab (btn.text.toKebab()), random 10-15 Qs, renderExam()
- [x] renderExam(): Scrollable Q list with radios (generate 4 options: correct + 3 fakes)
- [x] submitExam(): Score calc, summary, save Firebase/local, back to dashboard
- [x] Add Firebase init/firestore save
- [x] Subject btn click: set selectedSubject, enable btn
- [x] Timer countdown (repurpose #header-timer)

### 4. Testing & Completion ✅
- [x] Test flow: class→subject→assessment→exam→submit
- [x] Check localStorage/Firebase save
- [x] Responsive mobile test

*Progress: Starting with HTML edits...*

