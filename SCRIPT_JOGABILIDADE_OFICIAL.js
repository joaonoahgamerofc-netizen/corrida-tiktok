/**
 * ==============================================================================
 * SCRIPT DA JOGABILIDADE & ECONOMIA OFICIAL - CORRIDA TIKTOK LIVE
 * ==============================================================================
 * 
 * Este script contém:
 * 1. Motor de Física Calibrado (Tap-Tap + Decaimento + Conversão Km/h para m/s)
 * 2. Tabela Econômica de Presentes (Anti-Exploit, Teto de 100m, 0.5m por Rosa)
 * 3. Trava de Lucratividade Blindada (Safe Profit Mode - Retenção de 10 Minutos)
 * 4. Regra Oficial do Apito Final aos 10 Minutos (Vitória por Liderança)
 * 5. Ciclo de Vida da Prova (Grid -> Largada 3-2-1 -> Corrida -> Pódio -> Reinício)
 * ==============================================================================
 */

class GameplayEngine {
  constructor(config = {}) {
    // Configurações Oficiais da Corrida
    this.raceDistance = config.raceDistance || 1000;         // 1.000 metros padrão
    this.targetDurationSeconds = config.duration || 600;     // 600 segundos (10 minutos exatos)
    this.prizeCostBrl = config.prizeCostBrl || 20.00;        // Custo do Prêmio PIX da Rodada
    this.coinNetValueBrl = config.coinNetValueBrl || 0.025;  // Lucro líquido do streamer por moeda
    this.safeProfitMode = config.safeProfitMode !== false;   // Blindagem de lucro ligada por padrão

    // Estado da Rodada
    this.status = 'waiting'; // 'waiting', 'countdown', 'running', 'finished'
    this.roundElapsedSeconds = 0;
    this.roundTotalCoins = 0;
    this.players = new Map(); // id -> Player
    this.activeWinner = null;
    this.leaderboard = [];
    this.previousLeaderId = null;

    // Referência opcional ao Narrador
    this.narrator = config.narrator || null;
  }

  // ============================================================================
  // 1. CÁLCULO DO PONTO DE EQUILÍBRIO (BREAK-EVEN DE MOEDAS)
  // ============================================================================
  getBreakEvenCoins() {
    return Math.ceil(this.prizeCostBrl / this.coinNetValueBrl);
  }

  isProfitTargetReached() {
    return this.roundTotalCoins >= this.getBreakEvenCoins();
  }

  // ============================================================================
  // 2. ENTRADA AUTOMÁTICA DE JOGADORES (LIKE, CHAT OU PRESENTE)
  // ============================================================================
  joinPlayer(user) {
    const id = String(user.uniqueId || user.userId || user.id || user.nickname);
    if (this.players.has(id)) {
      return this.players.get(id);
    }

    const player = {
      id,
      uniqueId: user.uniqueId || id,
      nickname: user.nickname || 'Corredor',
      avatar: user.profilePictureUrl || user.avatarUrl || null,
      distance: 0,
      baseWalkSpeed: 38,      // 38 km/h velocidade de cruzeiro
      tapSpeed: 0,           // Velocidade ganha por curtidas
      turboSpeed: 0,         // Velocidade ganha por presentes
      turboTimeLeft: 0,
      turboTier: 0,
      totalTaps: 0,
      totalCoins: 0,
      lastTapTime: 0,
      rank: this.players.size + 1
    };

    this.players.set(id, player);

    if (this.narrator) {
      this.narrator.narrateJoin(player.nickname);
    }

    return player;
  }

  // ============================================================================
  // 3. FÍSICA DO ACELERADOR POR TAP-TAP (CURTIDAS)
  // ============================================================================
  processTap(userId, count = 1) {
    const player = this.players.get(String(userId));
    if (!player) return;

    player.totalTaps += count;
    player.lastTapTime = performance.now();

    // Cada curtida adiciona +6.5 km/h até o teto de 180 km/h
    player.tapSpeed = Math.min(180, player.tapSpeed + count * 6.5);

    if (this.narrator && count >= 5) {
      this.narrator.playSound('tap');
    }
  }

  // ============================================================================
  // 4. TABELA ECONÔMICA E MATEMÁTICA DE PRESENTES (SUPER TURBO)
  // ============================================================================
  getGiftTurboSpecs(totalCoins) {
    const MAX_METERS_CAP = 100; // Trava máxima anti-exploit: nenhum presente passa de 100m!

    let rawMeters = 0.5;
    let tier = 1;
    let label = 'TURBO NITRO AZUL';
    let duration = 3.0;

    if (totalCoins >= 1000) {
      // 1.000+ moedas (Galáxia, Leão, etc.)
      rawMeters = 100;
      tier = 4;
      label = 'MEGA TURBO SUPREMO';
      duration = 8.0;
    } else if (totalCoins >= 100) {
      // 100 a 999 moedas (Confete, etc.): escala de 30m até 95m
      rawMeters = 30 + ((totalCoins - 100) / 900) * 65;
      tier = 3;
      label = 'HYPER TURBO OURO';
      duration = 6.0;
    } else if (totalCoins >= 10) {
      // 10 a 99 moedas (Rosquinha, Panda, etc.): escala de 5m até 28m
      rawMeters = 5 + ((totalCoins - 10) / 90) * 23;
      tier = 2;
      label = 'SUPER TURBO ROXO';
      duration = 4.5;
    } else {
      // 1 a 9 moedas (Rosa, Mini Presentes): apenas 0,5m por moeda!
      rawMeters = totalCoins * 0.5;
      tier = 1;
      label = 'TURBO NITRO AZUL';
      duration = 3.0;
    }

    const totalMetersGain = Math.min(MAX_METERS_CAP, Number(rawMeters.toFixed(1)));
    const instantMeters = totalMetersGain * 0.35; // 35% avanço imediato
    const turboMetersPerSec = (totalMetersGain * 0.65) / duration; // 65% na propulsão contínua
    const speedBoost = Math.round(turboMetersPerSec / 0.025);

    return {
      tier,
      label,
      totalMetersGain,
      speedBoost: Math.max(20, speedBoost),
      instantMeters,
      duration
    };
  }

  processGift(userId, giftName, coins) {
    const player = this.players.get(String(userId));
    if (!player || this.status === 'finished') return;

    const totalCoins = Math.max(1, Number(coins) || 1);
    player.totalCoins += totalCoins;
    this.roundTotalCoins += totalCoins;

    const specs = this.getGiftTurboSpecs(totalCoins);

    player.turboSpeed = specs.speedBoost;
    player.turboTimeLeft = specs.duration;
    player.turboTier = Math.max(player.turboTier, specs.tier);

    if (this.status === 'running') {
      player.distance += specs.instantMeters;
    }

    if (this.narrator) {
      this.narrator.narrateTurbo(player.nickname, giftName, specs.tier);
    }
  }

  // ============================================================================
  // 5. ATUALIZAÇÃO FÍSICA E CONTROLE DE TEMPO (60 FPS / DELTA TIME)
  // ============================================================================
  update(dt) {
    if (this.status !== 'running') return;

    this.roundElapsedSeconds += dt;
    const isProfitReached = this.isProfitTargetReached();
    const playersArr = Array.from(this.players.values());

    for (const p of playersArr) {
      // Decaimento natural do Tap-Tap (-22 km/h por segundo)
      p.tapSpeed = Math.max(0, p.tapSpeed - 22 * dt);

      // Decaimento do Super Turbo de Presentes
      if (p.turboTimeLeft > 0) {
        p.turboTimeLeft = Math.max(0, p.turboTimeLeft - dt);
        if (p.turboTimeLeft <= 0) {
          p.turboSpeed = 0;
          p.turboTier = 0;
        }
      }

      const totalSpeedKmh = p.baseWalkSpeed + p.tapSpeed + p.turboSpeed;
      // Escala: 1.000m em 600s (~66 km/h velocidade média -> fator 0.025)
      let metersPerSec = totalSpeedKmh * 0.025;

      // 5.1 BLINDAGEM DE LUCRO (SAFE PROFIT MODE)
      // Se a live ainda não bateu a meta de moedas para pagar o prêmio,
      // limita a velocidade máxima para que a corrida dure 10 minutos!
      if (this.safeProfitMode && !isProfitReached) {
        const maxAllowedDistNow = Math.min(
          this.raceDistance - 5,
          (this.roundElapsedSeconds / this.targetDurationSeconds) * this.raceDistance + 65
        );
        if (p.distance > maxAllowedDistNow) {
          metersPerSec *= 0.25; // Reduz a tração
        }
      }

      p.distance += metersPerSec * dt;
    }

    // 5.2 ORDENAÇÃO E RANKING (DO 1º AO ÚLTIMO)
    playersArr.sort((a, b) => b.distance - a.distance);
    playersArr.forEach((p, idx) => {
      p.rank = idx + 1;
    });
    this.leaderboard = playersArr;

    // 5.3 NARRADOR DE ULTRAPASSAGEM DA LIDERANÇA
    if (playersArr.length > 0 && playersArr[0].id !== this.previousLeaderId) {
      if (this.previousLeaderId !== null && this.narrator) {
        this.narrator.narrateOvertake(playersArr[0].nickname);
      }
      this.previousLeaderId = playersArr[0].id;
    }

    // 5.4 AVISO DOS ÚLTIMOS 100 METROS
    if (playersArr.length > 0 && playersArr[0].distance >= this.raceDistance - 100 && !this.announcedFinalStretch) {
      this.announcedFinalStretch = true;
      if (this.narrator) {
        this.narrator.narrateFinalStretch(playersArr[0].nickname);
      }
    }

    // 5.5 REGRA DO APITO FINAL (10 MINUTOS) OU CHEGADA EM 1.000M
    if (playersArr.length > 0) {
      const isDistanceFinished = playersArr[0].distance >= this.raceDistance;
      const isTimeFinished = this.roundElapsedSeconds >= this.targetDurationSeconds;

      if (isDistanceFinished || isTimeFinished) {
        if (isDistanceFinished) {
          playersArr[0].distance = this.raceDistance;
        }
        this.finishRace(playersArr[0], isTimeFinished && !isDistanceFinished);
      }
    }
  }

  // ============================================================================
  // 6. ENCERRAMENTO E CONSAGRAÇÃO DO VENCEDOR
  // ============================================================================
  finishRace(winner, isTimeout = false) {
    this.status = 'finished';
    this.activeWinner = winner;

    if (this.narrator) {
      if (isTimeout) {
        this.narrator.playSound('whistle');
      }
      this.narrator.narrateVictory(winner.nickname, isTimeout);
    }
  }

  // ============================================================================
  // 7. INICIAR NOVA RODADA MANTENDO OS JOGADORES NO GRID
  // ============================================================================
  startNewRound() {
    this.status = 'countdown';
    this.roundElapsedSeconds = 0;
    this.roundTotalCoins = 0;
    this.activeWinner = null;
    this.announcedFinalStretch = false;
    this.previousLeaderId = null;

    for (const p of this.players.values()) {
      p.distance = 0;
      p.tapSpeed = 0;
      p.turboSpeed = 0;
      p.turboTimeLeft = 0;
      p.turboTier = 0;
    }

    let count = 3;
    if (this.narrator) this.narrator.narrateCountdown(count);

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        if (this.narrator) this.narrator.narrateCountdown(count);
      } else if (count === 0) {
        this.status = 'running';
        if (this.narrator) this.narrator.narrateCountdown(0);
        clearInterval(timer);
      }
    }, 850);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameplayEngine;
}
