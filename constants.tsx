
import { SDModel } from './types';

export const INITIAL_MODEL: SDModel = {
  id: 'euromotion-feedback-v4',
  name: 'Euromotion: Strategic Resilience Simulator',
  description:
    'A high-fidelity feedback model mapping the interplay between semiconductor lead-time panic, working capital constraints, and the impact of geopolitical supply shocks.',
  parameters: [
    { id: 'oem_base_demand', name: 'OEM Market Demand', value: 1000, min: 200, max: 2000, step: 50, unit: 'units/mo', position: { x: 950, y: 50 } },
    { id: 'chip_lead_time', name: 'Supplier Lead Time', value: 6, min: 1, max: 24, step: 1, unit: 'months', position: { x: 425, y: 50 } },
    { id: 'panic_sensitivity', name: 'Panic Ordering Weight', value: 0.5, min: 0, max: 1.5, step: 0.1, unit: 'factor', position: { x: 250, y: 50 } },
    { id: 'safety_stock_target', name: 'Base Safety Months', value: 2.0, min: 1, max: 12, step: 1, unit: 'months', position: { x: 100, y: 50 } },
    { id: 'working_capital_limit', name: 'Working Capital Cap', value: 150000, min: 50000, max: 500000, step: 10000, unit: '€', position: { x: 100, y: 650 } },
    { id: 'chip_unit_cost', name: 'Chip Unit Price', value: 45, min: 5, max: 250, step: 5, unit: '€', position: { x: 250, y: 650 } },
    { id: 'trust_erosion_rate', name: 'Trust Erosion Speed', value: 0.4, min: 0, max: 1, step: 0.05, unit: 'rate', position: { x: 1100, y: 650 } },
    { id: 'trust_recovery_rate', name: 'Trust Recovery Speed', value: 0.05, min: 0.01, max: 0.2, step: 0.01, unit: 'rate', position: { x: 800, y: 650 } },
    { id: 'failure_threshold', name: 'Termination Threshold', value: 0.25, min: 0.1, max: 0.5, step: 0.05, unit: 'trust', position: { x: 1100, y: 150 } },
    { id: 'max_assembly_capacity', name: 'Assembly Throughput', value: 1200, min: 500, max: 2000, step: 100, unit: 'units/mo', position: { x: 425, y: 200 } },
    // NEW RISK PARAMETERS
    { id: 'supplier_reliability', name: 'Supplier Reliability', value: 0.95, min: 0.5, max: 1.0, step: 0.01, unit: 'score', position: { x: 425, y: 650 } },
    { id: 'geopolitical_risk', name: 'Geopolitical Risk Index', value: 0.1, min: 0.0, max: 1.0, step: 0.05, unit: 'index', position: { x: 575, y: 650 } }
  ],

  stocks: [
    {
      id: 'chip_inventory',
      name: 'Physical Chip Stock',
      initialValue: '2000',
      formula: 'chip_replenishment - ecu_production',
      position: { x: 250, y: 350 }
    },
    {
      id: 'finished_ecu_inventory',
      name: 'Finished Goods',
      initialValue: '500',
      formula: 'ecu_production - ecu_shipment',
      position: { x: 600, y: 350 }
    },
    {
      id: 'oem_backlog',
      name: 'Unfulfilled Backlog',
      initialValue: '0',
      formula: 'oem_order_rate - ecu_shipment',
      position: { x: 600, y: 550 }
    },
    {
      id: 'oem_trust',
      name: 'Reputational Trust',
      initialValue: '1.0',
      formula: 'trust_recovery - trust_erosion',
      position: { x: 950, y: 550 }
    }
  ],

  flows: [
    {
      id: 'chip_replenishment',
      name: 'Procurement Flow',
      formula: '(max(0, (dynamic_target_stock - chip_inventory) / chip_lead_time)) * finance_intervention_gate * disruption_factor',
      targetId: 'chip_inventory',
      position: { x: 100, y: 350 }
    },
    {
      id: 'ecu_production',
      name: 'Assembly Rate',
      formula: 'min(chip_inventory, max_assembly_capacity)',
      sourceId: 'chip_inventory',
      targetId: 'finished_ecu_inventory',
      position: { x: 425, y: 350 }
    },
    {
      id: 'ecu_shipment',
      name: 'Delivery Rate',
      formula: 'min(finished_ecu_inventory, oem_order_rate + (oem_backlog * 0.5))',
      sourceId: 'finished_ecu_inventory',
      position: { x: 775, y: 350 }
    },
    {
      id: 'trust_recovery',
      name: 'Trust Recovery',
      formula: 'trust_recovery_rate * (1 - oem_trust)',
      targetId: 'oem_trust',
      position: { x: 820, y: 550 }
    },
    {
      id: 'trust_erosion',
      name: 'Trust Erosion',
      formula: 'max(0, 1 - service_level) * trust_erosion_rate * oem_trust',
      sourceId: 'oem_trust',
      position: { x: 1080, y: 550 }
    }
  ],

  converters: [
    {
      id: 'disruption_factor',
      name: 'Supply Disruption Shock',
      formula: '(sin(time * 0.4) > 0.8 ? (1 - geopolitical_risk) : 1) * supplier_reliability',
      position: { x: 100, y: 250 }
    },
    {
      id: 'panic_factor',
      name: 'Lead-Time Panic',
      formula: '1 + ((chip_lead_time / 12) * panic_sensitivity)',
      position: { x: 250, y: 150 }
    },
    {
      id: 'dynamic_target_stock',
      name: 'Inflated Target Stock',
      formula: 'oem_order_rate * safety_stock_target * panic_factor',
      position: { x: 100, y: 150 }
    },
    {
      id: 'chip_inventory_value',
      name: 'Total Tied Capital',
      formula: 'chip_inventory * chip_unit_cost',
      position: { x: 250, y: 520 }
    },
    {
      id: 'finance_intervention_gate',
      name: 'Finance Order Gate',
      formula: '(chip_inventory_value > working_capital_limit ? 0.1 : 1.0)',
      position: { x: 100, y: 520 }
    },
    {
      id: 'service_level',
      name: 'Delivery Performance',
      formula: 'ecu_shipment / max(1, oem_order_rate)',
      position: { x: 950, y: 350 }
    },
    {
      id: 'oem_order_rate',
      name: 'Active OEM Orders',
      formula: 'oem_base_demand * oem_trust * (oem_trust > failure_threshold ? 1 : 0)',
      position: { x: 950, y: 150 }
    }
  ],

  links: [
    { id: 'l1', source: 'chip_lead_time', target: 'panic_factor', polarity: '+' },
    { id: 'l2', source: 'panic_sensitivity', target: 'panic_factor', polarity: '+' },
    { id: 'l3', source: 'panic_factor', target: 'dynamic_target_stock', polarity: '+' },
    { id: 'l4', source: 'oem_order_rate', target: 'dynamic_target_stock', polarity: '+' },
    { id: 'l5', source: 'dynamic_target_stock', target: 'chip_replenishment', polarity: '+' },
    { id: 'l6', source: 'chip_inventory', target: 'chip_inventory_value', polarity: '+' },
    { id: 'l7', source: 'chip_unit_cost', target: 'chip_inventory_value', polarity: '+' },
    { id: 'l8', source: 'chip_inventory_value', target: 'finance_intervention_gate', polarity: '-' },
    { id: 'l9', source: 'working_capital_limit', target: 'finance_intervention_gate', polarity: '+' },
    { id: 'l10', source: 'finance_intervention_gate', target: 'chip_replenishment', polarity: '+' },
    { id: 'l11', source: 'ecu_shipment', target: 'service_level', polarity: '+' },
    { id: 'l12', source: 'service_level', target: 'trust_erosion', polarity: '-' },
    { id: 'l13', source: 'oem_trust', target: 'oem_order_rate', polarity: '+' },
    { id: 'l14', source: 'failure_threshold', target: 'oem_order_rate', polarity: '-' },
    { id: 'l15', source: 'max_assembly_capacity', target: 'ecu_production', polarity: '+' },
    { id: 'l16', source: 'oem_order_rate', target: 'oem_backlog', polarity: '+' },
    { id: 'l17', source: 'safety_stock_target', target: 'dynamic_target_stock', polarity: '+' },
    { id: 'l18', source: 'oem_base_demand', target: 'oem_order_rate', polarity: '+' },
    { id: 'l19', source: 'trust_recovery_rate', target: 'trust_recovery', polarity: '+' },
    { id: 'l20', source: 'trust_erosion_rate', target: 'trust_erosion', polarity: '+' },
    { id: 'l21', source: 'chip_lead_time', target: 'chip_replenishment', polarity: '-' },
    { id: 'l22', source: 'chip_inventory', target: 'chip_replenishment', polarity: '-' },
    // NEW RISK LINKS
    { id: 'l23', source: 'geopolitical_risk', target: 'disruption_factor', polarity: '-' },
    { id: 'l24', source: 'supplier_reliability', target: 'disruption_factor', polarity: '+' },
    { id: 'l25', source: 'disruption_factor', target: 'chip_replenishment', polarity: '+' }
  ],

  simulationConfig: {
    start: 0,
    end: 60,
    dt: 0.5
  }
};
