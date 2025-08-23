/*'use client';

import React, { useState, useRef, useEffect } from 'react';
import useAiStore from '@/store/ai/aiStore';
import { FaArrowUpLong } from "react-icons/fa6";
import { GiJellyfish, GiCirclingFish } from "react-icons/gi";
import { BiCodeCurly } from "react-icons/bi";
import RightCompilerBar from './rightCompilerBar';

const ChatBox = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [displayedTextMap, setDisplayedTextMap] = useState({});
  const [animatedMessageIds, setAnimatedMessageIds] = useState(new Set());
  const [showCompiler, setShowCompiler] = useState(false);
  const [isCompilerOpen, setIsCompilerOpen] = useState(false);

  const {
    activeChat,
    sendMessage,
    createNewChat
  } = useAiStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  useEffect(() => {
    if (!activeChat || !activeChat.messages.length) return;

    const lastMessage = activeChat.messages[activeChat.messages.length - 1];
    if (lastMessage.isUser || animatedMessageIds.has(lastMessage.id)) return;

    let index = 0;
    const text = lastMessage.text || "";
    setIsTyping(true);

    const interval = setInterval(() => {
      index++;
      setDisplayedTextMap(prev => ({
        ...prev,
        [lastMessage.id]: text.slice(0, index)
      }));
      if (index >= text.length) {
        clearInterval(interval);
        setAnimatedMessageIds(prev => new Set(prev).add(lastMessage.id));
        setIsTyping(false);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [activeChat?.messages, animatedMessageIds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading || isTyping) return;

    const message = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
    } finally {
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  const handleQuickQuestion = async (question) => {
    if (isLoading || isTyping) return;
    setIsLoading(true);

    try {
      if (!activeChat) await createNewChat();
      await sendMessage(question);
    } catch (error) {
      console.error('Hızlı soru gönderme hatası:', error);
    } finally {
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  // Compiler açma/kapatma fonksiyonları
  const handleOpenCompiler = () => {
    setIsCompilerOpen(true);
  };

  const handleCloseCompiler = () => {
    setIsCompilerOpen(false);
  };

  const quickQuestions = [
    "Whaleer nedir?",
    "Strateji nasıl kodlanır?",
    "Bot nasıl oluşturulur?"
  ];

  return (
    <div className="ml-60 flex flex-col h-screen bg-neutral-900">
      <header className="bg-neutral-900 py-[8px] pl-4 pr-4 border-b border-neutral-700 text-neutral-400 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img src="/img/logo1.jpg" alt="Whaleer Logo" className="w-8 h-8 rounded-full" />
          <h1 className="text-xl pt-2 font-bold font-mono">Whaleer.AI</h1>
        </div>

        <button
          onClick={handleOpenCompiler}
          title="Kod Editörünü Aç"
          className="bg-neutral-800 hover:bg-neutral-700 text-base text-neutral-300 mr-2 font-medium px-[10px] py-[10px] rounded-lg transition"
        >
          <BiCodeCurly />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!activeChat ? (
          <WelcomeMessage 
            quickQuestions={quickQuestions} 
            handleQuickQuestion={handleQuickQuestion} 
            isLoading={isLoading}
            isCompilerOpen={isCompilerOpen}
            handleCloseCompiler={handleCloseCompiler}
          />
        ) : activeChat.messages.length === 0 ? (
          <WelcomeMessage 
            quickQuestions={quickQuestions} 
            handleQuickQuestion={handleQuickQuestion} 
            isLoading={isLoading}
            isCompilerOpen={isCompilerOpen}
            handleCloseCompiler={handleCloseCompiler}
          />
        ) : (
          <>
            {activeChat.messages.map((message) => (
              <div
                key={message.id}
                className={`px-28 flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className="relative">
                  {!message.isUser && (
                    <img
                      src="/img/sailorWhale.png"
                      alt="Bot Avatar"
                      className="w-[34px] h-[51px] rounded-full absolute -top-1 -left-8"
                    />
                  )}
                  <div
                    className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-3xl ${
                      message.isUser
                        ? 'bg-neutral-700 text-white rounded-br-sm'
                        : 'bg-neutral-900 text-neutral-10 rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.isUser ? message.text : displayedTextMap[message.id] || ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start pl-32">
                <div className="bg-neutral-900 text-neutral-100  border border-neutral-700 rounded-2xl rounded-bl-md px-4 py-3 max-w-xs lg:max-w-md xl:max-w-lg shadow-lg">
                  <div className="flex items-center space-x-2">
                    <GiCirclingFish className="text-sky-400 text-2xl animate-spin" />
                    <span className="text-sm text-neutral-400">Yanıt bekleniyor...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="w-full flex justify-center mb-3">
        <div className="bg-neutral-950 p-4 w-full max-w-xl rounded-3xl">
          <form onSubmit={handleSubmit} className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Yanıtınızı buraya yazın..."
                className="scrollbar-hide w-full resize-none bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-400 rounded-2xl px-4 py-3 pr-12 focus:outline-none hover:ring-1 hover:ring-[#1a2324] max-h-32 min-h-12 shadow-inner"
                rows={1}
                disabled={isLoading || isTyping}
              />
              {inputMessage.trim() && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <span className="text-xs text-neutral-500">
                    {inputMessage.length}
                  </span>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading || isTyping}
              className={`p-3 mb-2 rounded-full transition-all duration-200 ${
                inputMessage.trim() && !isLoading && !isTyping
                  ? 'bg-white hover:from-blue-500 hover:to-blue-400 text-neutral-900 shadow-lg hover:shadow-xl transform hover:scale-105'
                  : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
              }`}
            >
              <FaArrowUpLong className="text-[18px]" />
            </button>
          </form>
          <div className="mt-2 text-xs text-neutral-500 text-center">
            WhaleerAI size yardımcı olmak için burada. Güvenli ve etkili kullanım için nezaket kurallarına uyun.
          </div>
        </div>
      </div>

      <RightCompilerBar
        isOpen={isCompilerOpen}
        onClose={handleCloseCompiler}
        initialCode={`def hello():\n    print("Merhaba Whaleer")`}
      />
    </div>
  );
};

// WelcomeMessage component'ini düzelt
const WelcomeMessage = ({ quickQuestions, handleQuickQuestion, isLoading, isCompilerOpen, handleCloseCompiler }) => (
  <div className="flex flex-col items-center justify-center h-full text-neutral-400">
    <div className="text-center max-w-md">
      <GiJellyfish className="w-16 h-16 mx-auto mb-4 text-neutral-600" />
      <h3 className="text-lg font-medium mb-2 text-white">Hoş Geldiniz!</h3>
      <p className="text-neutral-500 mb-4">
        Ben WhaleerAI, Whaleer algoritmik ticaret platformunun yapay zeka asistanıyım. Size nasıl yardımcı olabilirim?
      </p>
      <div className="flex flex-row gap-x-4">
        {quickQuestions.map((question, index) => (
          <button
            key={index}
            onClick={() => handleQuickQuestion(question)}
            disabled={isLoading}
            className={`px-6 py-3 rounded-xl shadow-lg transition-all duration-200 ${
              isLoading
                ? 'bg-neutral-700 border border-neutral-600 text-neutral-500 cursor-not-allowed'
                : 'bg-neutral-900 border border-neutral-600 hover:border-neutral-500 text-neutral-300 transform'
            }`}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default ChatBox;*/


'use client';

import React, { useState, useRef, useEffect } from 'react';
import useAiStore from '@/store/ai/aiStore';
import { FaArrowUpLong } from "react-icons/fa6";
import { GiJellyfish, GiCirclingFish } from "react-icons/gi";
import { BiCodeCurly } from "react-icons/bi";
import { HiCode } from "react-icons/hi";
import RightCompilerBar from './rightCompilerBar';

const ChatBox = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [displayedTextMap, setDisplayedTextMap] = useState({});
  const [animatedMessageIds, setAnimatedMessageIds] = useState(new Set());
  const [isCompilerOpen, setIsCompilerOpen] = useState(false);

  const {
    activeChat,
    sendMessage,
    createNewChat,
    activeCodeIndex,
    setActiveCodeIndex
  } = useAiStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  useEffect(() => {
    if (!activeChat || !activeChat.messages.length) return;

    const lastMessage = activeChat.messages[activeChat.messages.length - 1];
    if (lastMessage.isUser || animatedMessageIds.has(lastMessage.id)) return;

    let index = 0;
    const text = lastMessage.text || "";
    setIsTyping(true);

    const interval = setInterval(() => {
      index++;
      setDisplayedTextMap(prev => ({
        ...prev,
        [lastMessage.id]: text.slice(0, index)
      }));
      if (index >= text.length) {
        clearInterval(interval);
        setAnimatedMessageIds(prev => new Set(prev).add(lastMessage.id));
        setIsTyping(false);
        
        // Kod varsa compiler'ı otomatik aç
        if (lastMessage.codes && lastMessage.codes.length > 0) {
          setTimeout(() => {
            setIsCompilerOpen(true);
            setActiveCodeIndex(0); // İlk kodu aktif yap
          }, 500);
        }
      }
    }, 20);

    return () => clearInterval(interval);
  }, [activeChat?.messages, animatedMessageIds, setActiveCodeIndex]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading || isTyping) return;

    const message = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
    } finally {
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  const handleQuickQuestion = async (question) => {
    if (isLoading || isTyping) return;
    setIsLoading(true);

    try {
      if (!activeChat) await createNewChat();
      await sendMessage(question);
    } catch (error) {
      console.error('Hızlı soru gönderme hatası:', error);
    } finally {
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  const handleOpenCompiler = () => {
    setIsCompilerOpen(true);
  };

  const handleCloseCompiler = () => {
    setIsCompilerOpen(false);
  };

  const handleCodeButtonClick = (codeIndex) => {
    setActiveCodeIndex(codeIndex);
    setIsCompilerOpen(true);
  };

  // Aktif kod listesini al
  const getActiveCodes = () => {
    if (!activeChat?.messages) return [];
    
    const allCodes = [];
    activeChat.messages.forEach(message => {
      if (!message.isUser && message.codes) {
        message.codes.forEach(code => {
          allCodes.push(code);
        });
      }
    });
    
    return allCodes;
  };

  const quickQuestions = [
    "Whaleer nedir?",
    "Strateji nasıl kodlanır?",
    "Bot nasıl oluşturulur?"
  ];

  const activeCodes = getActiveCodes();

  return (
    <div className="ml-60 flex flex-col h-screen bg-neutral-900">
      <header className="bg-neutral-900 py-[8px] pl-4 pr-4 border-b border-neutral-700 text-neutral-400 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img src="/img/logo1.jpg" alt="Whaleer Logo" className="w-8 h-8 rounded-full" />
          <h1 className="text-xl pt-2 font-bold font-mono">Whaleer.AI</h1>
        </div>

        {activeCodes.length > 0 && (
          <button
            onClick={handleOpenCompiler}
            title="Kod Editörünü Aç"
            className="bg-neutral-800 hover:bg-neutral-700 text-base text-neutral-300 mr-2 font-medium px-[10px] py-[10px] rounded-lg transition"
          >
            <BiCodeCurly />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!activeChat ? (
          <WelcomeMessage 
            quickQuestions={quickQuestions} 
            handleQuickQuestion={handleQuickQuestion} 
            isLoading={isLoading}
          />
        ) : activeChat.messages.length === 0 ? (
          <WelcomeMessage 
            quickQuestions={quickQuestions} 
            handleQuickQuestion={handleQuickQuestion} 
            isLoading={isLoading}
          />
        ) : (
          <>
            {activeChat.messages.map((message) => (
              <div key={message.id}>
                <div className={`px-28 flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className="relative">
                    {!message.isUser && (
                      <img
                        src="/img/sailorWhale.png"
                        alt="Bot Avatar"
                        className="w-[34px] h-[51px] rounded-full absolute -top-1 -left-8"
                      />
                    )}
                    <div
                      className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-3xl ${
                        message.isUser
                          ? 'bg-neutral-700 text-white rounded-br-sm'
                          : 'bg-neutral-900 text-neutral-10 rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.isUser ? message.text : displayedTextMap[message.id] || ""}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Kod butonları - sadece AI mesajları için ve kod varsa */}
                {!message.isUser && message.codes && message.codes.length > 0 && (
                  <div className="px-28 mt-2 flex justify-start">
                    <div className="ml-4 space-y-2">
                      {message.codes.map((code, index) => {
                        const globalIndex = activeCodes.findIndex(c => c.id === code.id);
                        return (
                          <button
                            key={code.id}
                            onClick={() => handleCodeButtonClick(globalIndex)}
                            className="flex items-center space-x-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-2 rounded-lg transition-colors text-sm border border-neutral-600 hover:border-neutral-500"
                          >
                            <HiCode className="text-blue-400" />
                            <span>{code.title}</span>
                            <span className="text-xs bg-neutral-600 px-2 py-1 rounded">
                              {code.language}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start pl-32">
                <div className="bg-neutral-900 text-neutral-100 border border-neutral-700 rounded-2xl rounded-bl-md px-4 py-3 max-w-xs lg:max-w-md xl:max-w-lg shadow-lg">
                  <div className="flex items-center space-x-2">
                    <GiCirclingFish className="text-sky-400 text-2xl animate-spin" />
                    <span className="text-sm text-neutral-400">Yanıt bekleniyor...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="w-full flex justify-center mb-3">
        <div className="bg-neutral-950 p-4 w-full max-w-xl rounded-3xl">
          <form onSubmit={handleSubmit} className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Yanıtınızı buraya yazın..."
                className="scrollbar-hide w-full resize-none bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-400 rounded-2xl px-4 py-3 pr-12 focus:outline-none hover:ring-1 hover:ring-[#1a2324] max-h-32 min-h-12 shadow-inner"
                rows={1}
                disabled={isLoading || isTyping}
              />
              {inputMessage.trim() && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <span className="text-xs text-neutral-500">
                    {inputMessage.length}
                  </span>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading || isTyping}
              className={`p-3 mb-2 rounded-full transition-all duration-200 ${
                inputMessage.trim() && !isLoading && !isTyping
                  ? 'bg-white hover:from-blue-500 hover:to-blue-400 text-neutral-900 shadow-lg hover:shadow-xl transform hover:scale-105'
                  : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
              }`}
            >
              <FaArrowUpLong className="text-[18px]" />
            </button>
          </form>
          <div className="mt-2 text-xs text-neutral-500 text-center">
            WhaleerAI size yardımcı olmak için burada. Güvenli ve etkili kullanım için nezaket kurallarına uyun.
          </div>
        </div>
      </div>

      {/* RightCompilerBar'ı ana component içinde render et */}
      <RightCompilerBar
        isOpen={isCompilerOpen}
        onClose={handleCloseCompiler}
        codes={activeCodes}
        activeCodeIndex={activeCodeIndex}
        onCodeIndexChange={setActiveCodeIndex}
      />
    </div>
  );
};

// WelcomeMessage component'ini düzelt
const WelcomeMessage = ({ quickQuestions, handleQuickQuestion, isLoading }) => (
  <div className="flex flex-col items-center justify-center h-full text-neutral-400">
    <div className="text-center max-w-md">
      <GiJellyfish className="w-16 h-16 mx-auto mb-4 text-neutral-600" />
      <h3 className="text-lg font-medium mb-2 text-white">Hoş Geldiniz!</h3>
      <p className="text-neutral-500 mb-4">
        Ben WhaleerAI, Whaleer algoritmik ticaret platformunun yapay zeka asistanıyım. Size nasıl yardımcı olabilirim?
      </p>
      <div className="flex flex-row gap-x-4">
        {quickQuestions.map((question, index) => (
          <button
            key={index}
            onClick={() => handleQuickQuestion(question)}
            disabled={isLoading}
            className={`px-6 py-3 rounded-xl shadow-lg transition-all duration-200 ${
              isLoading
                ? 'bg-neutral-700 border border-neutral-600 text-neutral-500 cursor-not-allowed'
                : 'bg-neutral-900 border border-neutral-600 hover:border-neutral-500 text-neutral-300 transform'
            }`}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default ChatBox;