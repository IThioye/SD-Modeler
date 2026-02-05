
import { SDModel, SimulationResult } from './types';

export interface SimulationOutput {
  results: SimulationResult[];
  isStable: boolean;
  error?: string;
}

/**
 * Robust mathematical expression evaluator with safety checks.
 */
function evaluateFormula(formula: string, scope: Record<string, number>, quiet = false): number {
  try {
    const keys = Object.keys(scope);
    const values = Object.values(scope);
    
    const helpers = {
      min: Math.min,
      max: Math.max,
      clamp: (min: number, max: number, val: number) => Math.min(Math.max(val, min), max),
      abs: Math.abs,
      round: Math.round,
      sqrt: Math.sqrt,
      pow: Math.pow,
      exp: Math.exp,
      log: Math.log,
      sin: Math.sin,
      cos: Math.cos,
    };
    
    const helperKeys = Object.keys(helpers);
    const helperValues = Object.values(helpers);

    const fn = new Function(...keys, ...helperKeys, `"use strict"; return (${formula});`);
    const result = fn(...values, ...helperValues);
    
    return typeof result === 'number' && !isNaN(result) ? result : 0;
  } catch (e) {
    if (!quiet) console.warn(`Eval Error: ${formula}`);
    return 0;
  }
}

/**
 * Executes a single simulation run with optional parameter perturbations.
 */
export function runSimulation(model: SDModel, perturbations: Record<string, number> = {}): SimulationOutput {
  const { start, end, dt } = model.simulationConfig;
  const results: SimulationResult[] = [];
  let isStable = true;

  let currentScope: SimulationResult = { time: start };
  
  // 1. Initialize with perturbations for sensitivity analysis
  model.parameters.forEach(p => {
    const factor = perturbations[p.id] || 1;
    currentScope[p.id] = p.value * factor;
  });

  model.stocks.forEach(s => {
    currentScope[s.id] = evaluateFormula(s.initialValue, currentScope);
  });

  // 2. Main Loop
  for (let t = start; t <= end; t += dt) {
    currentScope.time = t;

    // Resolve dependencies via multi-pass evaluation
    for (let pass = 0; pass < 3; pass++) {
      model.converters.forEach(c => {
        currentScope[c.id] = evaluateFormula(c.formula, currentScope, pass < 2);
      });
      model.flows.forEach(f => {
        currentScope[f.id] = evaluateFormula(f.formula, currentScope, pass < 2);
      });
    }

    results.push({ ...currentScope });

    // 3. Update Stocks & Watch for Divergence
    const nextScope: SimulationResult = { ...currentScope };
    for (const s of model.stocks) {
      const netChangeRate = evaluateFormula(s.formula, currentScope);
      const nextValue = (currentScope[s.id] || 0) + netChangeRate * dt;
      
      // Safety threshold for numerical stability
      if (!Number.isFinite(nextValue) || Math.abs(nextValue) > 1e12) {
        return { results, isStable: false, error: "Numerical instability detected. Check feedback gains." };
      }
      nextScope[s.id] = Math.max(0, nextValue);
    }
    
    currentScope = nextScope;
  }

  return { results, isStable: true };
}

/**
 * Runs a batch of simulations for sensitivity analysis.
 */
export function runBatchSimulation(model: SDModel, count: number = 10): SimulationResult[][] {
  const batch: SimulationResult[][] = [];
  for (let i = 0; i < count; i++) {
    const perturbations: Record<string, number> = {};
    model.parameters.forEach(p => {
      // Apply ±5% random variance to simulate parameter uncertainty
      perturbations[p.id] = 1 + (Math.random() * 0.1 - 0.05);
    });
    const run = runSimulation(model, perturbations);
    if (run.isStable) batch.push(run.results);
  }
  return batch;
}
