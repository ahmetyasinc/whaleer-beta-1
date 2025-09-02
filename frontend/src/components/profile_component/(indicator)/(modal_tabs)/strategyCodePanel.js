"use client";

import { useState, useEffect, useRef } from "react";
import { IoMdClose } from "react-icons/io";
import { FaRegSave } from "react-icons/fa";
import { MdOpenInFull } from "react-icons/md";
import CodeEditor from "../../CodeEditor";
import usePanelStore from "@/store/indicator/panelStore";
import useCodePanelStore from "@/store/indicator/strategyCodePanelStore"; // versiyonlu store
import useStrategyStore from "@/store/indicator/strategyStore";
import RunButton from "./run_button_str";
import TerminalStrategy from "./terminalStrategy";
import VersionSelect from "./versionSelect";
import CodeModal from "./fullScreenStrategyCodeModal"; // 👈 YENİ modal
import axios from "axios";

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

  const { addStrategy, deleteStrategy } = useStrategyStore();

  const [localName, setLocalName] = useState("");
  const [localCode, setLocalCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const terminalRef = useRef(null);

  // Tam ekran modal state
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [codeModalStrategy, setCodeModalStrategy] = useState(null);

  useEffect(() => {
    setLocalName(strategyName);
    setLocalCode(strategyCode);
  }, [strategyName, strategyCode]);

  // seçili versiyon kilitli mi? (yeni versiyon modunda kilit devre dışı)
  const isLockedActive = !!(selected && !isNewVersion && selected.locked);

  const handleSaveStrategy = async () => {
    // kilitliyken kaydetme yok
    if (isLockedActive) return;

    setIsSaving(true);

    const { strategies, setPersonalStrategies } = useStrategyStore.getState();
    if (!localName.trim() || !localCode.trim()) {
      setIsSaving(false);
      return;
    }

    const delay = new Promise((res) => setTimeout(res, 250));

    try {
      if (selected && !isNewVersion) {
        // ---- GÜNCELLEME (mevcut versiyon) ----
        const isNameUnchanged = localName === strategyName;
        const isCodeUnchanged = localCode === strategyCode;
        if (isNameUnchanged && isCodeUnchanged) {
          setIsSaving(false);
          return;
        }

        setStrategyName(localName);
        setStrategyCode(localCode);

        const updateRequest = axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/edit-strategy/`,
          { id: selected.id, name: localName, code: localCode },
          { withCredentials: true, headers: { "Content-Type": "application/json" } }
        );

        await Promise.all([updateRequest, delay]);

        setPersonalStrategies(
          strategies.map((s) =>
            s.id === selected.id ? { ...s, name: localName, code: localCode } : s
          )
        );
        // replace mantığı
        deleteStrategy(selected.id);
        addStrategy({
          id: selected.id,
          name: localName,
          code: localCode,
          version: selected.version,
          parent_strategy_id: selected.parent_strategy_id,
          locked: selected.locked,
        });
      } else {
        // ---- YENİ / YENİ VERSİYON ----
        const postRequest = axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/add-strategy/`,
          {
            name: localName,
            code: localCode,
            parent_strategy_id: parent_strategy_id,
          },
          { withCredentials: true, headers: { "Content-Type": "application/json" } }
        );

        const [response] = await Promise.all([postRequest, delay]);
        const newStrategy = response.data;

        addStrategy({
          id: newStrategy.id,
          name: newStrategy.name,
          code: newStrategy.code,
          version: newStrategy.version,
          parent_strategy_id: newStrategy.parent_strategy_id,
          locked: newStrategy.locked,
        });

        setStrategyEditing(newStrategy);
        setStrategyName(newStrategy.name);
        setStrategyCode(newStrategy.code);
      }
    } catch (error) {
      console.error("Strategy save error:", error);
    }

    setIsSaving(false);
  };

  const handleClose = () => {
    closePanel();
    removeCustomPanel("panel-strategy-editor");
  };

  // Tam ekran modal aç (Run'ın solundaki ikon)
  const openFullscreenModal = () => {
    setCodeModalStrategy({
      id: selected?.id ?? null,
      name: (localName ?? "").trim() || "Untitled Strategy",
      code: localCode ?? "",
      locked: !!selected?.locked,
    });
    setIsCodeModalOpen(true);
  };

  if (!isOpen) return null;

  return (
    <div className="bg-black text-white rounded-md w-full h-full p-2 shadow-lg relative flex flex-col">
      <div className="flex justify-start drag-handle cursor-grab mt-0 mr-8 h-5">
        <h2 className="flex justify-start drag-handle text-xs font-bold mb-2">
          {isNewVersion ? "Add New Version" : selected ? "Edit Strategy" : "Add New Strategy"}
        </h2>
      </div>

      {/* Sağ üst aksiyon çubuğu: [Tam ekran] [Run] [Save] [Close] */}
      {selected && !isNewVersion && (
        <div className="absolute top-10 right-[10px] flex items-center gap-2">
          {/* Tam ekran ikonu — Run'ın SOLUNDA */}
          <button
            onClick={openFullscreenModal}
            className={`p-[1px] ${isLockedActive ? "opacity-60 cursor-not-allowed" : ""}`}
            title={isLockedActive ? "Locked versions cannot be viewed full-screen for edit" : "Full screen"}
            disabled={isLockedActive}
          >
            <MdOpenInFull size={16} />
          </button>
        </div>
      )}

      {!isLockedActive && (
        <RunButton strategyId={selected?.id} onBeforeRun={handleSaveStrategy} />
      )}

      {/* Save */}
      <button
        className={`absolute top-2 right-10 gap-1 px-[9px] py-[5px] mr-[6px] rounded text-xs font-medium flex items-center ${
          isLockedActive
            ? "bg-gray-700 cursor-not-allowed opacity-60"
            : "bg-[rgb(16,45,100)] hover:bg-[rgb(27,114,121)]"
        }`}
        title={isLockedActive ? "Locked versions cannot be modified" : "Save"}
        onClick={handleSaveStrategy}
        disabled={isLockedActive || isSaving}
        aria-disabled={isLockedActive || isSaving}
      >
        {isSaving ? (
          <div className="w-[16px] h-[16px] border-2 border-t-white border-gray-400 rounded-full animate-spin"></div>
        ) : (
          <FaRegSave />
        )}
      </button>

      {/* Close */}
      <button
        className="absolute top-2 right-1 gap-1 px-[9px] py-[5px] mr-1 bg-[rgb(100,16,16)] hover:bg-[rgb(189,49,49)] rounded text-sm font-medium"
        onClick={handleClose}
        title="Close"
      >
        <IoMdClose />
      </button>

      {/* Input + Version select */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          className={`w-64 h-[32px] p-2 bg-[#232323] text-white focus:outline-none rounded-sm ${
            isLockedActive ? "opacity-60 cursor-not-allowed" : ""
          }`}
          placeholder="Strategy name..."
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

      {/* Locked uyarısı */}
      {isLockedActive && (
        <div className="mb-2 px-2 py-1 bg-amber-900/30 border border-amber-700/40 rounded flex items-center gap-2 text-[12px]">
          <svg width="16" height="16" viewBox="0 0 24 24" className="text-amber-400"><path fill="currentColor" d="M12 17q.425 0 .713-.288T13 16q0-.425-.288-.713T12 15q-.425 0-.713.288T11 16q0 .425.288.713T12 17Zm-1-4h2V7h-2v6Zm1 9q-2.075 0-3.9-.788t-3.2-2.137t-2.137-3.2T2 12t.788-3.9t2.137-3.2t3.2-2.137T12 2t3.9.788t3.2 2.137t2.137 3.2T22 12t-.788 3.9t-2.137 3.2t-3.2 2.137T12 22Z"/></svg>
          <span>
            This version is <b>locked</b> (used by an active bot). Create a new version to edit.
          </span>
          <button
            className="ml-auto px-2 py-1 text-[12px] rounded bg-amber-700 hover:bg-amber-600"
            onClick={startNewVersion}
          >
            New Version
          </button>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden rounded-t-[4px] relative">
        <CodeEditor
          code={localCode}
          setCode={(val) => {
            if (!isLockedActive) setLocalCode(val);
          }}
          language="python"
          readOnly={isLockedActive}
        />
        {isLockedActive && (
          <div className="pointer-events-none absolute inset-0 border-2 border-amber-600/50 rounded-sm"></div>
        )}
      </div>

      {/* Terminal */}
      <TerminalStrategy
        {...(selected ? { id: selected.id } : {})}
        ref={terminalRef}
        initialOutput="🚀 Terminal ready..."
      />

      {/* Tam ekran modal */}
      <CodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        strategy={codeModalStrategy}
        onSave={handleSaveStrategy}               // Kaydet işlevi panelden
        runStrategyId={selected?.id || null}      // RunButton için id
        locked={isLockedActive}                   // Kilit kontrolü
      />
    </div>
  );
};

export default CodePanel;
