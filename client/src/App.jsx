import { useState, useEffect, useRef } from 'react'
import './App.css'

// Компонент панели настроек
function SettingsPanel({ settings, onSave, onClose }) {
  const [localSettings, setLocalSettings] = useState(settings || {})
  
  const handleSave = async () => {
    const success = await onSave(localSettings)
    if (success) {
      onClose()
    }
  }
  
  if (!settings) return null
  
  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h3>⚙️ Настройки AI</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="settings-content">
          <div className="setting-group">
            <label>Модель AI:</label>
            <select 
              value={localSettings.model || 'gpt-3.5-turbo'}
              onChange={(e) => setLocalSettings(prev => ({...prev, model: e.target.value}))}
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (быстрая)</option>
              <option value="gpt-4">GPT-4 (умная)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
            </select>
          </div>
          
          <div className="setting-group">
            <label>Креативность (0-2): {localSettings.temperature}</label>
            <input 
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={localSettings.temperature || 0.7}
              onChange={(e) => setLocalSettings(prev => ({...prev, temperature: parseFloat(e.target.value)}))}
            />
          </div>
          
          <div className="setting-group">
            <label>Максимум токенов:</label>
            <input 
              type="number"
              min="50"
              max="4000"
              value={localSettings.maxTokens || 500}
              onChange={(e) => setLocalSettings(prev => ({...prev, maxTokens: parseInt(e.target.value)}))}
            />
          </div>
          
          <div className="setting-group">
            <label>Системный промпт:</label>
            <textarea 
              value={localSettings.systemPrompt || ''}
              onChange={(e) => setLocalSettings(prev => ({...prev, systemPrompt: e.target.value}))}
              rows={8}
              placeholder="Описание роли и поведения AI помощника..."
            />
          </div>
        </div>
        
        <div className="settings-footer">
          <button className="btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn-primary" onClick={handleSave}>Сохранить</button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [settings, setSettings] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [theme, setTheme] = useState('light')
  const [serverInfo, setServerInfo] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const API_BASE = 'http://localhost:3002/api'

  // Проверка соединения с сервером
  useEffect(() => {
    checkServerStatus()
    loadSettings()
    loadTheme()
  }, [])

  // Автоскролл к последнему сообщению
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Применение темы
  useEffect(() => {
    document.body.className = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  const loadTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
  }

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const checkServerStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/status`)
      if (response.ok) {
        const data = await response.json()
        setIsConnected(true)
        setServerInfo(data)
        loadHistory()
      }
    } catch (error) {
      setIsConnected(false)
      console.error('Сервер недоступен:', error)
    }
  }

  const loadSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings`)
      const data = await response.json()
      if (data.success) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error)
    }
  }

  const updateSettings = async (newSettings) => {
    try {
      const response = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      })
      const data = await response.json()
      if (data.success) {
        setSettings(data.settings)
        return true
      }
    } catch (error) {
      console.error('Ошибка обновления настроек:', error)
    }
    return false
  }

  const loadHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/history`)
      const data = await response.json()
      if (data.success && data.history) {
        setMessages(data.history.map(msg => ({
          id: msg.id || Date.now(),
          text: msg.content,
          isUser: msg.role === 'user',
          timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
          date: msg.timestamp ? new Date(msg.timestamp).toLocaleDateString() : new Date().toLocaleDateString(),
          tokens: msg.tokens,
          model: msg.model
        })))
      }
    } catch (error) {
      console.error('Ошибка загрузки истории:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading || !isConnected) return

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputValue }),
      })

      const data = await response.json()
      
      const aiMessage = {
        id: Date.now() + 1,
        text: data.message || 'Извини, что-то пошло не так 😔',
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(),
        tokens: data.tokens,
        model: data.model
      }

      setMessages(prev => [...prev, aiMessage])

    } catch (error) {
      console.error('Ошибка отправки сообщения:', error)
      const errorMessage = {
        id: Date.now() + 2,
        text: 'Не могу подключиться к серверу 😞',
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      // Возвращаем фокус на поле ввода
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const clearHistory = async () => {
    if (!confirm('Вы уверены, что хотите очистить всю историю чата?')) return
    
    try {
      const response = await fetch(`${API_BASE}/history`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setMessages([])
      }
    } catch (error) {
      console.error('Ошибка очистки истории:', error)
    }
  }

  const exportHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/export`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Ошибка экспорта истории:', error)
    }
  }

  const quickCommands = [
    { text: "Помоги мне с планированием дня", icon: "📅" },
    { text: "Дай совет по продуктивности", icon: "⚡" },
    { text: "Объясни простыми словами", icon: "💡" },
    { text: "Помоги с программированием", icon: "💻" }
  ]

  const useQuickCommand = (command) => {
    setInputValue(command)
    inputRef.current?.focus()
  }

  return (
    <div className={`app ${theme}`}>
      <header className="header">
        <div className="header-left">
          <h1>🤖 Мой AI Помощник</h1>
          <div className="status">
            <span className={`status-indicator ${isConnected ? 'online' : 'offline'}`}></span>
            <span>{isConnected ? 'В сети' : 'Офлайн'}</span>
            {serverInfo && (
              <span className="model-info">({serverInfo.currentModel})</span>
            )}
          </div>
        </div>
        
        <div className="header-controls">
          <button 
            className="icon-btn"
            onClick={toggleTheme}
            title={`Переключить на ${theme === 'light' ? 'темную' : 'светлую'} тему`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          
          <button 
            className="icon-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Настройки"
          >
            ⚙️
          </button>
          
          {messages.length > 0 && (
            <>
              <button 
                className="icon-btn"
                onClick={exportHistory}
                title="Экспорт истории"
              >
                📥
              </button>
              <button 
                className="icon-btn"
                onClick={clearHistory}
                title="Очистить историю"
              >
                🗑️
              </button>
            </>
          )}
        </div>
      </header>

      <div className="chat-container">
        {showSettings && (
          <SettingsPanel 
            settings={settings}
            onSave={updateSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
        
        <div className="messages">
          {messages.length === 0 ? (
            <div className="welcome-section">
              <div className="welcome-message">
                <p>👋 Привет! Я Алекс - твой персональный AI помощник.</p>
                <p>Можешь задать любой вопрос или попросить о помощи!</p>
              </div>
              
              <div className="quick-commands">
                <h3>Быстрые команды:</h3>
                <div className="command-buttons">
                  {quickCommands.map((cmd, index) => (
                    <button 
                      key={index}
                      className="quick-command"
                      onClick={() => useQuickCommand(cmd.text)}
                    >
                      <span className="command-icon">{cmd.icon}</span>
                      <span className="command-text">{cmd.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`message ${message.isUser ? 'user' : 'ai'}`}>
                <div className="message-content">
                  <span className="message-text">{message.text}</span>
                  <div className="message-meta">
                    <span className="message-time">{message.timestamp}</span>
                    {message.tokens && (
                      <span className="message-tokens">({message.tokens} токенов)</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="message ai">
              <div className="message-content">
                <span className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <form className="input-form" onSubmit={sendMessage}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isConnected ? "Напиши сообщение..." : "Сервер недоступен"}
            disabled={!isConnected || isLoading}
            autoFocus
          />
          <button 
            type="submit" 
            disabled={!inputValue.trim() || !isConnected || isLoading}
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default App