const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const tiktokPkg = require('tiktok-live-connector');
const TikTokLiveConnection = tiktokPkg.TikTokLiveConnection || tiktokPkg.WebcastPushConnection;
const pixService = require('./pixService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

let tiktokConnection = null;
let currentUsername = null;
let isConnected = false;

// Estado do Vencedor Atual aguardando Chave PIX
let activeWinner = null;
let pixConfig = {
  enabled: true,
  mode: 'AUTO', // 'AUTO' | 'MANUAL' | 'OFF'
  provider: 'SIMULATOR', // 'SIMULATOR' | 'ASAAS'
  apiKey: ''
};

// Controle para evitar duplicidade em presentes de combo (streak)
const activeGiftStreaks = new Map();

function normalizeUser(data) {
  const u = data?.user || data || {};
  const uniqueId =
    u.uniqueId ||
    u.userId ||
    data?.uniqueId ||
    data?.userId ||
    `user_${Math.floor(Math.random() * 10000)}`;
  const nickname = u.nickname || data?.nickname || uniqueId;
  const avatar =
    u.profilePictureUrl ||
    u.profilePicture?.urls?.[0] ||
    u.profilePicture?.url?.[0] ||
    data?.profilePictureUrl ||
    '';

  return {
    id: String(uniqueId),
    uniqueId: String(uniqueId),
    nickname: String(nickname),
    avatar: String(avatar)
  };
}

async function connectToTikTok(username, options = {}) {
  const cleanUsername = String(username || '').trim().replace(/^@/, '');
  if (!cleanUsername) {
    throw new Error('Informe um @usuario válido do TikTok.');
  }

  if (tiktokConnection) {
    try {
      await tiktokConnection.disconnect();
    } catch (_) {}
    tiktokConnection = null;
  }

  currentUsername = cleanUsername;
  const connectionOptions = {
    processInitialData: true,
    enableExtendedGiftInfo: true
  };

  if (options.sessionId && options.sessionId.trim()) {
    connectionOptions.sessionId = options.sessionId.trim();
  }
  if (options.ttwid && options.ttwid.trim()) {
    connectionOptions.ttwid = options.ttwid.trim();
  }

  tiktokConnection = new TikTokLiveConnection(cleanUsername, connectionOptions);

  const state = await tiktokConnection.connect();
  isConnected = true;

  io.emit('tiktok_status', {
    connected: true,
    username: cleanUsername,
    roomId: state.roomId,
    message: `🟢 Conectado à live de @${cleanUsername} (Sala ${state.roomId})`
  });

  // 1. Pessoas entrando na live -> Vira personagem automaticamente
  tiktokConnection.on('member', (data) => {
    const user = normalizeUser(data);
    io.emit('race_event', {
      type: 'join',
      user
    });
  });

  // 2. Tap-Tap na tela (Curtidas) -> Acelerador proporcional à quantidade de taps
  tiktokConnection.on('like', (data) => {
    const user = normalizeUser(data);
    const tapCount = Math.max(1, Number(data.likeCount) || 1);
    io.emit('race_event', {
      type: 'tap',
      user,
      tapCount,
      totalLikes: Number(data.totalLikeCount) || 0
    });
  });

  // 3. Presentes -> Turbo proporcional ao valor em moedas/diamantes
  tiktokConnection.on('gift', (data) => {
    const user = normalizeUser(data);
    const giftId = data.giftId || data.giftDetails?.giftId || 0;
    const repeatCount = Math.max(1, Number(data.repeatCount) || 1);
    const giftType = data.giftDetails?.giftType ?? data.giftType ?? 0;
    const diamondUnit = Math.max(
      1,
      Number(
        data.giftDetails?.diamondCount ??
          data.extendedGiftInfo?.diamond_count ??
          data.diamondCount ??
          1
      )
    );
    const giftName =
      data.giftDetails?.giftName ||
      data.extendedGiftInfo?.name ||
      data.giftName ||
      'Presente';
    const giftPictureUrl =
      data.giftDetails?.giftImage?.url?.[0] ||
      data.extendedGiftInfo?.image?.url_list?.[0] ||
      data.giftPictureUrl ||
      '';

    const streakKey = `${user.id}_${giftId}`;

    let deltaCount = repeatCount;
    if (giftType === 1) {
      const prevCount = activeGiftStreaks.get(streakKey) || 0;
      deltaCount = Math.max(0, repeatCount - prevCount);
      if (data.repeatEnd) {
        activeGiftStreaks.delete(streakKey);
      } else {
        activeGiftStreaks.set(streakKey, repeatCount);
      }
    }

    if (deltaCount <= 0) return;

    const totalCoins = diamondUnit * deltaCount;
    io.emit('race_event', {
      type: 'gift',
      user,
      giftName,
      giftPictureUrl,
      repeatCount: deltaCount,
      diamondUnit,
      totalCoins
    });
  });

  // 4. Comentários no chat -> Balão de fala + DETECÇÃO E VALIDAÇÃO DE CHAVE PIX DO VENCEDOR
  tiktokConnection.on('chat', async (data) => {
    const user = normalizeUser(data);
    io.emit('race_event', {
      type: 'chat',
      user,
      comment: String(data.comment || '').slice(0, 70)
    });

    await checkAndExecutePixIfWinner(user, String(data.comment || ''));
  });

  tiktokConnection.on('streamEnd', () => {
    isConnected = false;
    io.emit('tiktok_status', {
      connected: false,
      username: cleanUsername,
      message: `A live de @${cleanUsername} foi encerrada.`
    });
  });

  tiktokConnection.on('disconnected', () => {
    isConnected = false;
    io.emit('tiktok_status', {
      connected: false,
      username: cleanUsername,
      message: `Desconectado da live de @${cleanUsername}.`
    });
  });
}

async function executePixTransferForWinner(key, keyType) {
  if (!activeWinner || activeWinner.paid) return;

  const result = await pixService.processPixPayment({
    config: pixConfig,
    winner: activeWinner,
    commentText: `PIX: ${key}`
  });

  if (result.success) {
    activeWinner.paid = true;
    activeWinner.txid = result.txid;
    activeWinner.key = result.key;
    activeWinner.paidAt = new Date().toLocaleTimeString('pt-BR');

    io.emit('pix_payment_success', {
      winner: activeWinner,
      payment: result
    });
    console.log(`✅ [PIX ENVIADO] ${result.message}`);
  } else {
    io.emit('pix_payment_status', {
      status: 'warn',
      winner: activeWinner,
      message: result.reason
    });
  }
}

async function checkAndExecutePixIfWinner(user, commentText) {
  if (!pixConfig.enabled || pixConfig.mode === 'OFF' || !activeWinner || activeWinner.paid) return;

  const userClean = String(user.uniqueId || user.id || '').toLowerCase().replace(/^@/, '');
  const winnerClean = String(activeWinner.uniqueId || '').toLowerCase().replace(/^@/, '');

  // Validação 1: O comentário precisa vir EXATAMENTE da conta do vencedor oficial da rodada!
  if (userClean !== winnerClean) return;

  const extracted = pixService.extractPixKey(commentText);
  if (!extracted) {
    io.emit('pix_payment_status', {
      status: 'warn',
      winner: activeWinner,
      message: `Comentário de @${activeWinner.nickname} recebido, mas não continha formato de Chave PIX válido.`
    });
    return;
  }

  // Se o Modo for MANUAL: Notifica o painel do streamer com os botões [Copiar] e [Pagar Agora]
  if (pixConfig.mode === 'MANUAL') {
    activeWinner.pendingKey = extracted.key;
    activeWinner.pendingKeyType = extracted.type;
    io.emit('pix_key_detected_manual', {
      winner: activeWinner,
      key: extracted.key,
      keyType: extracted.type
    });
    console.log(`🔔 [PIX MANUAL] Chave de @${activeWinner.nickname} detectada: ${extracted.key} (${extracted.type}). Aguardando confirmação no painel.`);
    return;
  }

  // Se o Modo for AUTO: Envia imediatamente pelo banco!
  try {
    await executePixTransferForWinner(extracted.key, extracted.type);
  } catch (err) {
    console.error('❌ [ERRO NO PIX]', err.message);
    io.emit('pix_payment_status', {
      status: 'error',
      winner: activeWinner,
      message: `Erro ao enviar PIX: ${err.message}`
    });
  }
}

io.on('connection', (socket) => {
  socket.emit('tiktok_status', {
    connected: isConnected,
    username: currentUsername,
    message: isConnected
      ? `🟢 Conectado à live de @${currentUsername}`
      : '🔴 Desconectado (Informe seu @ do TikTok para conectar)'
  });

  socket.emit('pix_config_state', {
    enabled: pixConfig.enabled,
    mode: pixConfig.mode,
    provider: pixConfig.provider,
    hasApiKey: Boolean(pixConfig.apiKey),
    activeWinner
  });

  socket.on('set_active_winner', (winnerData) => {
    if (!winnerData) {
      activeWinner = null;
      return;
    }
    activeWinner = {
      id: String(winnerData.uniqueId || winnerData.id || ''),
      uniqueId: String(winnerData.uniqueId || winnerData.id || '').toLowerCase(),
      nickname: String(winnerData.nickname || winnerData.uniqueId || ''),
      prizeAmount: Number(winnerData.prizeAmount) || 20.00,
      roundId: winnerData.roundId || Date.now(),
      paid: false
    };
    io.emit('active_winner_update', activeWinner);
    console.log(`🏆 [NOVO VENCEDOR REGISTRADO] @${activeWinner.nickname} aguardando chave PIX!`);
  });

  socket.on('update_pix_config', (newConfig) => {
    if (!newConfig) return;
    if (typeof newConfig.enabled === 'boolean') pixConfig.enabled = newConfig.enabled;
    if (newConfig.mode) pixConfig.mode = newConfig.mode;
    if (newConfig.provider) pixConfig.provider = newConfig.provider;
    if (typeof newConfig.apiKey === 'string') pixConfig.apiKey = newConfig.apiKey.trim();
    io.emit('pix_config_state', {
      enabled: pixConfig.enabled,
      mode: pixConfig.mode,
      provider: pixConfig.provider,
      hasApiKey: Boolean(pixConfig.apiKey),
      activeWinner
    });
  });

  socket.on('confirm_manual_pix', async () => {
    if (!activeWinner || activeWinner.paid || !activeWinner.pendingKey) return;
    try {
      await executePixTransferForWinner(activeWinner.pendingKey, activeWinner.pendingKeyType || 'PHONE');
    } catch (err) {
      console.error('❌ [ERRO NO PIX MANUAL]', err.message);
      socket.emit('pix_payment_status', {
        status: 'error',
        winner: activeWinner,
        message: `Erro ao enviar PIX: ${err.message}`
      });
    }
  });

  socket.on('simulate_winner_pix_chat', async ({ key }) => {
    if (!activeWinner) return;
    const fakeComment = `Meu pix é ${key || '11999999999'}`;
    const fakeUser = {
      id: activeWinner.uniqueId,
      uniqueId: activeWinner.uniqueId,
      nickname: activeWinner.nickname
    };
    io.emit('race_event', {
      type: 'chat',
      user: fakeUser,
      comment: fakeComment
    });
    await checkAndExecutePixIfWinner(fakeUser, fakeComment);
  });

  socket.on('connect_tiktok', async ({ username, sessionId, ttwid }) => {
    try {
      socket.emit('tiktok_status', {
        connected: false,
        username,
        loading: true,
        message: `Conectando à live de @${username}...`
      });
      await connectToTikTok(username, { sessionId, ttwid });
    } catch (err) {
      isConnected = false;
      socket.emit('tiktok_status', {
        connected: false,
        username,
        error: true,
        message: `Erro ao conectar em @${username}: verifique se a conta está AO VIVO agora. (${err.message})`
      });
    }
  });

  socket.on('disconnect_tiktok', async () => {
    if (tiktokConnection) {
      try {
        await tiktokConnection.disconnect();
      } catch (_) {}
      tiktokConnection = null;
    }
    isConnected = false;
    io.emit('tiktok_status', {
      connected: false,
      username: null,
      message: 'Desconectado do TikTok Live. Modo Simulador pronto.'
    });
  });

  socket.on('simulate_event', (payload) => {
    io.emit('race_event', payload);
  });

  socket.on('host_command', (cmd) => {
    io.emit('host_command', cmd);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🏁 Corrida Interativa TikTok Live rodando!`);
  console.log(`👉 Abra no navegador: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
