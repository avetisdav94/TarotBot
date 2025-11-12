require('dotenv').config();

module.exports = {
  // Токены
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  groqApiKey: process.env.GROQ_API_KEY,
  
  // Настройки Groq API
  groqApiUrl: 'https://api.groq.com/openai/v1/chat/completions',
  groqModel: 'llama-3.3-70b-versatile', // ✅ ОБНОВЛЕНО! Актуальная модель
  
  // Настройки бота
  botOptions: {
    polling: true
  },
  
  // Эмодзи для интерфейса
  emoji: {
    cards: '🃏',
    spread: '🔮',
    info: 'ℹ️',
    back: '⬅️',
    next: '➡️',
    major: '✨',
    minor: '🎴',
    ai: '🤖',
    question: '❓'
  }
};