# CLAUDE.md — Projeto Corrida Interativa TikTok Live

Guia de referência técnica, comandos, arquitetura e convenções para desenvolvedores e agentes trabalhando neste repositório.

---

## 📌 Visão Geral do Projeto
Jogo interativo em tempo real para **TikTok Live** integrado via `tiktok-live-connector` (Node.js + WebSockets). Os espectadores participam da corrida automaticamente ao entrar na live, aceleram dando **Tap-Tap** na tela e ganham turbo proporcional ao valor dos **Presentes** enviados. O vencedor recebe o prêmio via **PIX Automático** ou **PIX Manual (1-Clique)**.

---

## 🛠️ Stack Tecnológica
- **Backend:** Node.js (v20+), Express (v5), Socket.IO (v4), `tiktok-live-connector` (v2.5.0)
- **Frontend:** Vanilla JavaScript (ES6+), HTML5 Canvas 2D/2.5D, CSS3 (responsivo para 9:16 vertical do TikTok)
- **Áudio & Voz:** Web Audio API (sons sintetizados de motor, turbo, fanfarra) e Web Speech API (TTS nativo em `pt-BR`)
- **Pagamentos PIX:** Módulo customizado `pixService.js` com integração Asaas API e simulador local
- **Execução:** Windows (via `INICIAR_JOGO.bat`) ou Linux Ubuntu (via `pm2 start server.js`)

---

## 🚀 Comandos de Desenvolvimento

### Instalação de Dependências
```bash
npm install
```

### Iniciar Servidor Local
```bash
npm start
# ou:
node server.js
```
Acesse no navegador: `http://localhost:3000`  
URL limpa para fonte de navegador no OBS: `http://localhost:3000/?obs=1`

### Parar / Reiniciar Processo Daemon (Linux VPS / PM2)
```bash
pm2 start server.js --name "corrida-tiktok"
pm2 restart corrida-tiktok
pm2 logs corrida-tiktok
pm2 stop corrida-tiktok
```

---

## 🧱 Estrutura de Arquivos

```
live jogo/
├── server.js            # Servidor HTTP + WebSocket + TikTok Live Connector + Despachante PIX
├── pixService.js        # Parser de regex para chaves PIX e cliente de transferência bancária (Asaas)
├── package.json         # Manifesto de dependências e scripts do Node.js
├── INICIAR_JOGO.bat     # Script de inicialização rápida com 2 cliques no Windows
├── CLAUDE.md            # Instruções e diretrizes do projeto (este arquivo)
├── STATUS.md            # Relatório executivo de status, economia e decisões tomadas
└── public/
    ├── index.html       # Palco 9:16 vertical + HUD + Painel de Controle do Streamer
    ├── style.css        # Estilos neon, transparências para sobreposição OBS, modais de pódio e PIX
    └── game.js          # Física 2.5D, Câmera Elástica, Narrador de Voz pt-BR e sincronização
```

---

## ⚖️ Regras de Negócio e Economia da Live

### 1. Duração da Corrida e Escala de Metros
- Pista padrão: **1.000 metros** calibrada para durar **~10 minutos (600 segundos)**.
- Velocidade base + Tap-Tap médio: `~1,65 m/s` (`~100m por minuto`).
- Fator de conversão física: `metersPerSec = totalSpeedKmh * 0.025`.
- **Regra do Apito Final (Timeout):** Se o tempo limite (10 min) se esgotar e ninguém tiver chegado aos 1.000m, a corrida encerra imediatamente e **o 1º colocado (líder no momento que o relógio zerar) é declarado o vencedor oficial** (*"⏰ FIM DO TEMPO! VENCEU POR LIDERANÇA"*). Nenhuma corrida fica infinita.

### 2. Matemática de Lucro dos Presentes
- No TikTok Brasil, cada moeda enviada rende cerca de **R$ 0,014 líquidos** ao criador (após taxa do TikTok).
- **Teto Máximo Absoluto:** Nenhum presente pode avançar mais de **100 metros** na pista.
- **Rosa (1 moeda ≈ R$ 0,014):** Avança apenas **+0,5 metro** (10 Rosas = 5m). Impossível vencer com centavos.
- **Rosquinha (30 moedas ≈ R$ 0,42):** Avança **+12 metros**.
- **Confete (100 moedas ≈ R$ 1,40):** Avança **+30 metros**.
- **Galáxia / Leão (1.000+ moedas ≥ R$ 14,00):** Avança o teto máximo de **+100 metros**.
- **Modo Lucro Seguro:** Se ativado, o líder é freado suavemente caso tente cruzar a linha antes dos 10 minutos sem que a arrecadação da rodada tenha batido a meta do prêmio.

### 3. Câmera Elástica (Zoom Dinâmico)
- Mapeia a posição vertical entre o **Último Colocado** (`SCREEN_BOTTOM_Y = 825`) e o **1º Colocado** (`SCREEN_TOP_Y = 305`).
- Nenhum jogador sai da tela ou fica escondido, mesmo que a distância entre o líder e o lanterna ultrapasse 500 metros.

### 4. Sistema de PIX (Automático e Manual)
- **Validação de 4 Etapas:**
  1. O comentário no chat deve vir **obrigatoriamente da conta do vencedor oficial**.
  2. O comentário deve conter uma chave PIX reconhecida (E-mail, CPF, Celular ou EVP/Aleatória).
  3. A rodada não pode ter sido paga anteriormente (`activeWinner.paid = false`).
  4. O modo de envio deve estar ativo (`AUTO` ou `MANUAL`).
- **Modo AUTO:** Dispara o pagamento imediatamente e exibe o comprovante com TXID.
- **Modo MANUAL:** Detecta a chave, notifica o painel com a chave formatada e botões `[Copiar Chave]` e `[Enviar PIX Agora]`.

---

## ⚙️ Convenções de Código
- Manter o código frontend em Vanilla JS sem bundlers complexos para facilitar a edição em tempo real.
- Sempre atualizar a query string de cache nos scripts e estilos em `index.html` (`?v=N`) ao modificar assets estáticos.
- Manter as notificações e placares com opacidade baixa (`rgba(..., 0.25)`) para que a pista permaneça visível no OBS.
- Preservar o isolamento do parâmetro `?obs=1` para captura de tela limpa.
