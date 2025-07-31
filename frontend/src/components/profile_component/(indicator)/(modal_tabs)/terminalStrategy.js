'use client'
import React, { useState, useRef, useEffect } from 'react';
import useStrategyDataStore from "@/store/indicator/strategyDataStore";

const TerminalStrategy = ({ id }) => {
  const [output, setOutput] = useState(["🌊 Welcome, Terminal is ready..."]);
  const [input, setInput] = useState('');
  const [importedIndicators, setImportedIndicators] = useState([]);
  const { strategyData } = useStrategyDataStore();
  const startTime = useRef(Date.now());

  const lastPrintedRef = useRef([]);

  useEffect(() => {
    const strategy = strategyData?.[id];
    const subItems = strategy?.subItems || {};
    const maxSubId = Math.max(...Object.keys(subItems).map(Number));
    const currentSub = subItems?.[maxSubId];

    if (!currentSub) return;

    const { prints, strategy_result } = currentSub;
    console.log(currentSub);

    if (strategy_result?.status === "error" && strategy_result?.message) {
      setOutput((prev) => [
        ...prev,
        <span key={`error-${Date.now()}`} className="text-red-500">
          ❌ {strategy_result.message}
        </span>,
      ]);
      return;
    }

    if (!Array.isArray(prints)) return;
    if (JSON.stringify(prints) === JSON.stringify(lastPrintedRef.current)) return;

    const renderedLines = [];
    prints.forEach((msg, index) => {
      const lines = msg.split("\n");
      lines.forEach((line, i) => {
        renderedLines.push(
          <span key={`${index}-${i}`} className="text-yellow-400">
            🖨️ {line}
          </span>
        );
      });
    });

    setOutput((prev) => [...prev, ...renderedLines]);
    lastPrintedRef.current = prints;
  }, [strategyData, id]);

  const updateBackendIndicators = async (updatedList) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/strategies/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id,
          indicator_names: updatedList,
        }),
      });

      if (response.status === 401) {
        const errorData = await response.json();
        if (["Token expired", "Invalid token"].includes(errorData.detail)) {
          alert("Session expired or invalid token! Please log in again.");
          return false;
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Request failed");
      }

      const result = await response.json();
      return true;
    } catch (err) {
      setOutput((prev) => [
        ...prev,
        <span key={prev.length} className="text-red-500">
          ❌ Indicator not found: {err.message}
        </span>,
      ]);
      return false;
    }
  };

  useEffect(() => {
    async function fetchIndicators() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/strategies/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (response.status === 401) {
          const errorData = await response.json();
          if (["Token expired", "Invalid token"].includes(errorData.detail)) {
            alert("Session expired or invalid token! Please log in again.");
            return;
          }
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Request failed");
        }

        const data = await response.json();
        if (data.indicator_names) {
          setImportedIndicators(data.indicator_names);
          setOutput(prev => [
            ...prev,
            <span key={prev.length} className="text-green-500">
              ✅ {data.indicator_names.length} indicators loaded.
            </span>,
          ]);
        }
      } catch (error) {
        console.error("Fetch error:", error);
        setOutput(prev => [
          ...prev,
          <span key={prev.length} className="text-red-500">
            ❌ Failed to load indicators: {error.message}
          </span>,
        ]);
      }
    }

    if (id) fetchIndicators();
  }, [id]);

  const getMessageStyle = (type) => {
    switch (type) {
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'success': return 'text-green-500';
      default: return 'text-white';
    }
  };

  const addOutput = (message, type = 'default') => {
    setOutput(prevOutput => [
      ...prevOutput,
      <span key={prevOutput.length} className={getMessageStyle(type)}>
        {message}
      </span>
    ]);
  };

  const clearOutput = () => setOutput([]);

  const handleCommand = async (cmdRaw) => {
    const [command, ...args] = cmdRaw.trim().split(" ");
    const cmd = command.toLowerCase();
    const argument = args.join(" ").trim();

    if (cmd === "import") {
      const indicator = argument;
      if (!indicator) {
        addOutput("⚠️ Please enter an indicator name. E.g. import rsi", "warning");
        return;
      }
      if (importedIndicators.includes(indicator)) {
        addOutput(`⚠️ ${indicator} is already imported.`, "success");
      } else {
        const updated = [...importedIndicators, indicator];
        const success = await updateBackendIndicators(updated);
        if (success) {
          setImportedIndicators(updated);
          addOutput(`✅ ${indicator} successfully imported.`, "success");
        }
      }
      return;
    }

    if (cmd === "reset") {
      const arg = argument;
      if (!arg) {
        addOutput("⚠️ Please specify the indicator to delete. E.g. reset RSI", "warning");
        return;
      }

      if (arg.toLowerCase() === "imports") {
        const success = await updateBackendIndicators([]);
        if (success) {
          setImportedIndicators([]);
          addOutput("♻️ All imported indicators have been reset.", "success");
        }
      } else {
        if (importedIndicators.includes(arg)) {
          const updated = importedIndicators.filter((ind) => ind !== arg);
          const success = await updateBackendIndicators(updated);
          if (success) {
            setImportedIndicators(updated);
            addOutput(`🗑️ ${arg} removed from import list.`, "success");
          }
        } else {
          addOutput(`⚠️ ${arg} was not found in the import list.`, "warning");
        }
      }
      return;
    }

    switch (cmd) {
      case 'cls':
        clearOutput();
        addOutput('🌊 Welcome, Terminal is ready...');
        break;

      case 'help':
        addOutput('Available commands:', 'success');
        addOutput('cls - Clear the terminal');
        addOutput('help - List commands');
        addOutput('time - Show current time');
        addOutput('uptime - Show how long the page has been open');
        addOutput('import <indicator> - Import an indicator');
        addOutput('list imports - List imported indicators');
        addOutput('reset <indicator|imports> - Remove specific or all indicators');
        break;

      case 'time':
        addOutput(new Date().toLocaleString(), 'success');
        break;

      case 'uptime':
        const seconds = Math.floor((Date.now() - startTime.current) / 1000);
        addOutput(`⏱️ Page uptime: ${seconds} seconds`);
        break;

      case 'hata':
        addOutput('This is an error message!', 'error');
        break;

      case 'uyari':
        addOutput('This is a warning message!', 'warning');
        break;

      case 'basari':
        addOutput('This is a success message!', 'success');
        break;

      case 'list':
        if (importedIndicators.length === 0) {
          addOutput("📭 No indicators imported yet.", "warning");
        } else {
          addOutput("📦 Imported indicators:");
          importedIndicators.forEach((ind) => addOutput(`- ${ind}`));
        }
        break;

      default:
        addOutput(`> ${cmdRaw}`);
        addOutput(`Unknown command: ${cmdRaw}`, 'warning');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cmd = input.trim();
    if (cmd) {
      handleCommand(cmd);
      setInput('');
    }
  };

  return (
    <div className="bg-black text-white font-mono text-xs p-2 h-[135px] overflow-y-auto">
      <div>
        {output.map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="mt-1 flex items-center">
        <span className="mr-2">{'>'}</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="bg-black text-white border-none outline-none w-full caret-[hsl(59,100%,60%)]"
          placeholder="Enter command (type 'help' for list)"
          spellCheck={false}
        />
      </form>
    </div>
  );
};

export default TerminalStrategy;
