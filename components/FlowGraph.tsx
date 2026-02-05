
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { SDModel, Position, SDLink } from '../types';

interface Props {
  model: SDModel;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdatePosition: (id: string, position: Position) => void;
  isEditMode: boolean;
}

const FlowGraph: React.FC<Props> = ({ model, selectedId, onSelect, onUpdatePosition, isEditMode }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(0.8);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const findNode = (id: string) => {
    return [
      ...model.parameters.map(p => ({ ...p, type: 'parameter' })),
      ...model.stocks.map(s => ({ ...s, type: 'stock' })),
      ...model.flows.map(f => ({ ...f, type: 'flow' })),
      ...model.converters.map(c => ({ ...c, type: 'converter' }))
    ].find(n => n.id === id);
  };

  const materialLinks = useMemo(() => {
    const links: { id: string, source: string, target: string, type: 'material' }[] = [];
    model.flows.forEach(flow => {
      if (flow.sourceId) links.push({ id: `m-${flow.sourceId}-${flow.id}`, source: flow.sourceId, target: flow.id, type: 'material' });
      if (flow.targetId) links.push({ id: `m-${flow.id}-${flow.targetId}`, source: flow.id, target: flow.targetId, type: 'material' });
    });
    return links;
  }, [model.flows]);

  const relatedElements = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const related = new Set<string>([selectedId]);
    [...model.links, ...materialLinks].forEach(link => {
      if (link.source === selectedId || link.target === selectedId) {
        related.add(link.id);
        related.add(link.source);
        related.add(link.target);
      }
    });
    return related;
  }, [selectedId, model.links, materialLinks]);

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as SVGElement).tagName === 'svg' || (e.target as HTMLElement).id === 'grid-background') {
      onSelect(null);
    }
  };

  const handleNodeClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onSelect(id);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && (e.target === e.currentTarget || (e.target as SVGElement).tagName === 'svg')) {
      isPanning.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isEditMode) {
      setDragNodeId(id);
    }
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragNodeId && isEditMode) {
      const dx = (e.clientX - lastPos.current.x) / scale;
      const dy = (e.clientY - lastPos.current.y) / scale;
      const node = findNode(dragNodeId);
      if (node && node.position) {
        onUpdatePosition(dragNodeId, { 
          x: node.position.x + dx, 
          y: node.position.y + dy 
        });
      }
      lastPos.current = { x: e.clientX, y: e.clientY };
    } else if (isPanning.current) {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleGlobalMouseUp = () => {
    isPanning.current = false;
    setDragNodeId(null);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.1), 5));
  };

  const renderGenericLink = (link: any, isMaterial: boolean) => {
    const src = findNode(link.source);
    const tgt = findNode(link.target);

    if (!src?.position || !tgt?.position) return null;

    const from = src.position;
    const to = tgt.position;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const nx = dx / dist;
    const ny = dy / dist;

    const getMargin = (node: any) => {
      const type = (node as any).type;
      if (type === 'stock') return 55;
      if (type === 'flow') return 30;
      if (type === 'converter') return 22;
      if (type === 'parameter') return 18;
      return 20;
    };

    const sM = getMargin(src);
    const tM = getMargin(tgt);

    const sx = from.x + nx * sM;
    const sy = from.y + ny * sM;
    const ex = to.x - nx * tM;
    const ey = to.y - ny * tM;

    const isRelated = selectedId ? relatedElements.has(link.id) : true;
    const isSelected = selectedId === link.id;

    const midX = (sx + ex) / 2;
    const midY = (sy + ey) / 2;
    const bend = isMaterial ? 12 : 35; 
    const cx = midX - ny * bend;
    const cy = midY + nx * bend;

    const pathData = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;

    if (isMaterial) {
      return (
        <path
          key={link.id}
          d={pathData}
          fill="none"
          stroke={link.source.includes('chip') ? "#3b82f6" : "#10b981"}
          strokeWidth={isSelected ? 6 : 3}
          strokeLinecap="round"
          markerEnd="url(#arrowhead-material)"
          className={`transition-all duration-200 cursor-pointer ${isRelated ? 'opacity-90' : 'opacity-10'}`}
          onClick={(e) => { e.stopPropagation(); onSelect(link.id); }}
        />
      );
    } else {
      const polarity = (link as SDLink).polarity || '+';
      let strokeColor = "#334155";
      let markerId = "arrowhead-influence";

      if (isRelated || isSelected) {
        strokeColor = polarity === '+' ? "#10b981" : "#f43f5e";
        markerId = polarity === '+' ? "arrowhead-plus" : "arrowhead-minus";
      }

      if (isSelected) {
        strokeColor = polarity === '+' ? "#34d399" : "#fb7185";
      }

      // Calculate path midpoint for polarity label
      const t = 0.5;
      const labelX = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex;
      const labelY = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;

      return (
        <g key={link.id}>
          <path
            d={pathData}
            fill="none"
            stroke={strokeColor}
            strokeWidth={isSelected ? 4 : 1.5}
            strokeDasharray={isSelected ? "none" : "6 4"}
            markerEnd={`url(#${markerId})`}
            className={`transition-all duration-200 cursor-pointer ${isRelated ? 'opacity-90' : 'opacity-10'}`}
            onClick={(e) => { e.stopPropagation(); onSelect(link.id); }}
          />
          {isRelated && (
            <g transform={`translate(${labelX}, ${labelY})`}>
              <circle r="7" fill={strokeColor} className="shadow-lg" />
              <text textAnchor="middle" dy="3" fontSize="8" fontWeight="bold" fill="white" className="select-none pointer-events-none">
                {polarity}
              </text>
            </g>
          )}
        </g>
      );
    }
  };

  const selectedNode = selectedId ? findNode(selectedId) : null;

  return (
    <div 
      ref={containerRef}
      className={`relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner ${isFullscreen ? 'fixed inset-0 z-[100] rounded-none' : 'w-full h-full'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      onClick={handleContainerClick}
    >
      <div 
        id="grid-background"
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', 
          backgroundSize: '40px 40px', 
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
        }}
      ></div>
      
      <button 
        onClick={(e) => { e.stopPropagation(); setIsFullscreen(!isFullscreen); }}
        className="absolute top-4 right-4 z-[110] bg-slate-900/80 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-xl"
      >
        {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
      </button>

      <svg 
        className="w-full h-full z-10 cursor-grab active:cursor-grabbing" 
        viewBox="0 0 1200 700" 
        preserveAspectRatio="xMidYMid meet"
        onClick={handleContainerClick}
      >
        <defs>
          <marker id="arrowhead-material" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
            <path d="M 0 0 L 8 4 L 0 8 Z" fill="#3b82f6" />
          </marker>
          <marker id="arrowhead-influence" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 Z" fill="#475569" />
          </marker>
          <marker id="arrowhead-plus" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto">
            <path d="M 0 0 L 7 3.5 L 0 7 Z" fill="#10b981" />
          </marker>
          <marker id="arrowhead-minus" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto">
            <path d="M 0 0 L 7 3.5 L 0 7 Z" fill="#f43f5e" />
          </marker>
          
          <filter id="nodeSelectionGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
            <feOffset in="blur" dx="0" dy="0" result="offsetBlur" />
            <feFlood floodColor="#3b82f6" floodOpacity="0.4" result="color" />
            <feComposite in="color" in2="offsetBlur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
          <g>
            {materialLinks.map(l => renderGenericLink(l, true))}
            {model.links.map(l => renderGenericLink(l, false))}
          </g>

          {model.parameters.map(p => p.position && (
            <g key={p.id} 
               onClick={(e) => handleNodeClick(e, p.id)}
               onMouseDown={(e) => handleNodeMouseDown(e, p.id)} 
               className={`cursor-pointer transition-opacity duration-300 ${(!selectedId || relatedElements.has(p.id)) ? 'opacity-100' : 'opacity-20'}`}>
               <path d="M 0 -15 L 13 -7.5 L 13 7.5 L 0 15 L -13 7.5 L -13 -7.5 Z" 
                     transform={`translate(${p.position.x}, ${p.position.y})`}
                     fill="#1e293b" stroke={selectedId === p.id ? "#3b82f6" : "#475569"} strokeWidth="2"
                     filter={selectedId === p.id ? "url(#nodeSelectionGlow)" : ""} />
               <text x={p.position.x} y={p.position.y + 30} textAnchor="middle" className={`text-[8px] font-black uppercase tracking-widest pointer-events-none ${selectedId === p.id ? 'fill-blue-400' : 'fill-slate-500'}`}>{p.name}</text>
            </g>
          ))}

          {model.converters.map(conv => conv.position && (
            <g key={conv.id} 
               onClick={(e) => handleNodeClick(e, conv.id)}
               onMouseDown={(e) => handleNodeMouseDown(e, conv.id)} 
               className={`cursor-pointer transition-opacity duration-300 ${(!selectedId || relatedElements.has(conv.id)) ? 'opacity-100' : 'opacity-20'}`}>
              <circle cx={conv.position.x} cy={conv.position.y} r="18" fill="#0f172a" stroke={selectedId === conv.id ? "#f59e0b" : "#334155"} strokeWidth="2"
                      filter={selectedId === conv.id ? "url(#nodeSelectionGlow)" : ""} />
              <text x={conv.position.x} y={conv.position.y + 38} textAnchor="middle" className={`text-[9px] font-bold uppercase tracking-tighter pointer-events-none ${selectedId === conv.id ? 'fill-amber-400' : 'fill-slate-500'}`}>{conv.name}</text>
            </g>
          ))}

          {model.flows.map(flow => flow.position && (
            <g key={flow.id} 
               onClick={(e) => handleNodeClick(e, flow.id)}
               onMouseDown={(e) => handleNodeMouseDown(e, flow.id)} 
               className={`cursor-pointer transition-opacity duration-300 ${(!selectedId || relatedElements.has(flow.id)) ? 'opacity-100' : 'opacity-20'}`}>
              <rect x={flow.position.x - 22} y={flow.position.y - 14} width="44" height="28" fill="#0f172a" stroke={selectedId === flow.id ? "#10b981" : "#1e293b"} strokeWidth="2" rx="6"
                    filter={selectedId === flow.id ? "url(#nodeSelectionGlow)" : ""} />
              <path d="M -8 -8 L 8 8 M -8 8 L 8 -8" stroke={selectedId === flow.id ? "#10b981" : "#475569"} strokeWidth="2" transform={`translate(${flow.position.x},${flow.position.y})`} className="pointer-events-none" />
              <text x={flow.position.x} y={flow.position.y + 48} textAnchor="middle" className={`text-[9px] font-black uppercase tracking-widest pointer-events-none ${selectedId === flow.id ? 'fill-emerald-400' : 'fill-slate-400'}`}>{flow.name}</text>
            </g>
          ))}

          {model.stocks.map(stock => stock.position && (
            <g key={stock.id} 
               onClick={(e) => handleNodeClick(e, stock.id)}
               onMouseDown={(e) => handleNodeMouseDown(e, stock.id)} 
               className={`cursor-pointer transition-opacity duration-300 ${(!selectedId || relatedElements.has(stock.id)) ? 'opacity-100' : 'opacity-20'}`}>
              <rect x={stock.position.x - 50} y={stock.position.y - 40} width="100" height="80" fill={selectedId === stock.id ? "#172554" : "#020617"} stroke={selectedId === stock.id ? "#3b82f6" : "#1e293b"} strokeWidth="2.5" rx="4"
                    filter={selectedId === stock.id ? "url(#nodeSelectionGlow)" : ""} />
              <text x={stock.position.x} y={stock.position.y + 5} textAnchor="middle" className="text-[11px] fill-white font-black tracking-tighter uppercase pointer-events-none">{stock.name}</text>
            </g>
          ))}

          {!isEditMode && selectedNode && selectedNode.position && (
            <foreignObject x={selectedNode.position.x + 60} y={selectedNode.position.y - 140} width="260" height="160" className="overflow-visible pointer-events-none">
              <div className="bg-slate-900/90 backdrop-blur-xl border border-blue-500/30 p-4 rounded-xl shadow-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-left-4 duration-300 ring-1 ring-white/5">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-blue-500 font-bold uppercase tracking-[0.2em] mb-0.5">Component Identity</span>
                    <span className="text-[11px] font-black text-white uppercase tracking-tight">{selectedNode.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7px] bg-blue-600/20 px-2 py-0.5 rounded-full text-blue-400 border border-blue-500/20 uppercase font-black">{(selectedNode as any).type}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]"></div>
                  </div>
                </div>
                
                <div className="h-px bg-gradient-to-r from-blue-500/50 via-blue-500/10 to-transparent w-full" />
                
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] text-slate-500 uppercase font-black">Transfer Function</span>
                    <span className="text-[7px] text-slate-600 mono">EM-SYSTEM-v4</span>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                    <code className="text-[10px] mono text-blue-300 break-all leading-relaxed">
                      {(selectedNode as any).formula || (selectedNode as any).value || 'Fixed Constant'}
                    </code>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-auto">
                   <div className="flex-1 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500/50 w-full animate-progress-flow"></div>
                   </div>
                   <span className="text-[7px] text-slate-600 uppercase font-bold tracking-widest whitespace-nowrap">Context Active</span>
                </div>
              </div>
            </foreignObject>
          )}
        </g>
      </svg>
      
      <div className="absolute bottom-6 left-6 flex flex-col gap-2 pointer-events-none">
        <div className="flex flex-col gap-1.5 px-4 py-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl">
           <div className="flex items-center gap-3">
             <div className="w-4 h-1 rounded-full bg-emerald-500"></div>
             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Positive Reinforcement (+)</span>
           </div>
           <div className="flex items-center gap-3">
             <div className="w-4 h-1 rounded-full bg-rose-500"></div>
             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Negative Feedback (-)</span>
           </div>
           <div className="flex items-center gap-3 mt-1 pt-1 border-t border-slate-800/50">
             <div className="w-4 h-1 rounded-full bg-blue-500"></div>
             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Material Transfer</span>
           </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl">
           <div className={`w-2 h-2 rounded-full ${isEditMode ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`} />
           <span className="text-[9px] font-black text-white uppercase tracking-widest">{isEditMode ? 'Architecture Layout' : 'Operational Simulator'}</span>
        </div>
      </div>

      <style>{`
        @keyframes progress-flow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress-flow {
          animation: progress-flow 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default FlowGraph;
