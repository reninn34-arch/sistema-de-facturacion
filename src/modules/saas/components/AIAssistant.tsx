import React, { useState, useRef, useEffect } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { client } from '../../../api/client';
import { BusinessInfo } from '../../../types/types';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface AIProvider {
  id: string;
  name: string;
  active: boolean;
}

interface AIAssistantProps {
  businessInfo: BusinessInfo;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ businessInfo }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'ai', 
      text: '¡Hola! Soy tu asistente contable inteligente.\nPuedo ayudarte con dudas sobre el SRI, impuestos o cómo usar el sistema. ¿En qué te ayudo hoy?', 
      timestamp: new Date() 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Cargar proveedores disponibles desde el backend
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await client.get<{ providers: AIProvider[] }>('/api/ai/providers');
        const list = response.data.providers;
        setProviders(list);
        
        // Seleccionar por defecto el proveedor que venga marcado como activo
        const active = list.find(p => p.active);
        if (active) {
          setSelectedProvider(active.id);
        } else if (list.length > 0) {
          setSelectedProvider(list[0].id);
        }
      } catch (error) {
        console.error('Error fetching AI providers:', error);
      }
    };
    fetchProviders();
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    
    // Agregar mensaje usuario
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: userText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Obtener info del negocio para contexto
      const businessContext = {
        name: businessInfo.name,
        ruc: businessInfo.ruc,
        regime: businessInfo.regime,
      };

      const response = await client.post<{ reply: string; provider?: string }>('/api/ai/chat', {
        message: userText,
        context: businessContext,
        provider: selectedProvider || undefined
      });

      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        text: response.data.reply, 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      const errorMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        text: 'Lo siento, tuve un problema de conexión. Por favor intenta de nuevo.', 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const activeProviderName = providers.find(p => p.id === selectedProvider)?.name || 'AI';

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
      {/* Header */}
      <div className="bg-slate-900 p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-purple-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <SparklesIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-white font-black text-lg tracking-tight">Asistente Virtual</h2>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">
              Powered by {activeProviderName}
            </p>
          </div>
        </div>

        {/* Selector de Proveedor de IA */}
        {providers.length > 1 && (
          <div className="relative">
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="bg-slate-800 text-white text-xs font-bold rounded-xl px-4 py-2 border border-slate-700 outline-none cursor-pointer hover:bg-slate-700 transition-all focus:border-sky-500"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-5 rounded-3xl text-sm leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-sky-500 text-white rounded-br-none' 
                : 'bg-white text-slate-600 border border-slate-100 rounded-bl-none'
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              <span className={`text-[10px] block mt-2 opacity-50 ${msg.role === 'user' ? 'text-sky-100' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-5 rounded-3xl rounded-bl-none border border-slate-100 shadow-sm flex gap-2 items-center">
              <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce delay-75" />
              <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce delay-150" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-slate-100">
        <form onSubmit={handleSend} className="flex gap-4 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Escribe tu consulta al asistente (${activeProviderName})...`}
            className="flex-1 bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-sky-500 rounded-2xl px-6 py-4 outline-none transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400"
            disabled={loading}
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl px-8 transition-all shadow-lg shadow-sky-500/20 active:scale-95 flex items-center justify-center font-bold"
          >
            Enviar
          </button>
        </form>
        <p className="text-[10px] text-center text-slate-400 mt-4 uppercase tracking-widest font-bold">
          IA entrenada en normativa SRI • Verifica con tu contador
        </p>
      </div>
    </div>
  );
};

export default AIAssistant;
