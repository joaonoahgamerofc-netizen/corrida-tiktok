const socket = io();

// ================= ELEMENTOS DOM =================
const canvas = document.getElementById('raceCanvas');
const ctx = canvas.getContext('2d');

const hudPrizeText = document.getElementById('hudPrizeText');
const hudDistanceInfo = document.getElementById('hudDistanceInfo');
const leaderboardList = document.getElementById('leaderboardList');
const centerAnnouncement = document.getElementById('centerAnnouncement');
const giftAlertContainer = document.getElementById('giftAlertContainer');
const eventFeed = document.getElementById('eventFeed');
const leaderProgressFill = document.getElementById('leaderProgressFill');
const leaderProgressText = document.getElementById('leaderProgressText');

const winnerOverlay = document.getElementById('winnerOverlay');
const winnerAvatar = document.getElementById('winnerAvatar');
const winnerName = document.getElementById('winnerName');
const winnerPrizeValue = document.getElementById('winnerPrizeValue');
const winnerStats = document.getElementById('winnerStats');
const podiumRunners = document.getElementById('podiumRunners');
const nextRoundTimerText = document.getElementById('nextRoundTimerText');

const togglePanelBtn = document.getElementById('togglePanelBtn');
const controlPanel = document.getElementById('controlPanel');

const tiktokUsernameInput = document.getElementById('tiktokUsernameInput');
const connectTiktokBtn = document.getElementById('connectTiktokBtn');
const disconnectTiktokBtn = document.getElementById('disconnectTiktokBtn');
const tiktokStatusBanner = document.getElementById('tiktokStatusBanner');

const prizeInput = document.getElementById('prizeInput');
const raceDistanceSelect = document.getElementById('raceDistanceSelect');
const autoRestartSelect = document.getElementById('autoRestartSelect');
const tapPowerRange = document.getElementById('tapPowerRange');
const tapPowerVal = document.getElementById('tapPowerVal');
const giftPowerRange = document.getElementById('giftPowerRange');
const giftPowerVal = document.getElementById('giftPowerVal');

const startRaceBtn = document.getElementById('startRaceBtn');
const resetRaceBtn = document.getElementById('resetRaceBtn');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const voiceToggleBtn = document.getElementById('voiceToggleBtn');
const clearPlayersBtn = document.getElementById('clearPlayersBtn');

const autoBotsToggle = document.getElementById('autoBotsToggle');
const simJoinViewerBtn = document.getElementById('simJoinViewerBtn');
const simJoin5ViewersBtn = document.getElementById('simJoin5ViewersBtn');
const activeSimPlayerSelect = document.getElementById('activeSimPlayerSelect');
const simTapSingleBtn = document.getElementById('simTapSingleBtn');
const simTapBurstBtn = document.getElementById('simTapBurstBtn');
const winnersHistoryList = document.getElementById('winnersHistoryList');

const safeProfitModeToggle = document.getElementById('safeProfitModeToggle');
const prizeCostBrlInput = document.getElementById('prizeCostBrlInput');
const coinValueBrlInput = document.getElementById('coinValueBrlInput');
const roundCoinsText = document.getElementById('roundCoinsText');
const breakEvenCoinsText = document.getElementById('breakEvenCoinsText');
const roundRevenueBrlText = document.getElementById('roundRevenueBrlText');
const roundProfitBrlText = document.getElementById('roundProfitBrlText');

// ================= ÁUDIO SINTETIZADO (WEB AUDIO API) =================
let soundEnabled = true;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type, tier = 1) {
  if (!soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'join') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === 'tap') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220 + Math.random() * 140, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.06);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.start(now);
    osc.stop(now + 0.08);
  } else if (type === 'gift') {
    osc.type = 'sawtooth';
    const baseFreq = 300 + tier * 110;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, now + 0.35);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.42);
  } else if (type === 'beep') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === 'go') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(784, now);
    osc.frequency.setValueAtTime(1046, now + 0.1);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.42);
  } else if (type === 'win') {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq, now + idx * 0.12);
      g.gain.setValueAtTime(0.15, now + idx * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
      o.start(now + idx * 0.12);
      o.stop(now + idx * 0.12 + 0.36);
    });
  }
}

// ================= NARRADOR DE VOZ EM PORTUGUÊS (WEB SPEECH API) =================
let voiceEnabled = true;

function formatSpokenName(rawName) {
  // Transforma ex: "camila_star_482" em "Camila star" para a voz soar natural
  const cleaned = String(rawName || '')
    .replace(/^@/, '')
    .replace(/[_.-]+/g, ' ')
    .replace(/\b\d+\b/g, '')
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 2);
  return words.join(' ') || String(rawName || 'Corredor');
}

function speakPortuguese(text, priority = false) {
  if (!voiceEnabled || !('speechSynthesis' in window)) return;
  try {
    if (priority) {
      window.speechSynthesis.cancel();
    } else if (window.speechSynthesis.speaking) {
      // Se já estiver falando e não for prioridade alta, evita acumular fila longa
      return;
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pt-BR';
    utter.rate = 1.22;
    utter.pitch = 1.05;
    utter.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find((v) => v.lang && v.lang.toLowerCase().includes('pt-br')) ||
                    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('pt'));
    if (ptVoice) utter.voice = ptVoice;

    window.speechSynthesis.speak(utter);
  } catch (_) {}
}

// ================= ESTADO DO JOGO DA CORRIDA =================
const KART_COLORS = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#14b8a6'
];

const state = {
  status: 'running', // 'waiting' | 'countdown' | 'running' | 'finished'
  raceDistance: 1000,
  prizeText: 'PRÊMIO DA RODADA: R$ 20,00',
  tapMultiplier: 1.0,
  giftMultiplier: 1.0,
  roundElapsedSeconds: 0,
  roundTotalCoins: 0,
  cameraDistance: 0,
  camMinDist: 0,
  camMaxDist: 70,
  roadScrollPx: 0,
  screenShake: 0,
  players: new Map(), // id -> Player
  particles: [],
  floatingTexts: [],
  confetti: [],
  winnersHistory: [],
  nextRoundTimer: null,
  countdownTimer: null
};

// Cache de imagens de avatar
const avatarCache = new Map();

function getAvatarImage(url) {
  if (!url) return null;
  if (avatarCache.has(url)) return avatarCache.get(url);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  const record = { img, loaded: false };
  img.onload = () => { record.loaded = true; };
  img.onerror = () => { record.loaded = false; };
  avatarCache.set(url, record);
  return record;
}

// ================= CRIAÇÃO E MECÂNICAS DOS CORREDORES =================
function ensurePlayer(user) {
  const id = String(user.id || user.uniqueId);
  if (state.players.has(id)) {
    const existing = state.players.get(id);
    if (user.avatar && !existing.avatar) {
      existing.avatar = user.avatar;
      getAvatarImage(user.avatar);
    }
    return existing;
  }

  const index = state.players.size;
  const color = KART_COLORS[index % KART_COLORS.length];
  // Distribui os personagens horizontalmente nas faixas da pista (entre x=86 e x=454)
  const laneCount = 7;
  const laneIndex = index % laneCount;
  const trackLeft = 78;
  const trackRight = 462;
  const laneWidth = (trackRight - trackLeft) / laneCount;
  const baseX = trackLeft + laneWidth * laneIndex + laneWidth / 2 + (Math.random() * 14 - 7);

  const player = {
    id,
    uniqueId: user.uniqueId || id,
    nickname: user.nickname || user.uniqueId || id,
    avatar: user.avatar || '',
    color,
    x: baseX,
    targetX: baseX,
    distance: 0, // metros percorridos
    baseWalkSpeed: 6, // velocidade mínima automática ao entrar na live (km/h)
    tapSpeed: 0, // velocidade acumulada pelo Tap-Tap
    turboSpeed: 0, // velocidade extra de Presente
    turboTimeLeft: 0, // segundos restantes de Turbo
    turboTier: 0, // 0=nenhum, 1=azul, 2=roxo, 3=ouro, 4=supremo
    totalTaps: 0,
    totalCoins: 0,
    lastTapTime: 0,
    chatBubble: '',
    chatBubbleTimer: 0,
    wheelAngle: 0,
    joinedAt: Date.now()
  };

  if (player.avatar) getAvatarImage(player.avatar);
  state.players.set(id, player);

  spawnFloatingText(player.x, player.distance, `👋 @${player.nickname}`, '#38bdf8');
  addFeedItem(`👋 <b>@${escapeHtml(player.nickname)}</b> entrou na pista!`);
  playSound('join');
  speakPortuguese(`${formatSpokenName(player.nickname)} entrou na pista!`);
  updateSimPlayerDropdown();

  return player;
}

function handleTapEvent(user, tapCount = 1) {
  const player = ensurePlayer(user);
  if (state.status === 'finished') return;

  const count = Math.max(1, Number(tapCount) || 1);
  player.totalTaps += count;
  player.lastTapTime = performance.now();

  // Calibrado para corrida de 10 minutos (1000m em ~600s):
  // Tap-Tap aumenta a velocidade gradualmente, exigindo constância ao longo dos 10 minutos
  const speedGain = count * 2.4 * state.tapMultiplier;
  const maxTapSpeed = 65 * state.tapMultiplier;
  player.tapSpeed = Math.min(maxTapSpeed, player.tapSpeed + speedGain);

  // Avanço milimétrico por tap (0.04m por tap -> precisa de milhares de taps ao longo de 10 min)
  if (state.status === 'running') {
    player.distance += count * 0.04 * state.tapMultiplier;
  }

  // Partículas de faísca azul de Tap-Tap
  for (let i = 0; i < Math.min(8, count * 2); i++) {
    state.particles.push({
      x: player.x + (Math.random() * 16 - 8),
      dist: player.distance - 2,
      vx: (Math.random() - 0.5) * 40,
      vDist: -(20 + Math.random() * 35),
      color: count >= 5 ? '#f97316' : '#38bdf8',
      size: 3 + Math.random() * 3,
      life: 0.45,
      maxLife: 0.45
    });
  }

  spawnFloatingText(
    player.x + (Math.random() * 20 - 10),
    player.distance + 4,
    `👆 +${count} TAP!`,
    count >= 5 ? '#fb923c' : '#7dd3fc'
  );
  playSound('tap');
}

// CÁLCULO ECONÔMICO DOS PRESENTES REAIS DO TIKTOK:
// - 1 moeda (Rosa ~R$ 0,014 líquido no saque) = avança apenas 0,5m no total (10 Rosas = só 5m em 1000m!)
// - 30 moedas (Rosquinha ~R$ 0,42 líquido) = avança 12m
// - 100 moedas (Confete ~R$ 1,40 líquido) = avança 30m
// - 1.000+ moedas (Galáxia ~R$ 14,00 líquido) = teto máximo de 100m (NENHUM presente passa de 100m!)
function getGiftTurboSpecs(totalCoins) {
  const mult = state.giftMultiplier;
  const MAX_METERS_CAP = 100; // Trava máxima absoluta: nenhum presente passa de 100m!

  let rawMeters = 0.5;
  let tier = 1;
  let label = 'TURBO NITRO AZUL';
  let duration = 3.5;
  let color = '#38bdf8';
  let icon = '🌹';

  if (totalCoins >= 1000) {
    rawMeters = 100;
    tier = 4;
    label = 'MEGA TURBO SUPREMO';
    duration = 8.0;
    color = '#fde047';
    icon = '🌌';
  } else if (totalCoins >= 100) {
    // De 100 a 999 moedas: escala de 30m até 95m (ex: Confete 100 moedas = 30m)
    rawMeters = 30 + ((totalCoins - 100) / 900) * 65;
    tier = 3;
    label = 'HYPER TURBO OURO';
    duration = 6.0;
    color = '#f59e0b';
    icon = '🎉';
  } else if (totalCoins >= 10) {
    // De 10 a 99 moedas: escala de 5m até 28m (ex: Rosquinha 30 moedas = ~12m)
    rawMeters = 5 + ((totalCoins - 10) / 90) * 23;
    tier = 2;
    label = 'SUPER TURBO ROXO';
    duration = 4.5;
    color = '#c084fc';
    icon = '🍩';
  } else {
    // De 1 a 9 moedas (ex: Rosa = 1 moeda): apenas 0,5m por moeda!
    rawMeters = totalCoins * 0.5;
    tier = 1;
    label = 'TURBO NITRO AZUL';
    duration = 3.0;
    color = '#38bdf8';
    icon = '🌹';
  }

  // Garante que NUNCA passe de 100 metros
  const totalMetersGain = Math.min(MAX_METERS_CAP, Number((rawMeters * mult).toFixed(1)));
  // Divide o ganho: 35% avanço imediato + 65% diluído durante o efeito de turbo
  const instantMeters = totalMetersGain * 0.35;
  const turboMetersPerSec = (totalMetersGain * 0.65) / duration;
  // Converte para km/h visual na tela (fator 0.025 m/s por km/h)
  const speedBoost = Math.round(turboMetersPerSec / 0.025);

  return {
    tier,
    label,
    totalMetersGain,
    speedBoost: Math.max(15, speedBoost),
    instantMeters,
    duration,
    color,
    icon
  };
}

function handleGiftEvent(data) {
  const player = ensurePlayer(data.user);
  if (state.status === 'finished') return;

  const totalCoins = Math.max(1, Number(data.totalCoins) || 1);
  player.totalCoins += totalCoins;
  state.roundTotalCoins += totalCoins;
  updateProfitDashboard();

  const specs = getGiftTurboSpecs(totalCoins);

  // Define o Turbo respeitando o limite máximo de metros do presente
  player.turboSpeed = specs.speedBoost;
  player.turboTimeLeft = specs.duration;
  player.turboTier = Math.max(player.turboTier, specs.tier);

  if (state.status === 'running') {
    player.distance += specs.instantMeters;
  }

  // Efeito de tremor na câmera para presentes fortes
  if (specs.tier >= 3) {
    state.screenShake = specs.tier === 4 ? 18 : 9;
  }

  // Explosão de partículas de Turbo
  for (let i = 0; i < 28; i++) {
    state.particles.push({
      x: player.x + (Math.random() * 30 - 15),
      dist: player.distance,
      vx: (Math.random() - 0.5) * 110,
      vDist: -(40 + Math.random() * 90),
      color: specs.color,
      size: 4 + Math.random() * 5,
      life: 0.8,
      maxLife: 0.8
    });
  }

  spawnFloatingText(
    player.x,
    player.distance + 8,
    `🚀 +${specs.totalMetersGain}m (${specs.label})`,
    specs.color
  );

  showGiftAlertBanner(player, data.giftName || 'Presente', totalCoins, specs);
  playSound('gift', specs.tier);
  if (specs.tier >= 2) {
    speakPortuguese(`${formatSpokenName(player.nickname)} ativou turbo com ${data.giftName || 'presente'}!`, true);
  }
}

function handleChatEvent(user, comment) {
  const player = ensurePlayer(user);
  if (comment) {
    player.chatBubble = comment;
    player.chatBubbleTimer = 4.0;
  }
}

// ================= ALERTAS E FEED VISUAL (SUPER TRANSPARENTES) =================
function showGiftAlertBanner(player, giftName, totalCoins, specs) {
  // Mantém apenas 1 notificação super transparente por vez para nunca poluir a pista
  giftAlertContainer.innerHTML = '';
  const banner = document.createElement('div');
  banner.className = `gift-alert-banner ${specs.tier >= 3 ? 'mega-gift' : ''}`;
  banner.innerHTML = `
    <div class="gift-alert-icon">${specs.icon}</div>
    <div class="gift-alert-info">
      <div class="gift-alert-title">@${escapeHtml(player.nickname)} enviou ${escapeHtml(giftName)} (${totalCoins}🪙)</div>
      <div class="gift-alert-sub">⚡ ${specs.label}: Avançou +${specs.totalMetersGain}m!</div>
    </div>
  `;
  giftAlertContainer.appendChild(banner);

  setTimeout(() => {
    if (banner.parentElement) banner.remove();
  }, 2200);
}

function addFeedItem(html, isGift = false) {
  const item = document.createElement('div');
  item.className = `feed-item ${isGift ? 'feed-gift' : ''}`;
  item.innerHTML = html;
  eventFeed.innerHTML = '';
  eventFeed.appendChild(item);

  setTimeout(() => {
    if (item.parentElement) item.remove();
  }, 2800);
}

function spawnFloatingText(x, dist, text, color = '#ffffff') {
  state.floatingTexts.push({
    x,
    dist,
    text,
    color,
    life: 1.1,
    maxLife: 1.1
  });
}

function updateProfitDashboard() {
  if (!roundCoinsText) return;
  const prizeCost = Math.max(0, parseFloat(String(prizeCostBrlInput?.value || '20').replace(',', '.')) || 20);
  const coinVal = Math.max(0.001, parseFloat(String(coinValueBrlInput?.value || '0.025').replace(',', '.')) || 0.025);
  const breakEvenCoins = Math.ceil(prizeCost / coinVal);
  const revenueBrl = state.roundTotalCoins * coinVal;
  const profitBrl = revenueBrl - prizeCost;

  roundCoinsText.textContent = String(state.roundTotalCoins);
  breakEvenCoinsText.textContent = String(breakEvenCoins);
  roundRevenueBrlText.textContent = `R$ ${revenueBrl.toFixed(2).replace('.', ',')}`;

  if (profitBrl >= 0) {
    roundProfitBrlText.style.color = '#34d399';
    roundProfitBrlText.textContent = `+R$ ${profitBrl.toFixed(2).replace('.', ',')} (LUCRO GARANTIDO! 🟢)`;
  } else {
    const missingCoins = Math.max(0, breakEvenCoins - state.roundTotalCoins);
    roundProfitBrlText.style.color = '#fca5a5';
    roundProfitBrlText.textContent = `-R$ ${Math.abs(profitBrl).toFixed(2).replace('.', ',')} (Faltam ${missingCoins}🪙 p/ empatar)`;
  }
}

function formatTimeMMSS(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ================= FLUXO DA CORRIDA (INICIAR, CONTAGEM, VITÓRIA) =================
function startCountdownAndRace() {
  if (state.countdownTimer) clearInterval(state.countdownTimer);
  if (state.nextRoundTimer) clearInterval(state.nextRoundTimer);

  winnerOverlay.classList.add('hidden');
  state.status = 'countdown';
  state.roundElapsedSeconds = 0;
  state.roundTotalCoins = 0;
  updateProfitDashboard();

  // Posiciona todos na largada (0m) mantendo quem já entrou na live
  for (const player of state.players.values()) {
    player.distance = 0;
    player.tapSpeed = 0;
    player.turboSpeed = 0;
    player.turboTimeLeft = 0;
    player.turboTier = 0;
  }
  state.cameraDistance = 0;
  state.camMinDist = 0;
  state.camMaxDist = 70;

  let count = 3;
  centerAnnouncement.textContent = String(count);
  centerAnnouncement.classList.remove('hidden');
  playSound('beep');

  state.countdownTimer = setInterval(() => {
    count--;
    if (count > 0) {
      centerAnnouncement.textContent = String(count);
      playSound('beep');
    } else if (count === 0) {
      centerAnnouncement.textContent = 'VAI! 🏁';
      state.status = 'running';
      playSound('go');
    } else {
      centerAnnouncement.classList.add('hidden');
      clearInterval(state.countdownTimer);
      state.countdownTimer = null;
    }
  }, 850);
}

function resetRoundKeepPlayers() {
  if (state.countdownTimer) clearInterval(state.countdownTimer);
  if (state.nextRoundTimer) clearInterval(state.nextRoundTimer);
  winnerOverlay.classList.add('hidden');
  centerAnnouncement.classList.add('hidden');

  for (const player of state.players.values()) {
    player.distance = 0;
    player.tapSpeed = 0;
    player.turboSpeed = 0;
    player.turboTimeLeft = 0;
    player.turboTier = 0;
    player.totalTaps = 0;
    player.totalCoins = 0;
  }
  state.roundElapsedSeconds = 0;
  state.roundTotalCoins = 0;
  updateProfitDashboard();
  state.cameraDistance = 0;
  state.camMinDist = 0;
  state.camMaxDist = 70;
  state.status = 'running';
  socket.emit('set_active_winner', null);
  addFeedItem('🔄 <b>Nova rodada de 10 min iniciada! Dê Tap-Tap na tela!</b>');
}

function triggerRaceWinner(winner, sortedPlayers, isTimeout = false) {
  state.status = 'finished';
  playSound('win');

  const winnerCrownEl = document.querySelector('.winner-crown');
  if (winnerCrownEl) {
    winnerCrownEl.textContent = isTimeout ? '⏰ TEMPO ESGOTADO! VENCEU POR LIDERANÇA! 👑' : '👑 VENCEDOR DA CORRIDA! 👑';
  }

  if (isTimeout) {
    speakPortuguese(`Tempo esgotado! Parabéns ${formatSpokenName(winner.nickname)}! Estava na liderança e garantiu o prêmio da rodada!`, true);
    addFeedItem(`⏰ <b>Tempo esgotado!</b> @${escapeHtml(winner.nickname)} estava em 1º lugar e venceu!`);
  } else {
    speakPortuguese(`Parabéns ${formatSpokenName(winner.nickname)}! Venceu a corrida e garantiu o prêmio da rodada!`, true);
  }

  // Registra o vencedor oficial no servidor para aguardar e validar a chave PIX
  const prizeVal = parseFloat(String(prizeCostBrlInput?.value || '20').replace(',', '.')) || 20;
  socket.emit('set_active_winner', {
    uniqueId: winner.uniqueId,
    nickname: winner.nickname,
    prizeAmount: prizeVal,
    roundId: Date.now()
  });

  // Cria chuva de confetes
  state.confetti = [];
  for (let i = 0; i < 90; i++) {
    state.confetti.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 300,
      vx: (Math.random() - 0.5) * 90,
      vy: 110 + Math.random() * 140,
      color: KART_COLORS[i % KART_COLORS.length],
      size: 6 + Math.random() * 6,
      angle: Math.random() * Math.PI * 2
    });
  }

  // Preenche Pódio
  winnerName.textContent = `@${winner.nickname}`;
  winnerPrizeValue.textContent = state.prizeText;
  winnerStats.textContent = `👆 ${winner.totalTaps} Tap-Taps • 🎁 ${winner.totalCoins} Moedas em Presentes`;

  if (winner.avatar) {
    winnerAvatar.src = winner.avatar;
  } else {
    winnerAvatar.src = createInitialsDataUrl(winner.nickname, winner.color);
  }

  // 2º e 3º lugares
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];
  let podiumHtml = '';
  if (second) {
    podiumHtml += `<div class="podium-sub-row"><span>🥈 2º Lugar: <b>@${escapeHtml(second.nickname)}</b></span><span>${Math.floor(second.distance)}m</span></div>`;
  }
  if (third) {
    podiumHtml += `<div class="podium-sub-row"><span>🥉 3º Lugar: <b>@${escapeHtml(third.nickname)}</b></span><span>${Math.floor(third.distance)}m</span></div>`;
  }
  podiumRunners.innerHTML = podiumHtml || '<div class="podium-sub-row"><span>Vitória solo!</span></div>';

  winnerOverlay.classList.remove('hidden');

  // Registra no histórico de prêmios do Streamer
  const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  state.winnersHistory.unshift({
    time: timeStr,
    nickname: winner.nickname,
    prize: state.prizeText,
    taps: winner.totalTaps,
    coins: winner.totalCoins
  });
  renderWinnersHistory();

  // Verifica auto-reinício
  const autoSec = Number(autoRestartSelect.value) || 0;
  if (autoSec > 0) {
    let remaining = autoSec;
    nextRoundTimerText.textContent = `🔄 Nova corrida começando em ${remaining}s... Continue na live!`;
    state.nextRoundTimer = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        nextRoundTimerText.textContent = `🔄 Nova corrida começando em ${remaining}s... Continue na live!`;
      } else {
        clearInterval(state.nextRoundTimer);
        state.nextRoundTimer = null;
        resetRoundKeepPlayers();
        startCountdownAndRace();
      }
    }, 1000);
  } else {
    nextRoundTimerText.textContent = 'Aguardando o apresentador iniciar a próxima rodada!';
  }
}

function renderWinnersHistory() {
  if (state.winnersHistory.length === 0) {
    winnersHistoryList.innerHTML = '<div class="empty-history">Nenhum vencedor registrado ainda nesta sessão.</div>';
    return;
  }
  winnersHistoryList.innerHTML = state.winnersHistory
    .slice(0, 15)
    .map(
      (w) => `
      <div class="history-item">
        <div>
          <strong>🏆 @${escapeHtml(w.nickname)}</strong>
          <div style="color:#9ca3af;font-size:0.68rem;">🕒 ${w.time} • 👆 ${w.taps} taps • 🎁 ${w.coins}🪙</div>
        </div>
        <span style="color:#fde047;font-weight:800;">${escapeHtml(w.prize)}</span>
      </div>
    `
    )
    .join('');
}

// ================= ATUALIZAÇÃO FÍSICA E LOOP DO JOGO =================
let lastFrameTime = performance.now();

function updatePhysics(dt) {
  const playersArr = Array.from(state.players.values());

  if (state.status === 'running') {
    state.roundElapsedSeconds += dt;
  }

  if (state.screenShake > 0) {
    state.screenShake = Math.max(0, state.screenShake - dt * 28);
  }

  // Verifica se o Modo Ritmo 10 Min / Lucro Seguro está ativo
  const prizeCost = Math.max(0, parseFloat(String(prizeCostBrlInput?.value || '20').replace(',', '.')) || 20);
  const coinVal = Math.max(0.001, parseFloat(String(coinValueBrlInput?.value || '0.025').replace(',', '.')) || 0.025);
  const breakEvenCoins = Math.ceil(prizeCost / coinVal);
  const isProfitTargetReached = state.roundTotalCoins >= breakEvenCoins;
  // Tempo alvo proporcional ao tamanho da pista: 1000m = 600s (10 minutos)
  const targetDurationSeconds = (state.raceDistance / 1000) * 600;

  for (const p of playersArr) {
    // Decaimento natural do acelerador de Tap-Tap (precisa continuar clicando para manter velocidade alta!)
    p.tapSpeed = Math.max(0, p.tapSpeed - 22 * dt);

    // Controle do tempo de Turbo de Presente
    if (p.turboTimeLeft > 0) {
      p.turboTimeLeft = Math.max(0, p.turboTimeLeft - dt);
      if (p.turboTimeLeft <= 0) {
        p.turboSpeed = 0;
        p.turboTier = 0;
      } else {
        // Gera rastro contínuo enquanto está com Turbo ativo
        if (Math.random() < 0.65) {
          const tierColors = ['#38bdf8', '#38bdf8', '#c084fc', '#f59e0b', '#fde047'];
          state.particles.push({
            x: p.x + (Math.random() * 18 - 9),
            dist: p.distance - 3,
            vx: (Math.random() - 0.5) * 20,
            vDist: -(25 + Math.random() * 40),
            color: tierColors[p.turboTier] || '#38bdf8',
            size: 3 + p.turboTier * 1.3,
            life: 0.35,
            maxLife: 0.35
          });
        }
      }
    }

    if (p.chatBubbleTimer > 0) {
      p.chatBubbleTimer = Math.max(0, p.chatBubbleTimer - dt);
    }

    if (state.status === 'running') {
      const totalSpeedKmh = p.baseWalkSpeed + p.tapSpeed + p.turboSpeed;
      // Escala calibrada para 10 minutos (1000m em ~600s -> 1.65 m/s com velocidade média de ~66 km/h)
      let metersPerSec = totalSpeedKmh * 0.025;

      // Se o Modo Lucro Seguro / 10 min estiver ativo e a meta de moedas ainda não bateu,
      // controla o ritmo para que o líder não cruze a chegada antes dos 10 minutos!
      if (safeProfitModeToggle && safeProfitModeToggle.checked && !isProfitTargetReached) {
        const maxAllowedDistNow = Math.min(
          state.raceDistance - 5,
          (state.roundElapsedSeconds / targetDurationSeconds) * state.raceDistance + 65
        );
        if (p.distance > maxAllowedDistNow) {
          metersPerSec *= 0.25;
        }
      }

      p.distance += metersPerSec * dt;
      p.wheelAngle += metersPerSec * dt * 12;
    }
  }

  // Ordena jogadores por distância (do 1º ao último) e salva a posição (rank)
  playersArr.sort((a, b) => b.distance - a.distance);
  playersArr.forEach((p, idx) => {
    p.rank = idx + 1;
  });

  // CÂMERA ELÁSTICA (ZOOM DINÂMICO):
  // Enquadra automaticamente desde o ÚLTIMO colocado até o 1º COLOCADO para ninguém nunca sumir da tela!
  const leaderDist = playersArr.length > 0 ? playersArr[0].distance : 0;
  const lastPlaceDist = playersArr.length > 0 ? playersArr[playersArr.length - 1].distance : 0;
  const leaderSpeed = playersArr.length > 0
    ? playersArr[0].baseWalkSpeed + playersArr[0].tapSpeed + playersArr[0].turboSpeed
    : 12;

  if (state.status === 'running') {
    state.roadScrollPx = (state.roadScrollPx + (45 + leaderSpeed * 2.4) * dt) % 10000;
  }

  const MIN_SPAN_METERS = 65;
  const targetMin = Math.max(0, lastPlaceDist);
  const targetMax = Math.max(targetMin + MIN_SPAN_METERS, leaderDist);

  state.camMinDist += (targetMin - state.camMinDist) * Math.min(1, dt * 8);
  state.camMaxDist += (targetMax - state.camMaxDist) * Math.min(1, dt * 8);

  // Garante que nem o último nem o primeiro escapem dos limites visíveis
  if (state.camMinDist > lastPlaceDist) state.camMinDist = lastPlaceDist;
  if (state.camMaxDist < leaderDist) state.camMaxDist = leaderDist;
  state.cameraDistance = state.camMinDist;

  // Verifica se o 1º colocado cruzou a linha de chegada OU se o tempo da rodada acabou!
  if (state.status === 'running' && playersArr.length > 0) {
    const isDistanceFinished = playersArr[0].distance >= state.raceDistance;
    const isTimeFinished = state.roundElapsedSeconds >= targetDurationSeconds;

    if (isDistanceFinished || isTimeFinished) {
      if (isDistanceFinished) {
        playersArr[0].distance = state.raceDistance;
      }
      triggerRaceWinner(playersArr[0], playersArr, isTimeFinished && !isDistanceFinished);
    }
  }

  // Atualiza partículas
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.x += pt.vx * dt;
    pt.dist += pt.vDist * dt * 0.25;
    pt.life -= dt;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }

  // Atualiza textos flutuantes
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const ft = state.floatingTexts[i];
    ft.dist += 12 * dt;
    ft.life -= dt;
    if (ft.life <= 0) state.floatingTexts.splice(i, 1);
  }

  // Atualiza confetes da vitória
  for (const c of state.confetti) {
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.angle += 4 * dt;
    if (c.y > canvas.height + 20) {
      c.y = -20;
      c.x = Math.random() * canvas.width;
    }
  }

  updateHud(playersArr, leaderDist);
}

// ================= ATUALIZAÇÃO DO PLACAR TOP 5 E PROGRESSO =================
let lastHudUpdate = 0;

function updateHud(sortedPlayers, leaderDist) {
  const now = performance.now();
  if (now - lastHudUpdate < 120) return;
  lastHudUpdate = now;

  const targetMinutes = Math.round((state.raceDistance / 1000) * 10);
  const timerStr = formatTimeMMSS(state.roundElapsedSeconds);
  hudDistanceInfo.textContent = `⏱️ ${timerStr} (~${targetMinutes}:00) • Meta: ${state.raceDistance}m`;

  const pct = Math.min(100, Math.round((leaderDist / state.raceDistance) * 100));
  leaderProgressFill.style.width = `${pct}%`;
  leaderProgressText.textContent = `Líder: ${Math.floor(leaderDist)}m / ${state.raceDistance}m (${pct}%) • ⏱️ ${timerStr} • ${sortedPlayers.length} Corredores`;

  if (sortedPlayers.length === 0) {
    leaderboardList.innerHTML = `<div class="empty-leaderboard">Aguardando espectadores entrarem na live...</div>`;
    return;
  }

  const top5 = sortedPlayers.slice(0, 5);
  leaderboardList.innerHTML = top5
    .map((p, idx) => {
      const speedKmh = Math.round(p.baseWalkSpeed + p.tapSpeed + p.turboSpeed);
      const medals = ['🥇', '🥈', '🥉', '4º', '5º'];
      const turboBadge =
        p.turboTimeLeft > 0 ? `<span class="lb-turbo-tag">🚀 TURBO</span>` : '';
      return `
        <div class="lb-row ${idx === 0 ? 'rank-1' : ''}">
          <div class="lb-left">
            <span class="lb-pos">${medals[idx]}</span>
            <span class="lb-name">@${escapeHtml(p.nickname)}</span>
            ${turboBadge}
          </div>
          <div class="lb-right">
            <span style="color:#38bdf8;">${speedKmh} km/h</span>
            <span style="color:#fde047;">${Math.floor(p.distance)}m</span>
          </div>
        </div>
      `;
    })
    .join('');
}

// ================= RENDERIZAÇÃO DA PISTA 2.5D E CORREDORES (CÂMERA ELÁSTICA) =================
const SCREEN_BOTTOM_Y = 825; // Posição de tela do Último Colocado (sempre visível acima da barra inferior)
const SCREEN_TOP_Y = 305;    // Posição de tela do 1º Colocado (sempre visível abaixo do placar Top 5)

function distanceToScreenY(dist) {
  // Mapeia dinamicamente entre camMinDist (Último colocado) e camMaxDist (1º colocado)
  const span = Math.max(10, state.camMaxDist - state.camMinDist);
  const ratio = (dist - state.camMinDist) / span;
  return SCREEN_BOTTOM_Y - ratio * (SCREEN_BOTTOM_Y - SCREEN_TOP_Y);
}

function getDynamicMarkerStep(span) {
  if (span <= 120) return 25;
  if (span <= 300) return 50;
  if (span <= 700) return 100;
  if (span <= 1600) return 250;
  return 500;
}

function drawTrack() {
  ctx.save();

  if (state.screenShake > 0) {
    const dx = (Math.random() - 0.5) * state.screenShake;
    const dy = (Math.random() - 0.5) * state.screenShake;
    ctx.translate(dx, dy);
  }

  // Grama / Arquibancada Neon Lateral
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const trackLeft = 56;
  const trackRight = canvas.width - 56;
  const trackWidth = trackRight - trackLeft;

  // Sombra da pista
  ctx.fillStyle = '#161f33';
  ctx.fillRect(trackLeft, 0, trackWidth, canvas.height);

  // Faixas e zebras animadas com rolagem contínua para sensação constante de alta velocidade
  const stripeHeight = 45;
  const offsetPx = state.roadScrollPx % (stripeHeight * 2);

  for (let y = -stripeHeight * 2; y < canvas.height + stripeHeight * 2; y += stripeHeight) {
    const drawY = y + offsetPx;
    const isEven = Math.floor((y - offsetPx) / stripeHeight) % 2 === 0;

    // Zebras esquerda e direita
    ctx.fillStyle = isEven ? '#ef4444' : '#f8fafc';
    ctx.fillRect(trackLeft - 10, drawY, 10, stripeHeight);
    ctx.fillRect(trackRight, drawY, 10, stripeHeight);

    // Linhas pontilhadas das raias
    if (isEven) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
      const lanes = 4;
      for (let l = 1; l < lanes; l++) {
        const lx = trackLeft + (trackWidth / lanes) * l;
        ctx.fillRect(lx - 1.5, drawY, 3, stripeHeight * 0.55);
      }
    }
  }

  // Marcações de distância na pista adaptadas ao Zoom Elástico atual
  const span = Math.max(10, state.camMaxDist - state.camMinDist);
  const step = getDynamicMarkerStep(span);
  const firstMeterMark = Math.max(0, Math.floor(state.camMinDist / step) * step);

  ctx.font = 'bold 12px Segoe UI, sans-serif';
  ctx.textAlign = 'center';

  for (let m = firstMeterMark; m <= state.raceDistance; m += step) {
    const y = distanceToScreenY(m);
    if (y < -40 || y > canvas.height + 40) continue;

    ctx.strokeStyle = m === 0 ? '#22c55e' : 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = m % (step * 2) === 0 ? 2.5 : 1.2;
    ctx.beginPath();
    ctx.moveTo(trackLeft, y);
    ctx.lineTo(trackRight, y);
    ctx.stroke();

    ctx.fillStyle = 'rgba(226, 232, 240, 0.42)';
    ctx.fillText(`${m}m`, canvas.width / 2, y - 5);
  }

  // Linha de Chegada Quadriculada Dourada
  const finishY = distanceToScreenY(state.raceDistance);
  if (finishY > -80 && finishY < canvas.height + 80) {
    const sqSize = 14;
    const cols = Math.floor(trackWidth / sqSize);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#facc15' : '#111827';
        ctx.fillRect(trackLeft + c * sqSize, finishY - r * sqSize, sqSize, sqSize);
      }
    }
    ctx.fillStyle = '#fde047';
    ctx.font = '900 16px Segoe UI, sans-serif';
    ctx.fillText(`🏆 LINHA DE CHEGADA (${state.raceDistance}m) 🏆`, canvas.width / 2, finishY - 48);
  }

  // Partículas de velocidade / turbo
  for (const pt of state.particles) {
    const py = distanceToScreenY(pt.dist);
    if (py < -20 || py > canvas.height + 20) continue;
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, py, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Desenha os Corredores (ordenados por distância para sobreposição correta)
  const playersArr = Array.from(state.players.values()).sort((a, b) => a.distance - b.distance);
  for (const p of playersArr) {
    drawPlayerKart(p);
  }

  // Textos flutuantes (+TAP, +TURBO)
  for (const ft of state.floatingTexts) {
    const fy = distanceToScreenY(ft.dist);
    ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
    ctx.font = '900 13px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(ft.text, ft.x + 1, fy - 42 + 1);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, fy - 42);
  }
  ctx.globalAlpha = 1;

  // Minimapa Vertical na Lateral Direita da Pista
  drawMinimap(playersArr);

  // Confetes se a corrida terminou
  if (state.status === 'finished') {
    for (const c of state.confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawPlayerKart(p) {
  // Com a Câmera Elástica, todos os corredores ficam sempre dentro de [SCREEN_TOP_Y, SCREEN_BOTTOM_Y]
  const screenY = Math.min(SCREEN_BOTTOM_Y + 12, Math.max(SCREEN_TOP_Y - 12, distanceToScreenY(p.distance)));

  const x = p.x;
  const speedKmh = Math.round(p.baseWalkSpeed + p.tapSpeed + p.turboSpeed);
  const hasTurbo = p.turboTimeLeft > 0;
  const isTappingFast = performance.now() - p.lastTapTime < 650;

  ctx.save();
  ctx.translate(x, screenY);

  // 1. Aura de SUPER TURBO (quando enviou presente)
  if (hasTurbo) {
    const tierColors = [
      'rgba(56, 189, 248, 0.45)',
      'rgba(56, 189, 248, 0.55)',
      'rgba(192, 132, 252, 0.65)',
      'rgba(245, 158, 11, 0.75)',
      'rgba(253, 224, 71, 0.9)'
    ];
    const auraRadius = 28 + p.turboTier * 5 + Math.sin(performance.now() * 0.02) * 4;
    const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, auraRadius);
    grad.addColorStop(0, tierColors[p.turboTier] || tierColors[1]);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Chamas do escapamento (Tap-Tap ou Turbo)
  if (isTappingFast || hasTurbo) {
    const flameLen = hasTurbo ? 24 + Math.random() * 16 : 12 + Math.random() * 10;
    ctx.fillStyle = hasTurbo ? '#fde047' : '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(-8, 18);
    ctx.lineTo(0, 18 + flameLen);
    ctx.lineTo(8, 18);
    ctx.closePath();
    ctx.fill();
  }

  // 3. Rodas do Kart
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-20, -14, 6, 11);
  ctx.fillRect(14, -14, 6, 11);
  ctx.fillRect(-20, 6, 6, 11);
  ctx.fillRect(14, 6, 6, 11);

  // 4. Corpo do Kart
  ctx.fillStyle = p.color;
  ctx.strokeStyle = hasTurbo ? '#fef08a' : '#ffffff';
  ctx.lineWidth = hasTurbo ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.roundRect(-15, -20, 30, 38, 9);
  ctx.fill();
  ctx.stroke();

  // 5. Avatar Circular do Usuário do TikTok
  const avatarRadius = 14;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, -1, avatarRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const avatarRecord = getAvatarImage(p.avatar);
  if (avatarRecord && avatarRecord.loaded) {
    ctx.drawImage(avatarRecord.img, -avatarRadius, -1 - avatarRadius, avatarRadius * 2, avatarRadius * 2);
  } else {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-avatarRadius, -1 - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.nickname.slice(0, 2).toUpperCase(), 0, -1);
  }
  ctx.restore();

  // Borda do avatar
  ctx.strokeStyle = hasTurbo ? '#fde047' : '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -1, avatarRadius, 0, Math.PI * 2);
  ctx.stroke();

  // 6. Etiqueta com Posição (1º, 2º...), @nome, metros e velocidade acima do corredor (bem transparente)
  const rankPrefix = p.rank ? `${p.rank}º ` : '';
  const labelText = `${rankPrefix}@${p.nickname.slice(0, 10)}`;
  const speedText = `${Math.floor(p.distance)}m • ${speedKmh} km/h`;

  ctx.font = 'bold 10px Segoe UI, sans-serif';
  const nameWidth = Math.max(ctx.measureText(labelText).width, ctx.measureText(speedText).width) + 12;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.36)';
  ctx.strokeStyle = p.rank === 1 || hasTurbo ? 'rgba(250, 204, 21, 0.65)' : 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = p.rank === 1 ? 1.5 : 1;
  ctx.beginPath();
  ctx.roundRect(-nameWidth / 2, -46, nameWidth, 23, 5);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = p.rank === 1 ? '#fef08a' : '#ffffff';
  ctx.fillText(labelText, 0, -35);

  ctx.font = '900 9px Segoe UI, sans-serif';
  ctx.fillStyle = hasTurbo ? '#fde047' : '#38bdf8';
  ctx.fillText(speedText, 0, -25);

  // 7. Balão de Chat se comentou na live
  if (p.chatBubbleTimer > 0 && p.chatBubble) {
    ctx.font = 'bold 10px Segoe UI, sans-serif';
    const bw = Math.min(130, ctx.measureText(p.chatBubble).width + 14);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-bw / 2, -68, bw, 18, 8);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.fillText(p.chatBubble.slice(0, 18), 0, -56);
  }

  ctx.restore();
}

function drawMinimap(playersArr) {
  const mapX = canvas.width - 22;
  const mapTop = 235;
  const mapBottom = canvas.height - 60;
  const mapHeight = mapBottom - mapTop;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.beginPath();
  ctx.roundRect(mapX - 6, mapTop, 12, mapHeight, 6);
  ctx.fill();

  for (const p of playersArr) {
    const progress = Math.min(1, Math.max(0, p.distance / state.raceDistance));
    const dotY = mapBottom - progress * mapHeight;
    ctx.fillStyle = p.turboTimeLeft > 0 ? '#fde047' : p.color;
    ctx.beginPath();
    ctx.arc(mapX, dotY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function gameLoop(now) {
  const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  updatePhysics(dt);
  drawTrack();

  requestAnimationFrame(gameLoop);
}

// ================= UTILITÁRIOS E SIMULADOR =================
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createInitialsDataUrl(name, bgColor) {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = bgColor || '#3b82f6';
  g.fillRect(0, 0, 96, 96);
  g.fillStyle = '#fff';
  g.font = 'bold 38px Segoe UI, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(name || 'TK').slice(0, 2).toUpperCase(), 48, 48);
  return c.toDataURL();
}

const DEMO_NAMES = [
  'lucas_gamer', 'mariana_vip', 'pedro_turbo', 'ana_lara', 'gabriel_ff',
  'julia_tiktok', 'rafael_rei', 'camila_star', 'thiago_br', 'leticia_live',
  'felipe_pro', 'beatriz_sp', 'gustavo_top', 'larissa_99', 'matheus_x'
];

function createRandomSimUser() {
  const base = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
  const suffix = Math.floor(Math.random() * 900 + 100);
  const uniqueId = `${base}_${suffix}`;
  return {
    id: uniqueId,
    uniqueId,
    nickname: uniqueId,
    avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(uniqueId)}`
  };
}

function getSelectedOrRandomSimUser() {
  const selectedId = activeSimPlayerSelect.value;
  if (selectedId && selectedId !== 'random' && state.players.has(selectedId)) {
    return state.players.get(selectedId);
  }
  const all = Array.from(state.players.values());
  if (all.length === 0) {
    return ensurePlayer(createRandomSimUser());
  }
  return all[Math.floor(Math.random() * all.length)];
}

function updateSimPlayerDropdown() {
  const currentVal = activeSimPlayerSelect.value;
  const playersArr = Array.from(state.players.values());
  let html = `<option value="random">🎲 Aleatório (Qualquer corredor)</option>`;
  for (const p of playersArr) {
    html += `<option value="${escapeHtml(p.id)}">@${escapeHtml(p.nickname)}</option>`;
  }
  activeSimPlayerSelect.innerHTML = html;
  if (state.players.has(currentVal)) {
    activeSimPlayerSelect.value = currentVal;
  }
}

// ================= EVENTOS DO SOCKET.IO E BOTÕES =================
socket.on('race_event', (payload) => {
  if (!payload || !payload.type) return;
  if (payload.type === 'join') {
    ensurePlayer(payload.user);
  } else if (payload.type === 'tap') {
    handleTapEvent(payload.user, payload.tapCount);
  } else if (payload.type === 'gift') {
    handleGiftEvent(payload);
  } else if (payload.type === 'chat') {
    handleChatEvent(payload.user, payload.comment);
  }
});

socket.on('tiktok_status', (status) => {
  tiktokStatusBanner.textContent = status.message || '';
  tiktokStatusBanner.classList.toggle('error', Boolean(status.error));

  if (status.connected) {
    connectTiktokBtn.classList.add('hidden');
    disconnectTiktokBtn.classList.remove('hidden');
  } else {
    connectTiktokBtn.classList.remove('hidden');
    disconnectTiktokBtn.classList.add('hidden');
  }
});

connectTiktokBtn.addEventListener('click', () => {
  const username = tiktokUsernameInput.value.trim();
  if (!username) {
    tiktokStatusBanner.textContent = '⚠️ Digite seu @usuario do TikTok antes de conectar.';
    tiktokStatusBanner.classList.add('error');
    return;
  }
  socket.emit('connect_tiktok', { username });
});

disconnectTiktokBtn.addEventListener('click', () => {
  socket.emit('disconnect_tiktok');
});

prizeInput.addEventListener('input', () => {
  state.prizeText = prizeInput.value.trim() || 'PRÊMIO SURPRESA!';
  hudPrizeText.textContent = state.prizeText;
});

if (prizeCostBrlInput) {
  prizeCostBrlInput.addEventListener('input', updateProfitDashboard);
}
if (coinValueBrlInput) {
  coinValueBrlInput.addEventListener('input', updateProfitDashboard);
}
updateProfitDashboard();

raceDistanceSelect.addEventListener('change', () => {
  state.raceDistance = Number(raceDistanceSelect.value) || 1000;
  hudDistanceInfo.textContent = `Meta: ${state.raceDistance}m`;
});

tapPowerRange.addEventListener('input', () => {
  state.tapMultiplier = Number(tapPowerRange.value) || 1.0;
  tapPowerVal.textContent = `${state.tapMultiplier.toFixed(1)}x`;
});

giftPowerRange.addEventListener('input', () => {
  state.giftMultiplier = Number(giftPowerRange.value) || 1.0;
  giftPowerVal.textContent = `${state.giftMultiplier.toFixed(2)}x`;
});

startRaceBtn.addEventListener('click', () => {
  startCountdownAndRace();
});

resetRaceBtn.addEventListener('click', () => {
  resetRoundKeepPlayers();
});

soundToggleBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggleBtn.textContent = soundEnabled ? '🔊 Som: Ligado' : '🔇 Som: Mudo';
});

if (voiceToggleBtn) {
  voiceToggleBtn.addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    if (!voiceEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    voiceToggleBtn.textContent = voiceEnabled ? '🗣️ Voz: Ligada' : '🔇 Voz: Muda';
    if (voiceEnabled) {
      speakPortuguese('Narrador de voz ativado!', true);
    }
  });
}

clearPlayersBtn.addEventListener('click', () => {
  state.players.clear();
  state.particles = [];
  state.floatingTexts = [];
  state.cameraDistance = 0;
  state.camMinDist = 0;
  state.camMaxDist = 70;
  winnerOverlay.classList.add('hidden');
  updateSimPlayerDropdown();
  addFeedItem('🧹 Pista limpa! Aguardando novos espectadores.');
});

// Botões de Simulação Manual
simJoinViewerBtn.addEventListener('click', () => {
  const u = createRandomSimUser();
  const p = ensurePlayer(u);
  activeSimPlayerSelect.value = p.id;
});

simJoin5ViewersBtn.addEventListener('click', () => {
  for (let i = 0; i < 5; i++) {
    ensurePlayer(createRandomSimUser());
  }
});

simTapSingleBtn.addEventListener('click', () => {
  const p = getSelectedOrRandomSimUser();
  handleTapEvent(p, 1);
});

simTapBurstBtn.addEventListener('click', () => {
  const p = getSelectedOrRandomSimUser();
  handleTapEvent(p, 15);
});

document.querySelectorAll('.btn-gift').forEach((btn) => {
  btn.addEventListener('click', () => {
    const p = getSelectedOrRandomSimUser();
    const giftName = btn.getAttribute('data-gift');
    const coins = Number(btn.getAttribute('data-coins')) || 1;
    handleGiftEvent({
      user: p,
      giftName,
      totalCoins: coins
    });
  });
});

// Atalho Tecla ESPAÇO para dar Tap-Tap e Tecla H para Ocultar Painel (Modo OBS)
window.addEventListener('keydown', (e) => {
  if (document.activeElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    return;
  }
  if (e.code === 'Space') {
    e.preventDefault();
    const p = getSelectedOrRandomSimUser();
    handleTapEvent(p, 2);
  } else if (e.key === 'h' || e.key === 'H') {
    toggleStreamerPanel();
  }
});

function toggleStreamerPanel() {
  const isHidden = controlPanel.classList.toggle('hidden');
  togglePanelBtn.textContent = isHidden
    ? '⚙️ Mostrar Painel (Tecla H)'
    : '⚙️ Ocultar Painel (Modo OBS)';
}

togglePanelBtn.addEventListener('click', toggleStreamerPanel);

// Simulador Automático de Live Cheia (Bots dando Tap-Tap e mandando Presentes)
setInterval(() => {
  if (!autoBotsToggle.checked || state.status !== 'running') return;

  if (state.players.size < 8 && Math.random() < 0.35) {
    ensurePlayer(createRandomSimUser());
  }

  const all = Array.from(state.players.values());
  if (all.length === 0) return;

  // Vários espectadores dando Tap-Tap
  const tapper = all[Math.floor(Math.random() * all.length)];
  const tapAmount = Math.floor(Math.random() * 8) + 1;
  handleTapEvent(tapper, tapAmount);

  // Chance de alguém mandar presente turbo
  if (Math.random() < 0.16) {
    const gifter = all[Math.floor(Math.random() * all.length)];
    const roll = Math.random();
    if (roll < 0.65) {
      handleGiftEvent({ user: gifter, giftName: 'Rosa', totalCoins: 1 });
    } else if (roll < 0.9) {
      handleGiftEvent({ user: gifter, giftName: 'Rosquinha', totalCoins: 30 });
    } else {
      handleGiftEvent({ user: gifter, giftName: 'Carro Esportivo', totalCoins: 200 });
    }
  }
}, 320);

// ================= CONTROLES E EVENTOS DE PIX (AUTOMÁTICO / MANUAL) =================
const pixModeSelect = document.getElementById('pixModeSelect');
const pixProviderSelect = document.getElementById('pixProviderSelect');
const pixApiKeyInput = document.getElementById('pixApiKeyInput');
const pixApiKeyGroup = document.getElementById('pixApiKeyGroup');
const pixStatusBanner = document.getElementById('pixStatusBanner');

const pixManualActionBox = document.getElementById('pixManualActionBox');
const manualWinnerName = document.getElementById('manualWinnerName');
const manualPixKeyText = document.getElementById('manualPixKeyText');
const manualPixKeyType = document.getElementById('manualPixKeyType');
const copyPixKeyBtn = document.getElementById('copyPixKeyBtn');
const confirmManualPixBtn = document.getElementById('confirmManualPixBtn');

const simWinnerPixChatBtn = document.getElementById('simWinnerPixChatBtn');
const pixReceiptOverlay = document.getElementById('pixReceiptOverlay');
const receiptAmount = document.getElementById('receiptAmount');
const receiptWinnerName = document.getElementById('receiptWinnerName');
const receiptPixKey = document.getElementById('receiptPixKey');
const receiptTxid = document.getElementById('receiptTxid');
const closeReceiptBtn = document.getElementById('closeReceiptBtn');

function syncPixConfigToServer() {
  socket.emit('update_pix_config', {
    mode: pixModeSelect ? pixModeSelect.value : 'AUTO',
    provider: pixProviderSelect ? pixProviderSelect.value : 'SIMULATOR',
    apiKey: pixApiKeyInput ? pixApiKeyInput.value.trim() : ''
  });
}

if (pixModeSelect) {
  pixModeSelect.addEventListener('change', () => {
    syncPixConfigToServer();
    if (pixStatusBanner) {
      if (pixModeSelect.value === 'AUTO') {
        pixStatusBanner.textContent = '⚡ Modo 100% Automático ativado: o PIX será enviado assim que o vencedor digitar a chave.';
        pixStatusBanner.style.background = 'rgba(16,185,129,0.15)';
        pixStatusBanner.style.color = '#a7f3d0';
      } else if (pixModeSelect.value === 'MANUAL') {
        pixStatusBanner.textContent = '🖐️ Modo Manual ativado: a chave será detectada e você confirma o envio com 1 clique.';
        pixStatusBanner.style.background = 'rgba(234,179,8,0.15)';
        pixStatusBanner.style.color = '#fef08a';
      } else {
        pixStatusBanner.textContent = '🚫 Envio de PIX desativado.';
        pixStatusBanner.style.background = 'rgba(239,68,68,0.15)';
        pixStatusBanner.style.color = '#fecaca';
      }
    }
  });
}

if (pixProviderSelect) {
  pixProviderSelect.addEventListener('change', () => {
    if (pixApiKeyGroup) {
      pixApiKeyGroup.style.display = pixProviderSelect.value === 'ASAAS' ? 'flex' : 'none';
    }
    syncPixConfigToServer();
  });
}

if (pixApiKeyInput) {
  pixApiKeyInput.addEventListener('input', syncPixConfigToServer);
}

// Quando o vencedor digita a chave e o modo está em MANUAL:
socket.on('pix_key_detected_manual', ({ winner, key, keyType }) => {
  if (!pixManualActionBox) return;
  manualWinnerName.textContent = `@${winner.nickname}`;
  manualPixKeyText.textContent = key;
  manualPixKeyType.textContent = keyType;
  pixManualActionBox.classList.remove('hidden');

  if (pixStatusBanner) {
    pixStatusBanner.textContent = `🔔 Chave de @${winner.nickname} pronta para envio! Clique no botão abaixo para confirmar.`;
  }
  speakPortuguese(`Chave de ${formatSpokenName(winner.nickname)} detectada! Preparando envio!`);
});

// Botão Copiar Chave
if (copyPixKeyBtn) {
  copyPixKeyBtn.addEventListener('click', () => {
    const key = manualPixKeyText.textContent;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(key).then(() => {
        copyPixKeyBtn.textContent = '✅ Copiado!';
        setTimeout(() => { copyPixKeyBtn.textContent = '📋 Copiar Chave'; }, 2000);
      });
    }
  });
}

// Botão Confirmar Envio do PIX no Modo Manual
if (confirmManualPixBtn) {
  confirmManualPixBtn.addEventListener('click', () => {
    confirmManualPixBtn.disabled = true;
    confirmManualPixBtn.textContent = 'Enviando...';
    socket.emit('confirm_manual_pix');
    setTimeout(() => {
      confirmManualPixBtn.disabled = false;
      confirmManualPixBtn.textContent = '💸 Enviar PIX Agora';
    }, 2000);
  });
}

// Quando o PIX é enviado com sucesso (seja no Automático ou Manual):
socket.on('pix_payment_success', ({ winner, payment }) => {
  if (pixManualActionBox) pixManualActionBox.classList.add('hidden');

  // Preenche e exibe comprovante na tela
  receiptAmount.textContent = `R$ ${payment.amount.toFixed(2).replace('.', ',')}`;
  receiptWinnerName.textContent = `@${winner.nickname}`;
  receiptPixKey.textContent = `${payment.key} (${payment.keyType})`;
  receiptTxid.textContent = payment.txid;
  pixReceiptOverlay.classList.remove('hidden');

  // Fala o comprovante com o narrador
  playSound('win');
  speakPortuguese(`Prêmio de ${Math.floor(payment.amount)} reais enviado com sucesso para ${formatSpokenName(winner.nickname)}!`, true);

  // Registra no histórico com etiqueta de comprovante
  const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  state.winnersHistory.unshift({
    time: timeStr,
    nickname: `${winner.nickname} [PIX PAGO ✅]`,
    prize: `R$ ${payment.amount.toFixed(2)} (${payment.key})`,
    taps: 0,
    coins: 0
  });
  renderWinnersHistory();

  // Fecha o comprovante automaticamente após 7 segundos
  setTimeout(() => {
    pixReceiptOverlay.classList.add('hidden');
  }, 7000);
});

if (closeReceiptBtn) {
  closeReceiptBtn.addEventListener('click', () => {
    pixReceiptOverlay.classList.add('hidden');
  });
}

// Botão de Teste: Simular Vencedor enviando PIX no Chat
if (simWinnerPixChatBtn) {
  simWinnerPixChatBtn.addEventListener('click', () => {
    const activeSel = activeSimPlayerSelect.value;
    let chosen = getSelectedOrRandomSimUser();
    // Simula como vencedor se não houver um ainda
    socket.emit('set_active_winner', {
      uniqueId: chosen.uniqueId,
      nickname: chosen.nickname,
      prizeAmount: 20.00,
      roundId: Date.now()
    });

    setTimeout(() => {
      const demoKeys = [
        '11987654321',
        'camila.vencedora@gmail.com',
        '33458921845',
        'c4a89f31-89be-4f51-b012-78d9124a9192'
      ];
      const randomKey = demoKeys[Math.floor(Math.random() * demoKeys.length)];
      socket.emit('simulate_winner_pix_chat', { key: randomKey });
    }, 400);
  });
}

// Se o link tiver ?obs=1, oculta o painel automaticamente para a cena do OBS ficar limpa
if (new URLSearchParams(window.location.search).has('obs')) {
  controlPanel.classList.add('hidden');
  togglePanelBtn.classList.add('hidden');
}

// Inicializa com 4 corredores de demonstração para o usuário já ver a pista funcionando!
for (let i = 0; i < 4; i++) {
  ensurePlayer(createRandomSimUser());
}
requestAnimationFrame(gameLoop);
