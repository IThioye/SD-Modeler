
export type NodeType = 'stock' | 'flow' | 'converter';

export interface Position {
  x: number;
  y: number;
}

export interface SDParameter {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  position?: Position
}

export interface SDStock {
  id: string;
  name: string;
  initialValue: string;
  formula: string;
  position?: Position;
}

export interface SDFlow {
  id: string;
  name: string;
  formula: string;
  sourceId?: string; // ID of the stock it flows from
  targetId?: string; // ID of the stock it flows into
  position?: Position;
}

export interface SDConverter {
  id: string;
  name: string;
  formula: string;
  position?: Position;
}

export interface SDLink {
  id: string;
  source: string;
  target: string;
  polarity?: '+' | '-'; // +: Same direction, -: Opposite direction
}

export interface SDModel {
  id: string;
  name: string;
  description: string;
  parameters: SDParameter[];
  stocks: SDStock[];
  flows: SDFlow[];
  converters: SDConverter[];
  links: SDLink[];
  simulationConfig: {
    start: number;
    end: number;
    dt: number;
  };
}

export interface SimulationResult {
  time: number;
  [key: string]: number;
}
