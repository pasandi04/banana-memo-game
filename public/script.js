/**
 * ============================================
 * BANANA MEMORY GAME - FRONTEND
 * ============================================
 *
 * 3-STAGE SCREEN FLOW:
 * 1) Auth Section   → Login/Signup → Level Selection
 * 2) Level Section  → Pick level → Guidelines Section
 * 3) Game Section   → Play → Game Over + Leaderboard
 * Use showSection(sectionId) to hide all and show the selected one.
 */

const API_URL = window.location.origin;

// ============================================
// LEVEL CONFIGURATION OBJECT
// ============================================
// Defines time (ms), points per correct answer, and display name per level.
// Used for: timer duration, scoring, and dynamic guidelines content.
const levels = {
  easy:   { time: 5000, points: 1, name: "Easy",   timeDisplay: "5 seconds" },
  medium: { time: 3000, points: 2, name: "Medium", timeDisplay: "3 seconds" },
  hard:   { time: 2000, points: 3, name: "Hard",   timeDisplay: "2 seconds" }
};

// Map level key to numeric level (1, 2, 3) for backend/leaderboard
const LEVEL_KEY_TO_NUM = { easy: 1, medium: 2, hard: 3 };

const QUESTIONS_PER_GAME = 5;

// ============================================
// GAME STATE
// ============================================
let currentLevelKey = "easy";  
let currentScore = 0;
let questionsAnswered = 0;
let currentSolution = "";
let timerInterval = null;
let timerTimeout = null;

// ============================================
// SOUND SYSTEM
// ============================================
const sounds = {
  bgMusic: null,
  //ambience: null,
  //correct: null,
  //wrong: null
};
let soundOn = true;
let musicOn = true;
let volume = 0.7;

function loadSoundSettings() {
  try {
    soundOn = localStorage.getItem("banana_sound") !== "false";
    musicOn = localStorage.getItem("banana_music") !== "false";
    const v = localStorage.getItem("banana_volume");
    volume = v != null ? parseInt(v, 10) / 100 : 0.7;
  } catch (_) {}
}

function saveSoundSettings() {
  try {
    localStorage.setItem("banana_sound", String(soundOn));
    localStorage.setItem("banana_music", String(musicOn));
    localStorage.setItem("banana_volume", String(Math.round(volume * 100)));
  } catch (_) {}
}

function initSounds() {
  loadSoundSettings();
  try {
    sounds.bgMusic = new Audio("sounds/bg-music.mp3");
    sounds.bgMusic.loop = true;
    //sounds.ambience = new Audio("sounds/ambience.mp3");
    //sounds.ambience.loop = true;
    //sounds.ambience.volume = 0.15;
    //sounds.correct = new Audio("sounds/correct.mp3");
    //sounds.wrong = new Audio("sounds/wrong.mp3");
  } catch (e) {
    console.warn("Sound files not found - game will work without audio");
  }
}

function playBgMusic() {
  if (musicOn && sounds.bgMusic) {
    sounds.bgMusic.volume = volume * 0.3;
    sounds.bgMusic.play().catch(() => {});
  }
}

//function playAmbience() {
  //if (musicOn && sounds.ambience) {
    //sounds.ambience.volume = Math.min(0.15, volume * 0.2);
    //sounds.ambience.play().catch(() => {});
  //}
//}

//function playCorrect() {
  //if (soundOn && sounds.correct) {
    //sounds.correct.volume = volume;
    //sounds.correct.currentTime = 0;
   // sounds.correct.play().catch(() => {});
  //}
//}

//function playWrong() {
  //if (soundOn && sounds.wrong) {
    //sounds.wrong.volume = volume;
    //sounds.wrong.currentTime = 0;
    //sounds.wrong.play().catch(() => {});
  //}
//}

// ============================================
// AUTH HELPERS - JWT & localStorage
// ============================================
function getToken() {
  return localStorage.getItem("banana_jwt");
}

function getUsername() {
  return localStorage.getItem("banana_username");
}

function saveAuth(token, username) {
  localStorage.setItem("banana_jwt", token);
  localStorage.setItem("banana_username", username);
}

function clearAuth() {
  localStorage.removeItem("banana_jwt");
  localStorage.removeItem("banana_username");
}

function isLoggedIn() {
  return !!getToken();
}

// ============================================
// DOM ELEMENTS
// ============================================
const authSection = document.getElementById("authSection");
const levelSection = document.getElementById("levelSection");
const guideSection = document.getElementById("guideSection");
const gameSection = document.getElementById("gameSection");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const showLoginBtn = document.getElementById("show-login");
const showSignupBtn = document.getElementById("show-signup");
const authError = document.getElementById("auth-error");
const signupError = document.getElementById("signup-error");
const welcomeUsername = document.getElementById("welcome-username");
const logoutBtn = document.getElementById("logout-btn");
const levelCards = document.querySelectorAll(".level-card");
const guideLevelName = document.getElementById("guide-level-name");
const guideTime = document.getElementById("guide-time");
const guidePoints = document.getElementById("guide-points");
const guideStartBtn = document.getElementById("guide-start-btn");
const backToLevelsBtn = document.getElementById("back-to-levels");
const levelDisplay = document.getElementById("level-display");
const scoreDisplay = document.getElementById("score-display");
const timerDisplay = document.getElementById("timer-display");
const imageContainer = document.getElementById("image-container");
const bananaImage = document.getElementById("banana-image");
const countdownOverlay = document.getElementById("countdown-overlay");
const countdownNumber = document.getElementById("countdown-number");
const answerSection = document.getElementById("answer-section");
const answerInput = document.getElementById("answer-input");
const submitAnswerBtn = document.getElementById("submit-answer");
const resultMessage = document.getElementById("result-message");
const resultText = document.getElementById("result-text");
const resultSolution = document.getElementById("result-solution");
const gameOverSection = document.getElementById("game-over-section");
const finalScoreEl = document.getElementById("final-score");
const finalLevelEl = document.getElementById("final-level");
const playAgainBtn = document.getElementById("play-again-btn");
const leaderboardList = document.getElementById("leaderboard-list");
const gameUsername = document.getElementById("game-username");
const themeBtn = document.getElementById("theme-btn");
const themeLabel = document.querySelector(".theme-label");
const soundToggle = document.getElementById("sound-toggle");
const musicToggle = document.getElementById("music-toggle");
const volumeSlider = document.getElementById("volume-slider");
const confettiContainer = document.getElementById("confetti-container");

// ============================================
// SECTION SWITCHING LOGIC
// ============================================
// Hides all sections and shows only the one with the given ID.
// Only one section is visible at a time for clean 3-stage flow.
function showSection(sectionId) {
  const allSections = [authSection, levelSection, guideSection, gameSection];
  allSections.forEach((section) => {
    if (section) {
      section.classList.add("hidden");
      section.classList.remove("section-visible");
    }
  });

  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.remove("hidden");
    target.classList.add("section-visible");
  }
}

// ============================================
// AUTH - Login / Signup forms
// ============================================
function showLoginForm() {
  loginForm.classList.remove("hidden");
  signupForm.classList.add("hidden");
  showLoginBtn.classList.add("active");
  showSignupBtn.classList.remove("active");
  authError.textContent = "";
  signupError.textContent = "";
}

function showSignupForm() {
  loginForm.classList.add("hidden");
  signupForm.classList.remove("hidden");
  showLoginBtn.classList.remove("active");
  showSignupBtn.classList.add("active");
  authError.textContent = "";
  signupError.textContent = "";
}

async function handleLogin(e) {
  e.preventDefault();
  authError.textContent = "";

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      authError.textContent = data.error || "Login failed";
      return;
    }

    saveAuth(data.token, data.user.username);
    welcomeUsername.textContent = data.user.username;
    showSection("levelSection");  // After login → Level Selection
    if (musicOn) playAmbience();
  } catch (err) {
    authError.textContent = "Network error. Please try again.";
  }
}

async function handleSignup(e) {
  e.preventDefault();
  signupError.textContent = "";

  const username = document.getElementById("signup-username").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  try {
    const res = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      signupError.textContent = data.error || "Signup failed";
      return;
    }

    saveAuth(data.token, data.user.username);
    welcomeUsername.textContent = data.user.username;
    showSection("levelSection");  // After signup → Level Selection
    if (musicOn) playAmbience();
  } catch (err) {
    signupError.textContent = "Network error. Please try again.";
  }
}

function handleLogout() {
  clearAuth();
  showSection("authSection");
}

// ============================================
// LEVEL SELECTION - Click level card
// ============================================
// When user clicks a level: store selected level, update guidelines
// content dynamically, then show Guidelines section.
function handleLevelSelect(levelKey) {
  currentLevelKey = levelKey;
  const config = levels[levelKey];

  // Update guideline content based on selected level
  if (guideLevelName) guideLevelName.textContent = config.name;
  if (guideTime) guideTime.textContent = config.timeDisplay;
  if (guidePoints) guidePoints.textContent = config.points + " point" + (config.points > 1 ? "s" : "");

  showSection("guideSection");
}

// ============================================
// GUIDELINES - Start Game button
// ============================================
function handleStartFromGuide() {
  gameUsername.textContent = getUsername() || "Player";
  showSection("gameSection");
  startGame();
}

// ============================================
// GAME STATE HELPERS
// ============================================
function hideAllGameElements() {
  if (imageContainer) imageContainer.classList.add("hidden");
  if (answerSection) answerSection.classList.add("hidden");
  if (resultMessage) resultMessage.classList.add("hidden");
  if (gameOverSection) gameOverSection.classList.add("hidden");
  if (countdownOverlay) countdownOverlay.classList.add("hidden");
  if (answerInput) answerInput.value = "";
}

function updateStatsDisplay() {
  const config = levels[currentLevelKey];
  const levelNum = LEVEL_KEY_TO_NUM[currentLevelKey] || 1;
  if (levelDisplay) levelDisplay.textContent = levelNum;
  if (scoreDisplay) scoreDisplay.textContent = currentScore;
  if (timerDisplay) timerDisplay.textContent = config ? Math.round(config.time / 1000) : 5;
}

// ============================================
// FETCH PUZZLE - Backend proxy
// ============================================
async function fetchPuzzle() {
  const res = await fetch(`${API_URL}/puzzle`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch puzzle");
  return data;
}

// ============================================
// TIMER COUNTDOWN LOGIC
// ============================================
// Shows visible countdown (5,4,3,2,1 or 3,2,1 or 2,1) in stats area,
// plus optional big overlay. When timer reaches 0, hides image and runs onComplete.
function startImageTimer(onComplete) {
  const config = levels[currentLevelKey];
  const totalMs = config ? config.time : 5000;
  const seconds = Math.round(totalMs / 1000);
  let remaining = seconds;

  if (timerDisplay) timerDisplay.textContent = remaining;

  timerInterval = setInterval(() => {
    remaining--;
    if (timerDisplay) timerDisplay.textContent = remaining;
    if (remaining <= 0 && timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }, 1000);

  timerTimeout = setTimeout(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    onComplete();
  }, totalMs);
}

function clearTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (timerTimeout) {
    clearTimeout(timerTimeout);
    timerTimeout = null;
  }
}

// ============================================
// SAVE SCORE & LEADERBOARD
// ============================================
async function saveScore(score, levelReached) {
  const token = getToken();
  if (!token) return;
  try {
    await fetch(`${API_URL}/save-score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ score, levelReached })
    });
  } catch (err) {
    console.error("Failed to save score:", err);
  }
}

async function fetchLeaderboard() {
  try {
    const res = await fetch(`${API_URL}/leaderboard`);
    if (!res.ok) return [];
    return res.json();
  } catch (err) {
    console.error("Failed to fetch leaderboard:", err);
    return [];
  }
}

function displayLeaderboard(leaderboard) {
  if (!leaderboardList) return;
  leaderboardList.innerHTML = "";

  if (!leaderboard || leaderboard.length === 0) {
    leaderboardList.innerHTML = "<li>No scores yet. Be the first!</li>";
    return;
  }

  leaderboard.forEach((entry, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${i + 1}. ${entry.username}</span><span>${entry.score} pts</span>`;
    leaderboardList.appendChild(li);
  });
}

// ============================================
// RESULT & GAME FLOW
// ============================================
function showResult(isCorrect, solution) {
  if (resultMessage) resultMessage.classList.remove("hidden");
  if (resultText) {
    resultText.textContent = isCorrect ? "🎉 Correct!" : "😅 Wrong!";
    resultText.className = isCorrect ? "correct" : "wrong";
  }
  if (resultSolution) {
    resultSolution.textContent = isCorrect ? "" : `The answer was: ${solution}`;
    resultSolution.style.display = isCorrect ? "none" : "block";
  }
}

async function runOneRound() {
  hideAllGameElements();
  if (resultMessage) resultMessage.classList.add("hidden");

  try {
    const puzzle = await fetchPuzzle();
    currentSolution = puzzle.solution;
    bananaImage.src = puzzle.question;

    imageContainer.classList.remove("hidden");
    updateStatsDisplay();

    startImageTimer(() => {
      imageContainer.classList.add("hidden");
      answerSection.classList.remove("hidden");
      answerInput.value = "";
      answerInput.focus();
    });
  } catch (err) {
    alert(err.message || "Failed to load puzzle. Please try again.");
    if (guideStartBtn) guideStartBtn.disabled = false;
  }
}

function handleSubmitAnswer() {
  const userAnswer = answerInput.value.trim();
  const normalizedUser = String(userAnswer).trim().toLowerCase();
  const normalizedSolution = String(currentSolution).trim().toLowerCase();

  clearTimer();

  const config = levels[currentLevelKey];
  const pointsPerCorrect = config ? config.points : 1;
  const isCorrect = normalizedUser === normalizedSolution;

  if (isCorrect) {
    currentScore += pointsPerCorrect;
    playCorrect();
  } else {
    playWrong();
  }

  questionsAnswered++;
  updateStatsDisplay();
  answerSection.classList.add("hidden");
  showResult(isCorrect, currentSolution);

  if (questionsAnswered >= QUESTIONS_PER_GAME) {
    setTimeout(() => endGame(), 2000);
  } else {
    setTimeout(() => runOneRound(), 2000);
  }
}

// ============================================
// CONFETTI
// ============================================
function fireConfetti() {
  const colors = ["#ffb6c1", "#b565a7", "#98d8aa", "#ffd93d", "#6bcb77"];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "%";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
    piece.style.animationDelay = Math.random() * 0.5 + "s";
    piece.style.animationDuration = 2 + Math.random() * 2 + "s";
    confettiContainer.appendChild(piece);
    setTimeout(() => piece.remove(), 4000);
  }
}

// ============================================
// END GAME - Game state transition
// ============================================
async function endGame() {
  hideAllGameElements();
  finalScoreEl.textContent = currentScore;
  finalLevelEl.textContent = LEVEL_KEY_TO_NUM[currentLevelKey] || 1;
  gameOverSection.classList.remove("hidden");

  fireConfetti();

  await saveScore(currentScore, LEVEL_KEY_TO_NUM[currentLevelKey]);
  const leaderboard = await fetchLeaderboard();
  displayLeaderboard(leaderboard);

  if (guideStartBtn) guideStartBtn.disabled = false;
}

// ============================================
// START GAME - Begin 5-question session
// ============================================
function startGame() {
  currentScore = 0;
  questionsAnswered = 0;
  if (guideStartBtn) guideStartBtn.disabled = true;
  hideAllGameElements();
  runOneRound();
}

// ============================================
// PLAY AGAIN - Return to Level Selection
// ============================================
function handlePlayAgain() {
  gameOverSection.classList.add("hidden");
  showSection("levelSection");
}

// ============================================
// THEME & SOUND SETTINGS
// ============================================
function loadTheme() {
  const isDark = localStorage.getItem("banana_theme") === "dark";
  document.body.classList.toggle("theme-dark", isDark);
  if (themeBtn) themeBtn.textContent = isDark ? "🌙" : "☀";
  if (themeLabel) themeLabel.textContent = isDark ? "Jungle Night" : "Banana Day";
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("theme-dark");
  localStorage.setItem("banana_theme", isDark ? "dark" : "light");
  themeBtn.textContent = isDark ? "🌙" : "☀";
  themeLabel.textContent = isDark ? "Jungle Night" : "Banana Day";
}

function updateSoundUI() {
  soundToggle.textContent = soundOn ? "🔊" : "🔇";
  soundToggle.classList.toggle("muted", !soundOn);
  musicToggle.textContent = musicOn ? "🎵" : "🤫";
  musicToggle.classList.toggle("muted", !musicOn);
  if (volumeSlider) volumeSlider.value = Math.round(volume * 100);
  if (!musicOn && sounds.bgMusic) sounds.bgMusic.pause();
  if (!musicOn && sounds.ambience) sounds.ambience.pause();
}

// ============================================
// EVENT LISTENERS
// ============================================
showLoginBtn?.addEventListener("click", showLoginForm);
showSignupBtn?.addEventListener("click", showSignupForm);
loginForm?.addEventListener("submit", handleLogin);
signupForm?.addEventListener("submit", handleSignup);
logoutBtn?.addEventListener("click", handleLogout);

levelCards?.forEach((card) => {
  card.addEventListener("click", () => {
    const level = card.getAttribute("data-level");
    if (level && levels[level]) handleLevelSelect(level);
  });
});

guideStartBtn?.addEventListener("click", () => {
  handleStartFromGuide();
});

backToLevelsBtn?.addEventListener("click", () => {
  showSection("levelSection");
});

submitAnswerBtn?.addEventListener("click", () => handleSubmitAnswer());
answerInput?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleSubmitAnswer();
});

playAgainBtn?.addEventListener("click", handlePlayAgain);

themeBtn?.addEventListener("click", toggleTheme);
soundToggle?.addEventListener("click", () => {
  soundOn = !soundOn;
  saveSoundSettings();
  updateSoundUI();
});
musicToggle?.addEventListener("click", () => {
  musicOn = !musicOn;
  saveSoundSettings();
  updateSoundUI();
  if (musicOn) {
    playBgMusic();
    playAmbience();
  }
});
volumeSlider?.addEventListener("input", (e) => {
  volume = parseInt(e.target.value, 10) / 100;
  saveSoundSettings();
  if (sounds.bgMusic) sounds.bgMusic.volume = volume * 0.3;
  if (sounds.ambience) sounds.ambience.volume = Math.min(0.15, volume * 0.2);
});

// ============================================
// INIT - App startup
// ============================================
function init() {
  initSounds();
  loadTheme();
  updateSoundUI();

  if (isLoggedIn()) {
    welcomeUsername.textContent = getUsername() || "Player";
    showSection("levelSection");
  } else {
    showSection("authSection");
  }
}

init();
