// netlify/functions/telegram.js

// ВАЖНО: в Netlify → Site settings → Environment variables
// должен быть TELEGRAM_BOT_TOKEN = 8418769295:AAFsYxDl69QUEnLlJAI2_pEzylAeHY7pMmQ

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = 'https://app.cryptomars.ru/?tg=1'; // твой мини-апп

// маленький хелпер для Telegram Bot API
async function tg(method, payload) {
  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is missing');
    return;
  }
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    console.error('Telegram API error:', method, data);
  }
  return data;
}

exports.handler = async (event) => {
  // Telegram шлёт только POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, body: 'OK' };
  }

  let update = {};
  try {
    update = JSON.parse(event.body || '{}');
  } catch (e) {
    console.error('Bad JSON', e);
    return { statusCode: 200, body: 'OK' };
  }

  try {
    // ЛОГИ — смотри в Netlify → Functions → telegram → Logs
    console.log('Update:', JSON.stringify(update));

    // 1) Сообщения (личка с ботом)
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text || '';

      // /start → присылаем кнопку «Открыть приложение»
      if (text.startsWith('/start')) {
        await tg('sendMessage', {
          chat_id: chatId,
          text: 'Открой мини-приложение 👇',
          // Вариант А: инлайн-кнопка (появляется сразу под сообщением)
          reply_markup: {
            inline_keyboard: [[
              {
                text: 'Открыть приложение',
                web_app: { url: WEBAPP_URL },
              },
            ]],
          },
        });
      } else {
        // для отладки — отвечаем на любые сообщения
        await tg('sendMessage', {
          chat_id: chatId,
          text: 'Напиши /start — пришлю кнопку для открытия Mini App',
        });
      }
    }

    // 2) CallbackQuery (на будущее)
    if (update.callback_query) {
      const cq = update.callback_query;
      await tg('answerCallbackQuery', { callback_query_id: cq.id });
    }

    // 3) Игнор остального
  } catch (e) {
    console.error('Handler error:', e);
  }

  // Всегда отвечаем 200, чтобы Telegram не ретраил
  return { statusCode: 200, body: 'OK' };
};
