
import React, { useState, useEffect } from 'react';
import { runSimulation, runBatchSimulation } from './simulator';
import { INITIAL_MODEL } from './constants';
import { SDModel, SimulationResult, Position } from './types';
import { modifyModel } from './services/geminiService';
import SimulationCharts from './components/SimulationCharts';
import FlowGraph from './components/FlowGraph';

type Tab = 'dashboard' | 'architecture';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [currentModel, setCurrentModel] = useState<SDModel>(INITIAL_MODEL);
  const [simulationData, setSimulationData] = useState<SimulationResult[]>([]);
  const [baselineData, setBaselineData] = useState<SimulationResult[] | null>(null);
  const [sensitivityData, setSensitivityData] = useState<SimulationResult[][] | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Load layout on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem('euromotion_layout');
    if (savedLayout) {
      try {
        const positions = JSON.parse(savedLayout);
        applyPositionsToModel(positions);
      } catch (e) {
        console.error("Failed to load saved layout", e);
      }
    }
  }, []);

  // Run simulation whenever model changes
  useEffect(() => {
    const runSim = () => {
      const output = runSimulation(currentModel);
      setSimulationData(output.results);
      setSimError(output.isStable ? null : output.error || "Simulation Diverged");
    };
    runSim();
  }, [currentModel]);

  const applyPositionsToModel = (positions: Record<string, Position>) => {
    setCurrentModel(prev => {
      const updateList = (list: any[]) => list.map(item => 
        positions[item.id] ? { ...item, position: positions[item.id] } : item
      );
      return {
        ...prev,
        stocks: updateList(prev.stocks),
        flows: updateList(prev.flows),
        converters: updateList(prev.converters),
        parameters: updateList(prev.parameters)
      };
    });
  };

  const handleCaptureBaseline = () => setBaselineData([...simulationData]);
  const handleClearBaseline = () => setBaselineData(null);

  const handleRunSensitivity = () => {
    const batch = runBatchSimulation(currentModel, 12);
    setSensitivityData(batch);
    setTimeout(() => setSensitivityData(null), 5000); 
  };

  const handleSaveLayout = () => {
    const positions: Record<string, Position> = {};
    [...currentModel.stocks, ...currentModel.flows, ...currentModel.converters, ...currentModel.parameters].forEach(node => {
      if (node.position) positions[node.id] = node.position;
    });
    localStorage.setItem('euromotion_layout', JSON.stringify(positions));
    alert("Strategic Layout Synchronized to Local Storage.");
  };

  const handleParamChange = (id: string, value: number) => {
    setCurrentModel(prev => ({
      ...prev,
      parameters: prev.parameters.map(p => p.id === id ? { ...p, value } : p)
    }));
  };

  const handleUpdatePosition = (id: string, position: Position) => {
    setCurrentModel(prev => {
      const updateList = (list: any[]) => list.map(item => item.id === id ? { ...item, position } : item);
      return {
        ...prev,
        stocks: updateList(prev.stocks),
        flows: updateList(prev.flows),
        converters: updateList(prev.converters),
        parameters: updateList(prev.parameters)
      };
    });
  };

  const handleAiUpdate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const updated = await modifyModel(currentModel, aiPrompt, selectedId || undefined);
      setCurrentModel(updated);
      setAiPrompt("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "AI Logic Deployment Failed");
    } finally {
      setIsAiLoading(false);
    }
  };

  const selectedElement = [...currentModel.stocks, ...currentModel.flows, ...currentModel.parameters, ...currentModel.converters].find(e => e.id === selectedId);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-lg flex items-center justify-center font-black text-xs shadow-lg shadow-blue-500/20">EM</div>
            <div className="flex flex-col">
              <h1 className="text-xs font-black tracking-widest uppercase leading-none">Euromotion</h1>
              <span className="text-[10px] text-blue-500 font-medium tracking-tighter uppercase italic leading-none mt-1">Strategic Supply Forecaster</span>
            </div>
          </div>
          
          <nav className="flex gap-1 bg-slate-950/50 p-1 rounded-xl border border-white/5 shadow-inner">
            <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-500 hover:text-slate-300'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('architecture')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'architecture' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-500 hover:text-slate-300'}`}>Architecture</button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'architecture' && (
            <div className="flex items-center gap-2 mr-4">
               <button 
                onClick={() => setIsEditMode(!isEditMode)} 
                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all border ${isEditMode ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
               >
                {isEditMode ? 'Lock Layout' : 'Unlock Drag'}
               </button>
               <button onClick={handleSaveLayout} className="px-3 py-1.5 text-[9px] font-black uppercase bg-blue-600 border border-blue-500 text-white rounded-lg hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20">Save Layout</button>
            </div>
          )}
          
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
             <button onClick={handleCaptureBaseline} className="px-3 py-1 text-[9px] font-black uppercase text-blue-400 hover:bg-blue-500/10 rounded transition-all">Set Baseline</button>
             {baselineData && <button onClick={handleClearBaseline} className="px-3 py-1 text-[9px] font-black uppercase text-rose-500 hover:bg-rose-500/10 rounded transition-all">Clear</button>}
          </div>
          <button onClick={handleRunSensitivity} className="px-3 py-1.5 text-[9px] font-black uppercase bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 rounded-lg transition-all">Stress Test</button>
          <div className="w-px h-4 bg-slate-800 mx-1" />
          <button onClick={() => { if(confirm("Reset entire system?")) { setCurrentModel(INITIAL_MODEL); localStorage.removeItem('euromotion_layout'); } }} className="text-[9px] bg-slate-900 hover:bg-red-950/40 px-3 py-1.5 rounded-lg text-slate-500 hover:text-red-400 uppercase font-black transition-all border border-slate-800">Reset</button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        {simError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-rose-900/90 backdrop-blur-md border border-rose-500 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
             <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-white">{simError}</span>
          </div>
        )}

        <aside className="w-80 border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0 overflow-y-auto custom-scrollbar shadow-2xl z-40">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-l-2 border-blue-600 pl-2">Executive Levers</h2>
            <div className="space-y-6">
              {currentModel.parameters.map(p => (
                <div key={p.id} className={`group cursor-pointer p-3 rounded-xl transition-all border ${selectedId === p.id ? 'bg-blue-600/10 border-blue-500/30' : 'hover:bg-slate-800/30 border-transparent'}`} onClick={() => setSelectedId(p.id)}>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">{p.name}</label>
                    <span className="text-[10px] mono text-blue-500 font-bold">{p.value}</span>
                  </div>
                  <input type="range" min={p.min} max={p.max} step={p.step} value={p.value} onChange={(e) => handleParamChange(p.id, parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-600" />
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-blue-600/[0.03] flex-1">
            <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Mechanism Logic</h2>
            <div className="space-y-4">
              <div className={`p-4 bg-slate-950 rounded-xl border transition-all ${selectedId ? 'border-blue-500/40' : 'border-slate-800'}`}>
                <textarea 
                  placeholder={selectedId ? `Update logic for ${selectedElement?.name}...` : "Describe a broad strategic re-configuration..."}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-200 focus:outline-none min-h-[120px] resize-none leading-relaxed placeholder:text-slate-700"
                />
              </div>
              <button onClick={handleAiUpdate} disabled={isAiLoading || !aiPrompt} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20">
                {isAiLoading ? "Processing Architecture..." : "Deploy Change"}
              </button>
            </div>
          </div>
        </aside>

        <section className="flex-1 overflow-hidden relative bg-[#020617]">
          <div className="h-full p-8 overflow-y-auto custom-scrollbar flex flex-col items-center">
            {activeTab === 'dashboard' ? (
              <div className="w-full max-w-6xl space-y-10">
                <div className="flex justify-between items-end border-b border-slate-800/50 pb-6">
                  <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">{currentModel.name}</h2>
                    <p className="text-xs text-slate-400 max-w-2xl font-medium">{currentModel.description}</p>
                  </div>
                  {baselineData && (
                    <div className="px-3 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
                       <div className="w-2 h-0.5 bg-blue-400 border-t border-dashed border-blue-400" />
                       <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Comparing to Baseline</span>
                    </div>
                  )}
                </div>
                <SimulationCharts data={simulationData} baseline={baselineData} sensitivityData={sensitivityData} model={currentModel} />
              </div>
            ) : (
              <div className="w-full h-full max-w-6xl flex flex-col gap-4">
                <FlowGraph model={currentModel} selectedId={selectedId} onSelect={setSelectedId} onUpdatePosition={handleUpdatePosition} isEditMode={isEditMode} />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
