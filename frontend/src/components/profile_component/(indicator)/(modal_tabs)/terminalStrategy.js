'use client'
import React, { useState, useRef, useEffect } from 'react';
import useStrategyDataStore from "@/store/indicator/strategyDataStore";
import { useTranslation } from "react-i18next";

const TerminalStrategy = ({ id }) => {
  const { t } = useTranslation("strategyTerminal");

  const [output, setOutput] = useState([t("ready")]);
  const [input, setInput] = useState('');
  const [importedIndicators, setImportedIndicators] = useState([]);
  const { strategyData } = useStrategyDataStore();
  const startTime = useRef(Date.now());

  const lastPrintedRef = useRef([]);

  useEffect(() => {
    const strategy = strategyData?.[id];
    const subItems = strategy?.subItems || {};
    const keys = Object.keys(subItems);
    if (keys.length === 0) return;

    const maxSubId = Math.max(...keys.map(Number));
    const currentSub = subItems?.[maxSubId];

    if (!currentSub) return;

    const { prints, strategy_result } = currentSub;

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

  const updateBackendIndicators = async (updatedList) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/strategies/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, indicator_names: updatedList }),
      });

      if (response.status === 401) {
        const errorData = await response.json();
        if (["Token expired", "Invalid token"].includes(errorData.detail)) {
          alert(t("alerts.sessionExpired"));
          return false;
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || t("errors.requestFailed"));
      }

      await response.json();
      return true;
    } catch (err) {
      setOutput((prev) => [
        ...prev,
        <span key={prev.length} className="text-red-500">
          ❌ {t("errors.notFoundPrefix")} {err.message}
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
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (response.status === 401) {
          const errorData = await response.json();
          if (["Token expired", "Invalid token"].includes(errorData.detail)) {
            alert(t("alerts.sessionExpired"));
            return;
          }
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || t("errors.requestFailed"));
        }

        const data = await response.json();
        if (data.indicator_names) {
          setImportedIndicators(data.indicator_names);
          setOutput(prev => [
            ...prev,
            <span key={prev.length} className="text-green-500">
              {t("load.successCount", { count: data.indicator_names.length })}
            </span>,
          ]);
        }
      } catch (error) {
        console.error("Fetch error:", error);
        setOutput(prev => [
          ...prev,
          <span key={prev.length} className="text-red-500">
            {t("load.failed", { message: error.message })}
          </span>,
        ]);
      }
    }

    if (id) fetchIndicators();
  }, [id, t]);

  const handleCommand = async (cmdRaw) => {
    const [command, ...args] = cmdRaw.trim().split(" ");
    const cmd = command.toLowerCase();
    const argument = args.join(" ").trim();

    if (cmd === "import") {
      const indicator = argument;
      if (!indicator) {
        addOutput(t("import.enterName"), "warning");
        return;
      }
      if (importedIndicators.includes(indicator)) {
        addOutput(t("import.already", { indicator }), "success");
      } else {
        const updated = [...importedIndicators, indicator];
        const success = await updateBackendIndicators(updated);
        if (success) {
          setImportedIndicators(updated);
          addOutput(t("import.success", { indicator }), "success");
        }
      }
      return;
    }

    if (cmd === "reset") {
      const arg = argument;
      if (!arg) {
        addOutput(t("reset.specify"), "warning");
        return;
      }

      if (arg.toLowerCase() === "imports") {
        const success = await updateBackendIndicators([]);
        if (success) {
          setImportedIndicators([]);
          addOutput(t("reset.allDone"), "success");
        }
      } else {
        if (importedIndicators.includes(arg)) {
          const updated = importedIndicators.filter((ind) => ind !== arg);
          const success = await updateBackendIndicators(updated);
          if (success) {
            setImportedIndicators(updated);
            addOutput(t("reset.removed", { indicator: arg }), "success");
          }
        } else {
          addOutput(t("reset.notFound", { indicator: arg }), "warning");
        }
      }
      return;
    }

    switch (cmd) {
      case 'cls':
        clearOutput();
        addOutput(t("ready"));
        break;

      case 'help':
        addOutput(t('help.title'), 'success');
        addOutput(t('help.cls'));
        addOutput(t('help.help'));
        addOutput(t('help.time'));
        addOutput(t('help.uptime'));
        addOutput(t('help.import'));
        addOutput(t('help.list'));
        addOutput(t('help.reset'));
        break;

      case 'time':
        addOutput(new Date().toLocaleString(), 'success');
        break;

      case 'uptime': {
        const seconds = Math.floor((Date.now() - startTime.current) / 1000);
        addOutput(t('uptimeFormat', { seconds }));
        break;
      }

      case 'hata':
        addOutput(t('errorSample'), 'error');
        break;

      case 'uyari':
        addOutput(t('warningSample'), 'warning');
        break;

      case 'basari':
        addOutput(t('successSample'), 'success');
        break;

      case 'list':
        if (importedIndicators.length === 0) {
          addOutput(t("list.none"), "warning");
        } else {
          addOutput(t("list.title"));
          importedIndicators.forEach((ind) => addOutput(`- ${ind}`));
        }
        break;

      default:
        addOutput(`> ${cmdRaw}`);
        addOutput(t('unknown', { cmd: cmdRaw }), 'warning');
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
          placeholder={t("placeholder")}
          spellCheck={false}
        />
      </form>
    </div>
  );
};

export default TerminalStrategy;
