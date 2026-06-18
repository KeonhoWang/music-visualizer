// ── Audio Setup ──
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioCtx.createAnalyser();
const gainNode = audioCtx.createGain();
analyser.fftSize = 1024;
analyser.smoothingTimeConstant = 0.85;
gainNode.connect(audioCtx.destination);
analyser.connect(gainNode);

const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

// ── Canvas ──
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// ── State ──
let audioBuffer = null;
let sourceNode = null;
let startTime = 0;
let pauseOffset = 0;
let isPlaying = false;
let currentMode = "bars";
let particles = [];
let hue = 0;
let lastBeat = 0;
let beatCooldown = 300;
let primaryColor = "#e94560";
let sleepTimer = null;
let sleepMins = null;
let sleepStart = null;
let lyrics = [];
let lyricsMode = "beat";
let currentLyric = 0;
let lastBeatLyric = 0;
let playlist = [];
let currentTrack = 0;

// ── UI ──
const fileInput = document.getElementById("file-input");
const playBtn = document.getElementById("play-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const progressFill = document.getElementById("progress-fill");
const timeDisplay = document.getElementById("time-display");
const volumeSlider = document.getElementById("volume-slider");
const songName = document.getElementById("song-name");
const songArtist = document.getElementById("song-artist");
const modeBtns = document.querySelectorAll(".mode-btn");
const progressBar = document.getElementById("progress-bar");
const beatFlash = document.getElementById("beat-flash");
const screenshotBtn = document.getElementById("screenshot-btn");
const themeDots = document.querySelectorAll(".theme-dot");
const playlistToggle = document.getElementById("playlist-toggle");
const playlistPanel = document.getElementById("playlist-panel");
const playlistClose = document.getElementById("playlist-close");
const playlistItems = document.getElementById("playlist-items");
const timerBtn = document.getElementById("timer-btn");
const timerModal = document.getElementById("timer-modal");
const timerClose = document.getElementById("timer-close");
const timerOpts = document.querySelectorAll(".timer-opt");
const timerStatus = document.getElementById("timer-status");
const timerCancel = document.getElementById("timer-cancel");
const lyricsBtn = document.getElementById("lyrics-btn");
const lyricsModal = document.getElementById("lyrics-modal");
const lyricsClose = document.getElementById("lyrics-close");
const lyricsInput = document.getElementById("lyrics-input");
const lyricsSave = document.getElementById("lyrics-save");

// ── Toast ──
const toast = document.createElement("div");
toast.id = "toast";
document.body.appendChild(toast);

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

// ── Lyrics Display ──
const lyricsDisplay = document.createElement("div");
lyricsDisplay.id = "lyrics-display";
document.body.appendChild(lyricsDisplay);

// ── Drop Overlay ──
const dropOverlay = document.createElement("div");
dropOverlay.id = "drop-overlay";
dropOverlay.textContent = "🎵 Drop your songs here!";
document.body.appendChild(dropOverlay);

// ── Theme ──
themeDots.forEach((dot) => {
  dot.addEventListener("click", () => {
    themeDots.forEach((d) => d.classList.remove("active"));
    dot.classList.add("active");
    primaryColor = dot.dataset.color;
    document.documentElement.style.setProperty("--primary", primaryColor);
    beatFlash.style.background = `radial-gradient(circle at center, ${primaryColor}26 0%, transparent 70%)`;
  });
});

// ── Screenshot ──
screenshotBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  link.download = `visualizer-${timestamp}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  showToast("📸 Screenshot saved!");
});

// ── Playlist ──
playlistToggle.addEventListener("click", () => {
  playlistPanel.classList.toggle("hidden");
});

playlistClose.addEventListener("click", () => {
  playlistPanel.classList.add("hidden");
});

function renderPlaylist() {
  playlistItems.innerHTML = "";
  playlistToggle.textContent = `🎵 Playlist (${playlist.length})`;

  playlist.forEach((track, i) => {
    const item = document.createElement("div");
    item.classList.add("playlist-item");
    if (i === currentTrack) item.classList.add("active");

    const num = document.createElement("div");
    num.classList.add("playlist-num");
    num.textContent = i + 1;

    const info = document.createElement("div");
    info.classList.add("playlist-info");

    const title = document.createElement("div");
    title.classList.add("playlist-title");
    title.textContent = track.name.replace(/\.[^.]+$/, "");

    const remove = document.createElement("button");
    remove.classList.add("playlist-remove");
    remove.textContent = "✕";
    remove.addEventListener("click", (e) => {
      e.stopPropagation();
      playlist.splice(i, 1);
      if (currentTrack >= playlist.length)
        currentTrack = Math.max(0, playlist.length - 1);
      renderPlaylist();
    });

    info.appendChild(title);
    item.appendChild(num);
    item.appendChild(info);
    item.appendChild(remove);
    item.addEventListener("click", () => {
      currentTrack = i;
      loadTrack(i);
    });
    playlistItems.appendChild(item);
  });
}

function loadTrack(index) {
  if (!playlist.length) return;
  currentTrack = index;
  const track = playlist[index];
  const name = track.name.replace(/\.[^.]+$/, "");
  const parts = name.split(" - ");
  songName.textContent = parts[1] || parts[0];
  songArtist.textContent = parts[1] ? parts[0] : "Unknown Artist";

  const reader = new FileReader();
  reader.onload = (ev) => {
    audioCtx.decodeAudioData(ev.target.result, (buffer) => {
      audioBuffer = buffer;
      pauseOffset = 0;
      playBtn.disabled = false;
      lyrics = [];
      currentLyric = 0;
      lyricsDisplay.innerHTML = "";
      if (isPlaying) stopAudio();
      playAudio();
      renderPlaylist();
    });
  };
  reader.readAsArrayBuffer(track.file);
}

// ── File Input ──
fileInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  const wasEmpty = playlist.length === 0;
  files.forEach((file) => playlist.push({ name: file.name, file }));
  renderPlaylist();
  if (wasEmpty && playlist.length > 0) loadTrack(0);
});

// ── Prev / Next ──
prevBtn.addEventListener("click", () => {
  if (!playlist.length) return;
  currentTrack = (currentTrack - 1 + playlist.length) % playlist.length;
  loadTrack(currentTrack);
});

nextBtn.addEventListener("click", () => {
  if (!playlist.length) return;
  currentTrack = (currentTrack + 1) % playlist.length;
  loadTrack(currentTrack);
});

// ── Play / Pause ──
function playAudio() {
  if (!audioBuffer) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.connect(analyser);
  sourceNode.start(0, pauseOffset);
  startTime = audioCtx.currentTime - pauseOffset;
  isPlaying = true;
  playBtn.textContent = "⏸️";
  sourceNode.onended = () => {
    if (isPlaying) {
      isPlaying = false;
      playBtn.textContent = "▶️";
      if (playlist.length > 1) {
        currentTrack = (currentTrack + 1) % playlist.length;
        setTimeout(() => loadTrack(currentTrack), 500);
      } else {
        pauseOffset = 0;
      }
    }
  };
}

function stopAudio() {
  if (sourceNode) {
    sourceNode.onended = null;
    sourceNode.stop();
    sourceNode.disconnect();
  }
  isPlaying = false;
}

playBtn.addEventListener("click", () => {
  if (!audioBuffer) return;
  if (isPlaying) {
    pauseOffset = audioCtx.currentTime - startTime;
    stopAudio();
    playBtn.textContent = "▶️";
  } else {
    playAudio();
  }
});

// ── Volume ──
volumeSlider.addEventListener("input", () => {
  gainNode.gain.value = volumeSlider.value;
});

// ── Progress ──
progressBar.addEventListener("click", (e) => {
  if (!audioBuffer) return;
  const rect = progressBar.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  pauseOffset = ratio * audioBuffer.duration;
  if (isPlaying) {
    stopAudio();
    playAudio();
  }
});

// ── Viz Mode ──
modeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    modeBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;
    particles = [];
  });
});

// ── Sleep Timer ──
timerBtn.addEventListener("click", () => {
  timerModal.classList.toggle("hidden");
});
timerClose.addEventListener("click", () => {
  timerModal.classList.add("hidden");
});

timerOpts.forEach((opt) => {
  opt.addEventListener("click", () => {
    timerOpts.forEach((o) => o.classList.remove("active"));
    opt.classList.add("active");
    if (sleepTimer) clearTimeout(sleepTimer);
    sleepMins = parseInt(opt.dataset.mins);
    sleepStart = Date.now();
    sleepTimer = setTimeout(
      () => {
        stopAudio();
        showToast("😴 Sleep timer ended — music stopped!");
        timerStatus.textContent = "";
        timerCancel.classList.add("hidden");
        sleepTimer = null;
      },
      sleepMins * 60 * 1000,
    );
    timerStatus.textContent = `⏱️ Music stops in ${sleepMins} min`;
    timerCancel.classList.remove("hidden");
    showToast(`⏱️ Sleep timer set for ${sleepMins} min`);
  });
});

timerCancel.addEventListener("click", () => {
  if (sleepTimer) clearTimeout(sleepTimer);
  sleepTimer = null;
  sleepMins = null;
  timerStatus.textContent = "";
  timerCancel.classList.add("hidden");
  timerOpts.forEach((o) => o.classList.remove("active"));
  showToast("⏱️ Sleep timer cancelled");
});

// ── Lyrics ──
lyricsBtn.addEventListener("click", () => {
  lyricsModal.classList.toggle("hidden");
});
lyricsClose.addEventListener("click", () => {
  lyricsModal.classList.add("hidden");
});

lyricsSave.addEventListener("click", () => {
  const text = lyricsInput.value.trim();
  const lines = text ? text.split("\n").filter((l) => l.trim()) : [];

  // Detect LRC or manual timestamp format
  const hasTimestamps = lines.some((l) => /^\[\d{1,2}:\d{2}/.test(l));

  if (hasTimestamps) {
    // Parse LRC format [mm:ss.xx] or manual [mm:ss]
    lyrics = lines
      .map((line) => {
        const match = line.match(/^\[(\d{1,2}):(\d{2})[\.\:]?(\d*)\]\s*(.*)/);
        if (match) {
          const mins = parseInt(match[1]);
          const secs = parseInt(match[2]);
          const ms = match[3] ? parseInt(match[3].padEnd(3, "0")) / 1000 : 0;
          const time = mins * 60 + secs + ms;
          const text = match[4].trim();
          return text ? { time, text } : null;
        }
        return null;
      })
      .filter(Boolean);

    // Sort by time just in case
    lyrics.sort((a, b) => a.time - b.time);
    lyricsMode = "timestamp";
    showToast(`🎵 ${lyrics.length} synced lines saved!`);
  } else {
    lyrics = lines
      .map((l) => ({ text: l.trim(), time: null }))
      .filter((l) => l.text);
    lyricsMode = "beat";
    showToast(`🥁 ${lyrics.length} beat-synced lines saved!`);
  }

  currentLyric = 0;
  lyricsModal.classList.add("hidden");
  lyricsDisplay.innerHTML = "";
});

// ── Update Lyrics ──
function updateLyrics() {
  if (!lyrics.length || !isPlaying || !audioBuffer) {
    lyricsDisplay.innerHTML = "";
    return;
  }

  if (lyricsMode === "timestamp") {
    const currentTime = audioCtx.currentTime - startTime;
    let idx = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTime) idx = i;
      else break;
    }
    currentLyric = idx;
  } else {
    analyser.getByteFrequencyData(dataArray);
    const bassAvg = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    const now = Date.now();
    if (bassAvg > 180 && now - lastBeatLyric > 800) {
      lastBeatLyric = now;
      currentLyric = (currentLyric + 1) % lyrics.length;
    }
  }

  const prev = lyrics[currentLyric - 1]?.text || "";
  const current = lyrics[currentLyric]?.text || "";
  const next = lyrics[currentLyric + 1]?.text || "";

  lyricsDisplay.innerHTML = `
    ${prev ? `<div class="lyrics-line dim">${prev}</div>` : ""}
    ${current ? `<div class="lyrics-line">${current}</div>` : ""}
    ${next ? `<div class="lyrics-line dim">${next}</div>` : ""}
  `;
}

// ── Drag & Drop ──
document.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropOverlay.classList.add("active");
});

document.addEventListener("dragleave", () => {
  dropOverlay.classList.remove("active");
});

document.addEventListener("drop", (e) => {
  e.preventDefault();
  dropOverlay.classList.remove("active");
  const files = Array.from(e.dataTransfer.files).filter((f) =>
    f.type.startsWith("audio/"),
  );
  if (!files.length) return;
  const wasEmpty = playlist.length === 0;
  files.forEach((file) => playlist.push({ name: file.name, file }));
  renderPlaylist();
  if (wasEmpty) loadTrack(0);
});

// ── Beat Detection ──
function detectBeat() {
  analyser.getByteFrequencyData(dataArray);
  const bassAvg = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
  const now = Date.now();
  if (bassAvg > 180 && now - lastBeat > beatCooldown) {
    lastBeat = now;
    beatFlash.classList.add("flash");
    setTimeout(() => beatFlash.classList.remove("flash"), 80);
  }
}

// ── Bars ──
function drawBars() {
  analyser.getByteFrequencyData(dataArray);
  const w = canvas.width;
  const h = canvas.height;
  const barW = (w / bufferLength) * 3.5;
  let x = 0;
  for (let i = 0; i < bufferLength; i++) {
    const barH = (dataArray[i] / 255) * h * 0.75;
    const iHue = (i / bufferLength) * 360;
    const gradient = ctx.createLinearGradient(0, h, 0, h - barH);
    gradient.addColorStop(0, `hsla(${iHue}, 100%, 40%, 0.8)`);
    gradient.addColorStop(1, `hsla(${iHue}, 100%, 70%, 1)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, h - barH, barW - 1, barH);
    x += barW;
  }
}

// ── Circle ──
function drawCircle() {
  analyser.getByteFrequencyData(dataArray);
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.25;
  for (let i = 0; i < bufferLength; i += 4) {
    const angle = (i / bufferLength) * Math.PI * 2;
    const amp = (dataArray[i] / 255) * r * 0.8;
    const x1 = cx + Math.cos(angle) * r;
    const y1 = cy + Math.sin(angle) * r;
    const x2 = cx + Math.cos(angle) * (r + amp);
    const y2 = cy + Math.sin(angle) * (r + amp);
    const iHue = (i / bufferLength) * 360;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = `hsla(${iHue}, 100%, 65%, 0.9)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ── Wave ──
function drawWave() {
  analyser.getByteTimeDomainData(dataArray);
  const w = canvas.width;
  const h = canvas.height;
  const sliceW = w / bufferLength;
  ctx.lineWidth = 3;
  ctx.strokeStyle = `hsl(${hue}, 100%, 65%)`;
  ctx.beginPath();
  let x = 0;
  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * h) / 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceW;
  }
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  analyser.getByteFrequencyData(dataArray);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = `hsla(${(hue + 120) % 360}, 100%, 65%, 0.4)`;
  ctx.beginPath();
  x = 0;
  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 255;
    const y = h / 2 + v * h * 0.25 * Math.sin(i * 0.05 + hue * 0.01);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceW;
  }
  ctx.stroke();
  hue = (hue + 0.5) % 360;
}

// ── Particles ──
function createParticle(x, y, value) {
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * (value / 25),
    vy: (Math.random() - 0.5) * (value / 25) - 1.5,
    size: Math.random() * 3 + 1,
    hue: Math.floor((value / 255) * 360),
    alpha: 1,
    life: 1,
  };
}

function drawParticles() {
  analyser.getByteFrequencyData(dataArray);
  const w = canvas.width,
    h = canvas.height;
  const cx = w / 2,
    cy = h / 2;
  for (let i = 0; i < bufferLength; i += 12) {
    if (dataArray[i] > 160 && particles.length < 300) {
      const angle = (i / bufferLength) * Math.PI * 2;
      const r =
        Math.min(w, h) * 0.15 + (dataArray[i] / 255) * Math.min(w, h) * 0.1;
      particles.push(
        createParticle(
          cx + Math.cos(angle) * r,
          cy + Math.sin(angle) * r,
          dataArray[i],
        ),
      );
    }
  }
  particles = particles.filter((p) => p.alpha > 0.01);
  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.03;
    p.alpha -= 0.015;
    p.life -= 0.015;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${p.alpha})`;
    ctx.fill();
  });
  const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
  const pulse = Math.min(w, h) * 0.08 + avg * 0.2;
  ctx.beginPath();
  ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulse);
  g.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.6)`);
  g.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
  ctx.fillStyle = g;
  ctx.fill();
  hue = (hue + 1) % 360;
}

// ── Spiral ──
function drawSpiral() {
  analyser.getByteFrequencyData(dataArray);
  const cx = canvas.width / 2,
    cy = canvas.height / 2;
  for (let i = 0; i < bufferLength; i += 3) {
    const angle = (i / bufferLength) * Math.PI * 8 + hue * 0.02;
    const radius =
      (i / bufferLength) * Math.min(canvas.width, canvas.height) * 0.4;
    const amp = (dataArray[i] / 255) * 30;
    const x = cx + Math.cos(angle) * (radius + amp);
    const y = cy + Math.sin(angle) * (radius + amp);
    ctx.beginPath();
    ctx.arc(x, y, (dataArray[i] / 255) * 3 + 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${(i / bufferLength) * 360}, 100%, 65%, 0.8)`;
    ctx.fill();
  }
  hue = (hue + 0.8) % 360;
}

// ── Mirror ──
function drawMirror() {
  analyser.getByteFrequencyData(dataArray);
  const w = canvas.width,
    h = canvas.height;
  const barW = (w / 2 / bufferLength) * 3.5;
  const cx = w / 2;
  for (let i = 0; i < bufferLength; i++) {
    const barH = (dataArray[i] / 255) * (h / 2) * 0.8;
    const x = cx + i * barW;
    const xMir = cx - i * barW - barW;
    const iHue = (i / bufferLength) * 360;
    const gradient = ctx.createLinearGradient(0, h / 2, 0, h / 2 - barH);
    gradient.addColorStop(0, `hsla(${iHue}, 100%, 40%, 0.8)`);
    gradient.addColorStop(1, `hsla(${iHue}, 100%, 70%, 1)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, h / 2 - barH, barW - 1, barH);
    ctx.fillRect(xMir, h / 2 - barH, barW - 1, barH);
    ctx.fillRect(x, h / 2, barW - 1, barH);
    ctx.fillRect(xMir, h / 2, barW - 1, barH);
  }
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ── Progress ──
function updateProgress() {
  if (!audioBuffer || !isPlaying) return;
  const current = audioCtx.currentTime - startTime;
  const duration = audioBuffer.duration;
  progressFill.style.width = `${Math.min(current / duration, 1) * 100}%`;
  const fmt = (s) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  timeDisplay.textContent = `${fmt(current)} / ${fmt(duration)}`;
  if (sleepTimer && sleepMins && sleepStart) {
    const remaining = Math.max(
      0,
      sleepMins - (Date.now() - sleepStart) / 60000,
    ).toFixed(1);
    timerStatus.textContent = `⏱️ Stops in ${remaining} min`;
  }
}

// ── Main Loop ──
function animate() {
  requestAnimationFrame(animate);
  ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (isPlaying) detectBeat();
  if (isPlaying || pauseOffset > 0) {
    switch (currentMode) {
      case "bars":
        drawBars();
        break;
      case "circle":
        drawCircle();
        break;
      case "wave":
        drawWave();
        break;
      case "particles":
        drawParticles();
        break;
      case "spiral":
        drawSpiral();
        break;
      case "mirror":
        drawMirror();
        break;
    }
    updateLyrics();
  } else {
    hue = (hue + 0.5) % 360;
    const cx = canvas.width / 2,
      cy = canvas.height / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 60 + Math.sin(Date.now() * 0.002) * 10, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue}, 100%, 65%, 0.5)`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.6)`;
    ctx.font = "bold 1rem -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎵 Pick songs or drag & drop!", cx, cy + 100);
  }
  updateProgress();
}

animate();
