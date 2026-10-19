/**
 * StudyMate AI - Frontend Application Controller
 * Handles tabs, API calls, interactive quiz engine, 3D flashcards, and exam checklist.
 */

// Global Application State
const state = {
  currentTab: 'doubt',
  doubtLevel: 'beginner',
  currentQuiz: null,
  quizAnswers: {},
  quizTimerInterval: null,
  quizStartTime: null,
  quizSubmitted: false,
  flashcards: [],
  currentCardIndex: 0,
  cardMastery: {},
  examPlan: null,
  checklistState: {},
  customApiKey: sessionStorage.getItem('study_mate_api_key') || ''
};

// ==========================================
// INITIALIZATION & TAB SWITCHING
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  // Check health and display engine status
  checkSystemHealth();

  // Listen to keyboard shortcuts for flashcards (Space to flip, Arrows to navigate)
  document.addEventListener('keydown', (e) => {
    if (state.currentTab === 'flashcards' && state.flashcards.length > 0) {
      if (e.code === 'Space' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        flipCurrentCard();
      } else if (e.code === 'ArrowRight' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        nextFlashcard();
      } else if (e.code === 'ArrowLeft' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        prevFlashcard();
      }
    }
  });

  // Track word count on note textarea
  const noteContent = document.getElementById('noteContent');
  if (noteContent) {
    noteContent.addEventListener('input', () => {
      const words = noteContent.value.trim().split(/\s+/).filter(Boolean).length;
      document.getElementById('noteStats').innerText = `${words} words`;
    });
  }

  // Pre-fill custom API key input if stored
  if (state.customApiKey) {
    const keyInput = document.getElementById('customApiKeyInput');
    if (keyInput) keyInput.value = state.customApiKey;
  }
});

function switchTab(tabId) {
  state.currentTab = tabId;

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active-tab');
  });
  const activeBtn = document.getElementById(`tabBtn-${tabId}`);
  if (activeBtn) activeBtn.classList.add('active-tab');

  // Update module views
  document.querySelectorAll('.module-tab-content').forEach(el => {
    el.classList.add('hidden');
    el.classList.remove('block');
  });
  const activeModule = document.getElementById(`module-${tabId}`);
  if (activeModule) {
    activeModule.classList.remove('hidden');
    activeModule.classList.add('block');
  }

  // Re-create icons if Lucide is available
  if (window.lucide) lucide.createIcons();
}

async function checkSystemHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    const textEl = document.getElementById('engineStatusText');
    if (data.status === 'healthy') {
      textEl.innerText = data.engines.gemini ? 'Gemini AI Ready' : 'Smart Engine Ready';
    }
  } catch (err) {
    console.warn('Health check note:', err);
  }
}

// ==========================================
// SETTINGS & CUSTOM API KEY MODAL
// ==========================================

function openSettingsModal() {
  document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.add('hidden');
}

function saveCustomApiKey() {
  const val = document.getElementById('customApiKeyInput').value.trim();
  state.customApiKey = val;
  sessionStorage.setItem('study_mate_api_key', val);
  closeSettingsModal();
  alert(val ? 'Custom API Key saved for this session!' : 'Reset to default built-in AI engine.');
}

function getApiKey() {
  return state.customApiKey || undefined;
}

// ==========================================
// MODULE 1: AI DOUBT SOLVER
// ==========================================

function setDoubtLevel(level) {
  state.doubtLevel = level;
  ['beginner', 'academic', 'exam'].forEach(l => {
    const btn = document.getElementById(`doubtLevel-${l}`);
    if (btn) {
      if (l === level) btn.classList.add('active-level');
      else btn.classList.remove('active-level');
    }
  });
}

function loadDoubtPreset(question, level) {
  document.getElementById('doubtQuestion').value = question;
  setDoubtLevel(level);
  handleSolveDoubt();
}

async function handleSolveDoubt() {
  const question = document.getElementById('doubtQuestion').value.trim();
  const context = document.getElementById('doubtContext').value.trim();

  if (!question) {
    alert('Please enter a question to solve.');
    return;
  }

  // UI state: loading
  document.getElementById('doubtPlaceholder').classList.add('hidden');
  document.getElementById('doubtResult').classList.add('hidden');
  document.getElementById('doubtLoading').classList.remove('hidden');
  document.getElementById('doubtSubmitBtn').disabled = true;

  try {
    const res = await fetch('/api/doubt-solver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        context,
        level: state.doubtLevel,
        api_key: getApiKey()
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to solve doubt');

    renderDoubtResult(data);
  } catch (err) {
    alert(`Error: ${err.message}`);
    document.getElementById('doubtPlaceholder').classList.remove('hidden');
  } finally {
    document.getElementById('doubtLoading').classList.add('hidden');
    document.getElementById('doubtSubmitBtn').disabled = false;
  }
}

function renderDoubtResult(data) {
  document.getElementById('doubtTopicTitle').innerText = data.topic || 'Concept Explanation';
  document.getElementById('doubtTopicBadge').innerText = state.doubtLevel.toUpperCase();
  document.getElementById('doubtEngineTag').innerText = data.engine || 'Smart Engine';

  // Direct answer parsed with Markdown
  document.getElementById('doubtDirectAnswer').innerHTML = marked.parse(data.direct_answer || '');

  // Analogy
  document.getElementById('doubtAnalogy').innerText = data.analogy || 'No analogy provided.';

  // Steps
  const stepsList = document.getElementById('doubtStepsList');
  stepsList.innerHTML = '';
  (data.step_by_step || []).forEach(step => {
    const div = document.createElement('div');
    div.className = 'p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed font-medium';
    div.innerText = step;
    stepsList.appendChild(div);
  });

  // Mistakes
  const mistakesList = document.getElementById('doubtMistakesList');
  mistakesList.innerHTML = '';
  (data.common_mistakes || []).forEach(m => {
    const li = document.createElement('li');
    li.innerText = m;
    mistakesList.appendChild(li);
  });

  // Quick Tip
  document.getElementById('doubtQuickTip').innerText = data.quick_tip || 'Focus on foundational principles first.';

  // Follow up questions
  const followUpContainer = document.getElementById('doubtFollowUps');
  followUpContainer.innerHTML = '';
  (data.follow_up_questions || []).forEach(q => {
    const btn = document.createElement('button');
    btn.className = 'text-xs text-left px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition border border-indigo-200';
    btn.innerText = `→ ${q}`;
    btn.onclick = () => {
      document.getElementById('doubtQuestion').value = q;
      handleSolveDoubt();
    };
    followUpContainer.appendChild(btn);
  });

  document.getElementById('doubtResult').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

// ==========================================
// MODULE 2: NOTES SUMMARIZER
// ==========================================

async function handlePdfUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusBox = document.getElementById('pdfUploadStatus');
  const statusText = document.getElementById('pdfStatusText');
  statusBox.classList.remove('hidden');
  statusText.innerText = `Extracting text from "${file.name}"...`;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/extract-pdf', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to extract PDF');

    document.getElementById('noteContent').value = data.text;
    statusText.innerText = `Loaded ${data.page_count} page(s) (${data.word_count} words) from ${file.name}`;
    document.getElementById('noteStats').innerText = `${data.word_count} words`;
  } catch (err) {
    alert(`PDF Error: ${err.message}`);
    statusBox.classList.add('hidden');
  }
}

function clearUploadedPdf() {
  document.getElementById('pdfFileInput').value = '';
  document.getElementById('pdfUploadStatus').classList.add('hidden');
}

async function loadSampleNotes(topic) {
  try {
    const res = await fetch(`/api/sample-notes/${topic}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    document.getElementById('noteContent').value = data.content;
    document.getElementById('noteStats').innerText = `${data.word_count} words`;

    const statusBox = document.getElementById('pdfUploadStatus');
    statusBox.classList.remove('hidden');
    document.getElementById('pdfStatusText').innerText = `Loaded sample "${topic.replace('_', ' ').toUpperCase()}" notes (${data.word_count} words)`;
  } catch (err) {
    alert(`Could not load sample: ${err.message}`);
  }
}

async function handleSummarizeNotes() {
  const content = document.getElementById('noteContent').value.trim();
  const focus = document.getElementById('summaryFocus').value;

  if (!content) {
    alert('Please enter or upload study notes first (or click "Sample OS").');
    return;
  }

  document.getElementById('summaryPlaceholder').classList.add('hidden');
  document.getElementById('summaryResult').classList.add('hidden');
  document.getElementById('summaryLoading').classList.remove('hidden');
  document.getElementById('summarizeBtn').disabled = true;

  try {
    const res = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        focus_area: focus,
        api_key: getApiKey()
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to summarize notes');

    renderSummaryResult(data);
  } catch (err) {
    alert(`Error: ${err.message}`);
    document.getElementById('summaryPlaceholder').classList.remove('hidden');
  } finally {
    document.getElementById('summaryLoading').classList.add('hidden');
    document.getElementById('summarizeBtn').disabled = false;
  }
}

function renderSummaryResult(data) {
  document.getElementById('summaryTitle').innerText = data.title || 'Study Summary';
  document.getElementById('summaryExecText').innerHTML = marked.parse(data.executive_summary || '');

  // Key concepts tags
  const conceptsContainer = document.getElementById('summaryKeyConcepts');
  conceptsContainer.innerHTML = '';
  (data.key_concepts || []).forEach(kc => {
    const badge = document.createElement('span');
    badge.className = 'px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200';
    badge.innerText = kc.concept || kc;
    badge.title = kc.summary || '';
    conceptsContainer.appendChild(badge);
  });

  // Definitions
  const defsContainer = document.getElementById('summaryDefinitionsList');
  defsContainer.innerHTML = '';
  (data.definitions || []).forEach(d => {
    const card = document.createElement('div');
    card.className = 'p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1';
    card.innerHTML = `<span class="font-bold text-slate-900 block">${d.term}</span><span class="text-slate-600 block leading-relaxed">${d.meaning}</span>`;
    defsContainer.appendChild(card);
  });

  // Revision Points
  const revList = document.getElementById('summaryRevisionList');
  revList.innerHTML = '';
  (data.revision_points || []).forEach(pt => {
    const li = document.createElement('li');
    li.className = 'flex items-start space-x-2 text-xs text-slate-700 font-medium leading-relaxed';
    li.innerHTML = `<span class="text-emerald-500 font-bold mt-0.5">•</span><span>${pt}</span>`;
    revList.appendChild(li);
  });

  // Cheat Sheet
  const cheatList = document.getElementById('summaryCheatSheetList');
  cheatList.innerHTML = '';
  (data.cheat_sheet || []).forEach(cs => {
    const div = document.createElement('div');
    div.className = 'p-2 bg-white rounded border border-indigo-100 flex items-center space-x-2';
    div.innerHTML = `<span class="text-indigo-600 font-bold">⚡</span><span>${cs}</span>`;
    cheatList.appendChild(div);
  });

  document.getElementById('summaryResult').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function copySummaryToClipboard() {
  const title = document.getElementById('summaryTitle').innerText;
  const exec = document.getElementById('summaryExecText').innerText;
  navigator.clipboard.writeText(`${title}\n\n${exec}`).then(() => {
    alert('Summary copied to clipboard!');
  });
}

// ==========================================
// MODULE 3: AUTOMATIC QUIZ GENERATOR
// ==========================================

function syncNotesToQuiz() {
  const note = document.getElementById('noteContent').value;
  if (!note) {
    alert('No notes in Summarizer tab yet. Load "Sample OS" or paste notes first.');
    return;
  }
  document.getElementById('quizContextText').value = note;
}

async function handleGenerateQuiz() {
  const content = document.getElementById('quizContextText').value.trim() || document.getElementById('noteContent').value.trim();
  const numQuestions = document.getElementById('quizNumQuestions').value;
  const difficulty = document.getElementById('quizDifficulty').value;

  if (!content) {
    alert('Please paste study notes or click "Use Notes from Summarizer Tab".');
    return;
  }

  document.getElementById('quizPlaceholder').classList.add('hidden');
  document.getElementById('quizContainer').classList.add('hidden');
  document.getElementById('quizLoading').classList.remove('hidden');
  document.getElementById('generateQuizBtn').disabled = true;

  try {
    const res = await fetch('/api/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        num_questions: numQuestions,
        difficulty,
        api_key: getApiKey()
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate quiz');

    startQuiz(data);
  } catch (err) {
    alert(`Error: ${err.message}`);
    document.getElementById('quizPlaceholder').classList.remove('hidden');
  } finally {
    document.getElementById('quizLoading').classList.add('hidden');
    document.getElementById('generateQuizBtn').disabled = false;
  }
}

function startQuiz(quizData) {
  state.currentQuiz = quizData;
  state.quizAnswers = {};
  state.quizSubmitted = false;
  state.quizStartTime = Date.now();

  // Reset timer
  clearInterval(state.quizTimerInterval);
  state.quizTimerInterval = setInterval(updateQuizTimer, 1000);

  document.getElementById('quizActiveTitle').innerText = quizData.quiz_title || 'Active Quiz';
  document.getElementById('quizDifficultyBadge').innerText = quizData.difficulty || 'Medium';
  document.getElementById('quizScoreCard').classList.add('hidden');
  document.getElementById('quizActionsRow').classList.remove('hidden');

  renderQuizQuestions();
  updateQuizAnsweredCount();

  document.getElementById('quizContainer').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function updateQuizTimer() {
  if (!state.quizStartTime) return;
  const elapsed = Math.floor((Date.now() - state.quizStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  const timerEl = document.getElementById('quizTimerText');
  if (timerEl) timerEl.innerText = `${minutes}:${seconds}`;
}

function renderQuizQuestions() {
  const container = document.getElementById('quizQuestionsList');
  container.innerHTML = '';

  state.currentQuiz.questions.forEach((q, qIndex) => {
    const card = document.createElement('div');
    card.id = `quizCard-${qIndex}`;
    card.className = 'p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3';

    // Question header
    const header = document.createElement('div');
    header.className = 'flex items-start justify-between';
    header.innerHTML = `
      <h4 class="text-sm font-bold text-slate-900 leading-snug">
        <span class="text-indigo-600 font-extrabold mr-1">Q${qIndex + 1}.</span> ${q.question}
      </h4>
    `;
    card.appendChild(header);

    // Options list
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'space-y-2 mt-2';

    q.options.forEach((opt, optIndex) => {
      const optBtn = document.createElement('div');
      optBtn.id = `quizOpt-${qIndex}-${optIndex}`;
      optBtn.className = 'quiz-option p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 cursor-pointer flex items-center space-x-3 transition text-xs text-slate-800 font-medium';
      optBtn.onclick = () => selectQuizOption(qIndex, optIndex);

      const letter = String.fromCharCode(65 + optIndex);
      optBtn.innerHTML = `
        <span class="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center font-bold text-[11px] text-slate-500 opt-letter">
          ${letter}
        </span>
        <span class="flex-1">${opt}</span>
      `;
      optionsContainer.appendChild(optBtn);
    });

    card.appendChild(optionsContainer);

    // Explanation Box (Hidden until submit)
    const explanationBox = document.createElement('div');
    explanationBox.id = `quizExplanation-${qIndex}`;
    explanationBox.className = 'hidden p-3.5 rounded-xl text-xs space-y-1 mt-3';
    card.appendChild(explanationBox);

    container.appendChild(card);
  });
}

function selectQuizOption(qIndex, optIndex) {
  if (state.quizSubmitted) return;

  state.quizAnswers[qIndex] = optIndex;

  // Update styling
  state.currentQuiz.questions[qIndex].options.forEach((_, idx) => {
    const el = document.getElementById(`quizOpt-${qIndex}-${idx}`);
    if (el) {
      if (idx === optIndex) {
        el.className = 'quiz-option p-3 rounded-xl border-2 border-indigo-600 bg-indigo-50/70 cursor-pointer flex items-center space-x-3 transition text-xs text-indigo-950 font-bold';
      } else {
        el.className = 'quiz-option p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 cursor-pointer flex items-center space-x-3 transition text-xs text-slate-800 font-medium';
      }
    }
  });

  updateQuizAnsweredCount();
}

function updateQuizAnsweredCount() {
  const answered = Object.keys(state.quizAnswers).length;
  const total = state.currentQuiz ? state.currentQuiz.questions.length : 0;
  document.getElementById('quizAnsweredCountText').innerText = `${answered} of ${total} answered`;
}

function submitQuiz() {
  if (state.quizSubmitted) return;
  state.quizSubmitted = true;
  clearInterval(state.quizTimerInterval);

  let score = 0;
  const total = state.currentQuiz.questions.length;

  state.currentQuiz.questions.forEach((q, qIndex) => {
    const userSelected = state.quizAnswers[qIndex];
    const isCorrect = userSelected === q.correct_index;
    if (isCorrect) score++;

    // Highlight options
    q.options.forEach((_, optIndex) => {
      const el = document.getElementById(`quizOpt-${qIndex}-${optIndex}`);
      if (!el) return;

      if (optIndex === q.correct_index) {
        el.className = 'p-3 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-950 font-bold text-xs flex items-center space-x-3';
      } else if (optIndex === userSelected && !isCorrect) {
        el.className = 'p-3 rounded-xl border-2 border-rose-500 bg-rose-50 text-rose-950 font-bold text-xs flex items-center space-x-3';
      } else {
        el.className = 'p-3 rounded-xl border border-slate-200 bg-slate-100/50 text-slate-400 text-xs flex items-center space-x-3 opacity-60';
      }
    });

    // Reveal explanation
    const expBox = document.getElementById(`quizExplanation-${qIndex}`);
    if (expBox) {
      expBox.classList.remove('hidden');
      if (isCorrect) {
        expBox.className = 'p-3.5 rounded-xl text-xs space-y-1 bg-emerald-50 border border-emerald-200 text-emerald-900';
        expBox.innerHTML = `<strong>✓ Correct:</strong> ${q.explanation}`;
      } else {
        expBox.className = 'p-3.5 rounded-xl text-xs space-y-1 bg-rose-50 border border-rose-200 text-rose-900';
        expBox.innerHTML = `<strong>✗ Incorrect (Correct is Option ${String.fromCharCode(65 + q.correct_index)}):</strong> ${q.explanation}`;
      }
    }
  });

  // Show score card
  const percent = Math.round((score / total) * 100);
  const scoreCard = document.getElementById('quizScoreCard');
  scoreCard.classList.remove('hidden');

  document.getElementById('quizScoreCircle').innerText = `${percent}%`;
  document.getElementById('quizScoreSubtitle').innerText = `You scored ${score} out of ${total} questions correctly in ${document.getElementById('quizTimerText').innerText}.`;

  if (percent >= 80) {
    document.getElementById('quizScoreTitle').innerText = '🎉 Outstanding Mastery!';
  } else if (percent >= 50) {
    document.getElementById('quizScoreTitle').innerText = '👍 Good Effort - Review Explanations!';
  } else {
    document.getElementById('quizScoreTitle').innerText = '📚 Needs Additional Practice!';
  }

  document.getElementById('quizActionsRow').classList.add('hidden');
  scoreCard.scrollIntoView({ behavior: 'smooth' });
}

function retakeQuiz() {
  if (state.currentQuiz) {
    startQuiz(state.currentQuiz);
  }
}

// ==========================================
// MODULE 4: FLASHCARD GENERATOR
// ==========================================

function syncNotesToFlashcards() {
  const note = document.getElementById('noteContent').value;
  if (!note) {
    alert('No notes in Summarizer tab yet. Load "Sample OS" or paste notes first.');
    return;
  }
  document.getElementById('flashcardContextText').value = note;
}

async function handleGenerateFlashcards() {
  const content = document.getElementById('flashcardContextText').value.trim() || document.getElementById('noteContent').value.trim();
  const numCards = document.getElementById('flashcardCount').value;

  if (!content) {
    alert('Please paste study material or click "Use Notes from Summarizer Tab".');
    return;
  }

  document.getElementById('flashcardPlaceholder').classList.add('hidden');
  document.getElementById('flashcardStage').classList.add('hidden');
  document.getElementById('flashcardLoading').classList.remove('hidden');
  document.getElementById('generateFlashcardsBtn').disabled = true;

  try {
    const res = await fetch('/api/generate-flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        num_cards: numCards,
        api_key: getApiKey()
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate flashcards');

    state.flashcards = data.flashcards || [];
    state.currentCardIndex = 0;
    state.cardMastery = {};

    renderActiveFlashcard();
    updateMasteryProgress();

    document.getElementById('flashcardStage').classList.remove('hidden');
  } catch (err) {
    alert(`Error: ${err.message}`);
    document.getElementById('flashcardPlaceholder').classList.remove('hidden');
  } finally {
    document.getElementById('flashcardLoading').classList.add('hidden');
    document.getElementById('generateFlashcardsBtn').disabled = false;
  }
}

function renderActiveFlashcard() {
  const card = state.flashcards[state.currentCardIndex];
  if (!card) return;

  // Reset flip to front
  const flipEl = document.getElementById('activeFlipCard');
  flipEl.classList.remove('is-flipped');

  document.getElementById('cardCounter').innerText = `Card ${state.currentCardIndex + 1} of ${state.flashcards.length}`;
  document.getElementById('cardCategory').innerText = card.category || 'General';
  document.getElementById('cardFrontText').innerText = card.front;
  document.getElementById('cardBackText').innerText = card.back;

  if (window.lucide) lucide.createIcons();
}

function flipCurrentCard() {
  const flipEl = document.getElementById('activeFlipCard');
  flipEl.classList.toggle('is-flipped');
}

function nextFlashcard() {
  if (state.flashcards.length === 0) return;
  state.currentCardIndex = (state.currentCardIndex + 1) % state.flashcards.length;
  renderActiveFlashcard();
}

function prevFlashcard() {
  if (state.flashcards.length === 0) return;
  state.currentCardIndex = (state.currentCardIndex - 1 + state.flashcards.length) % state.flashcards.length;
  renderActiveFlashcard();
}

function shuffleFlashcards() {
  for (let i = state.flashcards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.flashcards[i], state.flashcards[j]] = [state.flashcards[j], state.flashcards[i]];
  }
  state.currentCardIndex = 0;
  renderActiveFlashcard();
}

function markCardMastery(isMastered) {
  const card = state.flashcards[state.currentCardIndex];
  if (!card) return;

  state.cardMastery[card.id || state.currentCardIndex] = isMastered;
  updateMasteryProgress();

  // Auto advance to next card
  setTimeout(() => {
    nextFlashcard();
  }, 200);
}

function updateMasteryProgress() {
  const total = state.flashcards.length;
  if (total === 0) return;

  const mastered = Object.values(state.cardMastery).filter(Boolean).length;
  const percent = Math.round((mastered / total) * 100);

  document.getElementById('flashcardMasteryBar').style.width = `${percent}%`;
  document.getElementById('flashcardMasteryText').innerText = `${mastered} of ${total} Mastered`;
  document.getElementById('flashcardMasteryPercent').innerText = `${percent}%`;
}

function exportFlashcardsJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.flashcards, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "studymate_flashcards.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// ==========================================
// MODULE 5: EXAM PREPARATION MODE
// ==========================================

async function handleGenerateExamPlan() {
  const subject = document.getElementById('examSubject').value.trim();
  const topics = document.getElementById('examTopics').value.trim();
  const availableTime = document.getElementById('examTimeAvailable').value;
  const targetGoal = document.getElementById('examTargetGoal').value;

  if (!topics) {
    alert('Please enter at least a few syllabus topics to prepare.');
    return;
  }

  document.getElementById('examPlaceholder').classList.add('hidden');
  document.getElementById('examResult').classList.add('hidden');
  document.getElementById('examLoading').classList.remove('hidden');
  document.getElementById('generatePlanBtn').disabled = true;

  try {
    const res = await fetch('/api/exam-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        topics,
        available_time: availableTime,
        target_goal: targetGoal,
        api_key: getApiKey()
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate exam plan');

    renderExamPlan(data);
  } catch (err) {
    alert(`Error: ${err.message}`);
    document.getElementById('examPlaceholder').classList.remove('hidden');
  } finally {
    document.getElementById('examLoading').classList.add('hidden');
    document.getElementById('generatePlanBtn').disabled = false;
  }
}

function renderExamPlan(data) {
  state.examPlan = data;
  state.checklistState = {};

  document.getElementById('planSubjectTitle').innerText = `${data.subject || 'Subject'} Revision Roadmap`;
  document.getElementById('planOverviewText').innerHTML = marked.parse(data.strategy_overview || '');
  document.getElementById('planPomodoroText').innerText = data.pomodoro_routine || '50 min study + 10 min break';

  // Schedule phases
  const scheduleContainer = document.getElementById('planScheduleList');
  scheduleContainer.innerHTML = '';

  (data.daily_schedule || []).forEach(phase => {
    const div = document.createElement('div');
    div.className = 'p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2';

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between text-xs font-bold text-slate-800';
    header.innerHTML = `<span>${phase.phase}</span><span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">${phase.allocated_time}</span>`;
    div.appendChild(header);

    const actionsUl = document.createElement('ul');
    actionsUl.className = 'space-y-1 text-xs text-slate-600 list-disc list-inside';
    (phase.action_items || []).forEach(act => {
      const li = document.createElement('li');
      li.innerText = act;
      actionsUl.appendChild(li);
    });
    div.appendChild(actionsUl);

    scheduleContainer.appendChild(div);
  });

  // Interactive Checklist
  const checklistContainer = document.getElementById('planChecklistItems');
  checklistContainer.innerHTML = '';

  (data.checklist || []).forEach(item => {
    state.checklistState[item.id] = false;

    const row = document.createElement('div');
    row.id = `checklistRow-${item.id}`;
    row.className = 'p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer select-none';
    row.onclick = () => toggleChecklistItem(item.id);

    const badgeColor = item.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200';

    row.innerHTML = `
      <div class="flex items-center space-x-3">
        <input type="checkbox" id="check-${item.id}" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" onclick="event.stopPropagation(); toggleChecklistItem(${item.id})">
        <span class="text-xs font-medium text-slate-800" id="checkLabel-${item.id}">${item.topic}</span>
      </div>
      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeColor}">${item.priority} Yield</span>
    `;

    checklistContainer.appendChild(row);
  });

  // Tips
  const tipsList = document.getElementById('planTipsList');
  tipsList.innerHTML = '';
  (data.exam_day_tips || []).forEach(tip => {
    const li = document.createElement('li');
    li.innerText = tip;
    tipsList.appendChild(li);
  });

  updateChecklistProgress();
  document.getElementById('examResult').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function toggleChecklistItem(id) {
  state.checklistState[id] = !state.checklistState[id];
  const checkbox = document.getElementById(`check-${id}`);
  const label = document.getElementById(`checkLabel-${id}`);
  const row = document.getElementById(`checklistRow-${id}`);

  if (checkbox) checkbox.checked = state.checklistState[id];
  if (label) {
    if (state.checklistState[id]) {
      label.classList.add('line-through', 'text-slate-400');
      row.classList.add('bg-slate-50/50');
    } else {
      label.classList.remove('line-through', 'text-slate-400');
      row.classList.remove('bg-slate-50/50');
    }
  }

  updateChecklistProgress();
}

function updateChecklistProgress() {
  const total = Object.keys(state.checklistState).length;
  if (total === 0) return;

  const checked = Object.values(state.checklistState).filter(Boolean).length;
  const percent = Math.round((checked / total) * 100);

  document.getElementById('checklistProgressBar').style.width = `${percent}%`;
  document.getElementById('checklistCountText').innerText = `${checked} of ${total} Concepts Checked`;
  document.getElementById('checklistPercentText').innerText = `${percent}% Ready`;
}

