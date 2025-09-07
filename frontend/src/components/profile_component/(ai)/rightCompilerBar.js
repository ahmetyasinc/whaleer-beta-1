'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { MdArrowForwardIos } from "react-icons/md";
import { BiCopy } from 'react-icons/bi';
import { MdLibraryAddCheck } from "react-icons/md";
import { BsFillTriangleFill } from "react-icons/bs";

// Monaco Editor'u sadece client tarafında yükle
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const RightCompilerBar = ({ 
  isOpen, 
  onClose, 
  codes = [], 
  activeCodeIndex = 0, 
  onCodeIndexChange 
}) => {
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const monacoRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const currentCode = codes[activeCodeIndex];

  // Aktif kod değiştiğinde editor'ı güncelle
  useEffect(() => {
    if (currentCode) {
      setCode(currentCode.content || '');
      setOutput(''); // Output'u temizle
    }
  }, [currentCode]);

  // Kod çalıştırma fonksiyonu
  const handleRun = async () => {
    if (!currentCode || !code.trim()) return;
    
    setIsRunning(true);
    setOutput('Kod çalıştırılıyor...');
    
    // Simulated code execution
    setTimeout(() => {
      setOutput(`${currentCode.title} başarıyla çalıştırıldı!\n\n=== ÇIKTI ===\nMerhaba Whaleer!\nKod başarıyla yürütüldü.\n\n=== BİLGİ ===\nDil: ${currentCode.language}\nSatır sayısı: ${code.split('\n').length}`);
      setIsRunning(false);
    }, 1500);
  };

  // Kod kopyalama fonksiyonu
  const handleCopy = () => {
    if (!code.trim()) return;
    
    navigator.clipboard.writeText(code);
    // Burada toast notification gösterebilirsiniz
    
    // 3 saniye sonra eski haline dön
    setCopied(true); // <-- BU SATIRI EKLEMEN GEREKİYOR
    setTimeout(() => {
      setCopied(false);
    }, 3000);

  };

  // Tab değiştirme fonksiyonu
  const handleTabChange = (index) => {
    onCodeIndexChange(index);
    setOutput(''); // Output'u temizle
  };

  // Monaco Editor konfigürasyonu
  function handleEditorWillMount(monaco) {
    if (monacoRef.current) return;
    monacoRef.current = monaco;

    // Python özel dil tanımı
    monaco.languages.register({ id: 'python-custom' });

    monaco.languages.setMonarchTokensProvider('python-custom', {
      tokenizer: {
        root: [
          [/#.*/, 'comment'],
          [/\b(print|def|class|if|else|elif|return|import|from|as|with|try|except|finally|while|for|plot|hline|break|continue|pass|lambda|not|or|and|is|assert|async|await|del|global|nonlocal|raise|yield)\b/, 'keyword'],
          [/\b(True|False|None)\b/, 'constant'],
          [/\b(int|float|str|bool|list|tuple|set|dict|bytes|complex|range|frozenset|memoryview|bytearray|object|type)\b/, 'type'],
          [/[+\-*/%=<>!&|^~]+/, 'operator'],
          [/[{}()\[\]]/, 'delimiter'],
          [/\b\d+(\.\d+)?\b/, 'number'],
          [/"""/, 'string', '@triple_double_quote'],
          [/'''/, 'string', '@triple_single_quote'],
          [/".*?"/, 'string'],
          [/'.*?'/, 'string'],
          [/\b(len|type|range|open|abs|round|sorted|map|filter|zip|sum|min|max|pow|chr|ord|bin|hex|oct|id|repr|hash|dir|vars|locals|globals|help|isinstance|issubclass|callable|eval|exec|compile|input|super|memoryview|staticmethod|classmethod|property|delattr|getattr|setattr|hasattr|all|any|enumerate|format|iter|next|reversed|slice)\b/, 'function'],
          [/\b(os|sys|math|random|time|datetime|re|json|csv|argparse|collections|functools|itertools|threading|multiprocessing|socket|subprocess|asyncio|base64|pickle|gzip|shutil|tempfile|xml|http|urllib|sqlite3)\b/, 'module'],
        ],
        triple_double_quote: [[/"""/, 'string', '@popall'], [/./, 'string']],
        triple_single_quote: [[/'''/, 'string', '@popall'], [/./, 'string']],
      },
    });
  }

  // Kod değişikliklerini takip et
  const handleEditorChange = (value) => {
    setCode(value || '');
  };

  if (!isOpen || codes.length === 0) return null;

  return (
    <div
      className="fixed top-0 right-0 h-screen bg-neutral-900 border-l border-neutral-700 z-50 transition-transform duration-300 ease-in-out flex flex-col"
      style={{ width: '750px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700 bg-neutral-800">
        {/* Sol taraf - Kapatma butonu ve başlık */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-700 transition"
          >
            <MdArrowForwardIos size={20} />
          </button>
          <div className="flex items-center space-x-2">
            <h3 className="text-neutral-300 font-semibold text-base mt-2">Kod Editörü</h3>
          </div>
        </div>

        {/* Sağ taraf - Aksiyon butonları */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-700 transition"
            title={copied ? "Kopyalandı" : "Kodu Kopyala"}
          >
            {copied ? <MdLibraryAddCheck size={18} /> : <BiCopy size={18} />}
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning || !code.trim()}
            className="flex items-center space-x-2 bg-neutral-800 text-neutral-700 hover:text-green-600  px-2 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <BsFillTriangleFill className="text-lg text-green-600 rotate-90" />
            <span>{isRunning ? 'Çalışıyor...' : 'Çalıştır'}</span>
          </button>
        </div>
      </div>

      {/* Code Tabs - Birden fazla kod varsa */}
      {codes.length > 1 && (
        <div className="flex border-b border-neutral-700 bg-neutral-800 overflow-x-auto">
          {codes.map((codeItem, index) => (
            <button
              key={codeItem.id}
              onClick={() => handleTabChange(index)}
              className={`flex-shrink-0 px-4 py-[10px] text-sm font-medium border-r border-neutral-700 transition-colors min-w-0 ${
                index === activeCodeIndex
                  ? 'bg-neutral-900 text-white border-b border-blue-400'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="truncate max-w-32">{codeItem.title}</span>
                <span className="text-[10px] bg-neutral-700 text-neutral-400 px-2 py-[3px] rounded flex-shrink-0">
                  {codeItem.language}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Aktif kod bilgisi - Tek kod varsa */}
      {codes.length === 1 && currentCode && (
        <div className="flex items-center justify-between p-3 bg-neutral-800 border-b border-neutral-700">
          <div className="flex items-center space-x-2">
            <span className="text-white font-medium">{currentCode.title}</span>
            <span className="text-xs bg-neutral-600 text-neutral-300 px-2 py-1 rounded">
              {currentCode.language}
            </span>
          </div>
        </div>
      )}

      {/* Monaco Editor ve Output Alanı */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Monaco Editor */}
        <div className={`${output ? 'flex-1' : 'flex-1'} border-b border-neutral-700`}>
          <MonacoEditor
            beforeMount={handleEditorWillMount}
            language={currentCode?.language === 'python' ? 'python-custom' : (currentCode?.language || 'python-custom')}
            value={code}
            onChange={handleEditorChange}
            theme="vs-dark"
            height="100%"
            options={{
              readOnly: true, // kullanıcı değişiklik yapamaz
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: true,
              automaticLayout: true,
              wordWrap: 'off', // satır kaydırma kapalı (yani yatay taşarsa scroll çıkar)
              lineNumbers: 'on',
              glyphMargin: false,
              folding: false,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 3,
              horizontal: 'scroll', // bazı durumlarda etkili olması için eklenebilir
              scrollbar: {
                horizontal: 'auto',
                horizontalScrollbarSize: 12
              }
            }}
          />

        </div>

      </div>
    </div>
  );
};

export default RightCompilerBar;