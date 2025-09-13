"use client";

import { useState, useEffect, useRef } from "react";
import { IoMdClose } from "react-icons/io";
import { FaRegSave } from "react-icons/fa";
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
  const [codeModalIndicator, setCodeModalIndicator] = useState(null);
  const terminalRef = useRef(null);

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
        setIndicatorCode(codeToSave); // panel state güncellendi

        const updateRequest = axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/edit-indicator/`,
          { id: selected.id, name: localName, code: codeToSave },
          { withCredentials: true, headers: { "Content-Type": "application/json" } }
        );

        await Promise.all([updateRequest, delay]);

        // store güncelle
        const updateFn = indicatorStore.getState().updateIndicator;
        if (typeof updateFn === "function") {
          updateFn(selected.id, { name: localName, code: codeToSave });
        }

        setIndicatorEditing({ ...selected, name: localName, code: codeToSave });
      } else {
        const postRequest = axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/add-indicator/`,
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

      <RunButton indicatorId={selected?.id} onBeforeRun={handleSaveIndicator} />

      <button
        className="absolute top-2 right-10 gap-1 px-[9px] py-[5px] mr-[6px] bg-[rgb(16,45,100)] hover:bg-[rgb(27,114,121)] rounded text-xs font-medium flex items-center"
        title={t("buttons.save")}
        onClick={handleSaveIndicator}
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
        <CodeEditor code={localCode} setCode={setLocalCode} language="python" />
      </div>

      <TerminalIndicator
        {...(selected ? { id: selected.id } : {})}
        ref={terminalRef}
        initialOutput={t("terminal.ready")}
      />

      <CodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        indicator={{ ...codeModalIndicator, code: localCode }}
        onSave={handleSaveIndicator}  // artık kod parametresi alıyor
        runIndicatorId={selected?.id || null}
      />
    </div>
  );
};

export default CodePanel;
