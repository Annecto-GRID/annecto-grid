/**
 * Modules and data flows per company (B-018).
 *
 * PLATFORM: belongs to the platform (company configuration). Moves to `@annecto-grid/tenancy` in M3.
 */

export interface ModuleDef {
  id: string;
  built?: boolean;
}

export const MODULE_DEFS: readonly ModuleDef[] = [
  { id: "fleet", built: true },
  { id: "place" },
  { id: "planner" },
  { id: "dispatcher" },
  { id: "analytics" },
];

export interface SourceDef {
  modules: string[];
  external: boolean;
  def: string;
}

/** Data sources per data type. `"external"` = external source via the integration layer, `"none"` = none. */
export const SOURCE_DEFS: Readonly<Record<string, SourceDef>> = {
  vehicles: { modules: ["fleet"], external: true, def: "fleet" },
  places: { modules: ["place"], external: true, def: "place" },
};

export interface FlowDef {
  id: string;
  data: string;
  from?: string;
  to: string;
  def: boolean;
}

/** Default flows according to the system architecture. Every receiver subscribes directly to its source. */
export const FLOW_DEFS: readonly FlowDef[] = [
  { id: "veh-place", data: "vehicles", to: "place", def: false },
  { id: "veh-planner", data: "vehicles", to: "planner", def: true },
  { id: "plc-planner", data: "places", to: "planner", def: true },
  { id: "veh-disp", data: "vehicles", to: "dispatcher", def: true },
  { id: "plc-disp", data: "places", to: "dispatcher", def: true },
  { id: "plan-disp", data: "plans", from: "planner", to: "dispatcher", def: true },
  { id: "veh-ana", data: "vehicles", to: "analytics", def: true },
  { id: "plc-ana", data: "places", to: "analytics", def: true },
  { id: "plan-ana", data: "plans", from: "planner", to: "analytics", def: true },
  { id: "ops-ana", data: "operations", from: "dispatcher", to: "analytics", def: true },
  { id: "km-fleet", data: "mileage", from: "dispatcher", to: "fleet", def: true },
];

export interface FlowConfig {
  enabled: boolean;
  mode: "event" | "schedule";
  intervalMin: number;
}

export interface IntegrationConfig {
  modules: Record<string, boolean>;
  sources: Record<string, string>;
  flows: Record<string, FlowConfig>;
}

/** Stored company configuration (possibly partial or from an older version). */
export interface IntegrationSettings {
  modules?: Record<string, unknown>;
  sources?: Record<string, string | undefined>;
  flows?: Record<string, { enabled?: unknown; mode?: unknown; intervalMin?: unknown } | undefined>;
}

/** Complete configuration with defaults for everything not stored. */
export function integrationCfg(cfg: IntegrationSettings | null | undefined): IntegrationConfig {
  const c = cfg || {};
  const out: IntegrationConfig = { modules: {}, sources: {}, flows: {} };
  MODULE_DEFS.forEach((m) => {
    const v = c.modules ? c.modules[m.id] : undefined;
    out.modules[m.id] = typeof v === "boolean" ? v : m.id === "fleet";
  });
  Object.keys(SOURCE_DEFS).forEach((k) => {
    out.sources[k] = (c.sources && c.sources[k]) || (SOURCE_DEFS[k] as SourceDef).def;
  });
  FLOW_DEFS.forEach((f) => {
    const x = (c.flows && c.flows[f.id]) || {};
    out.flows[f.id] = {
      enabled: typeof x.enabled === "boolean" ? x.enabled : f.def,
      mode: x.mode === "schedule" ? "schedule" : "event",
      intervalMin: (x.intervalMin as number) > 0 ? (x.intervalMin as number) : 60,
    };
  });
  return out;
}

export type FlowSource = { kind: "module"; id: string } | { kind: "external"; id: string } | { kind: "none" };

/** Where does the flow's data come from? */
export function flowSource(f: FlowDef, cfg: IntegrationConfig): FlowSource {
  if (f.from) return { kind: "module", id: f.from };
  const s = cfg.sources[f.data];
  if (s === "external") return { kind: "external", id: f.data };
  if (s === "none" || !s) return { kind: "none" };
  return { kind: "module", id: s };
}

export type FlowState = "active" | "off" | "dormant";
export type FlowReason = "off" | "noSource" | "sourceInactive" | "receiverInactive" | null;

/** Status: active, off, or dormant (enabled but the source or receiver is missing) with a reason. */
export function flowStatus(
  f: FlowDef,
  cfgIn: IntegrationSettings | null | undefined,
): { state: FlowState; reason: FlowReason; source: FlowSource } {
  const cfg = integrationCfg(cfgIn);
  const fc = cfg.flows[f.id] as FlowConfig;
  const src = flowSource(f, cfg);
  if (!fc.enabled) return { state: "off", reason: "off", source: src };
  if (src.kind === "none") return { state: "dormant", reason: "noSource", source: src };
  if (src.kind === "module" && !cfg.modules[src.id]) return { state: "dormant", reason: "sourceInactive", source: src };
  if (!cfg.modules[f.to]) return { state: "dormant", reason: "receiverInactive", source: src };
  return { state: "active", reason: null, source: src };
}
