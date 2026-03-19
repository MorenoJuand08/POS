import React, { useState } from 'react'
import { processChatbotQuery } from '@/services/chatbotService'

function ChatWindow({ onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(true)
  const messagesEndRef = React.useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const suggestedQuestions = [
    '¿Qué productos tienen más stock?',
    '¿Qué se venderá más rápido?',
    '¿Cuáles son los productos más rentables?',
    '¿Qué debo comprar?',
    '¿Cuántas semanas de stock tengo?',
    '¿Análisis de tallas?',
    '¿Productos bajos en stock?',
    'Resumen de inventario'
  ]

  const sendMessage = async (message = null) => {
    const messageText = message || input
    if (!messageText.trim()) return

    // Agregar mensaje del usuario
    setMessages(prev => [...prev, { role: 'user', text: messageText, type: 'text' }])
    setInput('')
    setLoading(true)

    try {
      // Procesar la consulta con el servicio de chatbot
      const response = await processChatbotQuery(messageText)
      
      // Agregar respuesta del bot
      setMessages(prev => [...prev, { role: 'bot', ...response }])
    } catch (error) {
      console.error('Error procesando consulta:', error)
      setMessages(prev => [...prev, { 
        role: 'bot', 
        type: 'text', 
        content: 'Disculpa, hubo un error procesando tu consulta.' 
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:shadow-xl"
          title="Abrir chatbot"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l6.29-.97C9.23 21.62 10.6 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </button>
      )}

      {/* Ventana del chatbot */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-gray-200 dark:border-neutral-700 flex flex-col" style={{ height: '500px' }}>
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-700 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-xl">
            <div className="flex items-center gap-3">
              {/* Logo/Icono */}
              <div className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-8 h-8">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Asistente IA</h2>
                <p className="text-xs text-blue-100">Trendo POS</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
              </svg>
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-neutral-800 scroll-smooth min-h-0">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 text-sm mt-12 flex flex-col items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-blue-400 opacity-50">
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l6.29-.97C9.23 21.62 10.6 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <p className="font-semibold">¡Bienvenido!</p>
                <p className="text-xs">Soy tu asistente de inventario.</p>
                <p className="text-xs">Pregúntame sobre productos, precios o stock.</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white dark:bg-neutral-700 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-200 dark:border-neutral-600'
                    }`}
                  >
                    {msg.type === 'text' && <p className="text-sm whitespace-pre-wrap">{msg.content || msg.text}</p>}

                    {msg.type === 'table' && (
                      <div>
                        <p className="font-bold text-sm mb-2">{msg.title}</p>
                        <table className="text-xs border-collapse">
                          <tbody>
                            {msg.content.map((row, idx) => (
                              <tr key={idx} className="border-b">
                                <td className="font-semibold pr-2">{row.nombre}</td>
                                {row.xs !== undefined && <td className="px-1">XS:{row.xs}</td>}
                                {row.s !== undefined && <td className="px-1">S:{row.s}</td>}
                                {row.m !== undefined && <td className="px-1">M:{row.m}</td>}
                                {row.l !== undefined && <td className="px-1">L:{row.l}</td>}
                                {row.xl !== undefined && <td className="px-1">XL:{row.xl}</td>}
                                {row.precio && <td className="px-1">{row.precio}</td>}
                                {row.tallaM !== undefined && <td className="px-1">M:{row.tallaM}</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {msg.type === 'stats' && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span>Total Productos:</span>
                          <strong>{msg.content.totalProducts}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Stock Total:</span>
                          <strong>{msg.content.totalStock}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>⚠️ Stock Bajo:</span>
                          <strong>{msg.content.lowStockCount}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-neutral-700 rounded-lg p-3 rounded-bl-none">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Preguntas sugeridas */}
          {messages.length === 0 && (
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Preguntas sugeridas:</p>
              <div className="space-y-2">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left text-xs p-2 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded hover:bg-blue-50 dark:hover:bg-neutral-600 transition text-gray-700 dark:text-gray-300"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
                placeholder="Escribe tu pregunta..."
                disabled={loading}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg text-sm dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16865566 C3.34915502,0.9115582 2.40734225,1.0000000 1.77946707,1.4726193 C0.994623095,2.0448061 0.837654326,3.1342327 1.15159189,3.9197196 L3.03521743,10.3606707 C3.03521743,10.5177681 3.19218622,10.6748655 3.50612381,10.6748655 L16.6915026,11.4603524 C16.6915026,11.4603524 17.1624089,11.4603524 17.1624089,12.0324475 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z" />
                </svg>
              </button>
            </div>
        </div>
      )}
    </>
  )
}

export default ChatWindow
