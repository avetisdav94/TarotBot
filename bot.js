const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const cardInfo = require('./handlers/cardInfo');
const spreads = require('./handlers/spreads');
const interpretation = require('./handlers/interpretation');
const history = require('./handlers/history');

// Проверка наличия токенов
if (!config.telegramToken || !config.groqApiKey) {
  console.error('❌ ОШИБКА: Не заданы токены в файле .env');
  console.error('Создайте файл .env и добавьте:');
  console.error('TELEGRAM_BOT_TOKEN=your_token_here');
  console.error('GROQ_API_KEY=your_groq_key_here');
  process.exit(1);
}

// Создание бота
const bot = new TelegramBot(config.telegramToken, config.botOptions);

console.log('🤖 Бот запущен!');
console.log('⏰ Время запуска:', new Date().toLocaleString('ru-RU'));
console.log('═══════════════════════════════════════════════════\n');

/**
 * Создать главное меню
 */
function createMainMenu() {
  return {
    inline_keyboard: [
      [
        {
          text: `${config.emoji.cards} Узнать о картах Таро`,
          callback_data: 'cards_menu'
        }
      ],
      [
        {
          text: `${config.emoji.spread} Выбрать расклад`,
          callback_data: 'spreads_menu'
        }
      ],
      [
        {
          text: `🎴 Карта дня`,
          callback_data: 'card_of_day'
        },
        {
          text: `❓ Быстрый ответ`,
          callback_data: 'quick_answer'
        }
      ],
      [
        {
          text: `📜 История гаданий`,
          callback_data: 'show_history'
        },
        {
          text: `📊 Статистика`,
          callback_data: 'show_stats'
        }
      ],
      [
        {
          text: `${config.emoji.info} О боте`,
          callback_data: 'about'
        },
        {
          text: `📚 Помощь`,
          callback_data: 'help'
        }
      ]
    ]
  };
}

/**
 * Команда /start
 */
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'друг';
  
  const welcomeMessage = 
    `🔮 <b>Добро пожаловать, ${firstName}!</b>\n\n` +
    `Я бот для работы с картами Таро, использующий искусственный интеллект для глубоких толкований.\n\n` +
    `✨ <b>Что я умею:</b>\n\n` +
    `🎴 <b>Справочник карт</b>\n` +
    `• Все 78 карт Таро с описаниями\n` +
    `• Значения в прямом и перевернутом положении\n` +
    `• Изображения классической колоды\n\n` +
    `🔮 <b>Расклады</b>\n` +
    `• 5 различных типов раскладов\n` +
    `• AI-толкование с учетом контекста\n` +
    `• Поддержка перевернутых карт\n\n` +
    `⚡ <b>Быстрые функции</b>\n` +
    `• Карта дня\n` +
    `• Быстрый ответ Да/Нет\n` +
    `• История гаданий\n` +
    `• Статистика\n\n` +
    `Выберите действие из меню ниже:`;
  
  await bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'HTML',
    reply_markup: createMainMenu()
  });
  
  console.log(`👋 Новый пользователь: ${chatId} (@${msg.from.username || 'без username'}) - ${firstName}`);
});

/**
 * Команда /help
 */
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  await showHelp(chatId);
});

/**
 * Показать справку
 */
async function showHelp(chatId, messageId = null) {
  const helpMessage =
    `📖 <b>Помощь по использованию бота</b>\n\n` +
    `<b>🎯 Основные команды:</b>\n` +
    `/start - Главное меню\n` +
    `/help - Эта справка\n` +
    `/menu - Вернуться в главное меню\n\n` +
    `<b>📚 Как изучать карты:</b>\n` +
    `1. Выберите "Узнать о картах Таро"\n` +
    `2. Выберите Старшие Арканы или масть\n` +
    `3. Кликните на интересующую карту\n` +
    `4. Изучите значение и изображение\n\n` +
    `<b>🔮 Как делать расклады:</b>\n` +
    `1. Выберите "Выбрать расклад"\n` +
    `2. Выберите тип расклада\n` +
    `3. Нажмите "Начать расклад"\n` +
    `4. Введите карты через запятую\n` +
    `5. Получите AI-толкование\n\n` +
    `<b>✍️ Формат ввода карт:</b>\n` +
    `• Карты вводятся <b>через запятую</b>\n` +
    `• Используйте русские названия\n` +
    `• Для перевернутой карты добавьте слово "перевернутая"\n\n` +
    `<b>Примеры:</b>\n` +
    `✅ Шут, Маг, Императрица\n` +
    `✅ Шут перевернутый, Маг, Луна перевернутая\n` +
    `✅ Туз Кубков, Десятка Мечей перевернутая\n\n` +
    `<b>🎴 Быстрые функции:</b>\n` +
    `• <b>Карта дня</b> - получите совет на день\n` +
    `• <b>Быстрый ответ</b> - ответ Да/Нет на вопрос\n` +
    `• <b>История</b> - просмотр прошлых раскладов\n` +
    `• <b>Статистика</b> - ваши предпочтения\n\n` +
    `<b>💡 Советы:</b>\n` +
    `• Задавайте конкретные вопросы\n` +
    `• Сосредоточьтесь перед раскладом\n` +
    `• Доверяйте интуиции при выборе карт\n` +
    `• Записывайте интересные толкования\n\n` +
    `<i>Помните: Таро - инструмент для самопознания и размышления! 🌟</i>`;
  
  const keyboard = {
    inline_keyboard: [
      [{
        text: `${config.emoji.back} Главное меню`,
        callback_data: 'main_menu'
      }]
    ]
  };
  
  if (messageId) {
    await cardInfo.safeEditMessage(bot, chatId, messageId, {
      type: 'text',
      text: helpMessage
    }, {
      reply_markup: keyboard
    });
  } else {
    await bot.sendMessage(chatId, helpMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }
}

/**
 * Команда /menu
 */
bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;
  
  await bot.sendMessage(chatId, '🔮 <b>Главное меню</b>\n\nВыберите действие:', {
    parse_mode: 'HTML',
    reply_markup: createMainMenu()
  });
});

/**
 * Карта дня
 */
async function handleCardOfDay(bot, chatId, messageId) {
  try {
    const allCards = cardInfo.getAllCards();
    const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
    
    // Случайно определяем положение карты
    const isReversed = Math.random() > 0.7; // 30% шанс перевернутой
    
    const orientation = isReversed ? '⬇️ Перевернутая' : '⬆️ Прямая';
    const meaning = isReversed ? randomCard.reversed : randomCard.upright;
    
    const message = 
      `🎴 <b>Ваша карта дня</b>\n\n` +
      `${randomCard.emoji} <b>${randomCard.name}</b>\n` +
      `<i>${randomCard.nameEn}</i>\n\n` +
      `Положение: ${orientation}\n\n` +
      `💫 <b>Значение:</b>\n${meaning}\n\n` +
      `📝 <b>Совет:</b>\n${randomCard.description}\n\n` +
      `<i>Позвольте энергии этой карты направлять вас сегодня!</i>`;
    
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🔄 Другая карта',
            callback_data: 'card_of_day'
          }
        ],
        [
          {
            text: `${config.emoji.spread} Сделать расклад`,
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
    
    // Если есть изображение, отправляем с фото
    if (randomCard.image) {
      try {
        await cardInfo.safeEditMessage(bot, chatId, messageId, {
          type: 'photo',
          photo: randomCard.image,
          caption: message
        }, {
          reply_markup: keyboard
        });
      } catch (error) {
        await cardInfo.safeEditMessage(bot, chatId, messageId, {
          type: 'text',
          text: message
        }, {
          reply_markup: keyboard
        });
      }
    } else {
      await cardInfo.safeEditMessage(bot, chatId, messageId, {
        type: 'text',
        text: message
      }, {
        reply_markup: keyboard
      });
    }
    
    console.log(`🎴 Пользователь ${chatId} получил карту дня: ${randomCard.name} (${orientation})`);
    
  } catch (error) {
    console.error('Ошибка при генерации карты дня:', error);
  }
}

/**
 * Быстрый ответ Да/Нет
 */
async function handleQuickAnswer(bot, chatId, messageId) {
  try {
    const message = 
      `❓ <b>Быстрый ответ</b>\n\n` +
      `Сейчас я вытяну карту и дам ответ на ваш вопрос.\n\n` +
      `💭 Сформулируйте вопрос в уме, чтобы ответ был Да или Нет.\n\n` +
      `Например:\n` +
      `• "Стоит ли мне принять это предложение?"\n` +
      `• "Это правильное решение?"\n` +
      `• "Будет ли успешным этот проект?"\n\n` +
      `Когда будете готовы, нажмите кнопку ниже:`;
    
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🎴 Вытянуть карту',
            callback_data: 'draw_quick_answer'
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
    
    await cardInfo.safeEditMessage(bot, chatId, messageId, {
      type: 'text',
      text: message
    }, {
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Ошибка в быстром ответе:', error);
  }
}

/**
 * Вытянуть карту для быстрого ответа
 */
async function drawQuickAnswer(bot, chatId, messageId) {
  try {
    const allCards = cardInfo.getAllCards();
    const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
    
    const isReversed = Math.random() > 0.5;
    
    // Определение ответа на основе энергии карты
    const positiveCards = ['Шут', 'Маг', 'Солнце', 'Звезда', 'Мир', 'Туз', 'Четверка Жезлов', 'Шестерка Жезлов', 'Девятка Кубков', 'Десятка Кубков'];
    const isPositive = positiveCards.some(name => randomCard.name.includes(name));
    
    let answer, answerEmoji;
    if (isReversed) {
      answer = isPositive ? 'Скорее НЕТ' : 'Точно НЕТ';
      answerEmoji = '❌';
    } else {
      answer = isPositive ? 'Точно ДА' : 'Скорее ДА';
      answerEmoji = '✅';
    }
    
    const orientation = isReversed ? 'перевернутом' : 'прямом';
    const meaning = isReversed ? randomCard.reversed : randomCard.upright;
    
    const message = 
      `${answerEmoji} <b>Ответ: ${answer}</b>\n\n` +
      `Выпала карта:\n` +
      `${randomCard.emoji} <b>${randomCard.name}</b> (в ${orientation} положении)\n\n` +
      `💬 <b>Пояснение:</b>\n${meaning}\n\n` +
      `🔮 <b>Совет:</b>\n${randomCard.description}`;
    
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🔄 Задать другой вопрос',
            callback_data: 'quick_answer'
          }
        ],
        [
          {
            text: `${config.emoji.spread} Подробный расклад`,
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
    
    if (randomCard.image) {
      try {
        await cardInfo.safeEditMessage(bot, chatId, messageId, {
          type: 'photo',
          photo: randomCard.image,
          caption: message
        }, {
          reply_markup: keyboard
        });
      } catch (error) {
        await cardInfo.safeEditMessage(bot, chatId, messageId, {
          type: 'text',
          text: message
        }, {
          reply_markup: keyboard
        });
      }
    } else {
      await cardInfo.safeEditMessage(bot, chatId, messageId, {
        type: 'text',
        text: message
      }, {
        reply_markup: keyboard
      });
    }
    
    console.log(`❓ Пользователь ${chatId} получил быстрый ответ: ${answer} (${randomCard.name})`);
    
  } catch (error) {
    console.error('Ошибка при вытягивании карты:', error);
  }
}

/**
 * Обработка callback запросов
 */
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;
  
  try {
    // Главное меню
    if (data === 'main_menu') {
      await cardInfo.safeEditMessage(bot, chatId, messageId, {
        type: 'text',
        text: '🔮 <b>Главное меню</b>\n\nВыберите действие:'
      }, {
        reply_markup: createMainMenu()
      });
    }
    
    // Меню карт
    else if (data === 'cards_menu') {
      await cardInfo.safeEditMessage(bot, chatId, messageId, {
        type: 'text',
        text: `${config.emoji.cards} <b>Справочник карт Таро</b>\n\n` +
          `Таро состоит из 78 карт:\n\n` +
          `✨ <b>Старшие Арканы (22 карты)</b>\n` +
          `Основные жизненные уроки и духовные принципы\n\n` +
          `🎴 <b>Младшие Арканы (56 карт)</b>\n` +
          `Повседневные события и ситуации:\n` +
          `• 🔥 Жезлы - действие, энергия, карьера\n` +
          `• 💧 Кубки - эмоции, отношения, чувства\n` +
          `• ⚔️ Мечи - мысли, конфликты, решения\n` +
          `• 🪙 Пентакли - материальное, финансы, здоровье\n\n` +
          `Выберите, что хотите изучить:`
      }, {
        reply_markup: cardInfo.createArcanaTypeMenu()
      });
    }
    
    // Выбор типа аркана (Старшие)
    else if (data === 'arcana_major') {
      await cardInfo.handleArcanaType(bot, chatId, messageId, 'major', 0);
    }
    
    // Выбор масти Младших Арканов
    else if (data.startsWith('arcana_') && 
        ['arcana_wands', 'arcana_cups', 'arcana_swords', 'arcana_pentacles'].includes(data)) {
      const suit = data.replace('arcana_', '');
      await cardInfo.handleArcanaType(bot, chatId, messageId, suit, 0);
    }
    
    // Пагинация списка карт
    else if (data.startsWith('cards_page_')) {
      const parts = data.replace('cards_page_', '').split('_');
      const arcanaType = parts[0];
      const page = parseInt(parts[1]);
      await cardInfo.handleArcanaType(bot, chatId, messageId, arcanaType, page);
    }
    
    // Показ конкретной карты
    else if (data.startsWith('show_card_')) {
      const parts = data.replace('show_card_', '').split('_');
      const arcanaType = parts[0];
      const cardIndex = parseInt(parts[1]);
      await cardInfo.handleShowCard(bot, chatId, messageId, arcanaType, cardIndex);
    }
    
    // Меню раскладов
    else if (data === 'spreads_menu') {
      await cardInfo.safeEditMessage(bot, chatId, messageId, {
        type: 'text',
        text: `${config.emoji.spread} <b>Расклады Таро</b>\n\n` +
          `Выберите расклад для гадания.\n\n` +
          `💡 <b>Совет:</b> Перед раскладом сформулируйте четкий вопрос и сосредоточьтесь на нем.\n\n` +
          `Каждый расклад имеет свое назначение:`
      }, {
        reply_markup: spreads.createSpreadsMenu()
      });
    }
    
    // Показ описания расклада
    else if (data.startsWith('spread_') && !data.startsWith('start_spread_')) {
      const spreadId = data.replace('spread_', '');
      await spreads.handleShowSpread(bot, chatId, messageId, spreadId, cardInfo.safeEditMessage);
    }
    
    // Начало расклада
    else if (data.startsWith('start_spread_')) {
      const spreadId = data.replace('start_spread_', '');
      await spreads.handleStartSpread(bot, chatId, messageId, spreadId, cardInfo.safeEditMessage);
    }
    
    // Карта дня
    else if (data === 'card_of_day') {
      await handleCardOfDay(bot, chatId, messageId);
    }
    
    // Быстрый ответ
    else if (data === 'quick_answer') {
      await handleQuickAnswer(bot, chatId, messageId);
    }
    
    // Вытянуть карту для быстрого ответа
    else if (data === 'draw_quick_answer') {
      await drawQuickAnswer(bot, chatId, messageId);
    }
    
    // История гаданий
    else if (data === 'show_history') {
      const userHistory = history.getHistory(chatId);
      const message = userHistory.length > 0
        ? `📜 <b>История ваших гаданий</b>\n\nВсего раскладов: ${userHistory.length}\n\nВыберите расклад для просмотра:`
        : `📜 <b>История гаданий</b>\n\nУ вас пока нет сохраненных раскладов.\n\nСделайте первый расклад!`;
      
      await cardInfo.safeEditMessage(bot, chatId, messageId, {
        type: 'text',
        text: message
      }, {
        reply_markup: history.createHistoryMenu(chatId, 0)
      });
    }
    
    // Пагинация истории
    else if (data.startsWith('history_page_')) {
      const page = parseInt(data.replace('history_page_', ''));
      const userHistory = history.getHistory(chatId);
      const message = `📜 <b>История ваших гаданий</b>\n\nВсего раскладов: ${userHistory.length}\n\nВыберите расклад для просмотра:`;
      
      await cardInfo.safeEditMessage(bot, chatId, messageId, {
        type: 'text',
        text: message
      }, {
        reply_markup: history.createHistoryMenu(chatId, page)
      });
    }
    
    // Просмотр конкретного расклада из истории
    else if (data.startsWith('view_history_')) {
      const spreadId = data.replace('view_history_', '');
      const spread = history.getSpreadById(chatId, spreadId);
      
      if (spread) {
        const message = history.formatSpreadView(spread);
        await cardInfo.safeEditMessage(bot, chatId, messageId, {
          type: 'text',
          text: message
        }, {
          reply_markup: history.createSpreadViewKeyboard(spreadId)
        });
      } else {
        await bot.answerCallbackQuery(query.id, {
          text: '❌ Расклад не найден',
          show_alert: true
        });
      }
    }
    
    // Удаление расклада
    else if (data.startsWith('delete_history_')) {
      const spreadId = data.replace('delete_history_', '');
      history.deleteSpread(chatId, spreadId);
      
      await bot.answerCallbackQuery(query.id, {
        text: '✅ Расклад удален',
        show_alert: false
      });
      
      // Возвращаемся к истории
      const userHistory = history.getHistory(chatId);
      const message = userHistory.length > 0
        ? `📜 <b>История ваших гаданий</b>\n\nВсего раскладов: ${userHistory.length}\n\nВыберите расклад для просмотра:`
        : `📜 <b>История гаданий</b>\n\nВсе расклады удалены.`;
      
      await cardInfo.safeEditMessage(bot, chatId, messageId, {
        type: 'text',
        text: message
      }, {
        reply_markup: history.createHistoryMenu(chatId, 0)
      });
    }
    
    // Подтверждение очистки истории
    else if (data === 'clear_history_confirm') {
      await cardInfo.safeEditMessage(bot, chatId, messageId, {
        type: 'text',
        text: '⚠️ <b>Очистка истории</b>\n\nВы уверены, что хотите удалить ВСЕ расклады из истории?\n\nЭто действие нельзя отменить!'
      }, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '✅ Да, удалить все',
                callback_data: 'clear_history_confirmed'
              }
            ],
            [
              {
                text: '❌ Отмена',
                callback_data: 'show_history'
              }
            ]
          ]
        }
      });
    }
    
    // Очистка истории
    else if (data === 'clear_history_confirmed') {
      history.clearHistory(chatId);
      
      await bot.answerCallbackQuery(query.id, {
        text: '✅ История очищена',
        show_alert: false
      });
      
      await cardInfo.safeEditMessage(bot, chatId, messageId, {
        type: 'text',
        text: `📜 <b>История гаданий</b>\n\nИстория успешно очищена.\n\nСделайте первый расклад!`
      }, {
        reply_markup: history.createHistoryMenu(chatId, 0)
      });
    }
    
    // Статистика
    else if (data === 'show_stats') {
      const statsMessage = history.formatStats(chatId);
      
      await cardInfo.safeEditMessage(bot, chatId, messageId, {
        type: 'text',
        text: statsMessage
      }, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📜 История гаданий',
                callback_data: 'show_history'
              }
            ],
            [
              {
                text: `${config.emoji.back} Главное меню`,
                callback_data: 'main_menu'
              }
            ]
          ]
        }
      });
    }
    
    // Помощь
    else if (data === 'help') {
      await showHelp(chatId, messageId);
    }
    
    // О боте
    else if (data === 'about') {
      const aboutMessage =
        `${config.emoji.info} <b>О боте Таро</b>\n\n` +
        `🔮 Это полнофункциональный бот для работы с картами Таро, использующий искусственный интеллект для глубоких и точных толкований.\n\n` +
        `<b>✨ Особенности:</b>\n\n` +
        `📚 <b>Полная колода</b>\n` +
        `• 22 Старших Аркана\n` +
        `• 56 Младших Аркана (4 масти)\n` +
        `• Подробные описания каждой карты\n` +
        `• Классические изображения Райдера-Уэйта\n\n` +
        `🔮 <b>Расклады</b>\n` +
        `• 5 различных типов раскладов\n` +
        `• От простых до сложных\n` +
        `• AI-толкование с учетом контекста\n` +
        `• Поддержка перевернутых карт\n\n` +
        `🤖 <b>Искусственный интеллект</b>\n` +
        `• Технология Groq (llama-3.3-70b)\n` +
        `• Индивидуальные толкования\n` +
        `• Учет взаимосвязи карт\n` +
        `• Практические советы\n\n` +
        `⚡ <b>Дополнительно</b>\n` +
        `• Карта дня с советом\n` +
        `• Быстрый ответ Да/Нет\n` +
        `• История гаданий (10 последних)\n` +
        `• Статистика использования\n\n` +
        `<b>🛠️ Технологии:</b>\n` +
        `• Node.js + Telegram Bot API\n` +
        `• Groq AI для толкований\n` +
        `• JSON база данных\n\n` +
        `<b>📖 Философия:</b>\n` +
        `Таро - это не предсказание будущего, а инструмент для самопознания, размышления и получения новых перспектив. Карты помогают задать правильные вопросы и найти ответы внутри себя.\n\n` +
        `<i>Версия: 1.0.0\n` +
        `Создано с 🔮 для изучения Таро</i>`;
      
      await cardInfo.safeEditMessage(bot, chatId, messageId, {
        type: 'text',
        text: aboutMessage
      }, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: `📚 Помощь`,
                callback_data: 'help'
              }
            ],
            [
              {
                text: `${config.emoji.back} Главное меню`,
                callback_data: 'main_menu'
              }
            ]
          ]
        }
      });
    }
    
    // Игнорировать callback (для пагинации)
    else if (data === 'ignore') {
      await bot.answerCallbackQuery(query.id);
      return;
    }
    
    // Подтверждение обработки callback
    await bot.answerCallbackQuery(query.id);
    
  } catch (error) {
    console.error('❌ Ошибка при обработке callback:', error);
    
    try {
      await bot.answerCallbackQuery(query.id, {
        text: '❌ Произошла ошибка. Попробуйте еще раз.',
        show_alert: true
      });
    } catch (e) {
      console.error('Не удалось отправить ответ на callback:', e);
    }
  }
});

/**
 * Обработка текстовых сообщений (для ввода карт)
 */
bot.on('message', async (msg) => {
  // Игнорируем команды
  if (msg.text && msg.text.startsWith('/')) {
    return;
  }
  
  const chatId = msg.chat.id;
  
  // Проверяем, есть ли активная сессия расклада
  const session = spreads.getUserSession(chatId);
  
  if (session) {
    // Обрабатываем ввод карт
    await interpretation.handleUserCardsInput(bot, msg);
  } else {
    // Если нет активной сессии, предлагаем помощь
    const tips = [
      '💡 Хотите узнать о картах Таро? Используйте /menu',
      '🔮 Готовы сделать расклад? Нажмите /start',
      '❓ Нужна помощь? Команда /help',
      '🎴 Попробуйте "Карту дня" для быстрого совета!',
      '✨ Выберите расклад в главном меню /menu'
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    
    await bot.sendMessage(chatId, randomTip, {
      reply_markup: {
        inline_keyboard: [
          [{
            text: '🔮 Открыть меню',
            callback_data: 'main_menu'
          }]
        ]
      }
    });
  }
});

/**
 * Обработка ошибок polling
 */
bot.on('polling_error', (error) => {
  console.error('❌ Ошибка polling:', error.code);
  if (error.response) {
    console.error('Ответ:', error.response.body);
  }
});

/**
 * Обработка необработанных ошибок
 */
process.on('unhandledRejection', (error) => {
  console.error('❌ Необработанная ошибка Promise:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Необработанное исключение:', error);
});

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n⏹️  Получен сигнал SIGINT. Останавливаем бота...');
  bot.stopPolling();
  server.close(() => {
    console.log('👋 HTTP сервер остановлен');
    console.log('👋 Бот остановлен');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Получен сигнал SIGTERM. Останавливаем бота...');
  bot.stopPolling();
  server.close(() => {
    console.log('👋 HTTP сервер остановлен');
    console.log('👋 Бот остановлен');
    process.exit(0);
  });
});

// ============================================
// HTTP СЕРВЕР ДЛЯ RENDER.COM
// ============================================

const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Главная страница
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'TarotAI Telegram Bot',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    message: '🔮 TarotAI Bot is running successfully!',
    endpoints: {
      status: '/status',
      health: '/health',
      ping: '/ping'
    }
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    status: 'healthy',
    bot_running: true,
    memory_usage: process.memoryUsage(),
    uptime_seconds: Math.floor(process.uptime())
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Ping endpoint
app.get('/ping', (req, res) => {
  res.send('pong');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'This is a Telegram Bot. Please use Telegram to interact.'
  });
});

// Запуск HTTP сервера
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`🌐 HTTP сервер запущен на порту ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/`);
  console.log('═══════════════════════════════════════════════════\n');
});

// Обработка ошибок сервера
server.on('error', (error) => {
  console.error('❌ Ошибка HTTP сервера:', error);
});

// ============================================
// КОНЕЦ HTTP СЕРВЕРА
// ============================================

// Финальное сообщение о готовности
console.log('✅ Бот полностью инициализирован и готов к работе!');
console.log('📝 Логи действий пользователей:\n');