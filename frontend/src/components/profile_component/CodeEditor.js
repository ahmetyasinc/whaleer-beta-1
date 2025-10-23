//"use client";
//
//import { useEffect, useRef } from "react";
//import Editor from "@monaco-editor/react";
//
//const CodeEditor = ({ code, setCode }) => {
//  const editorRef = useRef(null);
//  const monacoRef = useRef(null); // monaco referansı saklanıyor
//
//  const handleEditorDidMount = (editor, monaco) => {
//    editorRef.current = editor;
//    monacoRef.current = monaco;
  //
//    // Python dili tanımı ve renklendirme
//    monaco.languages.register({ id: "python" });
//    monaco.languages.setMonarchTokensProvider("python", {
//      tokenizer: {
//        root: [
//          [/#.*/, "comment"],
//          [/\b(print|def|class|if|else|elif|return|import|from|as|with|try|except|finally|while|for|plot|hline|break|continue|pass|lambda|not|or|and|is|assert|async|await|del|global|nonlocal|raise|yield)\b/, "keyword"],
//          [/\b(True|False|None)\b/, "constant"],
//          [/\b(int|float|str|bool|list|tuple|set|dict|bytes|complex|range|frozenset|memoryview|bytearray|object|type)\b/, "type"],
//          [/[+\-*/%=<>!&|^~]+/, "operator"],
//          [/[{}()\[\]]/, "delimiter"],
//          [/\b\d+(\.\d+)?\b/, "number"],
//          [/"""/, "string", "@triple_double_quote"],
//          [/'''/, "string", "@triple_single_quote"],
//          [/".*?"/, "string"],
//          [/'.*?'/, "string"],
//          [/\b(len|type|range|open|abs|round|sorted|map|filter|zip|sum|min|max|pow|chr|ord|bin|hex|oct|id|repr|hash|dir|vars|locals|globals|help|isinstance|issubclass|callable|eval|exec|compile|input|super|memoryview|staticmethod|classmethod|property|delattr|getattr|setattr|hasattr|all|any|enumerate|format|iter|next|reversed|slice)\b/, "function"],
//          [/\b(os|sys|math|random|time|datetime|re|json|csv|argparse|collections|functools|itertools|threading|multiprocessing|socket|subprocess|asyncio|base64|pickle|gzip|shutil|tempfile|xml|http|urllib|sqlite3)\b/, "module"],
//        ],
//        triple_double_quote: [[/"""/, "string", "@popall"], [/./, "string"]],
//        triple_single_quote: [[/'''/, "string", "@popall"], [/./, "string"]],
//      },
//    });
//  };
//
//  // 🔍 Basit Hata Kontrolü
//  useEffect(() => {
//    const editor = editorRef.current;
//    const monaco = monacoRef.current;
  //
//    if (!editor || !monaco) return;
  //
//    const model = editor.getModel();
//    const lines = code.split("\n");
  //
//    const markers = [];
  //
//    lines.forEach((line, index) => {
//      if (line.startsWith("import") && line.trim() === "import") {
//        markers.push({
//          severity: monaco.MarkerSeverity.Error,
//          message: "Eksik import ifadesi",
//          startLineNumber: index + 1,
//          startColumn: 1,
//          endLineNumber: index + 1,
//          endColumn: line.length + 1,
//        });
//      }
    //
//      // başka örnek: boş `def` satırlarını işaretleyebiliriz
//      if (line.trim().startsWith("def") && !line.includes("(")) {
//        markers.push({
//          severity: monaco.MarkerSeverity.Warning,
//          message: "Fonksiyon tanımı eksik olabilir",
//          startLineNumber: index + 1,
//          startColumn: 1,
//          endLineNumber: index + 1,
//          endColumn: line.length + 1,
//        });
//      }
//    });
  //
//    monaco.editor.setModelMarkers(model, "python", markers);
//  }, [code]);
//
//  return (
//    <Editor
//      height="100%"
//      language="python"
//      theme="vs-dark"
//      value={code}
//      onChange={setCode}
//      onMount={handleEditorDidMount}
//      options={{
//        automaticLayout: true,
//        minimap: { enabled: false },
//        wordWrap: "off",
//      }}
//    />
//  );
//};
//
//export default CodeEditor;
//

"use client";

import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";

const CodeEditor = ({ code, setCode, onSave }) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Python dili tanımı ve renklendirme
    monaco.languages.register({ id: "python" });
    monaco.languages.setMonarchTokensProvider("python", {
      tokenizer: {
        root: [
          [/#.*/, "comment"],
          [/\b(print|def|class|if|else|elif|return|import|from|as|with|try|except|finally|while|for|plot|hline|break|continue|pass|lambda|not|or|and|is|assert|async|await|del|global|nonlocal|raise|yield)\b/, "keyword"],
          [/\b(True|False|None)\b/, "constant"],
          [/\b(int|float|str|bool|list|tuple|set|dict|bytes|complex|range|frozenset|memoryview|bytearray|object|type)\b/, "type"],
          [/[+\-*/%=<>!&|^~]+/, "operator"],
          [/[{}()\[\]]/, "delimiter"],
          [/\b\d+(\.\d+)?\b/, "number"],
          [/"""/, "string", "@triple_double_quote"],
          [/'''/, "string", "@triple_single_quote"],
          [/".*?"/, "string"],
          [/'.*?'/, "string"],
        ],
        triple_double_quote: [[/"""/, "string", "@popall"], [/./, "string"]],
        triple_single_quote: [[/'''/, "string", "@popall"], [/./, "string"]],
      },
    });
  };

  // 🔍 Basit hata işaretleme
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    const lines = code.split("\n");
    const markers = [];

    lines.forEach((line, index) => {
      if (line.startsWith("import") && line.trim() === "import") {
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message: "Eksik import ifadesi",
          startLineNumber: index + 1,
          startColumn: 1,
          endLineNumber: index + 1,
          endColumn: line.length + 1,
        });
      }

      if (line.trim().startsWith("def") && !line.includes("(")) {
        markers.push({
          severity: monaco.MarkerSeverity.Warning,
          message: "Fonksiyon tanımı eksik olabilir",
          startLineNumber: index + 1,
          startColumn: 1,
          endLineNumber: index + 1,
          endColumn: line.length + 1,
        });
      }
    });

    monaco.editor.setModelMarkers(model, "python", markers);
  }, [code]);

  // 🔑 Ctrl+S / Cmd+S yakalama
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault(); // tarayıcı save dialogunu engelle
        if (onSave && editorRef.current) {
          const currentValue = editorRef.current.getValue();
          onSave(currentValue);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave]);

  return (
    <Editor
      height="100%"
      language="python"
      theme="vs-dark"
      value={code}
      onChange={setCode}
      onMount={handleEditorDidMount}
      options={{
        automaticLayout: true,
        minimap: { enabled: false },
        wordWrap: "off",
      }}
    />
  );
};

export default CodeEditor;
