const fs = require('fs');
const path = require('path');
const config = require('../config');

// Загрузка данных о картах
const cardsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/cards.json'), 'utf8')
);

/**
 * Получить все карты Старших Арканов
 */
function getMajorArcana() {
  return cardsData.majorArcana;
}

/**
 * Получить все карты Младших Арканов
 */
function getMinorArcana() {
  const minor = [];
  Object.values(cardsData.minorArcana).forEach(suit => {
    minor.push(...suit);
  });
  return minor;
}

/**
 * Получить карты одной масти
 */
function getMinorArcanaBySuit(suitName) {
  return cardsData.minorArcana[suitName] || [];
}

/**
 * Получить все карты
 */
function getAllCards() {
  return [...getMajorArcana(), ...getMinorArcana()];
}

/**
 * Найти карту по имени (с учетом перевернутого положения)
 */
function findCardByName(cardName) {
  const cleanName = cardName
    .trim()
    .toLowerCase()
    .replace('перевернутая', '')
    .replace('перевернутый', '')
    .replace('перевернутое', '')
    .trim();
  
  const isReversed = cardName.toLowerCase().includes('перевернут');
  
  const allCards = getAllCards();
  const card = allCards.find(c => 
    c.name.toLowerCase() === cleanName || 
    c.nameEn.toLowerCase() === cleanName
  );
  
  return card ? { ...card, isReversed } : null;
}

/**
 * Форматировать информацию о карте для отображения
 */
function formatCardInfo(card) {
  const emoji = card.emoji || '🎴';
  
  let message = `${emoji} <b>${card.name}</b>\n`;
  message += `<i>${card.nameEn}</i>\n\n`;
  message += `📖 <b>Описание:</b>\n${card.description}\n\n`;
  message += `⬆️ <b>Прямое положение:</b>\n${card.upright}\n\n`;
  message += `⬇️ <b>Перевернутое положение:</b>\n${card.reversed}\n\n`;
  message += `🔑 <b>Ключевые слова:</b>\n${card.keywords.join(', ')}`;
  
  return message;
}

/**
 * Создать меню выбора типа аркана
 */
function createArcanaTypeMenu() {
  return {
    inline_keyboard: [
      [
        {
          text: `${config.emoji.major} Старшие Арканы (22 карты)`,
          callback_data: 'arcana_major'
        }
      ],
      [
        {
          text: `🔥 Жезлы (14 карт)`,
          callback_data: 'arcana_wands'
        },
        {
          text: `💧 Кубки (14 карт)`,
          callback_data: 'arcana_cups'
        }
      ],
      [
        {
          text: `⚔️ Мечи (14 карт)`,
          callback_data: 'arcana_swords'
        },
        {
          text: `🪙 Пентакли (14 карт)`,
          callback_data: 'arcana_pentacles'
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
 * Создать список карт с кнопками
 */
function createCardsListMenu(cards, arcanaType, page = 0) {
  const cardsPerPage = 10;
  const totalPages = Math.ceil(cards.length / cardsPerPage);
  const startIndex = page * cardsPerPage;
  const endIndex = Math.min(startIndex + cardsPerPage, cards.length);
  
  const keyboard = [];
  
  // Кнопки карт
  for (let i = startIndex; i < endIndex; i++) {
    const card = cards[i];
    keyboard.push([{
      text: `${card.emoji} ${card.name}`,
      callback_data: `show_card_${arcanaType}_${i}`
    }]);
  }
  
  // Навигация по страницам
  if (totalPages > 1) {
    const navRow = [];
    if (page > 0) {
      navRow.push({
        text: `⬅️ Назад`,
        callback_data: `cards_page_${arcanaType}_${page - 1}`
      });
    }
    navRow.push({
      text: `📄 ${page + 1}/${totalPages}`,
      callback_data: 'ignore'
    });
    if (page < totalPages - 1) {
      navRow.push({
        text: `Вперед ➡️`,
        callback_data: `cards_page_${arcanaType}_${page + 1}`
      });
    }
    keyboard.push(navRow);
  }
  
  // Кнопка назад
  keyboard.push([{
    text: `${config.emoji.back} К выбору аркана`,
    callback_data: 'cards_menu'
  }]);
  
  return { inline_keyboard: keyboard };
}

/**
 * Создать клавиатуру для просмотра карты
 */
function createCardViewKeyboard(arcanaType) {
  return {
    inline_keyboard: [
      [
        {
          text: `${config.emoji.back} К списку карт`,
          callback_data: `arcana_${arcanaType}`
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
 * Универсальная функция для отправки сообщения
 * Автоматически определяет нужно ли удалить старое и отправить новое
 */
async function safeEditMessage(bot, chatId, messageId, content, options = {}) {
  try {
    // Пробуем удалить старое сообщение
    try {
      await bot.deleteMessage(chatId, messageId);
    } catch (deleteError) {
      // Игнорируем ошибку удаления
    }
    
    // Отправляем новое сообщение
    if (content.type === 'photo') {
      return await bot.sendPhoto(chatId, content.photo, {
        caption: content.caption,
        parse_mode: options.parse_mode || 'HTML',
        reply_markup: options.reply_markup
      });
    } else {
      return await bot.sendMessage(chatId, content.text, {
        parse_mode: options.parse_mode || 'HTML',
        reply_markup: options.reply_markup
      });
    }
  } catch (error) {
    console.error('Ошибка в safeEditMessage:', error.message);
    throw error;
  }
}

/**
 * Обработчик показа конкретной карты
 */
async function handleShowCard(bot, chatId, messageId, arcanaType, cardIndex) {
  try {
    let cards;
    
    if (arcanaType === 'major') {
      cards = getMajorArcana();
    } else {
      cards = getMinorArcanaBySuit(arcanaType);
    }
    
    if (cardIndex < 0 || cardIndex >= cards.length) {
      return;
    }
    
    const card = cards[cardIndex];
    const message = formatCardInfo(card);
    const keyboard = createCardViewKeyboard(arcanaType);
    
    // Если есть изображение, отправляем его
    if (card.image) {
      try {
        await safeEditMessage(bot, chatId, messageId, {
          type: 'photo',
          photo: card.image,
          caption: message
        }, {
          reply_markup: keyboard
        });
      } catch (error) {
        // Если не удалось загрузить фото, отправляем текст
        console.error('Ошибка загрузки изображения:', error.message);
        await safeEditMessage(bot, chatId, messageId, {
          type: 'text',
          text: message
        }, {
          reply_markup: keyboard
        });
      }
    } else {
      await safeEditMessage(bot, chatId, messageId, {
        type: 'text',
        text: message
      }, {
        reply_markup: keyboard
      });
    }
    
    console.log(`📖 Пользователь ${chatId} просматривает карту: ${card.name}`);
  } catch (error) {
    console.error('Ошибка при показе карты:', error);
  }
}

/**
 * Обработчик выбора типа аркана (показ списка)
 */
async function handleArcanaType(bot, chatId, messageId, arcanaType, page = 0) {
  try {
    let cards, title;
    
    if (arcanaType === 'major') {
      cards = getMajorArcana();
      title = '✨ <b>Старшие Арканы</b>\n\nВыберите карту для просмотра:';
    } else {
      cards = getMinorArcanaBySuit(arcanaType);
      const suitNames = {
        'wands': '🔥 Жезлы',
        'cups': '💧 Кубки',
        'swords': '⚔️ Мечи',
        'pentacles': '🪙 Пентакли'
      };
      title = `${suitNames[arcanaType]} <b>Младшие Арканы</b>\n\nВыберите карту для просмотра:`;
    }
    
    const keyboard = createCardsListMenu(cards, arcanaType, page);
    
    await safeEditMessage(bot, chatId, messageId, {
      type: 'text',
      text: title
    }, {
      reply_markup: keyboard
    });
  } catch (error) {
    console.error('Ошибка при выборе типа аркана:', error);
  }
}

module.exports = {
  getMajorArcana,
  getMinorArcana,
  getMinorArcanaBySuit,
  getAllCards,
  findCardByName,
  formatCardInfo,
  createArcanaTypeMenu,
  createCardsListMenu,
  handleShowCard,
  handleArcanaType,
  safeEditMessage
};