'use client';

import { useSurveyStore } from '@/store/survey/surveyStore';
import { useThemeStore } from '@/store/survey/themeStore';
import { useEffect, useState } from 'react';

export default function SurveyPage() {
  const { currentQuestionIndex, answers, setAnswer, nextQuestion, prevQuestion } = useSurveyStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const [error, setError] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleChange = (key, value) => {
    setAnswer(key, value);
    setError('');
  };

  const validateCurrentQuestion = () => {
    const current = questions[currentQuestionIndex];
    
    // Skip validation for optional questions (11, 12, 13, q1_1)
    if (['q11', 'q12', 'q1_1', 'q2_2'].includes(current.key)) {
      return true;
    }
    
    if (!answers[current.key]) {
      setError('Lütfen bu soruyu yanıtlayınız.');
      return false;
    }

    // For checkbox questions with maxSelections
    if (current.type === 'checkbox' && current.maxSelections) {
      const selectedCount = answers[current.key]?.length || 0;
      if (selectedCount > current.maxSelections) {
        setError(`En fazla ${current.maxSelections} seçim yapabilirsiniz.`);
        return false;
      }
    }

    // For questions with sub-questions
    if (current.subQuestions && current.condition?.(answers[current.key])) {
      for (const sub of current.subQuestions) {
        // Skip validation for optional sub-questions
        if (sub.key === 'q1_1') continue;

        if (!answers[sub.key]) {
          setError('Lütfen tüm alt soruları yanıtlayınız.');
          return false;
        }

        // Email validation for q10_1
        if (sub.key === 'q10_1') {
          const email = answers[sub.key];
          if (!email.includes('@')) {
            setError('Lütfen geçerli bir e-posta adresi giriniz.');
            return false;
          }
        }

        // Phone number validation for q10_2
        if (sub.key === 'q10_2') {
          const phoneNumber = answers[`${sub.key}_number`] || '';
          const countryCode = answers[`${sub.key}_countryCode`] || '+90';
          
          if (!phoneNumber) {
            setError('Lütfen telefon numaranızı giriniz.');
            return false;
          }
          
          if (!/^\d+$/.test(phoneNumber)) {
            setError('Lütfen sadece rakamlardan oluşan bir telefon numarası giriniz.');
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleCustomNext = () => {
    if (validateCurrentQuestion()) {
      // If current question is q3 and answer is "Hayır", skip to q6
      if (current.key === 'q3' && answers[current.key] === 'Hayır') {
        // Skip to q6 by calling nextQuestion multiple times
        for (let i = currentQuestionIndex; i < 5; i++) {
          nextQuestion();
        }
      } else {
        nextQuestion();
      }
    }
  };

  const handleCustomPrev = () => {
    // If current question is q6 and q3 was answered as "Hayır", go back to q3
    if (current.key === 'q6' && answers['q3'] === 'Hayır') {
      // Go back to q3 by calling prevQuestion multiple times
      for (let i = currentQuestionIndex; i > 2; i--) {
        prevQuestion();
      }
    } else {
      prevQuestion();
    }
  };

  // Toast gösterme fonksiyonu
  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
  };

  const questions = [
    {
      key: 'q1',
      type: 'radio',
      text: 'Yaş aralığınızı seçiniz:',
      options: ['-18','18 - 24', '25 - 34', '35 - 44', '45+'],
      subQuestions: [
        {
          key: 'q1_1',
          type: 'input',
          text: 'İsminiz (opsiyonel):',
        }
      ],
      condition: () => true, // Her zaman göster
    },
    {
      key: 'q2',
      type: 'input',
      text: 'Yatırım için ayırdığınız aylık bütçeniz nedir? (TL cinsinden)',
    },
    {
      key: 'q3',
      type: 'radio',
      text: 'Finansal piyasalara (kripto, hisse, forex vb.) ilginiz var mı?',
      options: ['Evet', 'Hayır'],
      subQuestions: [
        {
          key: 'q3_1',
          type: 'checkbox',
          text: 'Hangi yatırım araçlarına ilginiz var?',
          options: [
            'Kripto para borsaları',
            'Hisse senetleri',
            'Altın, gümüş gibi değerli madenler',
            'Forex (döviz) piyasası',
            'Diğer',
          ],
        },
        {
          key: 'q3_2',
          type: 'radio',
          text: 'Varsa ortalama aylık işlem sıklığınız?',
          options: ['0-20', '21-100', '100+'],
        },
      ],
      condition: (value) => value === 'Evet',
    },
    {
      key: 'q4',
      type: 'radio',
      text: 'Alım satım stratejileri geliştiriyor musunuz veya geliştirmek ister misiniz?',
      options: ['Evet', 'Hayır', 'Kısmen'],
      subQuestions: [
        {
          key: 'q4_1',
          type: 'checkbox',
          text: 'Hangi programlama dillerinde strateji yazma deneyiminiz var?',
          options: [
            'Python',
            'C, C++, C#, Java',
            'Pine Script (TradingView)',
            'Diğer',
          ],
        },
        {
          key: 'q4_2',
          type: 'checkbox',
          text: 'Stratejilerinizi nasıl test ediyorsunuz?',
          options: [
            'TradingView aracılığıyla',
            'Kod yazarak kendim',
            'Hazır platformlar (örnek: Trality, 3Commas)',
            'Test etmiyorum',
          ],
        },
      ],
      condition: (value) => value === 'Evet' || value === 'Kısmen',
    },
    {
      key: 'q5',
      type: 'radio',
      text: 'Daha önce otomatik alım satım robotu kullandınız mı?',
      options: ['Evet', 'Hayır ama kullanmak isterim', 'Hayır'],
      subQuestions: [
        {
          key: 'q5_1',
          type: 'checkbox',
          text: 'Hangi platform aracılığı ile robot çalıştırdınız? ',
          options: [
            '3Commas',
            'Matrix',
            'Kendim',
            'Diğer',
          ],
        },

      ],
      condition: (value) => value === 'Evet',
    },
    {
      key: 'q6',
      type: 'radio',
      text: 'Bot kiralama, strateji satın alma veya satabilme imkanınızın olduğu bir website olsa ilgilenir misiniz?',
      options: [
        'Evet, ilgilenirim',
        'Düşünürüm, ama güvenemem',
        'İlgilenmem',
      ],
    },
    {
      key: 'q7',
      type: 'radio',
      text: 'Kendi al-sat stratejinizi başkalarıyla paylaşır mısınız?',
      options: [
        'Ücretli',
        'Ücretsiz',
        'Kâr payı ile',
        'Paylaşmam',
      ],
    },
    {
      key: 'q8',
      type: 'radio',
      text: 'Başkalarının stratejilerini kullanmayı düşünür müsünüz?',
      options: [
        'Evet, düşünürüm',
        'Geçmiş performansını yeterince test ettikten sonra düşünebilirim',
        'Hayır, düşünmem',
      ],
    },
    {
      key: 'q9',
      type: 'radio',
      text: 'Bir stratejinin güvenilirliğini değerlendirmek isteseniz en çok neye dikkat edersiniz?',
      options: [
        'Kazandığı işlemlerin oranı',
        'Risk ve kazanç dengesi',
        'En fazla zarar ettiği miktar ve dönem',
        'Toplam kazanç',
        'Diğer kullanıcıların yorumları',
        'Farklı piyasa koşullarında gösterdiği performans',
        'Stratejinin nasıl çalıştığına dair şeffaflığı',
      ],
    },
    {
      key: 'q10',
      type: 'radio',
      text: 'Platformumuzun erken sürüm testlerinde yer almak ister misiniz?',
      options: ['Evet', 'Hayır'],
      subQuestions: [
        {
          key: 'q10_1',
          type: 'input',
          text: 'E-Mail:',
        },
        {
          key: 'q10_2',
          type: 'phone',
          text: 'Telefon:',
          countryCodes: [
            { code: '+90', country: 'Türkiye' },
            { code: '+1', country: 'USA/Canada' },
            { code: '+44', country: 'UK' },
            { code: '+49', country: 'Germany' },
            { code: '+33', country: 'France' },
            { code: '+39', country: 'Italy' },
            { code: '+34', country: 'Spain' },
            { code: '+31', country: 'Netherlands' },
            { code: '+32', country: 'Belgium' },
            { code: '+41', country: 'Switzerland' },
            { code: '+43', country: 'Austria' },
            { code: '+45', country: 'Denmark' },
            { code: '+46', country: 'Sweden' },
            { code: '+47', country: 'Norway' },
            { code: '+48', country: 'Poland' },
            { code: '+7', country: 'Russia' },
            { code: '+86', country: 'China' },
            { code: '+81', country: 'Japan' },
            { code: '+82', country: 'South Korea' },
            { code: '+91', country: 'India' },
            { code: '+55', country: 'Brazil' },
            { code: '+54', country: 'Argentina' },
            { code: '+52', country: 'Mexico' },
            { code: '+27', country: 'South Africa' },
            { code: '+61', country: 'Australia' },
            { code: '+64', country: 'New Zealand' },
          ],
        },
      ],      
      condition: (value) => value === 'Evet',
    },
    {
      key: 'q11',
      type: 'textarea',
      text: 'Platformumuzdan beklentileriniz nelerdir?',
    },
    {
      key: 'q12',
      type: 'textarea',
      text: 'Önerileriniz varsa yazınız.',
    },
    {
      key: 'q13',
      type: 'checkbox',
      text: 'Hangi özellik sizi en çok heyecanlandırır?',
      options: [
        'Ücretsiz robot oluşturabilme',
        'Hazır robotları satın alabilme',
        'Stratejimi başkalarına satabilme',
        'Canlı veriyle gerçek zamanlı test yapabilme',
        'Başarılı stratejilerden otomatik kopyalama (copy-trade)',
        'Strateji sahipliğimi blokzincirle koruma altına alabilme',
        'Topluluk içi sıralama ve yarışmalara katılabilme',
        'Mobil uygulama üzerinden kolay erişim',
      ],
      maxSelections: 3,
    },
    {
      key: 'q14',
      type: 'checkbox',
      text: 'Aşağıdakilerden en çok endişeniz olanlar hangileri?',
      options: [
        'Stratejilerimin izinsiz kopyalanması',
        'Botların doğru çalışmaması / zarara uğratması',
        'Platforma bağladığım cüzdanımın güvenliği',
        'Kimlik bilgilerimin 3. kişilerle paylaşılması',
        'Paramın çekilememesi / kaybolması',
        'Dolandırıcılık ihtimali (sahte strateji, sahte kullanıcı vb.)',
        'Destek ekibine ulaşamama / sorun çözülmemesi',
      ],
      maxSelections: 3,
    },
  ];

  const current = questions[currentQuestionIndex];
  const showSubQuestions = current.condition?.(answers[current.key]);

  return (
    <main className={`min-h-screen w-full transition-colors duration-300 ${
      isDarkMode ? 'hard-gradient' : 'light-gradient'
    } flex justify-center items-center p-4`}>
      {/* Toast Notifications */}
      {(isSubmitting || toast.show) && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`flex items-center space-x-3 px-6 py-3 rounded-xl shadow-lg backdrop-blur-lg transition-all duration-300 ${
            isSubmitting 
              ? isDarkMode ? 'bg-gray-800/90' : 'bg-white/90'
              : toast.type === 'success'
                ? isDarkMode ? 'bg-green-800/90' : 'bg-green-100/90'
                : isDarkMode ? 'bg-red-800/90' : 'bg-red-100/90'
          }`}>
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Cevaplarınız kaydediliyor...
                </span>
              </>
            ) : (
              <>
                {toast.type === 'success' ? (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className={`text-sm font-medium ${
                  isDarkMode 
                    ? toast.type === 'success' ? 'text-green-200' : 'text-red-200'
                    : toast.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {toast.message}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <div className={`w-full max-w-3xl h-[90vh] flex flex-col backdrop-blur-lg rounded-3xl shadow-2xl p-6 md:p-8 relative ${
        isDarkMode ? 'bg-black/90' : 'bg-white/90'
      }`}>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`absolute top-4 right-4 p-2 rounded-full transition-all duration-300 backdrop-blur-sm ${
            isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'
          }`}
          aria-label="Toggle theme"
        >
          {isDarkMode ? (
            <svg className="w-6 h-6 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
          Whaleer Kullanıcı Anketi
        </h1>

        {!isStarted ? (
          // Introduction Page
          <div className="flex-1 flex flex-col items-center overflow-y-auto">
            <div className="w-full max-w-2xl px-4 py-6 space-y-6">
              <p className={`text-lg md:text-xl leading-relaxed text-justify ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                Merhaba! 👋
              </p>
              <p className={`text-lg md:text-xl leading-relaxed text-justify ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                Whaleer olarak, algoritmik alım-satım dünyasında sadece strateji geliştirmekle kalmayıp, onu test edebileceğin, başkalarıyla paylaşabileceğin ve otomatik şekilde çalıştırabileceğin bir alan oluşturuyoruz.
              </p>
              <p className={`text-lg md:text-xl leading-relaxed text-justify ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                Bu kısa anketi meraklı ve yetenekli kullanıcılarımızı daha iyi anlayabilmek için hazırladık. Yanıtların, platformumuzu daha güvenli, sezgisel ve verimli hale getirmemizde bize ışık tutacak.
              </p>
              <p className={`text-lg md:text-xl leading-relaxed text-justify ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Vakit ayırdığın için şimdiden teşekkür ederiz. Hazırsan başlayalım! ✨
              </p>
            </div>
            <div className="w-full max-w-2xl px-4 py-4">
              <button
                onClick={() => setIsStarted(true)}
                className="w-full px-6 md:px-8 py-3 md:py-4 bg-blue-600 text-white text-lg md:text-xl rounded-xl hover:bg-blue-700 transition-all duration-300 transform hover:scale-105"
              >
                Ankete Başla
              </button>
            </div>
          </div>
        ) : isCompleted ? (
          // Thank You Page
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 px-4">
            <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-4">
              <h2 className={`text-2xl md:text-3xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                Teşekkürler!
              </h2>
              <p className={`text-lg md:text-xl leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                ✨ Görüşleriniz bizim için çok değerli. ✨
              </p>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center justify-center space-x-6 mt-8">
              <a
                href="https://www.linkedin.com/company/106360097"
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative p-3 rounded-full transition-all duration-300 transform hover:scale-110 ${
                  isDarkMode 
                    ? 'bg-gray-800 hover:bg-blue-600' 
                    : 'bg-gray-100 hover:bg-blue-500'
                }`}
              >
                <svg 
                  className={`w-6 h-6 transition-colors duration-300 ${
                    isDarkMode 
                      ? 'text-gray-300 group-hover:text-white' 
                      : 'text-gray-600 group-hover:text-white'
                  }`} 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded-md text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap bg-gray-900 text-white">
                  LinkedIn&#39;de Takip Et
                </span>
              </a>

              <a
                href="https://www.instagram.com/thewhaleer/"
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative p-3 rounded-full transition-all duration-300 transform hover:scale-110 ${
                  isDarkMode 
                    ? 'bg-gray-800 hover:bg-gradient-to-r hover:from-purple-500 hover:via-pink-500 hover:to-orange-500' 
                    : 'bg-gray-100 hover:bg-gradient-to-r hover:from-purple-500 hover:via-pink-500 hover:to-orange-500'
                }`}
              >
                <svg 
                  className={`w-6 h-6 transition-colors duration-300 ${
                    isDarkMode 
                      ? 'text-gray-300 group-hover:text-white' 
                      : 'text-gray-600 group-hover:text-white'
                  }`} 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded-md text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap bg-gray-900 text-white">
                  Instagram&#39;da Takip Et
                </span>
              </a>
            </div>
          </div>
        ) : (
          // Questions Section
          <>
            <div className="flex-1 overflow-y-auto pr-2">
              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Ana Soru */}
              <div className="mb-8 space-y-6">
                <p className={`text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{current.text}</p>

                {/* Select */}
                {current.type === 'select' && (
                  <select
                    name={current.key}
                    className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-gray-800 text-gray-100 border-gray-700' 
                        : 'bg-white text-gray-900 border-gray-200'
                    }`}
                    value={answers[current.key] || ''}
                    onChange={(e) => handleChange(current.key, e.target.value)}
                  >
                    <option value="" disabled>Yaş aralığınızı seçin</option>
                    {current.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {/* Input */}
                {current.type === 'input' && (
                  <input
                    type={current.key === 'q2' ? 'number' : 'text'}
                    name={current.key}
                    min={current.key === 'q2' ? '0' : undefined}
                    step={current.key === 'q2' ? '1' : undefined}
                    className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-gray-800 text-gray-100 border-gray-700' 
                        : 'bg-white text-gray-900 border-gray-200'
                    }`}
                    placeholder={current.key === 'q2' ? "Sadece sayı giriniz..." : "Yanıtınızı buraya yazabilirsiniz..."}
                    value={answers[current.key] || ''}
                    onChange={(e) => {
                      if (current.key === 'q2') {
                        const value = e.target.value;
                        if (value === '' || /^\d+$/.test(value)) {
                          handleChange(current.key, value);
                        }
                      } else {
                        handleChange(current.key, e.target.value);
                      }
                    }}
                  />
                )}

                {/* Radio */}
                {current.type === 'radio' && (
                  <div className="space-y-3">
                    {current.options.map((opt) => (
                      <label key={opt} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                        isDarkMode 
                          ? 'bg-gray-800 text-gray-100 border-gray-700 hover:bg-gray-700' 
                          : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
                      }`}>
                        <input
                          type="radio"
                          name={current.key}
                          className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                          checked={answers[current.key] === opt}
                          onChange={() => handleChange(current.key, opt)}
                        />
                        <span className="ml-3">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Checkbox */}
                {current.type === 'checkbox' && (
                  <div className="space-y-3">
                    {current.options.map((opt) => (
                      <label key={opt} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                        isDarkMode 
                          ? 'bg-gray-800 text-gray-100 border-gray-700 hover:bg-gray-700' 
                          : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
                      }`}>
                        <input
                          type="checkbox"
                          name={current.key}
                          className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                          checked={answers[current.key]?.includes(opt) || false}
                          onChange={(e) => {
                            const currentAnswers = answers[current.key] || [];
                            if (e.target.checked) {
                              if (current.maxSelections && currentAnswers.length >= current.maxSelections) {
                                setError(`En fazla ${current.maxSelections} seçim yapabilirsiniz.`);
                                return;
                              }
                              handleChange(current.key, [...currentAnswers, opt]);
                            } else {
                              handleChange(
                                current.key,
                                currentAnswers.filter((item) => item !== opt)
                              );
                            }
                          }}
                        />
                        <span className="ml-3">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Textarea */}
                {current.type === 'textarea' && (
                  <textarea
                    name={current.key}
                    rows={6}
                    className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-gray-800 text-gray-100 border-gray-700' 
                        : 'bg-white text-gray-900 border-gray-200'
                    }`}
                    placeholder="Yanıtınızı buraya yazabilirsiniz..."
                    value={answers[current.key] || ''}
                    onChange={(e) => handleChange(current.key, e.target.value)}
                  />
                )}
              </div>

              {/* Alt Sorular */}
              {showSubQuestions && current.subQuestions?.map((sub) => (
                <div key={sub.key} className="mb-8 space-y-6">
                  <p className={`text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{sub.text}</p>
                  
                  {/* Input (email, phone) */}
                  {sub.type === 'input' && (
                    <input
                      type={sub.key === 'q10_1' ? 'email' : 'text'}
                      placeholder={sub.key === 'q1_1' ? '' : sub.text}
                      className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                        isDarkMode 
                          ? 'bg-gray-800 text-gray-100 border-gray-700' 
                          : 'bg-white text-gray-900 border-gray-200'
                      }`}
                      value={answers[sub.key] || ''}
                      onChange={(e) => handleChange(sub.key, e.target.value)}
                    />
                  )}

                  {/* Phone Input with Country Code */}
                  {sub.type === 'phone' && (
                    <div className="flex flex-row gap-2">
                      <select
                        className={`w-24 p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-base ${
                          isDarkMode 
                            ? 'bg-gray-800 text-gray-100 border-gray-700' 
                            : 'bg-white text-gray-900 border-gray-200'
                        }`}
                        value={answers[`${sub.key}_countryCode`] || '+90'}
                        onChange={(e) => {
                          const countryCode = e.target.value;
                          const phoneNumber = answers[`${sub.key}_number`] || '';
                          handleChange(`${sub.key}_countryCode`, countryCode);
                          handleChange(sub.key, `${countryCode}${phoneNumber}`);
                        }}
                      >
                        {sub.countryCodes.map(({ code }) => (
                          <option key={code} value={code} className="text-base">
                            {code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        placeholder="Telefon numarası"
                        className={`flex-1 p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-base ${
                          isDarkMode 
                            ? 'bg-gray-800 text-gray-100 border-gray-700' 
                            : 'bg-white text-gray-900 border-gray-200'
                        }`}
                        value={answers[`${sub.key}_number`] || ''}
                        onChange={(e) => {
                          const phoneNumber = e.target.value;
                          if (phoneNumber === '' || /^\d+$/.test(phoneNumber)) {
                            const countryCode = answers[`${sub.key}_countryCode`] || '+90';
                            handleChange(`${sub.key}_number`, phoneNumber);
                            handleChange(sub.key, `${countryCode}${phoneNumber}`);
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Radio */}
                  {sub.type === 'radio' && (
                    <div className="space-y-3">
                      {sub.options.map((opt) => (
                        <label key={opt} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                          isDarkMode 
                            ? 'bg-gray-800 text-gray-100 border-gray-700 hover:bg-gray-700' 
                            : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
                        }`}>
                          <input
                            type="radio"
                            name={sub.key}
                            className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                            checked={answers[sub.key] === opt}
                            onChange={() => handleChange(sub.key, opt)}
                          />
                          <span className="ml-3">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Checkbox */}
                  {sub.type === 'checkbox' && (
                    <div className="space-y-3">
                      {sub.options.map((opt) => (
                        <label key={opt} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                          isDarkMode 
                            ? 'bg-gray-800 text-gray-100 border-gray-700 hover:bg-gray-700' 
                            : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
                        }`}>
                          <input
                            type="checkbox"
                            name={sub.key}
                            className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                            checked={answers[sub.key]?.includes(opt) || false}
                            onChange={(e) => {
                              const currentAnswers = answers[sub.key] || [];
                              if (e.target.checked) {
                                if (sub.maxSelections && currentAnswers.length >= sub.maxSelections) {
                                  setError(`En fazla ${sub.maxSelections} seçim yapabilirsiniz.`);
                                  return;
                                }
                                handleChange(sub.key, [...currentAnswers, opt]);
                              } else {
                                handleChange(
                                  sub.key,
                                  currentAnswers.filter((item) => item !== opt)
                                );
                              }
                            }}
                          />
                          <span className="ml-3">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
      
            {/* Navigation Buttons */}
            <div className={`flex justify-between mt-6 pt-6 border-t ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <button
                onClick={handleCustomPrev}
                className={`px-6 py-3 rounded-xl transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50`}
                disabled={currentQuestionIndex === 0}
              >
                ◀ Geri
              </button>

              {currentQuestionIndex === questions.length - 1 ? (
                <button
                  onClick={async () => {
                    if (validateCurrentQuestion()) {
                      setIsSubmitting(true);
                      try {
                        console.log(answers)
                        const res = await fetch('/api/save', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify(answers),
                        });
                      
                        if (res.ok) {
                          showToast('success', 'Teşekkürler! Cevaplarınız başarıyla kaydedildi.');
                          setIsCompleted(true);
                        } else {
                          showToast('error', 'Kaydetme başarısız oldu. Lütfen tekrar deneyin.');
                        }
                      } catch (err) {
                        console.error('Gönderim hatası:', err);
                        showToast('error', 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }
                  }}
                  disabled={isSubmitting}
                  className={`px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-300 ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? 'Gönderiliyor...' : 'Formu Tamamla'}
                </button>
              ) : (
                <button
                  onClick={handleCustomNext}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300"
                >
                  İleri ▶
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}