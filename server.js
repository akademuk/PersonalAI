import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// OpenAI клиент
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// История чата (в реальном проекте лучше использовать базу данных)
let chatHistory = [];

// Настройки AI по умолчанию
let aiSettings = {
  model: "gpt-3.5-turbo",
  temperature: 0.7,
  maxTokens: 500,
  systemPrompt: `Ты мой личный AI помощник по имени Алекс.

Твоя роль:
- Помогаешь с повседневными задачами
- Отвечаешь на вопросы  
- Даёшь советы и рекомендации
- Помогаешь с планированием и организацией
- Поддерживаешь дружескую беседу
- Помогаешь с программированием и техническими вопросами

Стиль общения:
- Дружелюбный и неформальный
- На "ты"
- Можешь использовать эмодзи
- Краткие, но содержательные ответы
- По-русски
- Адаптируешься к стилю собеседника

Особенности:
- Запоминаешь контекст беседы
- Можешь признать свои ошибки
- Честно говоришь, если чего-то не знаешь
- Предлагаешь альтернативы и варианты

Будь полезным, честным и поддерживающим помощником!`
};

// API маршруты
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    // Добавляем сообщение пользователя в историю с временной меткой
    const userMessage = { 
      role: 'user', 
      content: message,
      timestamp: new Date().toISOString(),
      id: Date.now()
    };
    chatHistory.push(userMessage);

    // Ограничиваем историю последними 30 сообщениями
    if (chatHistory.length > 30) {
      chatHistory = chatHistory.slice(-30);
    }

    const completion = await openai.chat.completions.create({
      model: aiSettings.model,
      messages: [
        { role: "system", content: aiSettings.systemPrompt },
        ...chatHistory.map(msg => ({ role: msg.role, content: msg.content }))
      ],
      max_tokens: aiSettings.maxTokens,
      temperature: aiSettings.temperature,
    });

    const aiResponse = completion.choices[0]?.message?.content;

    // Добавляем ответ AI в историю с метаданными
    const assistantMessage = {
      role: 'assistant', 
      content: aiResponse,
      timestamp: new Date().toISOString(),
      id: Date.now() + 1,
      model: aiSettings.model,
      tokens: completion.usage?.total_tokens || 0
    };
    chatHistory.push(assistantMessage);

    res.json({ 
      success: true, 
      message: aiResponse,
      timestamp: assistantMessage.timestamp,
      tokens: assistantMessage.tokens,
      model: aiSettings.model
    });

  } catch (error) {
    console.error('Ошибка API:', error);
    
    // Fallback ответы
    const fallbackResponses = [
      "Извини, у меня временные технические сложности 😅 Попробуй чуть позже!",
      "Что-то с интернетом не так... Но я здесь и готов помочь, как только всё наладится! 🔧",
      "Сейчас проблемы с AI сервисом, но не переживай - скоро всё заработает! ⚡",
    ];

    const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

    res.json({ 
      success: false, 
      message: randomResponse,
      timestamp: new Date().toISOString()
    });
  }
});

// Получить историю чата
app.get('/api/history', (req, res) => {
  res.json({ 
    success: true, 
    history: chatHistory.filter(msg => msg.role !== 'system')
  });
});

// Очистить историю
app.delete('/api/history', (req, res) => {
  chatHistory = [];
  res.json({ success: true, message: 'История очищена' });
});

// Получить настройки AI
app.get('/api/settings', (req, res) => {
  res.json({ 
    success: true, 
    settings: aiSettings 
  });
});

// Обновить настройки AI
app.put('/api/settings', (req, res) => {
  const { model, temperature, maxTokens, systemPrompt } = req.body;
  
  if (model) aiSettings.model = model;
  if (temperature !== undefined) aiSettings.temperature = Math.max(0, Math.min(2, temperature));
  if (maxTokens) aiSettings.maxTokens = Math.max(50, Math.min(4000, maxTokens));
  if (systemPrompt) aiSettings.systemPrompt = systemPrompt;
  
  res.json({ 
    success: true, 
    settings: aiSettings,
    message: 'Настройки обновлены' 
  });
});

// Экспорт истории чата
app.get('/api/export', (req, res) => {
  const exportData = {
    timestamp: new Date().toISOString(),
    messages: chatHistory,
    settings: aiSettings,
    totalMessages: chatHistory.length
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=chat-history.json');
  res.json(exportData);
});

// Статус сервера
app.get('/api/status', (req, res) => {
  res.json({ 
    success: true, 
    status: 'Сервер работает!',
    timestamp: new Date().toISOString(),
    totalMessages: chatHistory.length,
    currentModel: aiSettings.model
  });
});

app.listen(port, () => {
  console.log(`🚀 Персональный AI помощник запущен на http://localhost:${port}`);
  console.log(`📡 API доступно на http://localhost:${port}/api`);
});