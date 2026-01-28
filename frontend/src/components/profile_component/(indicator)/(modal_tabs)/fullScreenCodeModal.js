"use client";

import { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { IoMdClose } from "react-icons/io";
import { FaRegSave, FaChevronDown, FaChevronUp, FaRegEye } from "react-icons/fa";
import { MdGridView } from "react-icons/md";
import { TbColumns3 } from "react-icons/tb";
import RunButton from "./run_button";
import RunButtonStr from "./run_button_str";
import TerminalIndicator from "./terminalIndicator";
import TerminalStrategy from "./terminalStrategy";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";
import useIndicatorStore from "@/store/indicator/indicatorStore";
import useStrategyStore from "@/store/indicator/strategyStore";
import FullScreenChooseIndicator from "./fullScreenChooseIndicator";
import axios from "axios";
import { TbMaximize } from "react-icons/tb";

axios.defaults.withCredentials = true;

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

/**
 * CodeModal - Unified modal for both indicators and strategies
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.indicator - Indicator or Strategy object (for backward compatibility)
 * @param {Object} props.strategy - Strategy object (alternative to indicator prop)
 * @param {Function} props.onSave - Save handler
 * @param {"indicator"|"strategy"} props.type - Type of the modal ("indicator" or "strategy")
 * @param {boolean} props.locked - Whether editing is locked (for strategies)
 */
const CodeModal = ({
  isOpen,
  onClose,
  indicator,
  strategy,
  onSave,
  type = "indicator",
  locked = false,
  onMinimizeChange // 🔑 Notify parent about minimize state
}) => {
  // Determine the entity based on type
  const entity = type === "strategy" ? strategy : indicator;

  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localCode, setLocalCode] = useState("");
  const monacoRef = useRef(null);
  const runButtonRefs = useRef([]);
  const { t } = useTranslation("profile/indicatorEditor");
  const [isPeekMode, setIsPeekMode] = useState(false);
  const [layoutMode, setLayoutMode] = useState("columns");
  const [isMinimized, setIsMinimizedState] = useState(false);

  const setIsMinimized = (val) => {
    // If passing a function/callback
    const value = typeof val === 'function' ? val(isMinimized) : val;
    setIsMinimizedState(value);
    if (onMinimizeChange) onMinimizeChange(value);
  };

  // Multi-panel support - each panel has its own terminal state
  const [panels, setPanelsState] = useState([]);
  const panelsRef = useRef([]);
  const codesMapRef = useRef(new Map()); // Map<entityId-panelIndex, code> - stores code independently
  const [showSelectModal, setShowSelectModal] = useState(false);

  // Custom setPanels that updates both state and ref synchronously
  const setPanels = useCallback((updater) => {
    setPanelsState(prev => {
      const newPanels = typeof updater === 'function' ? updater(prev) : updater;
      panelsRef.current = newPanels;
      // Also update codesMap for each panel
      newPanels.forEach((p, i) => {
        const entityItem = p.indicator || p.strategy;
        if (entityItem?.id) {
          // Only set if not already in map (to preserve user edits)
          if (!codesMapRef.current.has(`${entityItem.id}-${i}`)) {
            codesMapRef.current.set(`${entityItem.id}-${i}`, p.code);
          }
        }
      });
      return newPanels;
    });
  }, []);

  // Get personal indicators/strategies from store (needed for panel limit check)
  const { indicators } = useIndicatorStore();
  const { strategies } = useStrategyStore();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (isOpen && !isMinimized) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    } else {
      // Restore scrolling when minimized
      document.body.style.overflow = "";
    }
  }, [isOpen, isMinimized, mounted]);

  // Reset state when modal closes (only if not minimized - minimize preserves data)
  useEffect(() => {
    if (!isOpen && !isMinimized) {
      prevEntityIdRef.current = null;
      setPanels([]);
      codesMapRef.current.clear();
    }
  }, [isOpen, isMinimized, setPanels]);

  // Initialize panels with main entity - only when entity ID changes or modal opens
  const prevEntityIdRef = useRef(null);
  useEffect(() => {
    if (entity && entity.id !== prevEntityIdRef.current) {
      prevEntityIdRef.current = entity.id;
      // Clear codesMap and add the initial entity's code
      codesMapRef.current.clear();
      codesMapRef.current.set(`${entity.id}-0`, entity.code || "");

      const panelData = {
        code: entity.code || "",
        isTerminalOpen: true,
        terminalRef: null
      };

      // Use the appropriate key based on type
      if (type === "strategy") {
        panelData.strategy = entity;
      } else {
        panelData.indicator = entity;
      }

      setPanels([panelData]);
    }
  }, [entity, type, setPanels]);

  // Update local code when panel changes
  useEffect(() => {
    if (panels.length > 0) {
      setLocalCode(panels[0].code);
    }
  }, [panels]);

  // Sync external code changes to the main panel
  const prevEntityCodeRef = useRef(entity?.code);

  useEffect(() => {
    // Only proceed if entity code has actually changed from outside
    if (entity?.code !== prevEntityCodeRef.current) {
      prevEntityCodeRef.current = entity?.code;

      setPanels(prev => {
        if (prev.length === 0) return prev;

        // Assume main entity is always at index 0 (the one modal opened with)
        const mainPanel = prev[0];
        const mainEntity = mainPanel.strategy || mainPanel.indicator;

        // Only update if it's the same entity ID
        if (mainEntity && mainEntity.id === entity.id) {
          // Update the code in the map and the panel
          codesMapRef.current.set(`${entity.id}-0`, entity.code);

          // If we are updating the first panel, this will trigger the effect above to update localCode too
          return prev.map((p, i) => i === 0 ? { ...p, code: entity.code } : p);
        }
        return prev;
      });
    }
  }, [entity?.code, entity?.id, setPanels]);

  function handleEditorWillMount(monaco) {
    if (monacoRef.current) return;
    monacoRef.current = monaco;

    monaco.languages.register({ id: "python-custom" });
    monaco.languages.setMonarchTokensProvider("python-custom", {
      tokenizer: {
        root: [
          [/#.*/, "comment"],
          [/\b(plot_indicator|mark|plot|if|else|elif|def|for|,)\b/, "function.custom"],
          [/\binput\.(int|float|bool|color|string|or)\b/, "type"],
          [/\binput\b/, "type"],
          [/\b(pd|np|df)\b/, "variable.predefined"],
          [/\b(print|class|return|import|from|as|with|try|except|finally|while|break|continue|pass|lambda|not|or|color|and|is|assert|async|await|del|global|nonlocal|raise|yield)\b/, "keyword"],
          [/\b(True|False|None|:)\b/, "constant"],
          [/\b(int|float|str|bool|list|tuple|set|dict|bytes|complex|range|frozenset|memoryview|bytearray|object|type|astype)\b/, "type"],
          [/[=><!\+\-*/%&|^~]+/, "operator"],
          [/[;,.]/, "delimiter"],
          [/[{}()\[\]]/, "delimiter.bracket"],
          [/\b\d+(\.\d+)?\b/, "number"],
          [/"""/, "string", "@triple_double_quote"],
          [/'''/, "string", "@triple_single_quote"],
          [/".*?"/, "string"],
          [/'.*?'/, "string"],
          [/\b(len|type|range|open|abs|round|sorted|map|filter|zip|sum|min|max|pow|chr|ord|bin|hex|oct|id|repr|hash|dir|vars|locals|globals|help|isinstance|issubclass|callable|eval|exec|compile|super|memoryview|staticmethod|classmethod|property|delattr|getattr|setattr|hasattr|all|any|enumerate|format|iter|next|reversed|slice)\b/, "function"],
          [/\b(os|sys|math|random|time|datetime|re|json|csv|argparse|collections|functools|itertools|threading|multiprocessing|socket|subprocess|asyncio|base64|pickle|gzip|shutil|tempfile|xml|http|urllib|sqlite3|pandas|numpy)\b/, "module"],
        ],
        triple_double_quote: [[/"""/, "string", "@popall"], [/./, "string"]],
        triple_single_quote: [[/'''/, "string", "@popall"], [/./, "string"]],
      },
    });

    monaco.editor.defineTheme('whaleer-custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'operator', foreground: 'E2E8F0' },
        { token: 'keyword', foreground: '9658DB' },
        { token: 'type', foreground: '8BE9FD' },
        { token: 'function', foreground: '50FA7B' },
        { token: 'function.custom', foreground: '3B8EEA' },
        { token: 'variable.predefined', foreground: 'FF79C6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'BD93F9' },
        { token: 'delimiter', foreground: '3B8EEA' },
        { token: 'delimiter.bracket', foreground: 'F8F8F2' },
        { token: 'comment', foreground: '6A9955' },
      ],
      colors: {}
    });
  }

  const handleEditorDidMount = (editor, monaco) => {
    // Add Ctrl+S command to the editor instance
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Trigger save all
      handleSaveAll();
    });

    // Add F5 command to the editor instance
    editor.addCommand(monaco.KeyCode.F5, () => {
      // Trigger run all
      handleRunAll();
    });
  };

  // Save a specific panel's entity (indicator or strategy)
  const handleSavePanel = async (panelIndex) => {
    // Use ref to get the CURRENT panels (avoid stale closure)
    const currentPanels = panelsRef.current;
    const panel = currentPanels[panelIndex];

    if (!panel) return;

    // Determine panel type - supports mixed indicator/strategy panels
    const isStrategyPanel = !!panel.strategy;
    const panelEntity = isStrategyPanel ? panel.strategy : panel.indicator;
    if (!panelEntity) return;

    // Check if panel is locked (only for strategy panels with locked prop)
    if (locked && isStrategyPanel) return;

    // Get code from codesMap (most up-to-date source) or fallback to panel.code
    const mapKey = `${panelEntity.id}-${panelIndex}`;
    const codeToSave = codesMapRef.current.get(mapKey) ?? panel.code;

    // Check if this panel is the main entity (the one modal was opened with)
    const isMainEntity = entity && panelEntity.id === entity.id;

    // For the main entity, use onSave prop (which updates parent state)
    if (isMainEntity && onSave) {
      await onSave(codeToSave);
    } else {
      // For additional panels (or if main panel is moved/removed), directly call the API
      try {
        if (isStrategyPanel) {
          // Strategy API endpoint
          await axios.put(
            `${process.env.NEXT_PUBLIC_API_URL}/edit-strategy/`,
            { id: panelEntity.id, name: panelEntity.name, code: codeToSave },
            { headers: { "Content-Type": "application/json" }, withCredentials: true }
          );
          // Update the strategy in store
          const updateFn = useStrategyStore.getState().updateStrategy;
          if (typeof updateFn === "function") {
            updateFn(panelEntity.id, { code: codeToSave });
          }
        } else {
          // Indicator API endpoint
          await axios.put(
            `${process.env.NEXT_PUBLIC_API_URL}/edit-indicator/`,
            { id: panelEntity.id, name: panelEntity.name, code: codeToSave },
            { headers: { "Content-Type": "application/json" }, withCredentials: true }
          );
          // Update the indicator in store
          const updateFn = useIndicatorStore.getState().updateIndicator;
          if (typeof updateFn === "function") {
            updateFn(panelEntity.id, { code: codeToSave });
          }
        }
      } catch (err) {
        console.error("Panel save failed", err);
      }
    }
  };

  const handleSave = async (panelIndex = 0) => {
    try {
      setIsSaving(true);
      await handleSavePanel(panelIndex);
    } finally {
      setIsSaving(false);
    }
  };

  // Save all panels sequentially
  const handleSaveAll = async () => {
    const currentPanels = panelsRef.current;
    try {
      setIsSaving(true);
      for (let i = 0; i < currentPanels.length; i++) {
        await handleSavePanel(i);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Run all panels - first save all, then run all
  const handleRunAll = async () => {
    // First, save all panels sequentially
    await handleSaveAll();

    // Then run all panels (onBeforeRun will be called but panels are already saved)
    runButtonRefs.current.forEach(ref => {
      if (ref && ref.click) {
        ref.click();
      }
    });
  };



  const handlePanelCodeChange = (index, newCode) => {
    const currentPanels = panelsRef.current;
    const panel = currentPanels[index];

    // Determine panel type - supports mixed indicator/strategy panels
    const isStrategyPanel = !!panel?.strategy;
    const panelEntity = isStrategyPanel ? panel?.strategy : panel?.indicator;

    // Check if this specific panel is locked (only strategy panels can be locked)
    if (locked && isStrategyPanel) return;

    if (panelEntity?.id) {
      // Update codesMap with the new code
      codesMapRef.current.set(`${panelEntity.id}-${index}`, newCode);
    }
    setPanels(prev => prev.map((p, i) => i === index ? { ...p, code: newCode } : p));
    if (index === 0) setLocalCode(newCode);
  };

  const handleAddEntity = (selectedEntity, selectedType) => {
    if (panels.length >= 4) return;

    // Use selectedType from the choose modal if provided, otherwise fallback to modal's type
    const entityType = selectedType || type;

    // Deep copy the entity to ensure independence
    const entityCopy = {
      id: selectedEntity.id,
      name: selectedEntity.name,
      code: selectedEntity.code || "",
      ...(entityType === "indicator" ? {
        parent_indicator_id: selectedEntity.parent_indicator_id,
        version: selectedEntity.version
      } : {
        parent_strategy_id: selectedEntity.parent_strategy_id,
        version: selectedEntity.version
      })
    };
    const code = entityCopy.code;

    setPanels(prev => {
      const newIndex = prev.length; // This will be the index of the new panel
      // Store code in codesMapRef BEFORE adding to panels
      codesMapRef.current.set(`${entityCopy.id}-${newIndex}`, code);

      const newPanel = {
        code,
        isTerminalOpen: true,
        terminalRef: null
      };

      // Use the appropriate key based on entityType (supports mixed panels)
      if (entityType === "strategy") {
        newPanel.strategy = entityCopy;
      } else {
        newPanel.indicator = entityCopy;
      }

      const newPanels = [...prev, newPanel];
      return newPanels;
    });
    setShowSelectModal(false);
  };

  const handleRemovePanel = (index) => {
    if (panels.length <= 1) return;
    setPanels(prev => prev.filter((_, i) => i !== index));
  };

  const togglePanelTerminal = (index) => {
    setPanels(prev => prev.map((p, i) =>
      i === index ? { ...p, isTerminalOpen: !p.isTerminalOpen } : p
    ));
  };

  // Keyboard shortcuts: Ctrl+S, F5, F, Space, Shift++, Shift+Esc
  useEffect(() => {
    // If closed, do nothing.
    // If minimized, we only allow "F" key to restore.
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Check if user is typing in a text input
      const activeEl = document.activeElement;
      const isTextInput = activeEl && (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.isContentEditable ||
        activeEl.closest(".monaco-editor") // Monaco editor check
      );

      // F key to toggle minimize/maximize (only if not typing) - WORKS EVEN WHEN MINIMIZED
      if (e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey && !e.altKey && !isTextInput) {
        e.preventDefault();
        setIsMinimized(prev => !prev);
        return; // Stop here if handled
      }

      // If minimized, other shortcuts should NOT be captured by the modal (CodePanel catches them)
      if (isMinimized) return;

      // Ctrl+S - Save all
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveAll();
      }

      // F5 - Run all
      if (e.key === "F5") {
        e.preventDefault();
        handleRunAll();
      }

      // Space key (hold) for peek mode (only if not typing)
      if (e.code === "Space" && !isTextInput) {
        e.preventDefault();
        setIsPeekMode(true);
      }

      // Shift++ to add panel (works for both indicators and strategies)
      if (e.shiftKey && e.key === "+" && panels.length < 4) {
        e.preventDefault();
        setShowSelectModal(true);
      }

      // Shift+Esc to close modal
      if (e.shiftKey && e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    const handleKeyUp = (e) => {
      // Release Space key to exit peek mode
      if (e.code === "Space") {
        setIsPeekMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isOpen, localCode, panels, onClose, type]);

  if (!mounted || !isOpen || !entity) return null;

  // Floating restore button when minimized
  if (isMinimized) {
    return createPortal(
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-3 right-6 z-50 w-12 h-12 bg-gradient-to-br from-zinc-700 to-zinc-900 hover:from-zinc-600 hover:to-zinc-800 rounded-lg shadow-lg shadow-black/50 border border-zinc-600 flex items-center justify-center transition-all hover:scale-110 group"
      >
        <TbMaximize size={24} />
        <span
          className="
            absolute top-[10px] -left-[140px] -translate-x-1/
            z-20
            px-2 py-1
            text-[11px] font-medium
            text-white
            bg-gray-900
            rounded-md
            shadow-md
            whitespace-nowrap
            transition-transform duration-200
            scale-0 group-hover:scale-100
          "
        >
          {t("buttons.maximize", "Kod Editörünü Büyüt (F)")}
        </span>
      </button>,
      document.body
    );
  }

  const modalUI = (
    <div className={`fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white transition-opacity duration-200 ${isPeekMode ? 'opacity-0' : 'opacity-100'}`}>
      {/* Header Bar */}
      <div className="h-6 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
        {/* Left side */}
        <div className="flex items-center h-full px-3">
          <span className="text-xs text-zinc-500"></span>
        </div>

        {/* Right side - 4 Buttons */}
        <div className="flex items-center h-full">
          {/* Eye Button (Peek) */}
          <button
            className="h-full px-3 bg-transparent hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors flex items-center justify-center border-l border-zinc-800"
            onMouseEnter={() => setIsPeekMode(true)}
            onMouseLeave={() => setIsPeekMode(false)}
            title={t("buttons.peek", "Önizleme (Space basılı tut)")}
          >
            <FaRegEye size={14} />
          </button>

          {/* + Button (Add Panel) OR Layout Toggle - Works for both indicators and strategies */}
          {panels.length < 4 ? (
            <button
              className="h-full px-3 bg-transparent hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors flex items-center justify-center border-l border-zinc-800"
              title={t("buttons.addPanel", "Yeni Panel Ekle (Shift++)")}
              onClick={() => setShowSelectModal(true)}
            >
              <span className="text-lg font-light">+</span>
            </button>
          ) : (
            <button
              className="h-full px-3 bg-transparent hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors flex items-center justify-center border-l border-zinc-800"
              title={layoutMode === "columns" ? t("buttons.gridView", "Grid Görünüme Geç") : t("buttons.columnView", "Sütun Görünüme Geç")}
              onClick={() => setLayoutMode(prev => prev === "columns" ? "grid" : "columns")}
            >
              {layoutMode === "columns" ? (
                <MdGridView size={18} />
              ) : (
                <TbColumns3 size={18} />
              )}
            </button>
          )}

          {/* Minimize Button (_) */}
          <button
            className="h-full px-3 bg-transparent hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors flex items-center justify-center border-l border-zinc-800"
            title={t("buttons.minimize", "Küçült (F)")}
            onClick={() => setIsMinimized(true)}
          >
            <span className="text-lg leading-none mb-1">_</span>
          </button>

          {/* Close Button (X) */}
          <button
            className="h-full px-3 bg-transparent hover:bg-red-900 text-zinc-400 hover:text-white transition-colors flex items-center justify-center border-l border-zinc-800"
            onClick={onClose}
            title={t("buttons.close", "Kapat (Shift+Esc)")}
            aria-label="Close"
          >
            <IoMdClose size={16} />
          </button>
        </div>
      </div>

      {/* Editor Area - Split panels */}
      <div className={`flex-1 overflow-hidden ${layoutMode === "grid" && panels.length === 4 ? "grid grid-cols-2 grid-rows-2" : "flex"}`}>
        {panels.map((panel, index) => {
          // Determine panel type - supports mixed indicator/strategy panels
          const isStrategyPanel = !!panel.strategy;
          const panelEntity = isStrategyPanel ? panel.strategy : panel.indicator;
          const isGrid = layoutMode === "grid" && panels.length === 4;
          // Grid borders:
          // Index 0: Right border, Bottom border
          // Index 1: Bottom border, No right border (last in row)
          // Index 2: Right border, No bottom border
          // Index 3: No borders (last in row, last in col)
          let borderClass = "border-r border-zinc-800 last:border-r-0";

          if (isGrid) {
            borderClass = "border-zinc-800"; // Reset base
            if (index === 0) borderClass += " border-r border-b";
            if (index === 1) borderClass += " border-b";
            if (index === 2) borderClass += " border-r";
            // index 3 needs no borders relative to inner grid lines usually, or rely on container gap/border.
            // But existing design uses borders on elements.
          }

          return (
            <div
              key={`${panelEntity.id}-${index}`}
              className={`flex-1 flex flex-col ${borderClass} ${panels.length > 1 ? 'min-w-0' : ''}`}
            >
              {/* Panel Header with entity name and buttons */}
              <div className="flex items-center justify-between px-3 py-1 bg-zinc-900 border-b border-zinc-800 shrink-0">
                <div className="flex items-center ml-12 gap-2 overflow-hidden flex-1">
                  <span className="text-sm font-medium text-zinc-300 truncate">
                    {panelEntity.name}
                  </span>
                  <div className="flex items-center gap-1 shrink-0 bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-700/50">
                    <span className={`w-1.5 h-1.5 rounded-full ${isStrategyPanel ? "bg-purple-500" : "bg-cyan-400"}`}></span>
                    <span className={`text-[10px] font-medium leading-none ${isStrategyPanel ? "text-purple-200" : "text-cyan-200"}`}>
                      {isStrategyPanel ? "Strateji" : "İndikatör"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Panel's own Run Button - Use appropriate button based on panel type */}
                  {isStrategyPanel ? (
                    !locked && (
                      <RunButtonStr
                        ref={el => runButtonRefs.current[index] = el}
                        strategyId={panelEntity.id}
                        onBeforeRun={() => handleSave(index)}
                        className="gap-1 px-[7px] py-[3px] rounded text-xs font-medium transition-all"
                      />
                    )
                  ) : (
                    <RunButton
                      ref={el => runButtonRefs.current[index] = el}
                      indicatorId={panelEntity.id}
                      onBeforeRun={() => handleSave(index)}
                      className="gap-1 px-[7px] py-[3px] rounded text-xs font-medium transition-all"
                    />
                  )}

                  {/* Panel's own Save Button */}
                  <button
                    className={`gap-1 px-[7px] py-[3px] rounded text-xs font-medium flex items-center ${locked && isStrategyPanel
                      ? "bg-gray-700 cursor-not-allowed opacity-60"
                      : "bg-[rgb(16,45,100)] hover:bg-[rgb(27,114,121)]"
                      }`}
                    title={locked && isStrategyPanel ? "Kilitli sürümler değiştirilemez" : "Kaydet (Ctrl+S)"}
                    onClick={() => handleSave(index)}
                    disabled={isSaving || (locked && isStrategyPanel)}
                  >
                    {isSaving ? (
                      <div className="w-[12px] h-[12px] border-2 border-t-white border-gray-400 rounded-full animate-spin"></div>
                    ) : (
                      <FaRegSave size={12} />
                    )}
                  </button>

                  {/* Panel Close Button - Works for both indicators and strategies with multiple panels */}
                  {panels.length > 1 && (
                    <button
                      className="px-1.5 py-0.5 ml-1 bg-red-800 hover:bg-red-600 rounded-[4px] transition-colors"
                      onClick={() => handleRemovePanel(index)}
                      title="Paneli Kapat"
                    >
                      <IoMdClose size={14} className="text-white" />
                    </button>
                  )}
                </div>
              </div>

              {/* Editor */}
              <div className={`flex-1 overflow-hidden px-1 ${panel.isTerminalOpen ? '' : 'pb-2'}`}>
                <MonacoEditor
                  beforeMount={handleEditorWillMount}
                  onMount={handleEditorDidMount}
                  language="python-custom"
                  value={panel.code}
                  onChange={(value) => handlePanelCodeChange(index, value)}
                  theme="whaleer-custom-dark"
                  height="100%"
                  options={{
                    readOnly: locked && isStrategyPanel,
                    fontSize: 13,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>

              {/* Panel's own Terminal - Use appropriate terminal based on panel type */}
              <div className={`relative border-t border-zinc-800 mx-1 mb-1 ${panel.isTerminalOpen ? "" : "hidden"}`}>
                {isStrategyPanel ? (
                  <TerminalStrategy
                    key={`terminal-strategy-${panelEntity.id}`}
                    id={panelEntity.id}
                    initialOutput={t("terminal.ready")}
                  />
                ) : (
                  <TerminalIndicator
                    key={`terminal-indicator-${panelEntity.id}`}
                    id={panelEntity.id}
                    initialOutput={t("terminal.ready")}
                  />
                )}
                <button
                  onClick={() => togglePanelTerminal(index)}
                  className="absolute top-0 right-0 p-0.5 bg-black hover:bg-zinc-950 rounded-sm text-gray-400 hover:text-white transition-colors z-[60]"
                  title="Terminali Gizle"
                >
                  <FaChevronDown size={12} />
                </button>
              </div>

              {/* Terminal Toggle Button when closed */}
              {!panel.isTerminalOpen && (
                <button
                  onClick={() => togglePanelTerminal(index)}
                  className="mx-1 mb-1 px-1 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-gray-400 hover:text-white transition-all text-xs flex items-center justify-center gap-1 border border-zinc-800"
                  title="Terminali Aç"
                >
                  <FaChevronUp size={10} />
                  <span>Terminal</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Selection Modal - Works for both indicators and strategies */}
      <FullScreenChooseIndicator
        isOpen={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        onSelect={(selected, selectedType) => handleAddEntity(selected, selectedType)}
        existingPanelIds={panels.map(p => (p.indicator?.id || p.strategy?.id))}
        type={type}
      />
    </div>
  );

  return createPortal(modalUI, document.body);
};

export default CodeModal;
