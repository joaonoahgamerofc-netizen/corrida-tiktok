/**
 * ==============================================================================
 * SCRIPT DA PISTA OFICIAL - CORRIDA INTERATIVA TIKTOK LIVE (2.5D CANVAS 9:16)
 * ==============================================================================
 * 
 * Este é o script EXATO e COMPLETO de renderização visual da pista do jogo.
 * Ele contém:
 * 1. Proporção vertical nativa 9:16 (540x960 ou 1080x1920)
 * 2. Asfalto Neon Noturno com margens de escape (#090d16 / #161f33)
 * 3. Zebras esportivas vermelhas e brancas animadas em alta velocidade
 * 4. 4 Raias com faixas pontilhadas sincronizadas com a rolagem da pista
 * 5. Sistema Matemático de Câmera Elástica (Zoom Dinâmico sem perder ninguém)
 * 6. Marcações transversais métricas com escala adaptativa (25m, 50m, 100m...)
 * 7. Linha de Chegada Quadriculada Dourada (1000m) com troféu e banner
 * 8. Karts 2.5D com rodas, avatar circular, chamas duplas e auras de Turbo
 * 9. Sistema de Partículas e Fagulhas de Nitro com efeito Screen Shake
 * 10. Minimapa HUD vertical lateral direito com telemetria dos competidores
 * ==============================================================================
 */

class TrackEngine {
  constructor(canvasElement) {
    this.canvas = canvasElement || document.getElementById('raceCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Dimensões do Canvas (Proporção 9:16)
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    // Configurações Geométricas da Pista
    this.trackLeft = 56;
    this.trackRight = this.width - 56;
    this.trackWidth = this.trackRight - this.trackLeft;
    this.lanesCount = 4;

    // Pontos de Ancoragem da Câmera Elástica na Tela
    this.SCREEN_BOTTOM_Y = 825; // Posição do último colocado (acima dos botões inferiores)
    this.SCREEN_TOP_Y = 305;    // Posição do líder (abaixo do painel Top 5)

    // Estado da Pista e Corrida
    this.state = {
      raceDistance: 1000,       // Distância total da prova em metros
      status: 'running',        // 'waiting', 'running', 'finished'
      camMinDist: 0,            // Distância mínima atual da câmera
      camMaxDist: 70,           // Distância máxima atual da câmera
      roadScrollPx: 0,          // Deslocamento contínuo da textura da pista
      screenShake: 0,           // Tremor de tela após super turbos
      particles: [],            // Fagulhas e faíscas de nitro
      floatingTexts: [],        // Textos flutuantes (+TAP, +TURBO)
      confetti: [],             // Chuva de confetes na vitória
      players: new Map()        // ID -> Corredor
    };

    this.lastFrameTime = performance.now();
    this.kartColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  }

  // ============================================================================
  // 1. CÂMERA ELÁSTICA: CONVERSÃO DE METROS DA CORRIDA PARA PIXELS DE TELA (Y)
  // ============================================================================
  distanceToScreenY(dist) {
    const span = Math.max(10, this.state.camMaxDist - this.state.camMinDist);
    const ratio = (dist - this.state.camMinDist) / span;
    return this.SCREEN_BOTTOM_Y - ratio * (this.SCREEN_BOTTOM_Y - this.SCREEN_TOP_Y);
  }

  // Intervalo inteligente das marcações de metros na pista conforme o zoom
  getDynamicMarkerStep(span) {
    if (span <= 120) return 25;
    if (span <= 300) return 50;
    if (span <= 700) return 100;
    if (span <= 1600) return 250;
    return 500;
  }

  // ============================================================================
  // 2. RENDERIZAÇÃO COMPLETA DA PISTA E ELEMENTOS VISUAIS
  // ============================================================================
  drawTrack() {
    const ctx = this.ctx;
    ctx.save();

    // 2.1 Efeito de Tremor de Tela (Impacto de Nitro)
    if (this.state.screenShake > 0) {
      const dx = (Math.random() - 0.5) * this.state.screenShake;
      const dy = (Math.random() - 0.5) * this.state.screenShake;
      ctx.translate(dx, dy);
    }

    // 2.2 Grama / Área de Escape Lateral (Preto Espacial / Azul Noturno)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2.3 Asfalto da Pista (Cinza Asfalto Profundo)
    ctx.fillStyle = '#161f33';
    ctx.fillRect(this.trackLeft, 0, this.trackWidth, this.height);

    // 2.4 Zebras Laterais (Vermelhas e Brancas) e Faixas Pontilhadas Animadas
    const stripeHeight = 45;
    const offsetPx = this.state.roadScrollPx % (stripeHeight * 2);

    for (let y = -stripeHeight * 2; y < this.height + stripeHeight * 2; y += stripeHeight) {
      const drawY = y + offsetPx;
      const isEven = Math.floor((y - offsetPx) / stripeHeight) % 2 === 0;

      // Zebra Esquerda e Zebra Direita
      ctx.fillStyle = isEven ? '#ef4444' : '#f8fafc';
      ctx.fillRect(this.trackLeft - 10, drawY, 10, stripeHeight);
      ctx.fillRect(this.trackRight, drawY, 10, stripeHeight);

      // Linhas Pontilhadas das Raias Internas (4 pistas de corrida)
      if (isEven) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
        for (let l = 1; l < this.lanesCount; l++) {
          const lx = this.trackLeft + (this.trackWidth / this.lanesCount) * l;
          ctx.fillRect(lx - 1.5, drawY, 3, stripeHeight * 0.55);
        }
      }
    }

    // 2.5 Marcações Métricas Transversais (0m, 25m, 50m, 100m...)
    const span = Math.max(10, this.state.camMaxDist - this.state.camMinDist);
    const step = this.getDynamicMarkerStep(span);
    const firstMeterMark = Math.max(0, Math.floor(this.state.camMinDist / step) * step);

    ctx.font = 'bold 12px Segoe UI, sans-serif';
    ctx.textAlign = 'center';

    for (let m = firstMeterMark; m <= this.state.raceDistance; m += step) {
      const y = this.distanceToScreenY(m);
      if (y < -40 || y > this.height + 40) continue;

      ctx.strokeStyle = m === 0 ? '#22c55e' : 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = m % (step * 2) === 0 ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(this.trackLeft, y);
      ctx.lineTo(this.trackRight, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(226, 232, 240, 0.42)';
      ctx.fillText(`${m}m`, this.width / 2, y - 5);
    }

    // 2.6 Linha de Chegada Quadriculada Dourada (1.000m)
    const finishY = this.distanceToScreenY(this.state.raceDistance);
    if (finishY > -80 && finishY < this.height + 80) {
      const sqSize = 14;
      const cols = Math.floor(this.trackWidth / sqSize);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? '#facc15' : '#111827';
          ctx.fillRect(this.trackLeft + c * sqSize, finishY - r * sqSize, sqSize, sqSize);
        }
      }
      ctx.fillStyle = '#fde047';
      ctx.font = '900 16px Segoe UI, sans-serif';
      ctx.fillText(`🏆 LINHA DE CHEGADA (${this.state.raceDistance}m) 🏆`, this.width / 2, finishY - 48);
    }

    // 2.7 Partículas de Nitro e Fagulhas de Aceleração
    for (const pt of this.state.particles) {
      const py = this.distanceToScreenY(pt.dist);
      if (py < -20 || py > this.height + 20) continue;
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, py, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 2.8 Desenha os Karts dos Corredores (ordenados por distância para profundidade)
    const playersArr = Array.from(this.state.players.values()).sort((a, b) => a.distance - b.distance);
    for (let i = 0; i < playersArr.length; i++) {
      playersArr[i].rank = playersArr.length - i;
    }
    for (const p of playersArr) {
      this.drawPlayerKart(p);
    }

    // 2.9 Textos Flutuantes (+TAP, +TURBO)
    for (const ft of this.state.floatingTexts) {
      const fy = this.distanceToScreenY(ft.dist);
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      ctx.font = '900 13px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000';
      ctx.fillText(ft.text, ft.x + 1, fy - 42 + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, fy - 42);
    }
    ctx.globalAlpha = 1;

    // 2.10 Minimapa HUD Lateral Direito
    this.drawMinimap(playersArr);

    // 2.11 Confetes comemorativos se a prova estiver concluída
    if (this.state.status === 'finished') {
      for (const c of this.state.confetti) {
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

  // ============================================================================
  // 3. RENDERIZAÇÃO DETALHADA DO KART DO COMPETIDOR
  // ============================================================================
  drawPlayerKart(p) {
    const ctx = this.ctx;
    const screenY = Math.min(this.SCREEN_BOTTOM_Y + 12, Math.max(this.SCREEN_TOP_Y - 12, this.distanceToScreenY(p.distance)));
    const x = p.x;
    const speedKmh = Math.round(p.baseWalkSpeed + p.tapSpeed + p.turboSpeed);
    const hasTurbo = p.turboTimeLeft > 0;
    const isTappingFast = performance.now() - p.lastTapTime < 650;

    ctx.save();
    ctx.translate(x, screenY);

    // AURA DE SUPER TURBO (GIFT TIER)
    if (hasTurbo) {
      const tierColors = [
        'rgba(56, 189, 248, 0.45)',
        'rgba(56, 189, 248, 0.55)',
        'rgba(192, 132, 252, 0.65)',
        'rgba(245, 158, 11, 0.75)',
        'rgba(253, 224, 71, 0.9)'
      ];
      const auraRadius = 28 + (p.turboTier || 1) * 5 + Math.sin(performance.now() * 0.02) * 4;
      const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, auraRadius);
      grad.addColorStop(0, tierColors[p.turboTier] || tierColors[1]);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // CHAMAS DUPLAS DO ESCAPAMENTO
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

    // 4 RODAS DO KART
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-20, -14, 6, 11);
    ctx.fillRect(14, -14, 6, 11);
    ctx.fillRect(-20, 6, 6, 11);
    ctx.fillRect(14, 6, 6, 11);

    // CORPO AERODINÂMICO DO KART
    ctx.fillStyle = p.color || '#3b82f6';
    ctx.strokeStyle = hasTurbo ? '#fef08a' : '#ffffff';
    ctx.lineWidth = hasTurbo ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.roundRect(-15, -20, 30, 38, 9);
    ctx.fill();
    ctx.stroke();

    // AVATAR CIRCULAR DO TIKTOK
    const avatarRadius = 14;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -1, avatarRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (p.avatarImg && p.avatarImg.complete) {
      ctx.drawImage(p.avatarImg, -avatarRadius, -1 - avatarRadius, avatarRadius * 2, avatarRadius * 2);
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

    // Borda do Avatar
    ctx.strokeStyle = hasTurbo ? '#fde047' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -1, avatarRadius, 0, Math.PI * 2);
    ctx.stroke();

    // TAG HUD DO PILOTO (Rank, @Nome, Metros e Velocidade)
    const rankPrefix = p.rank ? `${p.rank}º ` : '';
    const labelText = `${rankPrefix}@${p.nickname.slice(0, 10)}`;
    const speedText = `${Math.floor(p.distance)}m • ${speedKmh} km/h`;

    ctx.font = 'bold 10px Segoe UI, sans-serif';
    const nameWidth = Math.max(ctx.measureText(labelText).width, ctx.measureText(speedText).width) + 12;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.40)';
    ctx.strokeStyle = p.rank === 1 || hasTurbo ? 'rgba(250, 204, 21, 0.70)' : 'rgba(148, 163, 184, 0.35)';
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

    // BALÃO DE CHAT AO VIVO
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

  // ============================================================================
  // 4. MINIMAPA HUD VERTICAL LATERAL DIREITO
  // ============================================================================
  drawMinimap(playersArr) {
    const ctx = this.ctx;
    const mapX = this.width - 22;
    const mapTop = 235;
    const mapBottom = this.height - 60;
    const mapHeight = mapBottom - mapTop;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(mapX - 6, mapTop, 12, mapHeight, 6);
    ctx.fill();

    for (const p of playersArr) {
      const progress = Math.min(1, Math.max(0, p.distance / this.state.raceDistance));
      const dotY = mapBottom - progress * mapHeight;
      ctx.fillStyle = p.turboTimeLeft > 0 ? '#fde047' : (p.color || '#3b82f6');
      ctx.beginPath();
      ctx.arc(mapX, dotY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // ============================================================================
  // 5. ATUALIZAÇÃO DA FÍSICA E CÂMERA ELÁSTICA (DELTA TIME)
  // ============================================================================
  update(dt) {
    let leaderDist = 0;
    let leaderSpeed = 0;
    let lastPlaceDist = Infinity;

    for (const p of this.state.players.values()) {
      // 5.1 Decaimento natural do Tap e do Turbo
      if (p.tapSpeed > 0) {
        p.tapSpeed = Math.max(0, p.tapSpeed - 22 * dt);
      }
      if (p.turboTimeLeft > 0) {
        p.turboTimeLeft -= dt;
        if (p.turboTimeLeft <= 0) p.turboSpeed = 0;
      }
      if (p.chatBubbleTimer > 0) p.chatBubbleTimer -= dt;

      // 5.2 Avanço físico em metros (1 km/h = 1/3.6 m/s)
      const currentSpeedKmh = p.baseWalkSpeed + p.tapSpeed + p.turboSpeed;
      p.distance += (currentSpeedKmh / 3.6) * dt;

      if (p.distance > leaderDist) {
        leaderDist = p.distance;
        leaderSpeed = currentSpeedKmh;
      }
      if (p.distance < lastPlaceDist) {
        lastPlaceDist = p.distance;
      }

      // Emissão de fagulhas de turbo
      if (p.turboTimeLeft > 0 && Math.random() < 0.4) {
        this.state.particles.push({
          x: p.x + (Math.random() - 0.5) * 16,
          dist: p.distance - 2,
          size: 2 + Math.random() * 3,
          color: '#facc15',
          life: 0.5,
          maxLife: 0.5
        });
      }
    }

    if (lastPlaceDist === Infinity) lastPlaceDist = 0;

    // 5.3 Rolagem Dinâmica do Asfalto
    if (this.state.status === 'running') {
      this.state.roadScrollPx = (this.state.roadScrollPx + (45 + leaderSpeed * 2.4) * dt) % 10000;
    }

    // 5.4 CÂMERA ELÁSTICA DINÂMICA (SUAVIZAÇÃO LERP)
    const MIN_SPAN_METERS = 65;
    const targetMin = Math.max(0, lastPlaceDist);
    const targetMax = Math.max(targetMin + MIN_SPAN_METERS, leaderDist);

    this.state.camMinDist += (targetMin - this.state.camMinDist) * 3.5 * dt;
    this.state.camMaxDist += (targetMax - this.state.camMaxDist) * 3.5 * dt;

    // 5.5 Atualização de Partículas
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const pt = this.state.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) this.state.particles.splice(i, 1);
    }

    // 5.6 Atualização de Textos Flutuantes
    for (let i = this.state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.state.floatingTexts[i];
      ft.life -= dt;
      ft.dist += 1.5 * dt;
      if (ft.life <= 0) this.state.floatingTexts.splice(i, 1);
    }

    // 5.7 Amortecimento do Screen Shake
    if (this.state.screenShake > 0) {
      this.state.screenShake = Math.max(0, this.state.screenShake - 12 * dt);
    }

    // 5.8 Física dos Confetes de Vitória
    if (this.state.status === 'finished') {
      for (const c of this.state.confetti) {
        c.y += c.vy * dt;
        c.angle += 4 * dt;
        if (c.y > this.height + 20) {
          c.y = -20;
          c.x = Math.random() * this.width;
        }
      }
    }
  }

  // ============================================================================
  // 6. ADICIONAR OU ACELERAR JOGADORES (API DO JOGO)
  // ============================================================================
  addPlayer(id, nickname, avatarUrl) {
    const laneIndex = this.state.players.size % this.lanesCount;
    const laneWidth = this.trackWidth / this.lanesCount;
    const laneX = this.trackLeft + laneWidth * (laneIndex + 0.5);

    const player = {
      id,
      nickname,
      x: laneX,
      distance: 0,
      baseWalkSpeed: 38,
      tapSpeed: 0,
      turboSpeed: 0,
      turboTimeLeft: 0,
      turboTier: 0,
      lastTapTime: 0,
      chatBubble: '',
      chatBubbleTimer: 0,
      color: this.kartColors[this.state.players.size % this.kartColors.length],
      avatarImg: null
    };

    if (avatarUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = avatarUrl;
      player.avatarImg = img;
    }

    this.state.players.set(id, player);
    return player;
  }

  triggerTap(id, count = 1) {
    const p = this.state.players.get(id);
    if (!p) return;
    p.tapSpeed = Math.min(180, p.tapSpeed + count * 6.5);
    p.lastTapTime = performance.now();
    this.state.floatingTexts.push({
      x: p.x,
      dist: p.distance,
      text: `+${count} TAP!`,
      color: '#38bdf8',
      life: 0.8,
      maxLife: 0.8
    });
  }

  triggerTurbo(id, tier = 1) {
    const p = this.state.players.get(id);
    if (!p) return;
    const bonus = [0, 45, 90, 150, 220, 320][tier] || 60;
    p.turboSpeed = bonus;
    p.turboTimeLeft = 3.5;
    p.turboTier = tier;
    this.state.screenShake = Math.min(10, 2 + tier * 2);
    this.state.floatingTexts.push({
      x: p.x,
      dist: p.distance,
      text: `⚡ SUPER TURBO TIER ${tier}!`,
      color: '#facc15',
      life: 1.4,
      maxLife: 1.4
    });
  }

  // ============================================================================
  // 7. LOOP PRINCIPAL DE ANIMAÇÃO (60 FPS)
  // ============================================================================
  start() {
    const loop = (now) => {
      const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
      this.lastFrameTime = now;

      this.update(dt);
      this.drawTrack();

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// Exporta caso use em módulos ES/Node ou no navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TrackEngine;
}
