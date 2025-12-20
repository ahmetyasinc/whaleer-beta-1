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
import CodeModal from "./fullScreenStrategyCodeModal";
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
          `${process.env.NEXT_PUBLIC_API_URL}/api/edit-strategy/`,
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
          `${process.env.NEXT_PUBLIC_API_URL}/api/add-strategy/`,
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

  // 🔑 F5 → RunButtonStr çalıştır
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "F5") {
        e.preventDefault();
        if (runButtonRef.current) {
          runButtonRef.current.click();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
        strategy={codeModalStrategy}
        onSave={async (codeFromModal) => {
          await handleSaveStrategy(codeFromModal);
        }}
        runStrategyId={selected?.id || null}
        locked={isLockedActive}
      />
    </div>
  );
};

export default CodePanel;
