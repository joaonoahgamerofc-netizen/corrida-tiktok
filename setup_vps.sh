#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE INSTALAÇÃO AUTOMATIZADA: CORRIDA TIKTOK LIVE 24H NA VPS UBUNTU
# ==============================================================================
set -e

echo "🚀 Iniciando configuração da VPS para Corrida TikTok Live 24h..."

# 1. Atualização dos repositórios (sem dar upgrade geral para não afetar robôs existentes)
echo "📦 Atualizando lista de pacotes..."
sudo apt update

# Define a porta do Jogo (pode ser passada como variável: PORT=3050 ./setup_vps.sh)
GAME_PORT="${PORT:-3000}"
echo "🔌 Porta configurada para o jogo: $GAME_PORT"

# 2. Instalação de dependências básicas e Node.js 20
echo "📦 Instalando curl, git, build-essential..."
sudo apt install -y curl git build-essential ufw software-properties-common

echo "📦 Instalando Node.js 20 LTS e PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 3. Instalação da Interface Gráfica Leve (XFCE) + XRDP (Área de Trabalho Remota)
echo "🖥️ Instalando interface XFCE e servidor de Área de Trabalho Remota (xrdp)..."
sudo apt install -y xfce4 xfce4-goodies xrdp chromium-browser

# Configurações do XRDP
sudo systemctl enable xrdp
sudo adduser xrdp ssl-cert || true
echo "xfce4-session" > ~/.xsession
sudo systemctl restart xrdp

# 4. Instalação do OBS Studio no Ubuntu
echo "🎥 Instalando OBS Studio..."
sudo add-apt-repository -y ppa:obsproject/obs-studio
sudo apt update
sudo apt install -y obs-studio

# 5. Configuração do Firewall (UFW)
echo "🛡️ Configurando Firewall (Liberando porta $GAME_PORT para o Jogo e 3389 para Área de Trabalho)..."
sudo ufw allow 22/tcp || true
sudo ufw allow "$GAME_PORT"/tcp || true
sudo ufw allow 3389/tcp || true
sudo ufw --force enable || true

# 6. Instalação das dependências do Jogo
echo "📦 Instalando pacotes npm do jogo..."
npm install

# 7. Iniciar o Jogo com PM2 (com nome exclusivo e porta isolada)
echo "🚀 Iniciando servidor do jogo no PM2..."
pm2 stop corrida-live 2>/dev/null || true
pm2 delete corrida-live 2>/dev/null || true
PORT="$GAME_PORT" pm2 start server.js --name "corrida-live" --env PORT="$GAME_PORT"
pm2 save

echo ""
echo "=============================================================================="
echo "✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
echo "=============================================================================="
echo "👉 Painel do Jogo: http://$(curl -s ifconfig.me):$GAME_PORT"
echo "👉 Conexão Remota: Abra 'Conexão de Área de Trabalho Remota' no Windows"
echo "   e conecte no IP da VPS porta 3389 para abrir o OBS Studio 24h!"
echo "=============================================================================="
