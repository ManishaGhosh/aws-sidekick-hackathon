

const state = {
  screen: "home",       
  focusIndex: 0,        
  currentVideo: null,
  playbackTimer: null,
  quizFocus: 0,
  awaitingQuiz: null     
};

const els = {
  home: document.getElementById("screen-home"),
  player: document.getElementById("screen-player"),
  sidekick: document.getElementById("screen-sidekick"),
  grid: document.getElementById("library-grid"),
  playerBackdrop: document.getElementById("player-backdrop"),
  playerVideo: document.getElementById("player-video"),
  playerTitle: document.getElementById("player-title"),
  progressFill: document.getElementById("progress-fill"),
  sidekickTitle: document.getElementById("sidekick-video-title"),
  sidekickLog: document.getElementById("sidekick-log"),
  sidekickCards: document.getElementById("sidekick-cards"),
  sidekickQuiz: document.getElementById("sidekick-quiz"),
  sidekickInput: document.getElementById("sidekick-input"),
  loading: document.getElementById("loading")
};

// ===================== INIT =====================
(async function init() {
  await loadContent();
  renderLibrary();
  focusGridItem(0);
  document.addEventListener("keydown", onKeyDown);

  
  document.querySelectorAll(".suggestion-chip").forEach(chip => {
    chip.addEventListener("click", () => submitQuestion(chip.dataset.q));
  });
  els.sidekickInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && els.sidekickInput.value.trim()) {
      submitQuestion(els.sidekickInput.value.trim());
      els.sidekickInput.value = "";
    }
  });
})();

// =====================  HOME =====================
function renderLibrary() {
  els.grid.innerHTML = "";
  CONTENT_LIBRARY.forEach((video, i) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.index = i;
    card.innerHTML = `
      <div class="card-thumb"${video.thumbnail ? ` style="background-image: url('${video.thumbnail}')"` : ""}></div>
      <div class="card-body">
        <p class="card-title">${video.title}</p>
        <p class="card-meta">${video.category} · ${Math.round(video.durationSec / 60)} min</p>
      </div>
    `;
    card.addEventListener("click", () => playVideo(video));
    els.grid.appendChild(card);
  });
}

function focusGridItem(i) {
  const cards = els.grid.querySelectorAll(".card");
  cards.forEach(c => c.classList.remove("focused"));
  if (cards[i]) {
    cards[i].classList.add("focused");
    state.focusIndex = i;
  }
}

// ===================== SCREEN SWITCHING =====================
function showScreen(name) {
  [els.home, els.player, els.sidekick].forEach(s => s.classList.remove("active"));
  state.screen = name;
  if (name === "home") els.home.classList.add("active");
  if (name === "player") els.player.classList.add("active");
  if (name === "sidekick") {
    els.player.classList.add("active");
    els.sidekick.classList.add("active");
  }
}

// ===================== PLAYER =====================
function playVideo(video) {
  state.currentVideo = video;
  els.playerTitle.textContent = video.title;
  els.progressFill.style.width = "0%";
  els.playerVideo.src = video.video;
  els.playerVideo.load();
  showScreen("player");

  els.playerVideo.play().catch(err => console.warn("Video playback could not start:", err));
}

els.playerVideo.addEventListener("timeupdate", () => {
  if (!els.playerVideo.duration) return;
  els.progressFill.style.width = `${(els.playerVideo.currentTime / els.playerVideo.duration) * 100}%`;
});

// ===================== SIDEKICK OVERLAY =====================
function openSidekick() {
  if (!state.currentVideo) return;
  els.playerVideo.pause();
  els.sidekickTitle.textContent = "Now watching: " + state.currentVideo.title;
  els.sidekickLog.innerHTML = "";
  els.sidekickCards.innerHTML = "";
  els.sidekickQuiz.innerHTML = "";
  showScreen("sidekick");
  els.sidekick.classList.add("active");
  setTimeout(() => els.sidekickInput.focus(), 50);
}

function closeSidekick() {
  els.sidekick.classList.remove("active");
  showScreen("player");
  els.playerVideo.play().catch(err => console.warn("Video playback could not resume:", err));
}

function logEntry(who, text) {
  const div = document.createElement("div");
  div.className = "log-entry " + who;
  div.innerHTML = `<span class="who">${who === "user" ? "You" : "Sidekick"}</span>${text}`;
  els.sidekickLog.appendChild(div);
  els.sidekickLog.scrollTop = els.sidekickLog.scrollHeight;
}

function setLoading(on) {
  els.loading.classList.toggle("hidden", !on);
}

async function submitQuestion(question) {
  const video = state.currentVideo;
  if (!video) return;
  logEntry("user", question);
  els.sidekickCards.innerHTML = "";
  els.sidekickQuiz.innerHTML = "";

  const lower = question.toLowerCase();
  setLoading(true);
  try {
    if (lower.includes("quiz")) {
      const quiz = await quizAI(video);
      state.awaitingQuiz = quiz;
      logEntry("ai", "Here's a quick quiz based on what you just watched.");
      renderQuiz(quiz);
    } else if (lower.includes("show me") || lower.includes("other") || lower.includes("similar")) {
      const result = await exploreAI(video, question);
      logEntry("ai", "Here's a few related things:");
      renderCards(result.cards);
    } else {
      const answer = await askAI(video, question);
      logEntry("ai", answer);
    }
  } catch (err) {
    logEntry("ai", "Sorry, I couldn't reach the AI backend just now.");
    console.error(err);
  } finally {
    setLoading(false);
  }
}

function renderCards(cards) {
  els.sidekickCards.innerHTML = "";
  cards.forEach(c => {
    const div = document.createElement("div");
    div.className = "info-card";
    div.innerHTML = `<h4>${c.title}</h4><p>${c.detail}</p>`;
    els.sidekickCards.appendChild(div);
  });
}

function renderQuiz(quiz) {
  els.sidekickQuiz.innerHTML = "";
  quiz.questions.forEach((q, qi) => {
    const block = document.createElement("div");
    block.className = "quiz-q";
    block.innerHTML = `<p>${qi + 1}. ${q.question}</p>`;
    q.options.forEach((opt, oi) => {
      const btn = document.createElement("button");
      btn.className = "quiz-opt";
      btn.textContent = opt;
      btn.addEventListener("click", () => {
        btn.classList.add(oi === q.correctIndex ? "correct" : "incorrect");
        if (oi !== q.correctIndex) {
          block.children[q.correctIndex + 1]?.classList.add("correct");
        }
      });
      block.appendChild(btn);
    });
    els.sidekickQuiz.appendChild(block);
  });
}

// ===================== D-PAD / KEYBOARD NAVIGATION =====================

function onKeyDown(e) {
  if (state.screen === "home") return onKeyHome(e);
  if (state.screen === "player") return onKeyPlayer(e);
  if (state.screen === "sidekick") return onKeySidekick(e);
}

function onKeyHome(e) {
  const count = CONTENT_LIBRARY.length;
  const cols = 4;
  if (e.key === "ArrowRight") focusGridItem((state.focusIndex + 1) % count);
  if (e.key === "ArrowLeft") focusGridItem((state.focusIndex - 1 + count) % count);
  if (e.key === "ArrowDown") focusGridItem(Math.min(count - 1, state.focusIndex + cols));
  if (e.key === "ArrowUp") focusGridItem(Math.max(0, state.focusIndex - cols));
  if (e.key === "Enter") playVideo(CONTENT_LIBRARY[state.focusIndex]);
}

function onKeyPlayer(e) {
  if (e.key === "ArrowUp" || e.key === "Enter") openSidekick();
  if (e.key === "Backspace" || e.key === "Escape") {
    els.playerVideo.pause();
    showScreen("home");
  }
}

function onKeySidekick(e) {
  if (e.key === "Backspace" || e.key === "Escape") closeSidekick();

}
