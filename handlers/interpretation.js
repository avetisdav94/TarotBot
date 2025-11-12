const axios = require('axios');
const config = require('../config');
const { findCardByName } = require('./cardInfo');
const { getUserSession, clearUserSession } = require('./spreads');
const history = require('./history');

/**
 * Парсинг введенных пользователем карт
 */
function parseUserCards(input) {
  const cardNames = input.split(',').map(s => s.trim());
  const parsedCards = [];
  const errors = [];
  
  for (let i = 0; i < cardNames.length; i++) {
    const cardName = cardNames[i];
    const card = findCardByName(cardName);
    
    if (card) {
      parsedCards.push(card);
    } else {
      errors.push(`❌ Карта "${cardName}" не найдена`);
    }
  }
  
  return { parsedCards, errors };
}

/**
 * Создать промпт для AI на основе расклада и карт
 */
function createAIPrompt(spreadName, positions, cards) {
  let prompt = `Ты профессиональный таролог с многолетним опытом. `;
  prompt += `Пользователь сделал расклад "${spreadName}" и получил следующие карты:\n\n`;
  
  cards.forEach((card, index) => {
    const position = positions[index] || `Позиция ${index + 1}`;
    const orientation = card.isReversed ? ' (перевернутая)' : ' (прямая)';
    prompt += `${position}: ${card.name}${orientation}\n`;
  });
  
  prompt += `\nДай подробное, структурированное толкование этого расклада. `;
  prompt += `Учитывай значение каждой позиции и взаимосвязь карт между собой. `;
  prompt += `Ответ должен быть понятным, поддерживающим и давать практические советы. `;
  prompt += `Используй эмодзи для лучшего восприятия. `;
  prompt += `Структурируй ответ по позициям, а в конце дай общий вывод и совет.`;
  
  return prompt;
}

/**
 * Получить толкование от Groq AI
 */
async function getAIInterpretation(prompt) {
  try {
    console.log('🤖 Отправка запроса в Groq API...');
    
    const response = await axios.post(
      config.groqApiUrl,
      {
        model: config.groqModel,
        messages: [
          {
            role: 'system',
            content: 'Ты опытный таролог, который дает глубокие и точные толкования карт Таро. Твои ответы структурированы, понятны и помогают людям.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${config.groqApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Толкование получено успешно');
    return response.data.choices[0].message.content;
    
  } catch (error) {
    console.error('❌ Ошибка при обращении к Groq API:');
    
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные:', error.response.data);
    } else if (error.request) {
      console.error('Нет ответа от сервера. Проверьте интернет соединение.');
    } else {
      console.error('Ошибка:', error.message);
    }
    
    throw new Error('Не удалось получить толкование от AI');
  }
}

/**
 * Форматировать список карт для отображения
 */
function formatCardsList(cards, positions) {
  let message = '🎴 <b>Ваши карты:</b>\n\n';
  
  cards.forEach((card, index) => {
    const position = positions[index]?.split(' - ')[0] || `${index + 1}.`;
    const orientation = card.isReversed ? '⬇️ перевернутая' : '⬆️ прямая';
    message += `${position} ${card.emoji || '🎴'} ${card.name} (${orientation})\n`;
  });
  
  return message;
}

/**
 * Обработчик ввода карт пользователем
 */
async function handleUserCardsInput(bot, msg) {
  const chatId = msg.chat.id;
  const userInput = msg.text;
  
  try {
    // Проверяем, есть ли активная сессия
    const session = getUserSession(chatId);
    
    if (!session) {
      return;
    }
    
    // Парсим введенные карты
    const { parsedCards, errors } = parseUserCards(userInput);
    
    // Проверяем на ошибки
    if (errors.length > 0) {
      await bot.sendMessage(
        chatId,
        `❌ <b>Ошибки при распознавании карт:</b>\n\n${errors.join('\n')}\n\n` +
        `Пожалуйста, проверьте названия карт и попробуйте снова.`,
        { parse_mode: 'HTML' }
      );
      return;
    }
    
    // Проверяем количество карт
    if (parsedCards.length !== session.cardsCount) {
      await bot.sendMessage(
        chatId,
        `❌ Неверное количество карт!\n\n` +
        `Для расклада "${session.spreadName}" нужно ${session.cardsCount} карт(ы), ` +
        `а вы ввели ${parsedCards.length}.\n\n` +
        `Попробуйте еще раз.`,
        { parse_mode: 'HTML' }
      );
      return;
    }
    
    // Показываем индикатор печатания
    await bot.sendChatAction(chatId, 'typing');
    
    // Отправляем список карт
    const cardsList = formatCardsList(parsedCards, session.positions);
    await bot.sendMessage(chatId, cardsList, { parse_mode: 'HTML' });
    
    // Получаем толкование от AI
    await bot.sendMessage(
      chatId,
      `${config.emoji.ai} Анализирую расклад...\nЭто может занять несколько секунд.`
    );
    
    await bot.sendChatAction(chatId, 'typing');
    
    const prompt = createAIPrompt(session.spreadName, session.positions, parsedCards);
    const interpretation = await getAIInterpretation(prompt);
    
    // Сохраняем в историю
    const historyEntry = history.addToHistory(chatId, {
      spreadName: session.spreadName,
      cards: parsedCards,
      interpretation: interpretation
    });
    
    // Отправляем толкование
    await bot.sendMessage(
      chatId,
      `🔮 <b>Толкование расклада "${session.spreadName}"</b>\n\n${interpretation}`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: `💾 Сохранено в историю`,
                callback_data: `view_history_${historyEntry.id}`
              }
            ],
            [
              {
                text: `${config.emoji.spread} Новый расклад`,
                callback_data: 'spreads_menu'
              },
              {
                text: `📜 История`,
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
      }
    );
    
    console.log(`✅ Пользователь ${chatId} получил толкование расклада: ${session.spreadName}`);
    
    // Очищаем сессию
    clearUserSession(chatId);
    
  } catch (error) {
    console.error('Ошибка при обработке карт:', error);
    
    await bot.sendMessage(
      chatId,
      `❌ Произошла ошибка при получении толкования.\n\n` +
      `Пожалуйста, попробуйте позже или выберите другой расклад.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{
              text: `${config.emoji.back} Главное меню`,
              callback_data: 'main_menu'
            }]
          ]
        }
      }
    );
    
    clearUserSession(chatId);
  }
}

module.exports = {
  parseUserCards,
  createAIPrompt,
  getAIInterpretation,
  handleUserCardsInput
};