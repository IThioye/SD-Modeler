
import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { SimulationResult, SDModel } from '../types';

interface Props {
  data: SimulationResult[];
  baseline?: SimulationResult[] | null;
  sensitivityData?: SimulationResult[][] | null;
  model: SDModel;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const SimulationCharts: React.FC<Props> = ({ data, baseline, sensitivityData, model }) => {
  const stockIds = ['chip_inventory', 'finished_ecu_inventory', 'oem_backlog'];
  const indicatorIds = ['oem_trust', 'service_level'];

  if (data.length === 0) return null;

  const renderSeries = (ids: string[], isIndicators: boolean) => {
    return ids.flatMap((id, index) => {
      const color = COLORS[isIndicators ? index + 3 : index];
      const stock = model.stocks.find(s => s.id === id);
      const conv = model.converters.find(c => c.id === id);
      const name = stock?.name || conv?.name || id;
      
      const elements = [
        <Line 
          key={id} 
          type="monotone" 
          dataKey={id} 
          stroke={color} 
          strokeWidth={3} 
          dot={false}
          name={name}
          animationDuration={300}
        />
      ];

      if (baseline) {
        elements.push(
          <Line 
            key={`${id}-baseline`}
            type="monotone"
            data={baseline}
            dataKey={id}
            stroke={color}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            name={`${name} (Ref)`}
            opacity={0.4}
          />
        );
      }

      if (sensitivityData) {
        sensitivityData.forEach((sData, sIndex) => {
          elements.push(
            <Line 
              key={`${id}-stress-${sIndex}`}
              type="monotone"
              data={sData}
              dataKey={id}
              stroke={color}
              strokeWidth={1}
              dot={false}
              opacity={0.08}
              legendType="none"
              name={undefined}
            />
          );
        });
      }

      return elements;
    });
  };

  return (
    <div className="flex flex-col gap-8 w-full min-w-0">
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm min-w-0">
        <h3 className="text-[10px] font-black text-slate-500 mb-6 uppercase tracking-[0.2em] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
            Material Balance (Physical)
          </div>
          {sensitivityData && <span className="text-[8px] animate-pulse text-blue-400 font-bold">Stress Test Active...</span>}
        </h3>
        <div className="h-72 w-full min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                itemStyle={{ fontSize: '11px' }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '20px' }} />
              {renderSeries(stockIds, false)}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm min-w-0">
        <h3 className="text-[10px] font-black text-slate-500 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></div>
          Strategic Health Indicators
        </h3>
        <div className="h-72 w-full min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 1.2]} stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                itemStyle={{ fontSize: '11px' }}
              />
              <Legend verticalAlign="top" align="right" iconType="rect" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '20px' }} />
              {renderSeries(indicatorIds, true)}
              <Line 
                type="monotone" 
                dataKey={() => model.parameters.find(p => p.id === 'failure_threshold')?.value || 0.25} 
                stroke="#ef4444" 
                strokeWidth={1} 
                strokeDasharray="5 5"
                dot={false}
                name="Termination Cliff"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default SimulationCharts;
