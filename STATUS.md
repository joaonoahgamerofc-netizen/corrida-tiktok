# 📊 STATUS DO PROJETO: Corrida Premiada TikTok Live

**Data da Última Atualização:** 28 de Outubro de 2026  
**Status Atual:** 🟢 **100% Implantado na VPS Hostinger (Porta 3001) e Pronto para Operar**

---

## 🎯 Resumo Executivo das Decisões Tomadas & Arquitetura

### 1. Dinâmica da Live & Interação do Público
- **Entrada Automática:** Qualquer pessoa que entra na live, comenta, curte ou manda presentes é inserida automaticamente como um kart corredor na pista, com sua foto de perfil oficial do TikTok e seu `@nome`.
- **Tap-Tap como Acelerador:** O Tap-Tap (curtidas) funciona como o pedal do acelerador. Quanto mais rápido o espectador clicar na tela do celular, maior a velocidade acumulada (`km/h`) e chamas de escapamento aparecem no veículo.
- **Narrador de Voz em Português (`Web Speech API`):** Fala o nome da pessoa ao entrar na pista (*"Camila entrou na pista!"*), narra turbos de presentes e anuncia o campeão no pódio.
- **Regra do Apito Final (Timeout de 10 minutos):** Se a rodada atingir o tempo máximo e ninguém tiver batido os 1.000m, o apito soa e **quem estiver em 1º Lugar naquele segundo é declarado o Campeão da Rodada**. Evita corridas infinitas e gera uma disputa insana no minuto final.

### 2. Câmera Elástica (Zoom Dinâmico)
- A câmera calcula em tempo real o intervalo entre o 1º colocado e o último colocado, ajustando o zoom para que **100% dos corredores permaneçam visíveis na tela durante toda a corrida**, com plaquinhas indicando posição (`1º`, `2º`), metros e velocidade.

### 3. Notificações Limpas e Transparentes
- Redução da opacidade das caixas de HUD para **22% a 26%**, permitindo enxergar os karts por trás de qualquer aviso.
- Notificações de feed condensadas em 1 única linha no topo, com desaparecimento automático em 2,8 segundos para deixar a área inferior livre para os comentários nativos do app TikTok.

### 4. Economia Lucrativa & Duração de 10 Minutos
- **Cálculo real de monetização do TikTok Brasil:**
  - Cada 1 moeda enviada rende cerca de **R$ 0,014 líquidos** ao criador após descontos da plataforma.
  - Para empatar um prêmio de R$ 20,00, a live precisa arrecadar cerca de **1.429 moedas** por rodada.
- **Travas no jogo:**
  - Pista padrão de **1.000 metros** calibrada para durar **~10 minutos**.
  - **Teto máximo por presente:** Nenhum presente pode avançar mais de **100 metros** (10% da pista).
  - **Rosa (1 moeda ≈ R$ 0,014):** Avança apenas **+0,5 metro** (10 Rosas = 5m). Impossível vencer com centavos.
  - **Rosquinha (30 moedas ≈ R$ 0,42):** Avança **+12 metros**.
  - **Confete (100 moedas ≈ R$ 1,40):** Avança **+30 metros**.
  - **Galáxia (1.000 moedas ≈ R$ 14,00):** Avança o teto de **+100 metros**.
  - **Trava de Lucro Seguro:** Freia suavemente o líder caso a corrida tente terminar antes dos 10 minutos sem ter batido a meta de moedas para pagar o prêmio.

### 5. Sistema de Pagamento PIX (Automático vs. Manual)
- **Modo Manual (Recomendado):** O robô detecta a chave do vencedor, valida se é quem realmente ganhou e exibe os botões `[Copiar Chave]` e `[Confirmar Envio]` no painel para o streamer aprovar antes de enviar.
- **Modo Automático:** Disparo direto via gateway bancário oficial **Asaas API** gerando comprovante com TXID na tela.

---

## 🖥️ Infraestrutura & Hospedagem na VPS Hostinger

- **IP da VPS:** `187.77.62.165`
- **Porta em Produção:** `3001` (Liberada no Firewall Hostinger: `Accept TCP 3001`)
- **Processo PM2:** `corrida-live` (PID ativo, reinicialização automática)
- **Repositório GitHub:** `https://github.com/joaonoahgamerofc-netizen/corrida-tiktok.git`
- **Isolamento de Processos:** Os robôs existentes (`aviator-game` na porta 3000 e `nexus-darwin`) continuam 100% operacionais e intocados.
- **Painel de Controle:** `http://187.77.62.165:3001` (Reconstruído 100% para produção, sem simuladores).
- **Fonte de Vídeo para o OBS:** `http://187.77.62.165:3001/?obs=1` (Resolução 1080x1920).

---

## 🛡️ Guia Oficial de Blindagem Anti-Ban do TikTok

1. **Vocabulário Seguro:** Proibido "PIX na Hora" na tela/título; usar **"PRÊMIO DA RODADA"** ou **"MIMO"**.
2. **Selo Legal na Tela:** `Gincana Gratuita (Tap-Tap acelera e pode vencer)`.
3. **Resgate Seguro:** Envio de chave por E-mail ou Direct para evitar censura de números de CPF no chat.
4. **Categoria da Transmissão:** Sempre selecionar **`Jogos / Games`**.
5. **Transmissão Sob Demanda:** O streamer liga e desliga quando estiver ao vivo, evitando punições de transmissão fantasma 24h desassistida.

*Bom descanso! O projeto está 100% configurado, testado e pronto para você usar.*
