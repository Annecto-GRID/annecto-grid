/**
 * Unit tests for Fleet Manager's core logic: 27 tests, one per area of the prototype's core tests
 * (Annecto_Grid_Fleet_Manager_Prototyp_v2, section 3). The expected values describe the prototype's
 * behaviour; the same tests pass against the prototype's original `Core` (see README).
 */

import { describe, expect, it } from "vitest";
import * as Core from "../src/index.ts";
import type { InspectionState, ListItem, ReceivedReport, Vehicle, VehicleEvent } from "../src/index.ts";

const TODAY = "2026-11-07";
const VIN_A = "ZZZ1BUSA000000001";
const VIN_B = "ZZZ1BUSA000000002";
const ORDER = ["sv", "en", "de"];

const report = (x: Partial<ReceivedReport>): ReceivedReport => x as ReceivedReport;
const state = (x: Partial<InspectionState>): InspectionState => x as InspectionState;
const flow = (id: string): Core.FlowDef => Core.FLOW_DEFS.find((f) => f.id === id) as Core.FlowDef;

describe("fleet-core", () => {
  it("01 normalises input and vehicles", () => {
    expect(Core.normText("  Volvo   7900 ")).toBe("Volvo 7900");
    expect(Core.normText("   ")).toBeNull();
    expect(Core.normReg(" exn 101 ")).toBe("EXN101");
    expect(Core.normVin(" zzz1 busa000000001 ")).toBe(VIN_A);
    expect(Core.normAxle("6 × 2")).toBe("6x2");
    expect(Core.normAxle("4*2")).toBe("4x2");
    expect(Core.normNum("1 234,5")).toBe(1234.5);
    expect(Core.normNum("abc")).toBeNaN();
    expect(Core.normNum("")).toBeNull();
    const v = Core.normalizeVehicle({
      fleetNumber: " 101 ",
      regNumber: "exn 101",
      modelYear: "2019",
      info: "  rad  1  ",
    });
    expect(Object.keys(v)).toHaveLength(Core.FIELDS.length);
    expect(v["fleetNumber"]).toBe("101");
    expect(v["regNumber"]).toBe("EXN101");
    expect(v["modelYear"]).toBe(2019);
    expect(v["info"]).toBe("rad  1");
    expect(v["status"]).toBeNull();
  });

  it("02 validates chassis numbers (VIN) and creates UUIDs", () => {
    expect(Core.validVin(VIN_A)).toBe(true);
    expect(Core.validVin("ZZZ1BUSI000000001")).toBe(false);
    expect(Core.validVin("ZZZ1BUSO000000001")).toBe(false);
    expect(Core.validVin("ZZZ1BUSQ000000001")).toBe(false);
    expect(Core.validVin("ZZZ1BUSA00000001")).toBe(false);
    expect(Core.validVin(null)).toBe(false);
    expect(Core.uuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("03 parses wheel formulas", () => {
    expect(Core.parseAxle("4x2")).toEqual({ positions: 4, driven: 2, axles: 2 });
    expect(Core.parseAxle("6X4")).toEqual({ positions: 6, driven: 4, axles: 3 });
    expect(Core.parseAxle("6 × 2")).toEqual({ positions: 6, driven: 2, axles: 3 });
    for (const bad of ["5x2", "4x6", "2x2", "22x2", "4x1", "B4x2", "", null]) {
      expect(Core.parseAxle(bad)).toBeNull();
    }
  });

  it("04 validates vehicle fields", () => {
    const lists: Core.ValidationContext["lists"] = {
      classes: [
        { id: "k1", name: "Buss" },
        { id: "k2", name: "Minibuss" },
      ],
      categories: [{ id: "c1", name: "Stadsbuss", classId: "k1" }],
      depots: [{ id: "d1", name: "Norr" }],
      units: [],
      fuels: [],
      emissions: [],
    };
    const ok = Core.normalizeVehicle({
      status: "in_service",
      fleetNumber: "101",
      regNumber: "EXN101",
      vin: VIN_A,
      classId: "k1",
      categoryId: "c1",
      depotId: "d1",
      modelYear: "2019",
      seats: "40",
      transmission: "automatic",
      axleConfig: "4x2",
      registrationDate: "2019-05-01",
      lastInspection: "2025-05-10",
    });
    expect(Core.validateVehicle(ok, { lists })).toEqual({});

    const bad = Core.normalizeVehicle({
      status: "",
      fleetNumber: " ",
      regNumber: "ÅÄ1",
      manufacturer: "x".repeat(61),
      depotId: "nope",
      modelYear: "2019,5",
      seats: "400",
      transmission: "cvt",
      classId: "k2",
      categoryId: "c1",
      registrationDate: "2020-02-30",
      axleConfig: "5x2",
      vin: "ABC",
    });
    expect(Core.validateVehicle(bad, { lists })).toEqual({
      status: { key: "err.required", params: {} },
      fleetNumber: { key: "err.required", params: {} },
      regNumber: { key: "err.reg", params: {} },
      vin: { key: "err.vin", params: {} },
      manufacturer: { key: "err.tooLong", params: { max: 60 } },
      depotId: { key: "err.unknownItem", params: {} },
      modelYear: { key: "err.integer", params: {} },
      seats: { key: "err.range", params: { min: 0, max: 300 } },
      transmission: { key: "err.unknownItem", params: {} },
      categoryId: { key: "err.categoryClass", params: {} },
      registrationDate: { key: "err.date", params: {} },
      axleConfig: { key: "err.axle", params: {} },
    });

    const early = Core.normalizeVehicle({
      status: "in_service",
      fleetNumber: "102",
      registrationDate: "2020-05-01",
      lastInspection: "2020-04-01",
    });
    expect(Core.validateVehicle(early, {})).toEqual({ lastInspection: { key: "err.inspBeforeReg", params: {} } });
  });

  it("05 rejects duplicate numbers among vehicles that bind them and checks restore", () => {
    const vehicles: Vehicle[] = [
      { id: "a", status: "in_service", fleetNumber: "101", regNumber: "EXN101", vin: VIN_A },
      { id: "b", status: "deregistered", fleetNumber: "102", regNumber: "EXN102" },
      { id: "c", status: "in_service", fleetNumber: "103", regNumber: "EXN103", archived: true },
      { id: "d", status: "in_service", fleetNumber: "A12" },
    ];
    const nv = (x: Record<string, unknown>) => Core.normalizeVehicle(Object.assign({ status: "in_service" }, x));
    expect(Core.validateVehicle(nv({ fleetNumber: "101", regNumber: "EXN101", vin: VIN_A }), { vehicles })).toEqual({
      fleetNumber: { key: "err.dupFleet", params: {} },
      regNumber: { key: "err.dupReg", params: {} },
      vin: { key: "err.dupVin", params: {} },
    });
    expect(Core.validateVehicle(nv({ fleetNumber: "a12" }), { vehicles })).toEqual({
      fleetNumber: { key: "err.dupFleet", params: {} },
    });
    expect(Core.validateVehicle(nv({ fleetNumber: "102", regNumber: "EXN102" }), { vehicles })).toEqual({});
    expect(Core.validateVehicle(nv({ fleetNumber: "103", regNumber: "EXN103" }), { vehicles })).toEqual({});
    expect(
      Core.validateVehicle(nv({ fleetNumber: "101", regNumber: "EXN101", vin: VIN_A }), { id: "a", vehicles }),
    ).toEqual({});
    expect(Core.validateVehicle(nv({ status: "deregistered", fleetNumber: "101" }), { vehicles })).toEqual({});

    const archived: Vehicle = {
      id: "x",
      status: "in_service",
      fleetNumber: "101",
      regNumber: "EXN999",
      vin: VIN_A,
      archived: true,
    };
    expect(Core.restoreConflicts(archived, vehicles, null)).toEqual(["fleetNumber", "vin"]);
    expect(
      Core.restoreConflicts(Object.assign({}, archived, { vin: VIN_B, fleetNumber: "104" }), vehicles, null),
    ).toEqual([]);
    expect(Core.restoreConflicts(Object.assign({}, archived, { status: "deregistered" }), vehicles, null)).toEqual([]);
  });

  it("06 calculates the last inspection day", () => {
    expect(Core.dueDate({ status: "in_service", lastInspection: "2025-05-10" }, null)).toBe("2026-05-31");
    expect(Core.dueDate({ status: "in_service", registrationDate: "2025-03-15" }, null)).toBe("2026-03-15");
    expect(Core.dueDate({ status: "in_service", registrationDate: "2024-02-29" }, null)).toBe("2025-02-28");
    expect(Core.dueDate({ status: "in_service" }, null)).toBeNull();
    for (const status of ["deregistered", "exported", "transferred"]) {
      expect(Core.dueDate({ status, lastInspection: "2025-05-10" }, null)).toBeNull();
    }
    const v: Vehicle = { status: "in_service", categoryId: "c1", lastInspection: "2025-05-10" };
    expect(Core.dueDate(v, { byCategory: { c1: { intervalMonths: 24 } } })).toBe("2027-05-31");
    expect(Core.dueDate(v, { byCategory: { c1: { intervalMonths: "" } } })).toBe("2026-05-31");
    expect(Core.dueDate(v, { endOfMonth: false })).toBe("2026-05-10");
    expect(Core.inspCfg(null, "c1")).toEqual(Core.INSP_DEF);
  });

  it("07 gives warning levels and driving ban", () => {
    const v: Vehicle = { status: "in_service", lastInspection: "2025-05-10" };
    expect(Core.inspState(v, null, "2026-05-01")).toEqual({
      due: "2026-05-31",
      days: 30,
      level: "warn",
      banFrom: "2026-06-01",
      banned: false,
      banInDays: 31,
      alerts: true,
    });
    expect(Core.inspState(v, null, "2026-04-30")?.level).toBe("");
    expect(Core.inspState(v, null, "2026-05-28")?.level).toBe("red");
    expect(Core.inspState(v, null, "2026-05-31")).toMatchObject({ level: "red", banned: false, days: 0 });
    expect(Core.inspState(v, null, "2026-06-01")).toMatchObject({ level: "ban", banned: true, days: -1, banInDays: 0 });
    expect(Core.inspState(v, { banAfterDays: 14 }, "2026-06-10")).toMatchObject({
      level: "red",
      banned: false,
      banFrom: "2026-06-15",
      banInDays: 5,
    });
    expect(Core.inspState({ status: "off_road", lastInspection: "2025-05-10" }, null, "2026-05-01")?.alerts).toBe(
      false,
    );
    expect(Core.inspState({ status: "in_service" }, null, TODAY)).toBeNull();
  });

  it("08 acknowledges warnings up to the acknowledged level", () => {
    const warn = state({ due: "2026-05-31", level: "warn" });
    const red = state({ due: "2026-05-31", level: "red" });
    expect(Core.ackCovers({ due: "2026-05-31", level: "warn" }, warn)).toBe(true);
    expect(Core.ackCovers({ due: "2026-05-31", level: "warn" }, red)).toBe(false);
    expect(Core.ackCovers({ due: "2026-05-31", level: "red" }, warn)).toBe(true);
    expect(Core.ackCovers({ due: "2026-06-30", level: "ban" }, warn)).toBe(false);
    expect(Core.ackCovers({ due: "2026-05-31", level: "ban" }, state({ due: "2026-05-31", level: "" }))).toBe(false);
    expect(Core.ackCovers(null, warn)).toBe(false);
  });

  it("09 validates manual history entries", () => {
    expect(Core.validateNote({ date: TODAY, text: "Byte av däck" }, TODAY)).toEqual({});
    expect(Core.validateNote({ date: "2026-11-08", text: "x" }, TODAY)).toEqual({
      date: { key: "err.future", params: {} },
    });
    expect(Core.validateNote({ date: "2026-13-01", text: "  " }, TODAY)).toEqual({
      date: { key: "err.date", params: {} },
      text: { key: "err.required", params: {} },
    });
    expect(Core.validateNote({ date: "2020-01-01", text: "x".repeat(1001) }, TODAY)).toEqual({
      text: { key: "err.tooLong", params: { max: 1000 } },
    });
  });

  it("10 orders history chronologically with manual entries and records field changes", () => {
    expect(Core.eventDay({ type: "note", eventDate: "2026-10-01", at: "2026-11-06T10:00:00.000Z" })).toBe("2026-10-01");
    expect(Core.eventDay({ type: "updated", at: "2026-11-06T23:30:00.000Z" })).toBe("2026-11-07");
    expect(Core.eventDay({ type: "updated" })).toBe("");
    const events: VehicleEvent[] = [
      { id: "c", type: "created", at: "2026-11-06T10:00:00.000Z" },
      { id: "m1", type: "note", eventDate: "2024-03-01", at: "2026-11-06T12:00:00.000Z" },
      { id: "m2", type: "note", eventDate: "2026-11-06", at: "2026-11-06T09:00:00.000Z" },
      {
        id: "m3",
        type: "note",
        eventDate: "2023-01-01",
        at: "2026-11-06T13:00:00.000Z",
        deleted: { at: "x", by: "y" },
      },
    ];
    expect(Core.sortHistory(events).map((e) => e.id)).toEqual(["m3", "m1", "m2", "c"]);
    expect(Core.sortHistory(Core.visibleHistory(events)).map((e) => e.id)).toEqual(["m1", "m2", "c"]);
    expect(Core.histKey({ id: "x", type: "note" })).toBe("x");
    expect(Core.histKey({ type: "note", at: "T" })).toBe("at:T");

    expect(Core.diff({ fleetNumber: "101", seats: 40 }, { fleetNumber: "101", seats: 42, color: "Röd" })).toEqual([
      { f: "color", from: null, to: "Röd" },
      { f: "seats", from: 40, to: 42 },
    ]);
    expect(Core.diff(null, { fleetNumber: "1" })).toEqual([{ f: "fleetNumber", from: null, to: "1" }]);
    expect(Core.diff({ color: undefined }, { color: null })).toEqual([]);
  });

  it("11 builds history lines with corrections and hidden lines", () => {
    const describe = (e: VehicleEvent) =>
      e.type === "updated"
        ? [
            { id: "depot", text: "Depå ändrad" },
            { id: "status", text: "Status ändrad" },
          ]
        : [{ id: "main", text: String(e["text"] || e.type) }];
    const events: VehicleEvent[] = [
      { id: "c", type: "created", at: "2026-11-06T10:00:00.000Z" },
      {
        id: "u",
        type: "updated",
        at: "2026-11-06T11:00:00.000Z",
        lines: {
          status: { deleted: { at: "2026-11-07T08:00:00.000Z", by: "bo" } },
          depot: { eventDate: "2024-12-31", text: "Depå: Norr → Syd" },
        },
      },
      { id: "n", type: "note", eventDate: "2025-01-01", at: "2026-11-06T12:00:00.000Z", text: "Manuell" },
    ];
    const lines = Core.historyLines(events, describe);
    expect(lines.map((l) => [l.date, l.text, l.edited, l.key, l.lid])).toEqual([
      ["2024-12-31", "Depå: Norr → Syd", true, "u", "depot"],
      ["2025-01-01", "Manuell", false, "n", "main"],
      ["2026-11-06", "created", false, "c", "main"],
    ]);
    const plain = Core.historyLines([{ id: "u", type: "updated", at: "2026-11-06T11:00:00.000Z" }], describe);
    expect(plain.map((l) => l.lid)).toEqual(["depot", "status"]);
    expect(plain.map((l) => l.ord)).toEqual([1, 2]);
  });

  it("12 corrects and deletes system lines without changing the original event", () => {
    const e: VehicleEvent = { id: "u1", type: "updated", at: "2026-11-06T11:00:00.000Z", by: "anna" };
    const e1 = Core.editLine(
      e,
      "depot",
      { text: "Depå: Syd", eventDate: "2026-11-01" },
      "Depå ändrad",
      "2026-11-07T08:00:00.000Z",
      "bo",
    );
    expect(e.lines).toBeUndefined();
    expect(e1.lines?.["depot"]).toEqual({
      editedAt: "2026-11-07T08:00:00.000Z",
      editedBy: "bo",
      prev: [{ eventDate: "2026-11-06", text: "Depå ändrad", at: "2026-11-06T11:00:00.000Z", by: "anna" }],
      eventDate: "2026-11-01",
      text: "Depå: Syd",
    });
    const e2 = Core.editLine(
      e1,
      "depot",
      { text: "Depå ändrad", eventDate: "2026-11-06" },
      "Depå ändrad",
      "2026-11-07T09:00:00.000Z",
      "cy",
    );
    expect(e2.lines?.["depot"]).toEqual({
      editedAt: "2026-11-07T09:00:00.000Z",
      editedBy: "cy",
      prev: [
        { eventDate: "2026-11-06", text: "Depå ändrad", at: "2026-11-06T11:00:00.000Z", by: "anna" },
        { eventDate: "2026-11-01", text: "Depå: Syd", at: "2026-11-07T08:00:00.000Z", by: "bo" },
      ],
    });
    const e3 = Core.editLine(e1, "status", { deleted: true }, "Status ändrad", "2026-11-07T10:00:00.000Z", "bo");
    expect(e3.lines?.["status"]).toEqual({ deleted: { at: "2026-11-07T10:00:00.000Z", by: "bo" } });
    expect(e3.lines?.["depot"]).toEqual(e1.lines?.["depot"]);
  });

  it("13 finds the odometer reading when the vehicle was added", () => {
    const reports = [
      { km: 100.25, applied: true },
      { km: 50, applied: false },
      { km: "20.5", applied: true },
    ];
    expect(Core.addedKm(reports)).toBe(120.8);
    expect(Core.initialOdometer({ initialOdometer: 1000, odometer: 5000 }, [], reports)).toBe(1000);
    const created: VehicleEvent = { type: "created", changes: [{ f: "odometer", from: null, to: 1200 }] };
    expect(Core.initialOdometer({ odometer: 1500 }, [created], reports)).toBe(1200);
    expect(Core.initialOdometer({ odometer: 1500 }, [{ type: "created", changes: [] }], reports)).toBe(1379.2);
    const manual: VehicleEvent = { type: "updated", changes: [{ f: "odometer", from: 1, to: 2 }] };
    expect(Core.initialOdometer({ odometer: 1500 }, [manual], reports)).toBeNull();
    expect(Core.initialOdometer({}, [], [])).toBeNull();
  });

  it("14 blocks sending vehicles and matches master data by name", () => {
    expect(Core.sendBlock(null)).toBe("missing");
    expect(Core.sendBlock({ archived: true })).toBe("archived");
    expect(Core.sendBlock({ status: "transferred" })).toBe("pending");
    expect(Core.sendBlock({ transfer: { state: "pending" } })).toBe("pending");
    expect(Core.sendBlock({ transfer: { state: "rejected" } })).toBe("");
    expect(Core.sendBlock({ status: "in_service" })).toBe("");

    const list: ListItem[] = [
      { id: "d1", name: "Norr", names: { sv: "Norr", en: "North" } },
      { id: "d2", name: "Syd", active: false },
      { id: "d3", name: "Väst" },
    ];
    expect(Core.matchByName({ sv: "norr " }, list)).toBe("d1");
    expect(Core.matchByName({ en: "NORTH" }, list)).toBe("d1");
    expect(Core.matchByName({ de: "Väst" }, list)).toBe("d3");
    expect(Core.matchByName("Syd", list)).toBeNull();
    expect(Core.matchByName({ sv: "Öst" }, list)).toBeNull();
    expect(Core.matchByName({}, list)).toBeNull();
  });

  it("15 validates mileage reports and trips", () => {
    expect(Core.validateTrip({ line: "1", plannedKm: "12,5", status: "run" })).toEqual({});
    expect(Core.validateTrip({ plannedKm: "", status: "run" })).toEqual({
      plannedKm: { key: "err.required", params: {} },
    });
    expect(Core.validateTrip({ plannedKm: "x", status: "run" })).toEqual({
      plannedKm: { key: "err.number", params: {} },
    });
    expect(Core.validateTrip({ plannedKm: 0, status: "run" })).toEqual({
      plannedKm: { key: "err.range", params: { min: 0.1, max: 500 } },
    });
    expect(Core.validateTrip({ plannedKm: 10, status: "aborted" })).toEqual({
      kmBeforeAbort: { key: "err.required", params: {} },
    });
    expect(Core.validateTrip({ plannedKm: 10, status: "aborted", kmBeforeAbort: 11 })).toEqual({
      kmBeforeAbort: { key: "err.range", params: { min: 0, max: 10 } },
    });
    expect(Core.validateTrip({ plannedKm: 10, status: "x", line: "L".repeat(21) })).toEqual({
      line: { key: "err.tooLong", params: { max: 20 } },
      status: { key: "err.required", params: {} },
    });

    const ok = { vehicleId: "v1", blockId: "B12", trafficDay: "2026-11-06", trips: [{ plannedKm: 10, status: "run" }] };
    expect(Core.validateMileage(ok, TODAY)).toEqual({});
    expect(Core.validateMileage({}, TODAY)).toEqual({
      vehicleId: { key: "err.required", params: {} },
      blockId: { key: "err.required", params: {} },
      trafficDay: { key: "err.date", params: {} },
      trips: { key: "err.required", params: {} },
    });
    expect(
      Core.validateMileage(Object.assign({}, ok, { trafficDay: "2026-11-08", blockId: "B".repeat(41) }), TODAY),
    ).toEqual({
      blockId: { key: "err.tooLong", params: { max: 40 } },
      trafficDay: { key: "err.future", params: {} },
    });
    expect(
      Core.validateMileage(
        Object.assign({}, ok, { trips: [{ plannedKm: 1, status: "run" }, { status: "run" }] }),
        TODAY,
      ),
    ).toEqual({
      trips: [{}, { plannedKm: { key: "err.required", params: {} } }],
    });
  });

  it("16 applies km driven: trips, cancelled and aborted trips, replacement", () => {
    const r = {
      vehicleId: "v1",
      blockId: " b12 ",
      trafficDay: "2026-11-06",
      trips: [
        { line: "3", plannedKm: "12,4", status: "run" },
        { line: "3", plannedKm: 10, status: "cancelled" },
        { line: "5", plannedKm: 20, status: "aborted", kmBeforeAbort: "7,5" },
      ],
    };
    const trips = [
      { line: "3", plannedKm: 12.4, status: "run" },
      { line: "3", plannedKm: 10, status: "cancelled" },
      { line: "5", plannedKm: 20, status: "aborted", kmBeforeAbort: 7.5 },
    ];
    expect(Core.reportKm(r)).toBe(19.9);
    expect(Core.mileageKey(r)).toBe("2026-11-06|B12");
    expect(Core.mileageAction({ odometer: 1000 }, r, [])).toEqual({
      key: "2026-11-06|B12",
      km: 19.9,
      trips,
      replaces: false,
      action: "apply",
      from: 1000,
      to: 1019.9,
      delta: 19.9,
    });
    const received = [
      report({
        key: "2026-11-06|B12",
        km: 19.9,
        trips: Core.mileageAction({ odometer: 0 }, r, []).trips,
        applied: true,
      }),
    ];
    expect(Core.mileageAction({ odometer: 1019.9 }, r, received)).toMatchObject({
      action: "skip",
      reason: "duplicate",
      replaces: true,
    });

    const r2 = Object.assign({}, r, {
      trips: [Object.assign({}, r.trips[0], { plannedKm: 15 }), r.trips[1], r.trips[2]],
    });
    expect(Core.mileageAction({ odometer: 1019.9 }, r2, received)).toMatchObject({
      action: "apply",
      replaces: true,
      km: 22.5,
      delta: 2.6,
      from: 1019.9,
      to: 1022.5,
    });
    const notApplied = [report({ key: "2026-11-06|B12", km: 19.9, trips: [], applied: false })];
    expect(Core.mileageAction({ odometer: 1000 }, r2, notApplied)).toMatchObject({
      action: "apply",
      delta: 22.5,
      to: 1022.5,
    });
    expect(Core.mileageAction({ odometer: 1000, archived: true }, r2, [])).toMatchObject({
      action: "skip",
      reason: "archived",
    });
    expect(Core.mileageAction({ odometer: null }, r2, [])).toMatchObject({ action: "skip", reason: "noReading" });
    expect(Core.mileageAction({ odometer: "" }, r2, [])).toMatchObject({ action: "skip", reason: "noReading" });
  });

  it("17 summarises km driven per day", () => {
    const R1 = report({
      trafficDay: "2026-11-05",
      blockId: "10",
      km: 5.5,
      applied: true,
      trips: [
        { line: "10", status: "run", plannedKm: 5.5 },
        { line: "2", status: "cancelled", plannedKm: 3 },
      ],
    });
    const R2 = report({
      trafficDay: "2026-11-05",
      blockId: "2",
      km: 4.6,
      applied: true,
      trips: [{ line: "9", status: "run", plannedKm: 4.6 }],
    });
    const R3 = report({ trafficDay: "2026-11-06", blockId: "1", km: 3, applied: false, trips: [] });
    const R4 = report({
      trafficDay: "2026-11-07",
      blockId: "1",
      km: 2,
      applied: true,
      trips: [{ line: "1", status: "aborted", plannedKm: 4, kmBeforeAbort: 2 }],
    });
    expect(Core.kmPerDay([R1, R2, R3, R4])).toEqual([
      { day: "2026-11-05", km: 10.1, blocks: ["2", "10"], lines: ["9", "10"], reports: [R2, R1] },
      { day: "2026-11-07", km: 2, blocks: ["1"], lines: ["1"], reports: [R4] },
    ]);
    expect(Core.kmPerDay([R1, R2, R3, R4], "2026-11-06").map((d) => d.day)).toEqual(["2026-11-07"]);
    expect(Core.kmPerDay([R1, R2, R3, R4], null, "2026-11-05").map((d) => d.day)).toEqual(["2026-11-05"]);
  });

  it("18 calculates counts and age statistics", () => {
    const list = [{ c: "a" }, { c: "b" }, { c: "a" }, { c: null }, { c: "10" }, { c: "9" }];
    expect(Core.countBy(list, (v) => v.c)).toEqual([
      { key: "a", n: 2 },
      { key: "9", n: 1 },
      { key: "10", n: 1 },
      { key: "b", n: 1 },
      { key: "", n: 1 },
    ]);
    const fleet: Vehicle[] = [
      { modelYear: 2024 },
      { modelYear: 2019 },
      { modelYear: "2010" },
      { modelYear: 2000 },
      { modelYear: null },
      { modelYear: 2027 },
    ];
    expect(Core.ageStats(fleet, TODAY)).toEqual({
      avg: 10.2,
      known: 5,
      groups: [
        { key: "0-4", n: 2 },
        { key: "5-9", n: 1 },
        { key: "10-14", n: 0 },
        { key: "15+", n: 2 },
        { key: "", n: 1 },
      ],
    });
    expect(Core.ageOf({ modelYear: "x" }, TODAY)).toBeNull();
    expect(Core.ageStats([], TODAY)).toMatchObject({ avg: null, known: 0 });
  });

  it("19 summarises inspections and km statistics", () => {
    const states = [
      null,
      state({ level: "", due: "2027-01-31" }),
      state({ level: "warn", due: "2026-12-05" }),
      state({ level: "red", due: "2026-11-08" }),
      state({ level: "ban", due: "2026-10-31" }),
    ];
    expect(Core.inspSummary(states, TODAY, 3)).toEqual({
      ok: 1,
      warn: 1,
      red: 1,
      ban: 1,
      none: 1,
      overdue: 1,
      perMonth: [
        { month: "2026-11", n: 1 },
        { month: "2026-12", n: 1 },
        { month: "2027-01", n: 1 },
      ],
    });
    const byVehicle = {
      v1: [
        report({
          trafficDay: "2026-11-05",
          blockId: "1",
          km: 10,
          applied: true,
          trips: [
            { line: "1", plannedKm: 6, status: "run" },
            { line: "2", plannedKm: 4, status: "run" },
          ],
        }),
      ],
      v2: [
        report({
          trafficDay: "2026-11-07",
          blockId: "2",
          km: 3.5,
          applied: true,
          trips: [
            { line: "2", plannedKm: 5, status: "aborted", kmBeforeAbort: 3.5 },
            { line: "3", plannedKm: 2, status: "cancelled" },
          ],
        }),
        report({
          trafficDay: "2026-11-06",
          blockId: "x",
          km: 9,
          applied: false,
          trips: [{ line: "9", plannedKm: 9, status: "run" }],
        }),
      ],
    };
    expect(Core.kmStats(byVehicle, "2026-11-05", "2026-11-07")).toEqual({
      total: 13.5,
      perDay: [
        { day: "2026-11-05", km: 10 },
        { day: "2026-11-06", km: 0 },
        { day: "2026-11-07", km: 3.5 },
      ],
      avgPerDay: 4.5,
      perVehicle: [
        { id: "v1", km: 10 },
        { id: "v2", km: 3.5 },
      ],
      perLine: [
        { line: "2", km: 7.5 },
        { line: "1", km: 6 },
      ],
    });
    expect(Core.kmStats(byVehicle)).toMatchObject({
      avgPerDay: 6.8,
      perDay: [
        { day: "2026-11-05", km: 10 },
        { day: "2026-11-07", km: 3.5 },
      ],
    });
  });

  it("20 normalises, validates and compares custom fields", () => {
    const defs: Core.CustomFieldDef[] = [
      { id: "t", type: "text" },
      { id: "n", type: "number" },
      { id: "d", type: "date" },
      { id: "b", type: "bool" },
      { id: "l", type: "list", options: [{ id: "o1" }, { id: "o2" }] },
    ];
    expect(Core.normCustom({ type: "text" }, "  a   b ")).toBe("a b");
    expect(Core.normCustom({ type: "number" }, "1,5")).toBe(1.5);
    expect(Core.normCustom({ type: "number" }, "x")).toBeNaN();
    expect(Core.normCustom({ type: "bool" }, "true")).toBe(true);
    expect(Core.normCustom({ type: "bool" }, false)).toBe(false);
    expect(Core.normCustom({ type: "bool" }, "ja")).toBeNull();
    expect(Core.normCustom({ type: "date" }, "2026-01-01")).toBe("2026-01-01");
    expect(Core.normCustom({ type: "list" }, " o1 ")).toBe("o1");
    expect(Core.normCustom({ type: "text" }, " ")).toBeNull();
    expect(Core.validateCustom({ t: "x".repeat(201), n: NaN, d: "2026-02-30", b: true, l: "o3" }, defs)).toEqual({
      "cf:t": { key: "err.tooLong", params: { max: 200 } },
      "cf:n": { key: "err.number", params: {} },
      "cf:d": { key: "err.date", params: {} },
      "cf:l": { key: "err.unknownItem", params: {} },
    });
    expect(Core.validateCustom({ n: 2, l: "o1", t: null }, defs)).toEqual({});
    expect(Core.diffCustom({ t: "a", n: 1 }, { t: "a", n: 2, l: "o1" }, defs)).toEqual([
      { f: "cf:n", from: 1, to: 2 },
      { f: "cf:l", from: null, to: "o1" },
    ]);
    expect(Core.CUSTOM_TYPES).toEqual(["text", "number", "date", "bool", "list", "yesno"]);
  });

  it("21 handles Yes/No/Unknown with alternatives", () => {
    expect(Core.parseYesNo("yes")).toEqual({ a: "yes", opt: null });
    expect(Core.parseYesNo("yes:o1")).toEqual({ a: "yes", opt: "o1" });
    expect(Core.parseYesNo("no")).toEqual({ a: "no", opt: null });
    expect(Core.parseYesNo(null)).toBeNull();
    expect(Core.parseYesNo("maybe")).toBeNull();
    expect(Core.normCustom({ type: "yesno" }, "no:o1")).toBe("no");
    expect(Core.normCustom({ type: "yesno" }, "yes:o2")).toBe("yes:o2");
    expect(Core.normCustom({ type: "yesno" }, "x")).toBeNull();
    const defs: Core.CustomFieldDef[] = [{ id: "y", type: "yesno", options: [{ id: "o1" }] }];
    expect(Core.validateCustom({ y: "yes:o1" }, defs)).toEqual({});
    expect(Core.validateCustom({ y: "no" }, defs)).toEqual({});
    expect(Core.validateCustom({ y: null }, defs)).toEqual({});
    for (const bad of ["yes:o9", "no:o1", "x"]) {
      expect(Core.validateCustom({ y: bad }, defs)).toEqual({ "cf:y": { key: "err.unknownItem", params: {} } });
    }
  });

  it("22 allows Other in lists and places fields in sections and groups", () => {
    const other: Core.CustomFieldDef[] = [{ id: "l", type: "list", allowOther: true, options: [{ id: "o1" }] }];
    expect(Core.validateCustom({ l: "Egen färg" }, other)).toEqual({});
    expect(Core.validateCustom({ l: "x".repeat(201) }, other)).toEqual({
      "cf:l": { key: "err.tooLong", params: { max: 200 } },
    });
    expect(Core.validateCustom({ l: "Egen färg" }, [{ id: "l", type: "list", options: [{ id: "o1" }] }])).toEqual({
      "cf:l": { key: "err.unknownItem", params: {} },
    });
    expect(Core.customSection({ type: "yesno" })).toBe("equip");
    expect(Core.customSection({ type: "bool" })).toBe("equip");
    expect(Core.customSection({ type: "text" })).toBe("tech");
    expect(Core.customSection({ type: "list", section: "equip" })).toBe("equip");
    expect(Core.customSection({ type: "yesno", section: "tech" })).toBe("tech");
    expect(Core.CUSTOM_SECTIONS).toEqual(["tech", "equip"]);
    expect(Core.GROUPS).toHaveLength(9);
    expect(Core.FIELDS.every((f) => Core.GROUPS.indexOf(f.g) >= 0)).toBe(true);
    expect(Core.MODEL_FIELDS).toEqual([
      "length",
      "width",
      "height",
      "axleConfig",
      "doorsFront",
      "doorsMid",
      "doorsRear",
    ]);
  });

  it("23 handles comments on custom fields", () => {
    const defs: Core.CustomFieldDef[] = [
      { id: "a", type: "yesno", allowComment: true },
      { id: "b", type: "text" },
    ];
    expect(Core.normNotes({ a: "  Bra   skick ", b: "ignoreras" }, defs)).toEqual({ a: "Bra skick" });
    expect(Core.normNotes({ a: "  " }, defs)).toEqual({});
    expect(Core.normNotes(null, defs)).toEqual({});
    expect(Core.validateNotes({ a: "x".repeat(201) }, defs)).toEqual({
      "cfn:a": { key: "err.tooLong", params: { max: 200 } },
    });
    expect(Core.validateNotes({ a: "x".repeat(Core.NOTE_MAX) }, defs)).toEqual({});
    expect(Core.diffNotes({ a: "x" }, {}, defs)).toEqual([{ f: "cfn:a", from: "x", to: null }]);
    expect(Core.diffNotes({}, {}, defs)).toEqual([]);
    expect(Core.hasExtra({}, defs)).toBe(false);
    expect(Core.hasExtra({ info: "  " }, defs)).toBe(false);
    expect(Core.hasExtra({ info: "Text" }, defs)).toBe(true);
    expect(Core.hasExtra({ customNotes: { a: "c" } }, defs)).toBe(true);
    expect(Core.hasExtra({ customNotes: { b: "c" } }, defs)).toBe(false);
    expect(Core.hasExtra({ custom: { b: "v" } }, defs)).toBe(true);
    expect(Core.hasExtra({ custom: { b: "" } }, defs)).toBe(false);
    expect(Core.hasExtra({ custom: { b: "v" } }, [{ id: "b", type: "text", active: false }])).toBe(false);
  });

  it("24 suggests and fills the model registry", () => {
    expect(Core.modelKey(" Volvo ", "7900  Electric")).toBe("volvo|7900 electric");
    expect(Core.modelKey("Volvo", "")).toBeNull();
    expect(Core.fillEmpty({ length: 12000, width: null }, { length: 13000, width: 2550, height: 3300 })).toEqual({
      value: { length: 12000, width: 2550, height: 3300 },
      changed: ["width", "height"],
    });
    const models = [{ id: "m1", manufacturer: "Volvo", model: "7900", length: 12000, width: null }];
    expect(Core.findModel(models, "VOLVO", " 7900 ")?.id).toBe("m1");
    expect(
      Core.modelRegistryAction(models, { manufacturer: "volvo", model: "7900", length: 13000, width: 2550 }),
    ).toEqual({
      op: "fill",
      id: "m1",
      data: { id: "m1", manufacturer: "Volvo", model: "7900", length: 12000, width: 2550 },
      changed: ["width"],
    });
    expect(Core.modelRegistryAction(models, { manufacturer: "MAN", model: "Lion's City", length: 12100 })).toEqual({
      op: "create",
      data: {
        manufacturer: "MAN",
        model: "Lion's City",
        length: 12100,
        width: null,
        height: null,
        axleConfig: null,
        doorsFront: null,
        doorsMid: null,
        doorsRear: null,
      },
    });
    expect(Core.modelRegistryAction(models, { manufacturer: "Volvo", model: "7900", length: 1 })).toEqual({ op: null });
    expect(Core.modelRegistryAction(models, { manufacturer: "Volvo" })).toEqual({ op: null });
  });

  it("25 resolves texts and names per language", () => {
    const dicts = { sv: { a: "Hej", b: "Bara svenska", e: "" }, en: { a: "Hi" }, de: {} };
    expect(Core.resolveText("a", "en", dicts, null, ORDER)).toEqual({ text: "Hi", source: "lang", lang: "en" });
    expect(Core.resolveText("b", "de", dicts, null, ORDER)).toEqual({
      text: "Bara svenska",
      source: "fallback",
      lang: "sv",
    });
    expect(Core.resolveText("a", "sv", dicts, { sv: { a: "Hallå" } }, ORDER)).toEqual({
      text: "Hallå",
      source: "override",
      lang: "sv",
    });
    expect(Core.resolveText("a", "sv", dicts, { sv: { a: "  " } }, ORDER)).toEqual({
      text: "Hej",
      source: "lang",
      lang: "sv",
    });
    expect(Core.resolveText("e", "sv", dicts, null, ORDER)).toEqual({ text: "…", source: "missing", lang: null });
    expect(Core.interpolate("Mellan {min} och {max}", { min: 1, max: 5 })).toBe("Mellan 1 och 5");
    expect(Core.interpolate("Högst {max} {x}", { max: 3, x: null })).toBe("Högst 3 ");
    expect(Core.langChain("en", ORDER)).toEqual(["en", "sv", "de"]);
    expect(Core.langChain("de", null)).toEqual(["de", "sv"]);

    const item = { name: "Norr", names: { sv: "Norr", en: "North" } };
    expect(Core.nameOf(item, "en", ORDER)).toBe("North");
    expect(Core.nameOf(item, "de", ORDER)).toBe("Norr");
    expect(Core.nameOf({ name: "X" }, "en", ORDER)).toBe("X");
    expect(Core.nameOf(null, "en", ORDER)).toBe("");
    expect(Core.withNames({ id: "d1" }, { sv: " Norr ", en: " ", de: "Nord" }, ORDER)).toEqual({
      id: "d1",
      name: "Norr",
      names: { sv: "Norr", de: "Nord" },
    });
    expect(Core.withNames({ id: "d1" }, { en: "North" }, ORDER)).toBeNull();
    const list: ListItem[] = [
      { id: "d1", name: "Norr", names: { en: "North" } },
      { id: "d2", name: "Syd" },
    ];
    expect(Core.nameClash(list, { sv: "Väst", en: "north" })).toBe("en");
    expect(Core.nameClash(list, { sv: "Väst", en: "north" }, "d1")).toBeNull();
    expect(Core.nameClash(list, { sv: "syd" })).toBe("sv");
  });

  it("26 calculates contrast and adapts logos", () => {
    expect(Core.luminance("#ffffff")).toBe(1);
    expect(Core.luminance("#000000")).toBe(0);
    expect(Core.luminance("nope")).toBe(1);
    expect(Core.contrast("#000000", "#ffffff")).toBe(21);
    expect(Core.contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
    expect(Core.bestInk("#ffffff")).toBe("#16191d");
    expect(Core.bestInk("#16191d")).toBe("#ffffff");
    expect(Core.bestInk("#1f5fbf")).toBe("#ffffff");

    expect(Core.adaptLogo(null, "#ffffff")).toBeNull();
    expect(Core.adaptLogo({ src: "a", lum: 0.1 }, "#ffffff")).toEqual({ src: "a", tone: null, plate: null });
    expect(Core.adaptLogo({ src: "a", lum: 0.9, alpha: true }, "#ffffff")).toEqual({
      src: "a",
      tone: "dark",
      plate: null,
    });
    expect(Core.adaptLogo({ src: "a", lum: 0.9 }, "#ffffff")).toEqual({ src: "a", tone: null, plate: "#16191d" });
    expect(Core.adaptLogo({ src: "a", lum: 0.05 }, "#16191d")).toEqual({ src: "a", tone: null, plate: "#ffffff" });

    const logos = { light: { src: "L", lum: 0.1 }, dark: { src: "D", lum: 0.9 } };
    expect(Core.pickLogo(logos, "#ffffff")).toEqual({ src: "L", plate: null });
    expect(Core.pickLogo(logos, "#16191d")).toEqual({ src: "D", plate: null });
    expect(Core.pickLogo({ light: { src: "L", lum: 0.05 } }, "#16191d")).toEqual({ src: "L", plate: "#ffffff" });
    expect(Core.pickLogo({}, "#ffffff")).toBeNull();

    const A = { src: "A" };
    const B = { src: "B" };
    const C = { src: "C" };
    expect(Core.brandLogo({ logo: A })).toBe(A);
    expect(Core.brandLogo({ logoDark: B })).toBe(B);
    expect(Core.brandLogo({ logoLight: C, logoDark: B })).toBe(C);
    expect(Core.brandLogo(null)).toBeNull();
  });

  it("27 gives the status of data flows", () => {
    const def = Core.integrationCfg(null);
    expect(def.modules).toEqual({ fleet: true, place: false, planner: false, dispatcher: false, analytics: false });
    expect(def.sources).toEqual({ vehicles: "fleet", places: "place" });
    expect(def.flows["veh-planner"]).toEqual({ enabled: true, mode: "event", intervalMin: 60 });
    expect(def.flows["veh-place"]?.enabled).toBe(false);

    const cfg = {
      modules: { planner: true },
      sources: { places: "external" },
      flows: {
        "veh-planner": { mode: "schedule", intervalMin: 15 },
        "km-fleet": { enabled: false },
        "plc-planner": { intervalMin: 0 },
      },
    };
    expect(Core.integrationCfg(cfg).flows["veh-planner"]).toEqual({ enabled: true, mode: "schedule", intervalMin: 15 });
    expect(Core.integrationCfg(cfg).flows["plc-planner"]?.intervalMin).toBe(60);
    expect(Core.flowStatus(flow("veh-planner"), cfg)).toEqual({
      state: "active",
      reason: null,
      source: { kind: "module", id: "fleet" },
    });
    expect(Core.flowStatus(flow("km-fleet"), cfg)).toMatchObject({ state: "off", reason: "off" });
    expect(Core.flowStatus(flow("plc-planner"), cfg)).toEqual({
      state: "active",
      reason: null,
      source: { kind: "external", id: "places" },
    });
    expect(Core.flowStatus(flow("veh-place"), null)).toMatchObject({ state: "off", reason: "off" });
    expect(Core.flowStatus(flow("veh-disp"), cfg)).toMatchObject({ state: "dormant", reason: "receiverInactive" });
    expect(Core.flowStatus(flow("plan-disp"), cfg)).toMatchObject({
      state: "dormant",
      reason: "receiverInactive",
      source: { kind: "module", id: "planner" },
    });
    expect(Core.flowStatus(flow("plc-planner"), { modules: { planner: true } })).toMatchObject({
      state: "dormant",
      reason: "sourceInactive",
    });
    expect(
      Core.flowStatus(flow("veh-planner"), { modules: { planner: true }, sources: { vehicles: "none" } }),
    ).toMatchObject({
      state: "dormant",
      reason: "noSource",
    });
  });
});
