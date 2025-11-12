const fs = require('fs');
const path = require('path');
const config = require('../config');

// Путь к папке с историей
const historyDir = path.join(__dirname, '../data/history');

// Создаем папку если не существует
if (!fs.existsSync(historyDir)) {
  fs.mkdirSync(historyDir, { recursive: true });
}

/**
 * Получить путь к файлу истории пользователя
 */
function getUserHistoryPath(userId) {
  return path.join(historyDir, `${userId}.json`);
}

/**
 * Загрузить историю пользователя
 */
function loadUserHistory(userId) {
  const filePath = getUserHistoryPath(userId);
  
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Ошибка чтения истории пользователя ${userId}:`, error);
    return [];
  }
}

/**
 * Сохранить историю пользователя
 */
function saveUserHistory(userId, history) {
  const filePath = getUserHistoryPath(userId);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Ошибка сохранения истории пользователя ${userId}:`, error);
    return false;
  }
}

/**
 * Добавить расклад в историю
 */
function addToHistory(userId, spreadData) {
  const history = loadUserHistory(userId);
  
  const entry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    spreadName: spreadData.spreadName,
    cards: spreadData.cards,
    interpretation: spreadData.interpretation,
    date: new Date().toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
  
  // Добавляем в начало массива
  history.unshift(entry);
  
  // Ограничиваем до 10 последних раскладов
  if (history.length > 10) {
    history.splice(10);
  }
  
  saveUserHistory(userId, history);
  
  console.log(`💾 Сохранен расклад в историю пользователя ${userId}`);
  
  return entry;
}

/**
 * Получить историю пользователя
 */
function getHistory(userId, limit = 10) {
  const history = loadUserHistory(userId);
  return history.slice(0, limit);
}

/**
 * Получить конкретный расклад по ID
 */
function getSpreadById(userId, spreadId) {
  const history = loadUserHistory(userId);
  return history.find(entry => entry.id === spreadId);
}

/**
 * Удалить расклад из истории
 */
function deleteSpread(userId, spreadId) {
  const history = loadUserHistory(userId);
  const filtered = history.filter(entry => entry.id !== spreadId);
  
  if (filtered.length < history.length) {
    saveUserHistory(userId, filtered);
    console.log(`🗑️ Удален расклад ${spreadId} из истории пользователя ${userId}`);
    return true;
  }
  
  return false;
}

/**
 * Очистить всю историю пользователя
 */
function clearHistory(userId) {
  saveUserHistory(userId, []);
  console.log(`🧹 Очищена история пользователя ${userId}`);
  return true;
}

/**
 * Создать меню истории
 */
function createHistoryMenu(userId, page = 0) {
  const history = getHistory(userId);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(history.length / itemsPerPage);
  const startIndex = page * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, history.length);
  
  const keyboard = [];
  
  if (history.length === 0) {
    keyboard.push([{
      text: '📝 История пуста',
      callback_data: 'ignore'
    }]);
  } else {
    // Кнопки с раскладами
    for (let i = startIndex; i < endIndex; i++) {
      const entry = history[i];
      keyboard.push([{
        text: `${entry.spreadName} - ${entry.date}`,
        callback_data: `view_history_${entry.id}`
      }]);
    }
    
    // Навигация по страницам
    if (totalPages > 1) {
      const navRow = [];
      if (page > 0) {
        navRow.push({
          text: `⬅️`,
          callback_data: `history_page_${page - 1}`
        });
      }
      navRow.push({
        text: `${page + 1}/${totalPages}`,
        callback_data: 'ignore'
      });
      if (page < totalPages - 1) {
        navRow.push({
          text: `➡️`,
          callback_data: `history_page_${page + 1}`
        });
      }
      keyboard.push(navRow);
    }
    
    // Кнопка очистки истории
    keyboard.push([{
      text: '🗑️ Очистить историю',
      callback_data: 'clear_history_confirm'
    }]);
  }
  
  // Кнопки навигации
  keyboard.push([
    {
      text: `${config.emoji.spread} Новый расклад`,
      callback_data: 'spreads_menu'
    }
  ]);
  
  keyboard.push([{
    text: `${config.emoji.back} Главное меню`,
    callback_data: 'main_menu'
  }]);
  
  return { inline_keyboard: keyboard };
}

/**
 * Форматировать расклад для просмотра
 */
function formatSpreadView(entry) {
  let message = `🔮 <b>${entry.spreadName}</b>\n`;
  message += `📅 ${entry.date}\n\n`;
  
  message += `🎴 <b>Карты:</b>\n`;
  entry.cards.forEach((card, index) => {
    const orientation = card.isReversed ? '⬇️' : '⬆️';
    message += `${index + 1}. ${card.emoji || '🎴'} ${card.name} ${orientation}\n`;
  });
  
  message += `\n📖 <b>Толкование:</b>\n${entry.interpretation}`;
  
  // Ограничиваем длину (Telegram ограничение 4096 символов)
  if (message.length > 4000) {
    message = message.substring(0, 3950) + '...\n\n<i>(Толкование слишком длинное, показана часть)</i>';
  }
  
  return message;
}

/**
 * Создать клавиатуру для просмотра расклада
 */
function createSpreadViewKeyboard(spreadId) {
  return {
    inline_keyboard: [
      [
        {
          text: '🗑️ Удалить этот расклад',
          callback_data: `delete_history_${spreadId}`
        }
      ],
      [
        {
          text: `${config.emoji.back} К истории`,
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
  };
}

/**
 * Получить статистику пользователя
 */
function getUserStats(userId) {
  const history = loadUserHistory(userId);
  
  const stats = {
    totalSpreads: history.length,
    spreadTypes: {},
    mostFrequentCards: {},
    firstSpread: history.length > 0 ? history[history.length - 1].date : null,
    lastSpread: history.length > 0 ? history[0].date : null
  };
  
  // Подсчет типов раскладов
  history.forEach(entry => {
    stats.spreadTypes[entry.spreadName] = (stats.spreadTypes[entry.spreadName] || 0) + 1;
    
    // Подсчет карт
    entry.cards.forEach(card => {
      stats.mostFrequentCards[card.name] = (stats.mostFrequentCards[card.name] || 0) + 1;
    });
  });
  
  return stats;
}

/**
 * Форматировать статистику
 */
function formatStats(userId) {
  const stats = getUserStats(userId);
  
  if (stats.totalSpreads === 0) {
    return '📊 <b>Статистика</b>\n\nУ вас пока нет раскладов в истории.';
  }
  
  let message = `📊 <b>Ваша статистика</b>\n\n`;
  message += `🔢 Всего раскладов: ${stats.totalSpreads}\n`;
  message += `📅 Первый расклад: ${stats.firstSpread}\n`;
  message += `📅 Последний расклад: ${stats.lastSpread}\n\n`;
  
  // Топ раскладов
  const topSpreads = Object.entries(stats.spreadTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  if (topSpreads.length > 0) {
    message += `🔮 <b>Любимые расклады:</b>\n`;
    topSpreads.forEach(([name, count]) => {
      message += `• ${name}: ${count} раз\n`;
    });
    message += '\n';
  }
  
  // Топ карт
  const topCards = Object.entries(stats.mostFrequentCards)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  if (topCards.length > 0) {
    message += `🎴 <b>Чаще всего выпадают:</b>\n`;
    topCards.forEach(([name, count]) => {
      message += `• ${name}: ${count} раз\n`;
    });
  }
  
  return message;
}

module.exports = {
  addToHistory,
  getHistory,
  getSpreadById,
  deleteSpread,
  clearHistory,
  createHistoryMenu,
  formatSpreadView,
  createSpreadViewKeyboard,
  getUserStats,
  formatStats
};