import { useState, useEffect, useRef } from "react";
import { IoMdClose } from "react-icons/io";
import { FaRegSave } from "react-icons/fa";
import CodeEditor from "../../CodeEditor";
import usePanelStore from "@/store/indicator/panelStore";
import useCodePanelStore from "@/store/indicator/indicatorCodePanelStore";
import useIndicatorStore from "@/store/indicator/indicatorStore";
import RunButton from "./run_button";
import TerminalIndicator from "./terminalIndicator"; // Import terminal component
import axios from "axios";

const CodePanel = () => {
  const removeCustomPanel = usePanelStore(state => state.removeCustomPanel);
  const {
    indicatorName,
    indicatorCode,
    editingIndicator,
    closePanel,
    setIndicatorEditing,
    setIndicatorName,
    setIndicatorCode,
  } = useCodePanelStore();
  const { addIndicator, deleteIndicator, indicators } = useIndicatorStore();
  const [localName, setLocalName] = useState("");
  const [localCode, setLocalCode] = useState("");
  const terminalRef = useRef(null);
  const term = useRef(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalName(indicatorName);
    setLocalCode(indicatorCode);
  }, [indicatorName, indicatorCode]);

  useEffect(() => {
    if (terminalRef.current && !term.current) {
      term.current = new Terminal({
        rows: 8,
        theme: { background: "#000007", foreground: "#ffffff" },
        fontSize: 14,
      });
      term.current.open(terminalRef.current);
      term.current.writeln("🚀 Terminal ready...");
    }
  }, []);

  const handleSaveIndicator = async () => {
    setIsSaving(true);

    const { indicators, setPersonalIndicators } = useIndicatorStore.getState();
    if (!localName.trim() || !localCode.trim()) {
      setIsSaving(false);
      return;
    }

    const delay = new Promise((res) => setTimeout(res, 250));

    if (editingIndicator) {
      const isNameUnchanged = localName === indicatorName;
      const isCodeUnchanged = localCode === indicatorCode;
      if (isNameUnchanged && isCodeUnchanged) {
        setIsSaving(false);
        return;
      }
      console.log(localName, localCode);
      try {
        setIndicatorName(localName);
        setIndicatorCode(localCode);

        const updateRequest = axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/edit-indicator/`,
          { id: editingIndicator.id, name: localName, code: localCode },
          { withCredentials: true, headers: { "Content-Type": "application/json" } }
        );

        await Promise.all([updateRequest, delay]);

        setPersonalIndicators(
          indicators.map((ind) =>
            ind.id === editingIndicator.id ? { ...ind, name: localName, code: localCode } : ind
          )
        );
        deleteIndicator(editingIndicator.id);
        addIndicator({ id: editingIndicator.id, name: localName, code: localCode });

      } catch (error) {
        console.error("An error occurred during update:", error);
      }

    } else {
      try {
        const postRequest = axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/add-indicator/`,
          { name: localName, code: localCode },
          { withCredentials: true, headers: { "Content-Type": "application/json" } }
        );

        const [response] = await Promise.all([postRequest, delay]);

        const newIndicator = response.data;
        addIndicator({ id: newIndicator.id, name: newIndicator.name, code: newIndicator.code });
        setIndicatorEditing(newIndicator);
        setIndicatorName(newIndicator.name);
        setIndicatorCode(newIndicator.code);

      } catch (error) {
        console.error("An error occurred while adding new indicator:", error);
      }
    }

    setIsSaving(false);
  };

  const handleClose = () => {
    closePanel();
    removeCustomPanel("panel-indicator-editor");
  };

  return (
    <div className="bg-black text-white rounded-md w-full h-full p-2 shadow-lg relative flex flex-col">
      <div className="flex justify-start drag-handle cursor-grab mt-0 mr-8 h-5 ">
        <h2 className="flex justify-start drag-handle text-xs font-bold mb-2">
          {editingIndicator ? "Edit Indicator" : "Add New Indicator"}
        </h2>
      </div>
      
      {editingIndicator && <RunButton indicatorId={editingIndicator.id} onBeforeRun={handleSaveIndicator} />}
      <button
        className="absolute top-2 right-10 gap-1 px-[9px] py-[5px] mr-[6px] bg-[rgb(16,45,100)] hover:bg-[rgb(27,114,121)] rounded text-xs font-medium flex items-center"
        title="Save"
        onClick={handleSaveIndicator}
      >
        {isSaving ? (
          <div className="w-[16px] h-[16px] border-2 border-t-white border-gray-400 rounded-full animate-spin"></div>
        ) : (
          <FaRegSave />
        )}
      </button>

      <button className="absolute top-2 right-1 gap-1 px-[9px] py-[5px] mr-1 bg-[rgb(100,16,16)] hover:bg-[rgb(189,49,49)] rounded text-sm font-medium" onClick={handleClose}>
        <IoMdClose />
      </button>

      <input
        type="text"
        className="w-64 h-[32px] p-2 mb-3 bg-[#232323] text-white focus:outline-none rounded-sm"
        placeholder="Indicator name..."
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        maxLength={40}
      />
      <div className="flex-1 overflow-hidden rounded-t-[4px] ">
        <CodeEditor code={localCode} setCode={setLocalCode} language="python" />
      </div>

      {/* Terminal Area */}
      <TerminalIndicator 
        {...(editingIndicator ? { id: editingIndicator.id } : {})}
        ref={terminalRef}
        initialOutput="🚀 Terminal ready..." 
      />
    </div>
  );
};

export default CodePanel;
