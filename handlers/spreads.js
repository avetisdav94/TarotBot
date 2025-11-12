const fs = require('fs');
const path = require('path');
const config = require('../config');

// Загрузка данных о раскладах
const spreadsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/spreads.json'), 'utf8')
);

// Хранилище активных сессий раскладов пользователей
const userSessions = new Map();

/**
 * Получить все расклады
 */
function getAllSpreads() {
  return spreadsData.spreads;
}

/**
 * Найти расклад по ID
 */
function getSpreadById(spreadId) {
  return spreadsData.spreads.find(s => s.id === spreadId);
}

/**
 * Создать меню выбора расклада
 */
function createSpreadsMenu() {
  const keyboard = [];
  
  spreadsData.spreads.forEach(spread => {
    keyboard.push([{
      text: `${spread.emoji} ${spread.name} (${spread.cardsCount} карт)`,
      callback_data: `spread_${spread.id}`
    }]);
  });
  
  keyboard.push([{
    text: `${config.emoji.back} Главное меню`,
    callback_data: 'main_menu'
  }]);
  
  return { inline_keyboard: keyboard };
}

/**
 * Форматировать описание расклада
 */
function formatSpreadDescription(spread) {
  let message = `${spread.emoji} <b>${spread.name}</b>\n\n`;
  message += `📋 <b>Описание:</b>\n${spread.description}\n\n`;
  message += `🎴 <b>Количество карт:</b> ${spread.cardsCount}\n\n`;
  message += `<b>Позиции карт:</b>\n`;
  
  spread.positions.forEach(position => {
    message += `${position}\n`;
  });
  
  message += `\n💡 <b>Инструкция:</b>\n${spread.instruction}`;
  
  return message;
}

/**
 * Создать клавиатуру для расклада
 */
function createSpreadKeyboard(spreadId) {
  return {
    inline_keyboard: [
      [
        {
          text: `${config.emoji.cards} Начать расклад`,
          callback_data: `start_spread_${spreadId}`
        }
      ],
      [
        {
          text: `${config.emoji.back} К выбору расклада`,
          callback_data: 'spreads_menu'
        }
      ],
      [
        {
          text: `${config.emoji.back} Главное меню`,
          callback_data: 'main_menu'
        }
      ]
    ]
  };
}

/**
 * Показать описание расклада
 */
async function handleShowSpread(bot, chatId, messageId, spreadId) {
  try {
    const spread = getSpreadById(spreadId);
    
    if (!spread) {
      await bot.answerCallbackQuery(messageId, {
        text: '❌ Расклад не найден',
        show_alert: true
      });
      return;
    }
    
    const message = formatSpreadDescription(spread);
    const keyboard = createSpreadKeyboard(spreadId);
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
    
    console.log(`🔮 Пользователь ${chatId} выбрал расклад: ${spread.name}`);
  } catch (error) {
    console.error('Ошибка при показе расклада:', error);
  }
}

/**
 * Начать сессию расклада
 */
async function handleStartSpread(bot, chatId, messageId, spreadId) {
  try {
    const spread = getSpreadById(spreadId);
    
    if (!spread) {
      await bot.answerCallbackQuery(messageId, {
        text: '❌ Расклад не найден',
        show_alert: true
      });
      return;
    }
    
    // Сохраняем активную сессию
    userSessions.set(chatId, {
      spreadId: spreadId,
      spreadName: spread.name,
      positions: spread.positions,
      cardsCount: spread.cardsCount,
      timestamp: Date.now()
    });
    
    const message = `${spread.emoji} <b>Расклад "${spread.name}"</b>\n\n` +
      `Введите названия ${spread.cardsCount} карт(ы) через запятую.\n\n` +
      `<b>Пример:</b>\n` +
      `Шут, Маг, Императрица перевернутая\n\n` +
      `<i>Если карта выпала в перевернутом положении, добавьте слово "перевернутая" после названия.</i>\n\n` +
      `Введите карты:`;
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{
            text: `${config.emoji.back} Отмена`,
            callback_data: 'spreads_menu'
          }]
        ]
      }
    });
    
    console.log(`▶️ Пользователь ${chatId} начал расклад: ${spread.name}`);
  } catch (error) {
    console.error('Ошибка при начале расклада:', error);
  }
}

/**
 * Получить активную сессию пользователя
 */
function getUserSession(chatId) {
  return userSessions.get(chatId);
}

/**
 * Удалить сессию пользователя
 */
function clearUserSession(chatId) {
  userSessions.delete(chatId);
}

/**
 * Очистка старых сессий (старше 1 часа)
 */
function cleanOldSessions() {
  const oneHour = 60 * 60 * 1000;
  const now = Date.now();
  
  for (const [chatId, session] of userSessions.entries()) {
    if (now - session.timestamp > oneHour) {
      userSessions.delete(chatId);
      console.log(`🧹 Удалена старая сессия пользователя ${chatId}`);
    }
  }
}

// Очистка старых сессий каждые 30 минут
setInterval(cleanOldSessions, 30 * 60 * 1000);

module.exports = {
  getAllSpreads,
  getSpreadById,
  createSpreadsMenu,
  formatSpreadDescription,
  handleShowSpread,
  handleStartSpread,
  getUserSession,
  clearUserSession
};