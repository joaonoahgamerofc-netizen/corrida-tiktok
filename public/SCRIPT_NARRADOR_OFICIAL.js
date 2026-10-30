/**
 * ==============================================================================
 * SCRIPT DO NARRADOR OFICIAL & ÁUDIO PROCEDURAL - TIKTOK LIVE
 * ==============================================================================
 * 
 * Este script contém:
 * 1. Sintetizador de Voz em Português do Brasil (Web Speech API pt-BR)
 * 2. Algoritmo de Higienização Fonética de @Nicknames do TikTok
 * 3. Fila de Narração Inteligente com Prioridades (Ultrapassagens, Turbos, Vitória)
 * 4. Sintetizador de Efeitos Sonoros Procedurais (Web Audio API sem arquivos externos)
 * ==============================================================================
 */

class NarratorEngine {
  constructor() {
    this.voiceEnabled = true;
    this.soundEnabled = true;
    this.audioCtx = null;
    this.speechQueue = [];
    this.isSpeaking = false;
    this.ptVoice = null;

    this.initAudioContext();
    this.loadVoices();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  // ============================================================================
  // 1. CARREGAMENTO E DETECÇÃO DA VOZ NATURAL EM PORTUGUÊS (PT-BR)
  // ============================================================================
  loadVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    
    // Procura a melhor voz brasileira (Google português, Microsoft Maria, Leticia, etc.)
    this.ptVoice = voices.find(v => v.lang && v.lang.toLowerCase() === 'pt-br') ||
                   voices.find(v => v.lang && v.lang.toLowerCase().includes('pt-br')) ||
                   voices.find(v => v.lang && v.lang.toLowerCase().startsWith('pt'));
  }

  // ============================================================================
  // 2. HIGIENIZAÇÃO FONÉTICA DE NOMES DO TIKTOK
  // ============================================================================
  formatSpokenName(rawName) {
    // Transforma ex: "joao_pedro_9482" em "João Pedro" para soar natural
    const cleaned = String(rawName || '')
      .replace(/^@/, '')
      .replace(/[_.-]+/g, ' ')
      .replace(/\b\d+\b/g, '')
      .trim();

    const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 2);
    return words.join(' ') || String(rawName || 'Corredor');
  }

  // ============================================================================
  // 3. SISTEMA DE FALA COM PRIORIDADE (WEB SPEECH API)
  // ============================================================================
  speak(text, priority = false) {
    if (!this.voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      if (priority) {
        window.speechSynthesis.cancel();
      } else if (window.speechSynthesis.speaking) {
        // Evita congestionar a fila de áudio com frases repetidas
        return;
      }

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'pt-BR';
      utter.rate = 1.22;  // Locução rápida e animada
      utter.pitch = 1.05; // Entonação esportiva
      utter.volume = 1.0;

      if (this.ptVoice) {
        utter.voice = this.ptVoice;
      }

      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('[Narrador] Erro na síntese:', e);
    }
  }

  // ============================================================================
  // 4. FRASES OFICIAIS DE TRANSMISSÃO ESPORTIVA
  // ============================================================================
  narrateCountdown(num) {
    if (num > 0) {
      this.playSound('beep');
    } else {
      this.playSound('go');
      this.speak('Atenção corredores! Vai! Dada a largada!', true);
    }
  }

  narrateJoin(name) {
    this.playSound('join');
    this.speak(`${this.formatSpokenName(name)} entrou na pista!`);
  }

  narrateOvertake(leaderName) {
    this.speak(`Atenção! ${this.formatSpokenName(leaderName)} assumiu a liderança da corrida!`, true);
  }

  narrateTurbo(name, giftName, tier = 1) {
    this.playSound('gift', tier);
    if (tier >= 2) {
      this.speak(`${this.formatSpokenName(name)} pisou fundo e ativou o Super Turbo com ${giftName}!`, true);
    }
  }

  narrateFinalStretch(name) {
    this.speak(`${this.formatSpokenName(name)} entrou nos metros finais! Falta pouco para a vitória!`, true);
  }

  narrateTimeoutWarning(seconds) {
    this.speak(`Atenção corredores! Faltam apenas ${seconds} segundos para o apito final!`, true);
  }

  narrateVictory(name, isTimeout = false) {
    this.playSound('win');
    if (isTimeout) {
      this.speak(`Tempo esgotado! Parabéns ${this.formatSpokenName(name)}! Estava na liderança e é o grande campeão da rodada!`, true);
    } else {
      this.speak(`Parabéns ${this.formatSpokenName(name)}! Cruzou a linha de chegada e é o grande campeão da corrida!`, true);
    }
  }

  narratePixDetected(name) {
    this.speak(`Chave PIX de ${this.formatSpokenName(name)} detectada no chat! Conferindo o envio!`, true);
  }

  narratePixSent(name, amount) {
    this.playSound('win');
    this.speak(`Prêmio de ${Math.floor(amount)} reais enviado com sucesso para ${this.formatSpokenName(name)}! Comprovante gerado na tela!`, true);
  }

  // ============================================================================
  // 5. SINTETIZADOR PROCEDURAL DE ÁUDIO (WEB AUDIO API - ZERO DEPENDÊNCIAS)
  // ============================================================================
  initAudioContext() {
    if (typeof window === 'undefined') return;
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playSound(type, tier = 1) {
    if (!this.soundEnabled) return;
    this.initAudioContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'tap': {
        // Blip dinâmico de alta velocidade
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220 + Math.random() * 140, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.06);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }

      case 'gift': {
        // Rugido de propulsão de nitro proporcional ao Tier
        osc.type = 'sawtooth';
        const baseFreq = 300 + tier * 110;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, now + 0.35);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.42);
        break;
      }

      case 'beep': {
        // Bipe de largada (520Hz)
        osc.type = 'square';
        osc.frequency.setValueAtTime(520, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }

      case 'go': {
        // Sinal de largada estridente
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(784, now);
        osc.frequency.setValueAtTime(1046, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.42);
        break;
      }

      case 'whistle': {
        // Apito duplo de encerramento da corrida aos 10 minutos
        [2800, 3100].forEach((freq) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, now);
          g.gain.setValueAtTime(0.18, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
          o.start(now);
          o.stop(now + 0.68);
        });
        break;
      }

      case 'win': {
        // Fanfarra triunfal arpejada (Dó, Mi, Sol, Dó oitava)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, now + idx * 0.12);
          g.gain.setValueAtTime(0.15, now + idx * 0.12);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
          o.start(now + idx * 0.12);
          o.stop(now + idx * 0.12 + 0.36);
        });
        break;
      }
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NarratorEngine;
}
