"use client";

import { useState, useEffect, useRef } from "react";
import { IoMdClose } from "react-icons/io";
import { FaRegSave } from "react-icons/fa";
import { MdOpenInFull } from "react-icons/md"; // 👈 Tam ekran ikonu
import CodeEditor from "../../CodeEditor";
import usePanelStore from "@/store/indicator/panelStore";
import useCodePanelStore from "@/store/indicator/indicatorCodePanelStore";
import useIndicatorStore from "@/store/indicator/indicatorStore";
import RunButton from "./run_button";
import TerminalIndicator from "./terminalIndicator";
import axios from "axios";
import VersionSelect from "./versionSelect";
import CodeModal from "./fullScreenCodeModal"; // 👈 aynı klasördeyse bu yol doğru
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

  const { addIndicator, deleteIndicator, indicators } = useIndicatorStore();

  const [localName, setLocalName] = useState("");
  0;
  const [localCode, setLocalCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const terminalRef = useRef(null);

  // Tam ekran CodeModal durumu
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [codeModalIndicator, setCodeModalIndicator] = useState(null);

  const { t } = useTranslation("indicatorEditor");

  useEffect(() => {
    setLocalName(indicatorName);
    setLocalCode(indicatorCode);
  }, [indicatorName, indicatorCode]);

  const handleSaveIndicator = async () => {
    setIsSaving(true);

    const { indicators, setPersonalIndicators } = useIndicatorStore.getState();
    if (!localName.trim() || !localCode.trim()) {
      setIsSaving(false);
      return;
    }

    const delay = new Promise((res) => setTimeout(res, 250));

    try {
      if (selected && !isNewVersion) {
        // Güncelleme
        setIndicatorName(localName);
        setIndicatorCode(localCode);

        const updateRequest = axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/edit-indicator/`,
          { id: selected.id, name: localName, code: localCode },
          { withCredentials: true, headers: { "Content-Type": "application/json" } }
        );

        await Promise.all([updateRequest, delay]);

        setPersonalIndicators(
          indicators.map((ind) =>
            ind.id === selected.id ? { ...ind, name: localName, code: localCode } : ind
          )
        );
        deleteIndicator(selected.id);
        addIndicator({ id: selected.id, name: localName, code: localCode });
      } else {
        // Yeni ekleme veya yeni versiyon
        const postRequest = axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/add-indicator/`,
          {
            name: localName,
            code: localCode,
            parent_indicator_id: parent_indicator_id,
          },
          { withCredentials: true, headers: { "Content-Type": "application/json" } }
        );

        const [response] = await Promise.all([postRequest, delay]);
        const newIndicator = response.data;

        addIndicator({
          id: newIndicator.id,
          name: newIndicator.name,
          code: newIndicator.code,
          version: newIndicator.version,
          parent_indicator_id: newIndicator.parent_indicator_id,
        });

        setIndicatorEditing(newIndicator);
        setIndicatorName(newIndicator.name);
        setIndicatorCode(newIndicator.code);
      }
    } catch (err) {
      console.error(t("errors.save"), err);
    }

    setIsSaving(false);
  };

  const handleClose = () => {
    closePanel();
    removeCustomPanel("panel-indicator-editor");
  };

  // Tam ekran modal aç (Run'ın solundaki ikon)
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

      {/* Sağ üst aksiyon çubuğu: [Tam ekran ikonu] [Run] [Save] [Close] */}
      {selected && !isNewVersion && (
        <div className="absolute top-10 right-[10px] flex items-center gap-2">
          {/* Tam ekran ikonu — Run'ın SOLUNDA */}
          <button onClick={openFullscreenModal} className="p-[1px]" title={t("tooltips.fullscreen")}>
            <MdOpenInFull size={16} />
          </button>
        </div>
      )}
      <RunButton indicatorId={selected?.id} onBeforeRun={handleSaveIndicator} />

      {/* Save button */}
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

      {/* Close button */}
      <button
        className="absolute top-2 right-1 gap-1 px-[9px] py-[5px] mr-1 bg-[rgb(100,16,16)] hover:bg-[rgb(189,49,49)] rounded text-sm font-medium"
        onClick={handleClose}
        title={t("buttons.close")}
      >
        <IoMdClose />
      </button>

      {/* Input + Version select yan yana */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          className="w-64 h-[32px] p-2 bg-[#232323] text-white focus:outline-none rounded-sm"
          placeholder={t("inputs.namePlaceholder")}
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          maxLength={40}
        />

        {/* Versiyon seçici */}
        {versions.length > 0 && (
          <VersionSelect
            versions={versions}
            selectedId={selected?.id || null}
            onChange={(id) => selectVersion(id)}
            onAdd={() => startNewVersion()}
          />
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden rounded-t-[4px]">
        <CodeEditor code={localCode} setCode={setLocalCode} language="python" />
      </div>

      {/* Terminal */}
      <TerminalIndicator
        {...(selected ? { id: selected.id } : {})}
        ref={terminalRef}
        initialOutput={t("terminal.ready")}
      />

      {/* Tam ekran CodeModal */}
      <CodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        indicator={codeModalIndicator}
        onSave={handleSaveIndicator}          // 👈 Kaydet işlevini CodePanel’den al
        runIndicatorId={selected?.id || null} // 👈 RunButton için id ver
      />
    </div>
  );
};

export default CodePanel;
