/**
 * measurement-records.ts
 * P2.2 — Final measurement capture and post-measurement revision linkage.
 */

/* ============================================================
   Types
   ============================================================ */

export interface MeasuredWall {
  wallId: string;
  measuredLength: number;   // mm
  notes?: string;
}

export interface MeasuredOpening {
  wall: string;
  type: "door" | "window" | "vent";
  width: number;            // mm
  height: number;           // mm
  position?: string;
}

export interface MeasurementRecord {
  measurementId: string;
  projectId: string;
  revisionId?: string;      // linked to post-measurement revision
  measuredBy: string;
  measuredAt: string;
  measuredWalls: MeasuredWall[];
  measuredOpenings: MeasuredOpening[];
  measuredCeilingHeight: number;   // mm
  notes?: string;
  deviations: MeasurementDeviation[];
}

export interface MeasurementDeviation {
  fieldPath: string;        // "walls[0].length", "ceilingHeight"
  briefingValue: number;
  measuredValue: number;
  deviationMm: number;
  severity: "minor" | "significant" | "critical";
  notes?: string;
}

/* ============================================================
   Storage
   ============================================================ */

const records = new Map<string, MeasurementRecord>();

/* ============================================================
   Measurement Capture
   ============================================================ */

export function captureMeasurement(
  projectId: string,
  data: {
    measuredBy: string;
    walls: MeasuredWall[];
    openings?: MeasuredOpening[];
    ceilingHeight: number;
    notes?: string;
  },
  briefingWalls?: Array<{ id: string; length_m: number }>,
  briefingCeilingHeight?: number,
): MeasurementRecord {
  const measurementId = `msr-${projectId}-${Date.now()}`;

  // Detect deviations from briefing
  const deviations: MeasurementDeviation[] = [];

  if (briefingWalls) {
    for (const mw of data.walls) {
      const bw = briefingWalls.find(w => w.id === mw.wallId);
      if (bw) {
        const briefingMm = Math.round(bw.length_m * 1000);
        const dev = Math.abs(mw.measuredLength - briefingMm);
        if (dev > 5) {
          deviations.push({
            fieldPath: `walls.${mw.wallId}.length`,
            briefingValue: briefingMm,
            measuredValue: mw.measuredLength,
            deviationMm: dev,
            severity: dev > 50 ? "critical" : dev > 20 ? "significant" : "minor",
            notes: `Parede ${mw.wallId}: briefing ${briefingMm}mm vs medido ${mw.measuredLength}mm (±${dev}mm)`,
          });
        }
      }
    }
  }

  if (briefingCeilingHeight) {
    const briefingMm = Math.round(briefingCeilingHeight * 1000);
    const dev = Math.abs(data.ceilingHeight - briefingMm);
    if (dev > 5) {
      deviations.push({
        fieldPath: "ceilingHeight",
        briefingValue: briefingMm,
        measuredValue: data.ceilingHeight,
        deviationMm: dev,
        severity: dev > 30 ? "critical" : dev > 15 ? "significant" : "minor",
      });
    }
  }

  const record: MeasurementRecord = {
    measurementId,
    projectId,
    measuredBy: data.measuredBy,
    measuredAt: new Date().toISOString(),
    measuredWalls: data.walls,
    measuredOpenings: data.openings || [],
    measuredCeilingHeight: data.ceilingHeight,
    notes: data.notes,
    deviations,
  };

  records.set(measurementId, record);
  return record;
}

/** Link measurement to a post-measurement revision */
export function linkMeasurementToRevision(measurementId: string, revisionId: string): boolean {
  const record = records.get(measurementId);
  if (!record) return false;
  record.revisionId = revisionId;
  return true;
}

/** Get measurement by project */
export function getMeasurementByProject(projectId: string): MeasurementRecord | null {
  for (const [, record] of records) {
    if (record.projectId === projectId) return record;
  }
  return null;
}

/** Get measurement by ID */
export function getMeasurement(measurementId: string): MeasurementRecord | null {
  return records.get(measurementId) || null;
}

/** Check if measurement has critical deviations */
export function hasCriticalDeviations(record: MeasurementRecord): boolean {
  return record.deviations.some(d => d.severity === "critical");
}
