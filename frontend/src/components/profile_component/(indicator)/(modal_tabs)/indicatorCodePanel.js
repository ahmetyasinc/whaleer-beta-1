"use client";

import { useState, useEffect, useRef } from "react";
import { IoMdClose } from "react-icons/io";
import { FaRegSave, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { MdOpenInFull } from "react-icons/md";
import CodeEditor from "../../CodeEditor";
import usePanelStore from "@/store/indicator/panelStore";
import useCodePanelStore from "@/store/indicator/indicatorCodePanelStore";
import useIndicatorStore from "@/store/indicator/indicatorStore";
import RunButton from "./run_button";
import TerminalIndicator from "./terminalIndicator";
import axios from "axios";
import VersionSelect from "./versionSelect";
import CodeModal from "./fullScreenCodeModal";
import { useTranslation } from "react-i18next";

const CodePanel = () => {
  const removeCustomPanel = usePanelStore((s) => s.removeCustomPanel);
  const {
    isOpen,
    closePanel,
    versions,
    selected,
    isNewVersion,
    parent_indicator_id,
    indicatorName,
    indicatorCode,
    setIndicatorName,
    setIndicatorCode,
    selectVersion,
    startNewVersion,
    setIndicatorEditing,
  } = useCodePanelStore();

  const { addIndicator } = useIndicatorStore();
  const indicatorStore = useIndicatorStore;

  const [localName, setLocalName] = useState("");
  const [localCode, setLocalCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isModalMinimized, setIsModalMinimized] = useState(false); // 🔑 Track minimized state
  const [codeModalIndicator, setCodeModalIndicator] = useState(null);
  const terminalRef = useRef(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);

  const runButtonRef = useRef(null); // 🔑 RunButton için ref
  const { t } = useTranslation("indicatorEditor");

  useEffect(() => {
    setLocalName(indicatorName);
    setLocalCode(indicatorCode);
  }, [indicatorName, indicatorCode]);

  const handleSaveIndicator = async (codeToSave = localCode) => {
    setIsSaving(true);

    if (!localName.trim() || !codeToSave.trim()) {
      setIsSaving(false);
      return;
    }

    const delay = new Promise((res) => setTimeout(res, 250));

    try {
      if (selected && !isNewVersion) {
        setIndicatorName(localName);
        setIndicatorCode(codeToSave);

        const updateRequest = axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/edit-indicator/`,
          { id: selected.id, name: localName, code: codeToSave },
          { withCredentials: true, headers: { "Content-Type": "application/json" } }
        );

        await Promise.all([updateRequest, delay]);

        const updateFn = indicatorStore.getState().updateIndicator;
        if (typeof updateFn === "function") {
          updateFn(selected.id, { name: localName, code: codeToSave });
        }

        setIndicatorEditing({ ...selected, name: localName, code: codeToSave });
      } else {
        const postRequest = axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/add-indicator/`,
          { name: localName, code: codeToSave, parent_indicator_id },
          { withCredentials: true, headers: { "Content-Type": "application/json" } }
        );

        const [response] = await Promise.all([postRequest, delay]);
        const newIndicator = response.data;

        addIndicator(newIndicator);
        setIndicatorEditing(newIndicator);
        setIndicatorName(newIndicator.name || "");
        setIndicatorCode(newIndicator.code || "");
      }
    } catch (err) {
      console.error("Save failed", err);
    }

    setIsSaving(false);
  };

  const handleClose = () => {
    closePanel();
    removeCustomPanel("panel-indicator-editor");
  };

  const openFullscreenModal = () => {
    setCodeModalIndicator({
      id: selected?.id ?? null,
      name: (localName ?? "").trim() || t("labels.untitled"),
      code: localCode ?? "",
    });
    setIsCodeModalOpen(true);
  };

  // 🔑 Global Shorts (F5, Ctrl+S)
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
      if (isCodeModalOpen && !isModalMinimized) return;
      handleSaveIndicator();
    };

    const onGlobalRun = () => handleRun();
    const onGlobalSave = () => handleSave();

    const onKeyDown = (e) => {
      if (isCodeModalOpen && !isModalMinimized) return;

      if (e.key === "F5") {
        e.preventDefault();
        handleRun();
      }
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
  }, [isCodeModalOpen, isModalMinimized, localCode, localName]); // Dependencies for closure access

  // 🔑 ID'ler eşleşiyorsa localCode'u codeModalIndicator state'ine aktar
  // Böylece panel değiştirildiğinde elimizde en güncel kod kalır
  useEffect(() => {
    if (codeModalIndicator && selected?.id === codeModalIndicator.id) {
      if (codeModalIndicator.code !== localCode) {
        setCodeModalIndicator(prev => ({ ...prev, code: localCode }));
      }
    }
  }, [localCode, selected?.id, codeModalIndicator]);

  if (!isOpen) return null;

  return (
    <div className="bg-black text-white rounded-md w-full h-full p-2 shadow-lg relative flex flex-col">
      <div className="flex justify-start drag-handle cursor-grab mt-0 mr-8 h-5">
        <h2 className="flex justify-start drag-handle text-xs font-bold mb-2">
          {isNewVersion
            ? t("titles.addNewVersion")
            : selected
              ? t("titles.editIndicator")
              : t("titles.addNewIndicator")}
        </h2>
      </div>

      {selected && !isNewVersion && (
        <div className="absolute top-10 right-[10px] flex items-center gap-2">
          <button
            onClick={openFullscreenModal}
            className="p-[1px]"
            title={t("tooltips.fullscreen")}
          >
            <MdOpenInFull size={16} />
          </button>
        </div>
      )}

      <RunButton
        ref={runButtonRef} // 🔑 ref eklendi
        indicatorId={selected?.id}
        onBeforeRun={handleSaveIndicator}
      />

      <button
        className="absolute top-2 right-10 gap-1 px-[9px] py-[5px] mr-[6px] bg-[rgb(16,45,100)] hover:bg-[rgb(27,114,121)] rounded text-xs font-medium flex items-center"
        title={t("buttons.save")}
        onClick={() => handleSaveIndicator()}
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
          className="w-64 h-[32px] p-2 bg-[#232323] text-white focus:outline-none rounded-sm"
          placeholder={t("inputs.namePlaceholder")}
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          maxLength={40}
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

      <div className="flex-1 overflow-hidden rounded-t-[4px]">
        <CodeEditor
          code={localCode}
          setCode={setLocalCode}
          language="python"
          onSave={handleSaveIndicator} // 🔑 Ctrl+S ile kaydet
        />
      </div>

      <div className={`relative border-t border-zinc-800 pt-1 ${isTerminalOpen ? "" : "hidden"}`}>
        <TerminalIndicator
          {...(selected ? { id: selected.id } : {})}
          ref={terminalRef}
          initialOutput={t("terminal.ready")}
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
        indicator={
          codeModalIndicator
            ? {
              ...codeModalIndicator,
              code: (selected?.id === codeModalIndicator.id) ? localCode : codeModalIndicator.code
            }
            : null
        }
        onSave={async (codeFromModal) => {
          // Check if the modal's indicator is the same as the currently selected one in the panel
          if (codeModalIndicator && selected?.id === codeModalIndicator.id) {
            await handleSaveIndicator(codeFromModal);
          } else if (codeModalIndicator) {
            // Context mismatch: Save directly to API
            setIsSaving(true);
            try {
              const nameToSave = codeModalIndicator.name || "Untitled";
              await axios.put(
                `${process.env.NEXT_PUBLIC_API_URL}/edit-indicator/`,
                { id: codeModalIndicator.id, name: nameToSave, code: codeFromModal },
                { withCredentials: true, headers: { "Content-Type": "application/json" } }
              );

              // Update the store
              const updateFn = indicatorStore.getState().updateIndicator;
              if (typeof updateFn === "function") {
                updateFn(codeModalIndicator.id, { name: nameToSave, code: codeFromModal });
              }

              // Update local modal state
              setCodeModalIndicator(prev => ({ ...prev, code: codeFromModal }));

            } catch (err) {
              console.error("Save failed", err);
            } finally {
              setIsSaving(false);
            }
          }
        }}
        runIndicatorId={selected?.id || null}
        type="indicator"
        onMinimizeChange={setIsModalMinimized}
      />
    </div>
  );
};

export default CodePanel;
