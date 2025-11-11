// src/app/(public)/support/SupportChatbot.tsx
'use client'

import { useState } from 'react'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'

export default function SupportChatbot() {
  const [messages, setMessages] = useState<{ from: 'user' | 'bot'; text: string }[]>([
    { from: 'bot', text: 'Hallo! Wie kann ich dir heute helfen?' },
  ])
  const [input, setInput] = useState('')

  const send = () => {
    if (!input.trim()) return
    const userMsg = { from: 'user' as const, text: input.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    // Simulierte Bot-Antwort
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { from: 'bot', text: 'Gute Frage! Schau in unsere FAQs oder beschreibe dein Problem genauer.' },
      ])
    }, 1000)
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-[500px] bg-white">
      {/* Chatverlauf (kein Auto-Scroll) */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] px-4 py-2 rounded-lg ${
                m.from === 'user'
                  ? 'bg-blue-100 text-blue-900'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Eingabe */}
      <div className="border-t border-gray-200 p-4 flex items-center gap-3">
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Schreib eine Nachricht..."
          className="flex-1 resize-none border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={send}
          className="bg-blue-600 p-3 rounded-full text-white hover:bg-blue-700 transition"
        >
          <PaperAirplaneIcon className="h-5 w-5 rotate-90" />
        </button>
      </div>
    </div>
  )
}
