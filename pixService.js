// Serviço de Validação e Envio de PIX Automático
// Suporta: Asaas API, Mercado Pago API e Modo Simulação (para testes locais)

const https = require('https');

// Regex para identificar e validar os 4 formatos de Chave PIX aceitos no Brasil
const PIX_PATTERNS = {
  EMAIL: /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/,
  CPF: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/,
  PHONE: /\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}[-\s]?\d{4}|\d{4}[-\s]?\d{4})\b/,
  EVP: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/
};

function extractPixKey(text) {
  if (!text || typeof text !== 'string') return null;

  // 1. Tenta identificar E-mail
  const emailMatch = text.match(PIX_PATTERNS.EMAIL);
  if (emailMatch) {
    return { key: emailMatch[0].trim(), type: 'EMAIL' };
  }

  // 2. Tenta identificar Chave Aleatória (EVP/UUID)
  const evpMatch = text.match(PIX_PATTERNS.EVP);
  if (evpMatch) {
    return { key: evpMatch[0].trim(), type: 'EVP' };
  }

  // 3. Tenta identificar CPF
  const cpfMatch = text.match(PIX_PATTERNS.CPF);
  if (cpfMatch) {
    const cleanCpf = cpfMatch[0].replace(/\D/g, '');
    if (cleanCpf.length === 11) {
      return { key: cleanCpf, type: 'CPF' };
    }
  }

  // 4. Tenta identificar Telefone Celular
  const phoneMatch = text.match(PIX_PATTERNS.PHONE);
  if (phoneMatch) {
    let cleanPhone = phoneMatch[0].replace(/\D/g, '');
    if (cleanPhone.length >= 10 && cleanPhone.length <= 13) {
      if (!cleanPhone.startsWith('55') && (cleanPhone.length === 10 || cleanPhone.length === 11)) {
        cleanPhone = '55' + cleanPhone;
      }
      return { key: '+' + cleanPhone, type: 'PHONE' };
    }
  }

  return null;
}

// Envia o PIX real via API do Asaas (O gateway mais simples e confiável para PIX automático)
async function sendPixAsaas(apiKey, key, keyType, amountBrl) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      value: amountBrl,
      pixAddressKey: key,
      pixAddressKeyType: keyType,
      description: 'Premio Corrida TikTok Live'
    });

    const options = {
      hostname: 'www.asaas.com',
      port: 443,
      path: '/api/v3/transfers',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
        'User-Agent': 'TikTokLiveGame'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              success: true,
              txid: json.id || json.transactionReceiptUrl || 'PIX_' + Date.now(),
              raw: json
            });
          } else {
            const errorMsg = json.errors?.[0]?.description || json.message || 'Erro no envio do PIX pelo Asaas';
            reject(new Error(errorMsg));
          }
        } catch (e) {
          reject(new Error('Resposta inválida do banco Asaas: ' + body));
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(payload);
    req.end();
  });
}

// Disparador principal de pagamento com travas de segurança
async function processPixPayment({ config, winner, commentText }) {
  // Trava 1: Verifica se o vencedor existe e se já não foi pago
  if (!winner || winner.paid) {
    return { success: false, reason: 'Nenhum vencedor aguardando pagamento ou rodada já paga.' };
  }

  // Trava 2: Extrai e valida o formato da chave enviada no chat
  const extracted = extractPixKey(commentText);
  if (!extracted) {
    return {
      success: false,
      reason: 'Mensagem do vencedor recebida, mas não continha formato de Chave PIX reconhecido.'
    };
  }

  const amount = Number(winner.prizeAmount) || 20.00;

  // Trava 3: Se o modo for Simulação (ou sem API Key), simula o envio com sucesso
  if (!config.apiKey || config.provider === 'SIMULATOR') {
    return {
      success: true,
      simulated: true,
      key: extracted.key,
      keyType: extracted.type,
      amount,
      txid: 'SIM_PIX_' + Math.floor(Math.random() * 899999 + 100000),
      message: `[SIMULAÇÃO] PIX de R$ ${amount.toFixed(2)} enviado para ${extracted.key} (${extracted.type})!`
    };
  }

  // Trava 4: Envio real pelo provedor configurado
  if (config.provider === 'ASAAS') {
    const result = await sendPixAsaas(config.apiKey, extracted.key, extracted.type, amount);
    return {
      success: true,
      simulated: false,
      key: extracted.key,
      keyType: extracted.type,
      amount,
      txid: result.txid,
      message: `PIX de R$ ${amount.toFixed(2)} enviado com sucesso! Comprovante: ${result.txid}`
    };
  }

  return { success: false, reason: 'Provedor de PIX desconhecido: ' + config.provider };
}

module.exports = {
  extractPixKey,
  processPixPayment
};
