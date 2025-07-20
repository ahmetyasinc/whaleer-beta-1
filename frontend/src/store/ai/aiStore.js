/*import { create } from 'zustand';

const useAiStore = create((set, get) => ({
  // Current active chat
  activeChat: null,
  
  // All chats storage
  chats: [],
  
  // Static AI response
  staticAiResponse: "Merhaba! Ben bir AI asistanıyım. Size nasıl yardımcı olabilirim? Bu statik bir yanıttır ve backend bağlantısı olmadığı için şu anda gerçek AI işlevi bulunmamaktadır AHMETİ GOTTEN.",

  // Create new chat
  createNewChat: () => {
    const newChat = {
      id: Date.now().toString(),
      title: `Yeni Sohbet ${get().chats.length + 1}`,
      messages: [],
      createdAt: new Date().toISOString(),
    };
    
    set((state) => ({
      chats: [newChat, ...state.chats],
      activeChat: newChat
    }));
    
    return newChat.id;
  },

  // Select existing chat
  selectChat: (chatId) => {
    const chat = get().chats.find(c => c.id === chatId);
    if (chat) {
      set({ activeChat: chat });
    }
  },

  // Add message to current chat
  addMessage: (message, isUser = true) => {
    const state = get();
    if (!state.activeChat) {
      // Create new chat if none exists
      state.createNewChat();
    }

    const newMessage = {
      id: Date.now().toString(),
      text: message,
      isUser: isUser,
      timestamp: new Date().toISOString(),
    };

    set((state) => {
      const updatedChats = state.chats.map(chat => {
        if (chat.id === state.activeChat.id) {
          const updatedMessages = [...chat.messages, newMessage];
          
          // Update chat title with first user message if it's still default
          let updatedTitle = chat.title;
          if (chat.title.startsWith('Yeni Sohbet') && isUser && updatedMessages.filter(m => m.isUser).length === 1) {
            updatedTitle = message.length > 30 ? message.substring(0, 30) + '...' : message;
          }
          
          return {
            ...chat,
            messages: updatedMessages,
            title: updatedTitle,
            updatedAt: new Date().toISOString()
          };
        }
        return chat;
      });

      const updatedActiveChat = updatedChats.find(chat => chat.id === state.activeChat.id);

      return {
        chats: updatedChats,
        activeChat: updatedActiveChat
      };
    });
  },

  // Send message and get AI response
  sendMessage: async (message) => {
    const state = get();
    
    // Add user message
    state.addMessage(message, true);
    
    // Simulate AI response delay
    setTimeout(() => {
      state.addMessage(state.staticAiResponse, false);
    }, 1000);
  },

  // Delete chat
  deleteChat: (chatId) => {
    set((state) => {
      const updatedChats = state.chats.filter(chat => chat.id !== chatId);
      const newActiveChat = state.activeChat?.id === chatId ? null : state.activeChat;
      
      return {
        chats: updatedChats,
        activeChat: newActiveChat
      };
    });
  },

  // Clear all chats
  clearAllChats: () => {
    set({
      chats: [],
      activeChat: null
    });
  }
}));

export default useAiStore;*/

import axios from 'axios';

axios.defaults.withCredentials = true;


import { create } from 'zustand';

const useAiStore = create((set, get) => ({
  // Current active chat
  activeChat: null,
  
  // All chats storage
  chats: [],
  
  // Active code index for compiler
  activeCodeIndex: 0,
  
  // Static AI response for testing
  staticAiResponse: {
    message: "Merhaba! Ben bir AI asistanıyım. Size nasıl yardımcı olabilirim? Bu statik bir yanıttır ve backend bağlantısı olmadığı için şu anda gerçek AI işlevi bulunmamaktadır AHMETİ GOTTEN.",
    codes: [
      {
        id: 1,
        title: "Basit Hesap Makinesi",
        language: "python",
        content: `def hesap_makinesi(a, b, islem):
    if islem == '+':
        return a + b
    elif islem == '-':
        return a - b
    elif islem == '*':
        return a * b
    elif islem == '/':
        return a / b if b != 0 else "Sıfıra bölme hatası"
    else:
        return "Geçersiz işlem"

# Kullanım örneği
sonuc = hesap_makinesi(10, 5, '+')
print(f"Sonuç: {sonuc}")`
      },
      {
        id: 2,
        title: "Veri Analizi Örneği",
        language: "python",
        content: `import pandas as pd
import numpy as np

# Örnek veri oluşturma
data = {
    'isim': ['Ali', 'Ayşe', 'Mehmet', 'Fatma'],
    'yas': [25, 30, 35, 28],
    'maas': [5000, 6000, 7500, 5500]
}

df = pd.DataFrame(data)
print("Veri Çerçevesi:")
print(df)

# Temel istatistikler
print("\\nTemel İstatistikler:")
print(df.describe())

# Ortalama maaş
ortalama_maas = df['maas'].mean()
print(f"\\nOrtalama Maaş: {ortalama_maas}")`
      }
    ]
  },

  // Create new chat
  createNewChat: () => {
    const newChat = {
      id: Date.now().toString(),
      title: `Yeni Sohbet ${get().chats.length + 1}`,
      messages: [],
      createdAt: new Date().toISOString(),
    };
    
    set((state) => ({
      chats: [newChat, ...state.chats],
      activeChat: newChat
    }));
    
    return newChat.id;
  },

  // Select existing chat
  selectChat: (chatId) => {
    const chat = get().chats.find(c => c.id === chatId);
    if (chat) {
      set({ activeChat: chat });
    }
  },

  // Set active code index
  setActiveCodeIndex: (index) => {
    set({ activeCodeIndex: index });
  },

  // Add message to current chat
  addMessage: (messageData, isUser = true) => {
    const state = get();
    if (!state.activeChat) {
      // Create new chat if none exists
      state.createNewChat();
    }

    const newMessage = {
      id: Date.now().toString(),
      text: isUser ? messageData : messageData.message,
      codes: isUser ? [] : (messageData.codes || []),
      isUser: isUser,
      timestamp: new Date().toISOString(),
    };

    set((state) => {
      const updatedChats = state.chats.map(chat => {
        if (chat.id === state.activeChat.id) {
          const updatedMessages = [...chat.messages, newMessage];
          
          // Update chat title with first user message if it's still default
          let updatedTitle = chat.title;
          if (chat.title.startsWith('Yeni Sohbet') && isUser && updatedMessages.filter(m => m.isUser).length === 1) {
            const messageText = typeof messageData === 'string' ? messageData : messageData.message;
            updatedTitle = messageText.length > 30 ? messageText.substring(0, 30) + '...' : messageText;
          }
          
          return {
            ...chat,
            messages: updatedMessages,
            title: updatedTitle,
            updatedAt: new Date().toISOString()
          };
        }
        return chat;
      });

      const updatedActiveChat = updatedChats.find(chat => chat.id === state.activeChat.id);

      return {
        chats: updatedChats,
        activeChat: updatedActiveChat
      };
    });
  },

  // Send message and get AI response
  // Send message and get AI response from backend
  sendMessage: async (message) => {
    const state = get();

    // Add user message
    state.addMessage(message, true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/chat2`, // kendi endpoint'ine göre düzenle
        { message }
      );

      const { explanation, codes } = response.data;

      // Format backend response for UI
      state.addMessage(
        {
          message: explanation,
          codes: codes.map((c, i) => ({
            id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
            title: c.title || `Kod ${i + 1}`,
            language: 'python',
            content: c.code
          }))
        },
        false
      );

    } catch (error) {
      console.error("Mesaj gönderimi başarısız:", error);
      state.addMessage(
        {
          message: "Bir hata oluştu, lütfen daha sonra tekrar deneyin.",
          codes: []
        },
        false
      );
    }
  },


  // Delete chat
  deleteChat: (chatId) => {
    set((state) => {
      const updatedChats = state.chats.filter(chat => chat.id !== chatId);
      const newActiveChat = state.activeChat?.id === chatId ? null : state.activeChat;
      
      return {
        chats: updatedChats,
        activeChat: newActiveChat
      };
    });
  },

  
  // Clear all chats
  clearAllChats: () => {
    set({
      chats: [],
      activeChat: null
    });
  }
}));

export default useAiStore;