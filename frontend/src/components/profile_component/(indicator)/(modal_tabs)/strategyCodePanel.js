"use client";

import { useState, useEffect, useRef } from "react";
import { IoMdClose } from "react-icons/io";
import { FaRegSave, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { MdOpenInFull } from "react-icons/md";
import CodeEditor from "../../CodeEditor";
import usePanelStore from "@/store/indicator/panelStore";
import useCodePanelStore from "@/store/indicator/strategyCodePanelStore";
import useStrategyStore from "@/store/indicator/strategyStore";
import RunButton from "./run_button_str";
import TerminalStrategy from "./terminalStrategy";
import VersionSelect from "./versionSelect";
import CodeModal from "./fullScreenCodeModal";
import axios from "axios";
import { useTranslation } from "react-i18next";

axios.defaults.withCredentials = true;

const CodePanel = () => {
  const removeCustomPanel = usePanelStore((s) => s.removeCustomPanel);

  const {
    isOpen,
    closePanel,
    versions,
    selected,
    isNewVersion,
    parent_strategy_id,
    strategyName,
    strategyCode,
    setStrategyName,
    setStrategyCode,
    selectVersion,
    startNewVersion,
    setStrategyEditing,
  } = useCodePanelStore();

  const { addStrategy } = useStrategyStore();
  const strategyStore = useStrategyStore;

  const [localName, setLocalName] = useState("");
  const [localCode, setLocalCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const terminalRef = useRef(null);

  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isModalMinimized, setIsModalMinimized] = useState(false); // 🔑 Track minimized state
  const [codeModalStrategy, setCodeModalStrategy] = useState(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);

  const runButtonRef = useRef(null); // 🔑 RunButtonStr için ref
  const { t } = useTranslation("strategyCodePanel");

  useEffect(() => {
    setLocalName(strategyName);
    setLocalCode(strategyCode);
  }, [strategyName, strategyCode]);

  const isLockedActive = !!(selected && !isNewVersion && selected.locked);

  const handleSaveStrategy = async (incomingCode) => {
    if (isLockedActive) return;

    const codeToSave = typeof incomingCode === "string" ? incomingCode : localCode;
    const nameToSave = localName?.trim();

    if (typeof incomingCode === "string") {
      setLocalCode(incomingCode);
      setStrategyCode(incomingCode);
    }

    setIsSaving(true);

    if (!nameToSave || !codeToSave || !codeToSave.trim()) {
      setIsSaving(false);
      return;
    }

    const delay = new Promise((res) => setTimeout(res, 350));

    try {
      if (selected && !isNewVersion) {
        setStrategyName(nameToSave);
        setStrategyCode(codeToSave);

        const updateRequest = axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/edit-strategy/`,
          { id: selected.id, name: nameToSave, code: codeToSave },
          { withCredentials: true, headers: { "Content-Type": "application/json" } }
        );

        await Promise.all([updateRequest, delay]);

        const updateFn = strategyStore.getState().updateStrategy;
        if (typeof updateFn === "function") {
          updateFn(selected.id, { name: nameToSave, code: codeToSave });
        }

        setStrategyEditing({ ...selected, name: nameToSave, code: codeToSave });
      } else {
        const postRequest = axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/add-strategy/`,
          {
            name: nameToSave,
            code: codeToSave,
            parent_strategy_id,
          },
          { withCredentials: true, headers: { "Content-Type": "application/json" } }
        );

        const [response] = await Promise.all([postRequest, delay]);
        const newStrategy = response.data;

        addStrategy(newStrategy);
        setStrategyEditing(newStrategy);
        setStrategyName(newStrategy.name || "");
        setStrategyCode(newStrategy.code || "");
      }
    } catch (error) {
      console.error(t("errors.save"), error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    closePanel();
    removeCustomPanel("panel-strategy-editor");
  };

  const openFullscreenModal = () => {
    setCodeModalStrategy({
      id: selected?.id ?? null,
      name: (localName ?? "").trim() || t("labels.untitled"),
      code: localCode ?? "",
      locked: !!selected?.locked,
    });
    setIsCodeModalOpen(true);
  };

  // 🔑 Global Shorts (F5, Ctrl+S)
  // Handles both window events (when not focused) and custom events (dispatched by CodeEditor)
  useEffect(() => {
    const handleRun = () => {
      // Allow run if modal is closed OR minimized
      if (isCodeModalOpen && !isModalMinimized) return;
      if (runButtonRef.current) {
        runButtonRef.current.click();
      }
    };

    const handleSave = () => {
      // Allow save if modal is closed OR minimized
      if ((isCodeModalOpen && !isModalMinimized) || isLockedActive) return;
      handleSaveStrategy();
    };

    // 1. Custom Events (Created by CodeEditor when focused)
    const onGlobalRun = () => handleRun();
    const onGlobalSave = () => handleSave();

    // 2. DOM Events (When focus is outside editor)
    const onKeyDown = (e) => {
      if (isCodeModalOpen && !isModalMinimized) return;

      // F5
      if (e.key === "F5") {
        e.preventDefault();
        handleRun();
      }
      // Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("whaleer-trigger-run-all", onGlobalRun);
    window.addEventListener("whaleer-trigger-save-all", onGlobalSave);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("whaleer-trigger-run-all", onGlobalRun);
      window.removeEventListener("whaleer-trigger-save-all", onGlobalSave);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isCodeModalOpen, isModalMinimized, isLockedActive, localCode, localName]); // Dependencies for handleSaveStrategy closure

  // 🔑 Sync localCode to codeModalStrategy state while IDs match
  // This ensures that if we switch away, codeModalStrategy holds the latest version
  useEffect(() => {
    if (codeModalStrategy && selected?.id === codeModalStrategy.id) {
      if (codeModalStrategy.code !== localCode) {
        setCodeModalStrategy(prev => ({ ...prev, code: localCode }));
      }
    }
  }, [localCode, selected?.id, codeModalStrategy /* safe to add object if we check id inside */]);

  if (!isOpen) return null;

  return (
    <div className="bg-black text-white rounded-md w-full h-full p-2 shadow-lg relative flex flex-col">
      <div className="flex justify-start drag-handle cursor-grab mt-0 mr-8 h-5">
        <h2 className="flex justify-start drag-handle text-xs font-bold mb-2">
          {isNewVersion
            ? t("titles.addNewVersion")
            : selected
              ? t("titles.editStrategy")
              : t("titles.addNewStrategy")}
        </h2>
      </div>

      {selected && !isNewVersion && (
        <div className="absolute top-10 right-[10px] flex items-center gap-2">
          <button
            onClick={openFullscreenModal}
            className={`p-[1px] ${isLockedActive ? "opacity-60 cursor-not-allowed" : ""}`}
            title={isLockedActive ? t("tooltips.fullscreenLocked") : t("tooltips.fullscreen")}
            disabled={isLockedActive}
          >
            <MdOpenInFull size={16} />
          </button>
        </div>
      )}

      {!isLockedActive && (
        <RunButton
          ref={runButtonRef} // 🔑 ref eklendi
          strategyId={selected?.id}
          onBeforeRun={handleSaveStrategy}
        />
      )}

      <button
        className={`absolute top-2 right-10 gap-1 px-[9px] py-[5px] mr-[6px] rounded text-xs font-medium flex items-center ${isLockedActive
          ? "bg-gray-700 cursor-not-allowed opacity-60"
          : "bg-[rgb(16,45,100)] hover:bg-[rgb(27,114,121)]"
          }`}
        title={isLockedActive ? t("tooltips.saveLocked") : t("buttons.save")}
        onClick={() => handleSaveStrategy()}
        disabled={isLockedActive || isSaving}
        aria-disabled={isLockedActive || isSaving}
      >
        {isSaving ? (
          <div className="w-[16px] h-[16px] border-2 border-t-white border-gray-400 rounded-full animate-spin"></div>
        ) : (
          <FaRegSave />
        )}
      </button>

      <button
        className="absolute top-2 right-1 gap-1 px-[9px] py-[5px] mr-1 bg-[rgb(100,16,16)] hover:bg-[rgb(189,49,49)] rounded text-sm font-medium"
        onClick={handleClose}
        title={t("buttons.close")}
      >
        <IoMdClose />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          className={`w-64 h-[32px] p-2 bg-[#232323] text-white focus:outline-none rounded-sm ${isLockedActive ? "opacity-60 cursor-not-allowed" : ""
            }`}
          placeholder={t("inputs.namePlaceholder")}
          value={localName}
          onChange={(e) => {
            if (!isLockedActive) setLocalName(e.target.value);
          }}
          maxLength={40}
          disabled={isLockedActive}
        />

        {versions.length > 0 && (
          <VersionSelect
            versions={versions}
            selectedId={selected?.id || null}
            onChange={(id) => selectVersion(id)}
            onAdd={() => startNewVersion()}
          />
        )}
      </div>

      {isLockedActive && (
        <div className="mb-2 px-2 py-1 bg-amber-900/30 border border-amber-700/40 rounded flex items-center gap-2 text-[12px]">
          <span>{t("banners.locked")}</span>
          <button
            className="ml-auto px-2 py-1 text-[12px] rounded bg-amber-700 hover:bg-amber-600"
            onClick={startNewVersion}
          >
            {t("buttons.newVersion")}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden rounded-t-[4px] relative">
        <CodeEditor
          code={localCode}
          setCode={(val) => {
            if (!isLockedActive) setLocalCode(val);
          }}
          language="python"
          readOnly={isLockedActive}
          onSave={handleSaveStrategy}
        />
        {isLockedActive && (
          <div className="pointer-events-none absolute inset-0 border-2 border-amber-600/50 rounded-sm"></div>
        )}
      </div>

      <div className={`relative border-t border-zinc-800 pt-1 ${isTerminalOpen ? "" : "hidden"}`}>
        <TerminalStrategy
          {...(selected ? { id: selected.id } : {})}
          ref={terminalRef}
          initialOutput={t("terminalReady")}
        />
        <button
          onClick={() => setIsTerminalOpen(false)}
          className="absolute top-0 right-0 p-1 bg-black hover:bg-zinc-950 rounded-sm text-gray-400 hover:text-white transition-colors z-[60]"
          title={t("tooltips.closeTerminal")}
        >
          <FaChevronDown size={14} />
        </button>
      </div>

      {!isTerminalOpen && (
        <button
          onClick={() => setIsTerminalOpen(true)}
          className="absolute bottom-2 right-2 py-[1px] px-[5px] bg-black hover:bg-zinc-950 rounded-tl-sm shadow-lg text-gray-400 hover:text-white transition-all z-[60]"
          title={t("tooltips.openTerminal")}
        >
          <FaChevronUp size={16} />
        </button>
      )}

      <CodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        strategy={
          codeModalStrategy
            ? {
              ...codeModalStrategy,
              code: (selected?.id === codeModalStrategy.id) ? localCode : codeModalStrategy.code
            }
            : null
        }
        onSave={async (codeFromModal) => {
          // Check if the modal's strategy is the same as the currently selected one in the panel
          if (codeModalStrategy && selected?.id === codeModalStrategy.id) {
            await handleSaveStrategy(codeFromModal);
          } else if (codeModalStrategy) {
            // Context mismatch: User switched panel content (e.g. to RSI) but is editing previous strategy (e.g. MACD) in modal.
            // Save directly to API without touching the panel's current 'localCode'.
            setIsSaving(true);
            try {
              const nameToSave = codeModalStrategy.name || "Untitled";
              await axios.put(
                `${process.env.NEXT_PUBLIC_API_URL}/edit-strategy/`,
                { id: codeModalStrategy.id, name: nameToSave, code: codeFromModal },
                { withCredentials: true, headers: { "Content-Type": "application/json" } }
              );

              // Update the store so if we switch back to this strategy, it's fresh
              const updateFn = strategyStore.getState().updateStrategy;
              if (typeof updateFn === "function") {
                updateFn(codeModalStrategy.id, { name: nameToSave, code: codeFromModal });
              }

              // Update local modal state so it keeps the changes
              setCodeModalStrategy(prev => ({ ...prev, code: codeFromModal }));

            } catch (error) {
              console.error(t("errors.save"), error);
            } finally {
              setIsSaving(false);
            }
          }
        }}
        type="strategy"
        locked={isLockedActive}
        onMinimizeChange={setIsModalMinimized}
      />
    </div>
  );
};

export default CodePanel;
