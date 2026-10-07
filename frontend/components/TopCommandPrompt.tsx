"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Terminal, CornerDownLeft, Play, Cpu, Layers, Sparkles, CheckCircle2, ChevronRight, X } from "lucide-react";

export interface TopCommandPromptProps {
  onExecuteCommand?: (cmd: string) => void;
  className?: string;
}

export interface CommandItem {
  id: string;
  command: string;
  label: string;
  description: string;
  category: "EXEC" | "PRESET" | "QUANTUM" | "SYSTEM";
  badge?: string;
}

const AVAILABLE_COMMANDS: CommandItem[] = [
  {
    id: "run",
    command: "/run",
    label: "Launch Simulation",
    description: "Execute quantum resource dispatch & start real-time telemetry",
    category: "EXEC",
    badge: "START"
  },
  {
    id: "preset-tokyo",
    command: "/preset Tokyo",
    label: "Preset: Tokyo Metro",
    description: "Load Tokyo earthquake & flood scenario with 80+ disaster nodes",
    category: "PRESET",
    badge: "TOKYO"
  },
  {
    id: "preset-sf",
    command: "/preset SanFrancisco",
    label: "Preset: San Francisco",
    description: "Load SF Bay coastal hazard model & bridge bottleneck route network",
    category: "PRESET",
    badge: "SF-BAY"
  },
  {
    id: "qubo-depth-4",
    command: "/qubo-depth 4",
    label: "Set QAOA Depth (p=4)",
    description: "Increase QUBO optimizer depth layers for higher approximation ratio",
    category: "QUANTUM",
    badge: "QUBO"
  },
  {
    id: "shots-1024",
    command: "/shots 1024",
    label: "Set Quantum Shots: 1024",
    description: "Configure stochastic quantum sampler count to 1,024 circuit shots",
    category: "QUANTUM",
    badge: "SAMPLER"
  },
  {
    id: "clear",
    command: "/clear",
    label: "Clear Terminal",
    description: "Reset terminal status feedback & active prompt buffer",
    category: "SYSTEM",
    badge: "SYS"
  }
];

const QUICK_ACTIONS = [
  { cmd: "/run", label: "/run", icon: Play, color: "bg-[#FACC15] hover:bg-[#FFE043]" },
  { cmd: "/preset Tokyo", label: "/preset Tokyo", icon: Layers, color: "bg-white hover:bg-[#FACC15]" },
  { cmd: "/qubo-depth 4", label: "/qubo-depth 4", icon: Cpu, color: "bg-white hover:bg-[#FACC15]" }
];

export function TopCommandPrompt({ onExecuteCommand, className = "" }: TopCommandPromptProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lastExecuted, setLastExecuted] = useState<{
    cmd: string;
    timestamp: string;
    status: "OK" | "READY" | "RUNNING";
  }>({
    cmd: "SYS://INIT",
    timestamp: "STANDBY",
    status: "READY"
  });
  const [flashFeedback, setFlashFeedback] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter commands based on input
  const filteredCommands = useMemo(() => {
    const raw = inputValue.trim().toLowerCase();
    if (!raw) return AVAILABLE_COMMANDS;
    const search = raw.startsWith("/") ? raw : `/${raw}`;
    return AVAILABLE_COMMANDS.filter(
      (item) =>
        item.command.toLowerCase().includes(raw) ||
        item.label.toLowerCase().includes(raw) ||
        item.command.toLowerCase().includes(search)
    );
  }, [inputValue]);

  // Keep selected index in bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const executeCommand = (cmdToRun: string) => {
    const cleanCmd = cmdToRun.trim();
    if (!cleanCmd) return;

    const timeStr = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

    if (cleanCmd.toLowerCase() === "/clear") {
      setLastExecuted({
        cmd: "BUFFER CLEARED",
        timestamp: timeStr,
        status: "READY"
      });
      setInputValue("");
      setIsFocused(false);
      onExecuteCommand?.(cleanCmd);
      return;
    }

    setLastExecuted({
      cmd: cleanCmd,
      timestamp: timeStr,
      status: "OK"
    });

    setFlashFeedback(true);
    setTimeout(() => setFlashFeedback(false), 900);

    setInputValue("");
    setIsFocused(false);

    if (onExecuteCommand) {
      onExecuteCommand(cleanCmd);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (filteredCommands.length > 0 && filteredCommands[selectedIndex]) {
        setInputValue(filteredCommands[selectedIndex].command);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isFocused && filteredCommands.length > 0 && selectedIndex < filteredCommands.length) {
        executeCommand(filteredCommands[selectedIndex].command);
      } else if (inputValue.trim()) {
        executeCommand(inputValue.trim());
      }
    } else if (e.key === "Escape") {
      setIsFocused(false);
    }
  };

  const showDropdown = isFocused && (inputValue.length > 0 || isFocused);

  return (
    <div
      ref={containerRef}
      className={`w-full border-b-[3px] border-black bg-[#F7F4EA] font-mono text-black transition-all ${className}`}
    >
      <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-3 py-2.5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Left: Terminal Prompt & Autocomplete */}
        <div className="relative flex-1 max-w-3xl">
          <div className="relative flex items-center border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform focus-within:-translate-y-0.5 focus-within:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            
            {/* Terminal Prefix `>_` */}
            <div className="flex select-none items-center gap-1.5 border-r-2 border-black bg-[#FACC15] px-3 py-2 font-mono text-xs font-black uppercase text-black">
              <span className="text-sm font-black tracking-tight">&gt;_</span>
              <span className="hidden sm:inline-block text-[11px] font-black tracking-wider">CLI</span>
            </div>

            {/* Input field */}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (!isFocused) setIsFocused(true);
              }}
              onFocus={() => setIsFocused(true)}
              onKeyDown={handleKeyDown}
              placeholder="Type / for command suggestions... (e.g. /run, /preset Tokyo, /qubo-depth 4)"
              className="w-full bg-transparent px-3 py-2 font-mono text-xs font-bold text-black placeholder:font-normal placeholder:text-neutral-500 focus:outline-none"
              autoComplete="off"
              spellCheck="false"
            />

            {/* Clear or Action Hint */}
            {inputValue ? (
              <button
                type="button"
                onClick={() => setInputValue("")}
                className="mr-2 border border-black bg-neutral-100 p-1 hover:bg-neutral-200"
                title="Clear input"
              >
                <X size={13} className="text-black" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                if (filteredCommands.length > 0 && selectedIndex < filteredCommands.length) {
                  executeCommand(filteredCommands[selectedIndex].command);
                } else if (inputValue.trim()) {
                  executeCommand(inputValue.trim());
                } else {
                  inputRef.current?.focus();
                  setIsFocused(true);
                }
              }}
              className="flex items-center gap-1 border-l-2 border-black bg-black px-3 py-2 text-[11px] font-black uppercase text-[#FACC15] hover:bg-neutral-800 active:bg-black"
            >
              <span>RUN</span>
              <CornerDownLeft size={12} className="stroke-[3]" />
            </button>
          </div>

          {/* Autocomplete Dropdown Menu */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between border-b-2 border-black bg-[#F7F4EA] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-black">
                <span className="flex items-center gap-1.5">
                  <Terminal size={12} />
                  Available Commands ({filteredCommands.length})
                </span>
                <span className="text-neutral-600">
                  Navigate <span className="border border-black bg-white px-1 font-bold">↑↓</span> &bull; Select <span className="border border-black bg-white px-1 font-bold">Tab</span> &bull; Run <span className="border border-black bg-white px-1 font-bold">↵</span>
                </span>
              </div>

              {filteredCommands.length === 0 ? (
                <div className="p-4 text-center text-xs font-bold text-neutral-500">
                  No matching commands. Try <code className="bg-[#FACC15] px-1 text-black font-black">/run</code> or <code className="bg-[#FACC15] px-1 text-black font-black">/preset Tokyo</code>
                </div>
              ) : (
                <ul className="divide-y divide-black/20">
                  {filteredCommands.map((cmdItem, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <li
                        key={cmdItem.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => executeCommand(cmdItem.command)}
                        className={`group flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-xs transition-colors ${
                          isSelected
                            ? "bg-[#FACC15] font-black text-black"
                            : "bg-white hover:bg-[#FFF9D2] text-neutral-900"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`inline-flex items-center justify-center border-2 border-black px-1.5 py-0.5 text-[10px] font-black ${
                            isSelected ? "bg-black text-[#FACC15]" : "bg-[#F7F4EA] text-black"
                          }`}>
                            {cmdItem.badge || cmdItem.category}
                          </span>
                          <div>
                            <span className="font-mono font-black text-black">
                              {cmdItem.command}
                            </span>
                            <span className="ml-2 font-sans font-bold text-neutral-700 group-hover:text-black">
                              {cmdItem.label}
                            </span>
                            <p className="mt-0.5 font-sans text-[11px] font-normal text-neutral-600 group-hover:text-neutral-900">
                              {cmdItem.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <span className="hidden items-center gap-1 border border-black bg-black px-1.5 py-0.5 text-[10px] font-black text-white sm:inline-flex">
                              PRESS ↵
                            </span>
                          )}
                          <ChevronRight size={14} className={isSelected ? "text-black translate-x-0.5" : "text-neutral-400"} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Right Section: Quick Action Pills & Execution Status Badge */}
        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          
          {/* Quick Action Pill Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="hidden text-[10px] font-black uppercase tracking-wider text-neutral-500 xl:inline-block">
              QUICK:
            </span>
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.cmd}
                  type="button"
                  onClick={() => executeCommand(action.cmd)}
                  className={`inline-flex items-center gap-1.5 border-2 border-black px-2.5 py-1.5 font-mono text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${action.color}`}
                >
                  <Icon size={12} className="stroke-[2.5]" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>

          {/* Execution Feedback Badge */}
          <div
            className={`flex items-center gap-2 border-2 border-black px-3 py-1.5 font-mono text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${
              flashFeedback
                ? "bg-[#2ECC40] text-black scale-105"
                : lastExecuted.status === "OK"
                ? "bg-[#FACC15] text-black"
                : "bg-black text-[#FACC15]"
            }`}
          >
            <span
              className={`inline-block h-2 w-2 rounded-none border border-black ${
                lastExecuted.status === "OK" ? "bg-black" : "bg-[#2ECC40]"
              }`}
            />
            <div className="flex items-center gap-1.5 font-black uppercase">
              <span className="tracking-wider">EXEC:</span>
              <span className="max-w-[130px] truncate sm:max-w-[200px]" title={lastExecuted.cmd}>
                {lastExecuted.cmd}
              </span>
            </div>
            <span className="border-l border-black/40 pl-1.5 text-[10px] font-bold opacity-80">
              [{lastExecuted.timestamp}]
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}

export default TopCommandPrompt;
