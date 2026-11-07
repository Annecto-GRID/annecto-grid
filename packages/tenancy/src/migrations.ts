/**
 * Naming and order of versioned SQL migrations (B-055).
 * File name: `NNNN_description.sql`, numbered from 0001 without gaps.
 * The runner itself (against `grid_system` and every company database) is built in M3.
 */

export interface MigrationFile {
  /** Sequence number, 1, 2, 3 … */
  seq: number;
  /** Description from the file name, e.g. `create_companies`. */
  name: string;
  file: string;
}

const NAME_RE = /^(\d{4})_([a-z0-9]+(?:_[a-z0-9]+)*)\.sql$/;

/** Parses a migration file name. Returns `null` when it does not follow the convention. */
export function parseMigrationName(file: string): MigrationFile | null {
  const m = NAME_RE.exec(file);
  if (!m) return null;
  return { seq: Number(m[1]), name: m[2] as string, file };
}

/**
 * Validates and orders migration files. Throws when a name does not follow the convention,
 * a number is used twice or the sequence has a gap. Files that are not `.sql` are ignored.
 */
export function orderMigrations(files: readonly string[]): MigrationFile[] {
  const out: MigrationFile[] = [];
  for (const f of files) {
    if (!f.endsWith(".sql")) continue;
    const m = parseMigrationName(f);
    if (!m) throw new Error(`Invalid migration file name: ${f} (expected NNNN_description.sql)`);
    out.push(m);
  }
  out.sort((a, b) => a.seq - b.seq);
  out.forEach((m, i) => {
    if (m.seq !== i + 1) {
      const prev = out[i - 1];
      throw new Error(
        prev && prev.seq === m.seq
          ? `Migration number ${m.seq} is used twice: ${prev.file}, ${m.file}`
          : `Migration sequence has a gap before ${m.file} (expected ${String(i + 1).padStart(4, "0")})`,
      );
    }
  });
  return out;
}
