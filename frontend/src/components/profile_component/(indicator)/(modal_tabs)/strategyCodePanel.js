"use client";

import { useState, useEffect, useRef } from "react";
import { IoMdClose } from "react-icons/io";
import { FaRegSave } from "react-icons/fa";
import CodeEditor from "../../CodeEditor";
import usePanelStore from "@/store/indicator/panelStore";
import useCodePanelStore from "@/store/indicator/strategyCodePanelStore";
import useStrategyStore from "@/store/indicator/strategyStore";
import RunButton from "./run_button_str";
import TerminalStrategy from "./terminalStrategy"; // Import terminal component
import axios from "axios";

const CodePanel = () => {
  const removeCustomPanel = usePanelStore(state => state.removeCustomPanel);
  const {
    strategyName,
    strategyCode,
    editingStrategy,
    closePanel,
    setStrategyEditing,
    setStrategyName,
    setStrategyCode,
  } = useCodePanelStore();
  const { addStrategy, deleteStrategy } = useStrategyStore();
  const [localName, setLocalName] = useState("");
  const [localCode, setLocalCode] = useState("");
  const terminalRef = useRef(null);
  const term = useRef(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalName(strategyName);
    setLocalCode(strategyCode);
  }, [strategyName, strategyCode]);

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

  const handleSaveStrategy = async () => {
    setIsSaving(true);

    const { strategies, setPersonalStrategies } = useStrategyStore.getState();
    if (!localName.trim() || !localCode.trim()) {
      setIsSaving(false);
      return;
    }

    const delay = new Promise((res) => setTimeout(res, 250));

    if (editingStrategy) {
      const isNameUnchanged = localName === strategyName;
      const isCodeUnchanged = localCode === strategyCode;
      if (isNameUnchanged && isCodeUnchanged) {
        setIsSaving(false);
        return;
      }
      console.log(localName, localCode)
      try {
        setStrategyName(localName);
        setStrategyCode(localCode);
  
        const updateRequest = axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/edit-strategy/`,
          { id: editingStrategy.id, name: localName, code: localCode },
          { withCredentials: true, headers: { "Content-Type": "application/json" } }
        );
  
        await Promise.all([updateRequest, delay]);
  
        setPersonalStrategies(
          strategies.map((ind) =>
            ind.id === editingStrategy.id ? { ...ind, name: localName, code: localCode } : ind
          )
        );
        deleteStrategy(editingStrategy.id);
        addStrategy({ id: editingStrategy.id, name: localName, code: localCode });
  
      } catch (error) {
        console.error("Error occurred during update:", error);
      }
  
    } else {
      try {
        const postRequest = axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/add-strategy/`,
          { name: localName, code: localCode },
          { withCredentials: true, headers: { "Content-Type": "application/json" } }
        );
  
        const [response] = await Promise.all([postRequest, delay]);
  
        const newStrategy = response.data;
        addStrategy({ id: newStrategy.id, name: newStrategy.name, code: newStrategy.code });
        setStrategyEditing(newStrategy);
        setStrategyName(newStrategy.name);
        setStrategyCode(newStrategy.code);
  
      } catch (error) {
        console.error("Error occurred while adding new strategy:", error);
      }
    }
  
    setIsSaving(false);
  };

  const handleClose = () => {
    closePanel();
    removeCustomPanel("panel-strategy-editor");
  };

  return (
    <div className="bg-black text-white rounded-md w-full h-full p-2 shadow-lg relative flex flex-col">
      <div className="flex justify-start drag-handle cursor-grab mt-0 mr-8 h-5 ">
        <h2 className="flex justify-start drag-handle text-xs font-bold mb-2">
          {editingStrategy ? "Edit Strategy" : "Add New Strategy"}
        </h2>
      </div>
      
      {editingStrategy && <RunButton strategyId={editingStrategy.id} onBeforeRun={handleSaveStrategy} />}
      <button className="absolute top-2 right-10 gap-1 px-[9px] py-[5px] mr-[6px] bg-[rgb(16,45,100)] hover:bg-[rgb(27,114,121)] rounded text-xs font-medium" title="Save" onClick={handleSaveStrategy} >
          <FaRegSave />
      </button>
      <button className="absolute top-2 right-1 gap-1 px-[9px] py-[5px] mr-1 bg-[rgb(100,16,16)] hover:bg-[rgb(189,49,49)] rounded text-xs font-medium" onClick={handleClose}>
        <IoMdClose />
      </button>

      <input
        type="text"
        className="w-64 h-[32px] p-2 mb-3 bg-[#232323] text-white focus:outline-none rounded-sm"
        placeholder="Strategy name..."
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        maxLength={40}
      />
      <div className="flex-1 overflow-hidden rounded-t-[4px] ">
        <CodeEditor code={localCode} setCode={setLocalCode} language="python" />
      </div>

      {/* Terminal Area */}
      <TerminalStrategy 
        {...(editingStrategy ? { id: editingStrategy.id } : {})}
        ref={terminalRef}
        initialOutput="🚀 Terminal ready..." 
      />
    </div>
  );
};

export default CodePanel;
