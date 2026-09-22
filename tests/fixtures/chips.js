/**
 * tests/fixtures/chips.js — ad-hoc chip objects for __playground.applyChipObject().
 *
 * data/chips.json ships every number null in step 1, so these four objects exercise the chip-driven
 * geometry (docs/CONTRACT.md, "Chip object"). Each fixture carries the state() values it must produce:
 *   dieCount    = die_count
 *   lpddrCount  = lpddr_modules
 *   gpuTiles    = gpu_cores (one tile per core)
 *   fansVisible = chassis !== 'air' (checked at dial 3 so the level-2 fans are not hidden by the dial)
 *   streamSpeed = bandwidth_gbs
 * dieSideMm is asserted only for single-die fixtures: from die_mm2 when set, otherwise the contract
 * fallback dims.SOC.dieSideFromGpuCores(gpu_cores). Multi-die layouts leave the per-die side to the soc lane.
 * Nothing here is a real chip figure; the ids say so.
 */
import { MM, SOC } from '../../src/dims.js';

/** A chips.json-shaped object with every field present, overridden by `over`. */
function chip(over) {
  return {
    id: 'fixture',
    family: 'Fixture',
    tier: 'fixture',
    marketing_name: 'Test fixture (not a real chip)',
    announce_date: null,
    ships_in_macbook: null,
    chassis: null,
    process_node: null,
    transistors_billion: null,
    cpu_cores_total: null,
    cpu_super_cores: null,
    cpu_p_cores: null,
    cpu_e_cores: null,
    gpu_cores: null,
    gpu_neural_accelerators: null,
    neural_engine_cores: null,
    ane_tops: null,
    ane_tops_basis: null,
    memory_options_gb: [],
    bandwidth_gbs: null,
    lpddr_generation: null,
    lpddr_modules: null,
    die_count: null,
    die_mm2: null,
    media_engines: { prores: null, av1_decode: null },
    thunderbolt_version: null,
    macbook_models: [],
    notable_features: [],
    sources: [],
    status: 'placeholder',
    ...over,
  };
}

function fixture(over, dieSideMm = null) {
  const c = chip(over);
  return {
    chip: c,
    expect: {
      dieCount: c.die_count,
      lpddrCount: c.lpddr_modules,
      gpuTiles: c.gpu_cores,
      fansVisible: c.chassis !== 'air',
      streamSpeed: c.bandwidth_gbs,
    },
    dieSideMm,
  };
}

export const FIXTURES = Object.freeze([
  fixture(
    { id: 'fx-air-1die', marketing_name: 'Fixture: air, 1 die, 2 LPDDR, 8 GPU', chassis: 'air', die_count: 1, lpddr_modules: 2, gpu_cores: 8, cpu_super_cores: 4, cpu_e_cores: 4, bandwidth_gbs: 100 },
    SOC.dieSideFromGpuCores(8) / MM,
  ),
  fixture(
    { id: 'fx-2die', marketing_name: 'Fixture: 2 dies, 4 LPDDR, 40 GPU', chassis: 'pro', die_count: 2, lpddr_modules: 4, gpu_cores: 40, cpu_p_cores: 12, cpu_e_cores: 4, bandwidth_gbs: 400 },
  ),
  fixture(
    { id: 'fx-4die', marketing_name: 'Fixture: 4 dies, 8 LPDDR, 80 GPU', chassis: 'pro', die_count: 4, lpddr_modules: 8, gpu_cores: 80, cpu_p_cores: 24, cpu_e_cores: 8, bandwidth_gbs: 800 },
  ),
  fixture(
    { id: 'fx-die150', marketing_name: 'Fixture: die 150 mm², bandwidth 1200', chassis: 'pro', die_count: 1, lpddr_modules: 2, gpu_cores: 10, die_mm2: 150, bandwidth_gbs: 1200 },
    SOC.dieSideFromMm2(150) / MM,
  ),
]);
