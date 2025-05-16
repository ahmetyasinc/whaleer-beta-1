import React, { useState, useRef } from "react";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { FaArrowUp } from "react-icons/fa";
import { BsThreeDots } from "react-icons/bs";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ChatBox = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  const getAIResponse = async (userMessage) => {
    try {
        const response = await fetch(
            "https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill",
            {
                method: "POST",
                headers: {
                    "Authorization": "Bearer ",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ inputs: userMessage }),
            }
        );

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        // Gelen yanıt bir array, bu yüzden ilk elemanı alıyoruz
        return data[0]?.generated_text || "Üzgünüm, yanıt oluşturulamadı.";
    } catch (error) {
        console.error("AI API error:", error);
        return "Bağlantı hatası oluştu. Lütfen daha sonra tekrar deneyin.";
    }
};


  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    const newMessages = [...messages, { text: userMessage, sender: "user" }];
    setMessages(newMessages);
    setInput("");
    
    // Textarea'nın yüksekliğini sıfırla
    resetTextareaHeight();
    
    setLoading(true);

    await delay(1000);

    try {
      const aiResponse = await getAIResponse(userMessage);
      setMessages([...newMessages, { text: aiResponse, sender: "ai" }]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      setMessages([
        ...newMessages,
        { text: "Bir hata oluştu. Lütfen tekrar deneyin.", sender: "ai" },
      ]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Enter tuşunun varsayılan davranışını engelle
      handleSend();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = "40px"; // Yüksekliği sıfırla
    e.target.style.height = `${e.target.scrollHeight}px`; // İçeriğe göre ayarla
  };

  return (
    <div
      key="chatbox"
      data-grid={{ x: 0, y: 0, w: 8, h: 8, minH: 4, minW: 3, maxH: 15 }}
      className="px-3 pb-3 rounded-md bg-[#191919] flex flex-col h-full"
    >
      {/* Sürüklenebilir Alan */}
      <div className="drag-handle bg-[rgb(22,38,126)] cursor-move pt-[1px] rounded-b-3xl rounded-t-sm text-center h-7 font-bold justify-center">
        whaleerAI
      </div>

      {/* Mesaj Alanı */}
      <div className="flex-1 overflow-y-auto p-2">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 my-5 font-bold text-[16px]">
            Ben yapay zeka asistanın whaleerAI, Nasıl Yardımcı Olabilirim?
          </div>
        )}
        {/* Mesajları yukarıdan aşağı eklemek için flex-col kullanıyoruz */}
        <div className="flex flex-col gap-1">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`py-2 pl-5 pr-3 my-1 rounded-[20px] max-w-3/4 ${
                msg.sender === "user"
                  ? "bg-[#303030] text-white ml-auto"
                  : "bg-[#191919] text-white mr-auto"
              }`}
              style={{
                display: "inline-block",
                minWidth: "20%",
                maxWidth: "75%",
                float: msg.sender === "user" ? "right" : "left",
                clear: "both",
                whiteSpace: "pre-wrap", // Satır biçimini koru
              }}
            >
              {msg.text}
            </div>
          ))}
          {/* Loading animasyonu en son mesajın hemen altında olacak */}
          {loading && (
            <div className="self-start bg-[#191919] text-black p-2 rounded-lg flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
              <div
                className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
          )}
        </div>
      </div>

      {/* Sabit Input Alanı */}
      <div className="flex p-2 bg-[#191919] items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyPress}
          className="flex-1 p-2 rounded-xl focus:outline-none focus:border-blue-500 text-white bg-[#303030]
                     min-h-[40px] max-h-[140px] overflow-y-auto resize-none"
          placeholder="Soru sor..."
          style={{ height: "40px" }}
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className={`h-10 w-10 flex items-center justify-center ${
            loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
          } text-white rounded-full transition-colors`}
        >
          {loading
            ? <BsThreeDots className="text-[24px]" />
            : <FaArrowUp className="text-[14px]" />}
        </button>

      </div>
    </div>
  );
};

export default ChatBox;