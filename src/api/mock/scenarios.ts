/**
 * Failure injection.
 *
 * Every row of USER-FLOWS §8 is a screen someone has to design and someone has
 * to review. If the only way to see one is to unplug a router at the right
 * moment, it does not get reviewed. Settings → Developer flips these at runtime.
 */
export type Scenario =
  | 'healthy'
  /** No connectivity at send: the phrase is queued, the log appears as pending. */
  | 'offline'
  /** Resolver times out after one silent retry: fall through to search, pre-filled. */
  | 'resolverTimeout'
  /** Model returned nothing usable: plain message, phrase kept, miss logged. */
  | 'nothingParsed'
  /** Daily AI budget spent: stated plainly with a reset time; search still works. */
  | 'quotaExhausted'
  /** Search returns no rows: the exit is custom-food creation, not a dead end. */
  | 'emptySearch'
  /** A brand-new account: every list is in its empty state. */
  | 'firstRun';

type Listener = (s: Scenario) => void;

let current: Scenario = 'healthy';
const listeners = new Set<Listener>();

export const getScenario = (): Scenario => current;

export function setScenario(next: Scenario) {
  current = next;
  listeners.forEach(fn => fn(next));
}

export function onScenarioChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const SCENARIOS: Array<{ id: Scenario; label: string; detail: string }> = [
  { id: 'healthy', label: 'Healthy', detail: 'Everything responds' },
  { id: 'offline', label: 'Offline at send', detail: 'Phrase queues, log shows as pending' },
  { id: 'resolverTimeout', label: 'Resolver times out', detail: 'Falls through to search, pre-filled' },
  { id: 'nothingParsed', label: 'Nothing parsed', detail: 'Plain message, phrase kept' },
  { id: 'quotaExhausted', label: 'Quota exhausted', detail: 'AI stops, search and repeat keep working' },
  { id: 'emptySearch', label: 'No search results', detail: 'Exits into custom-food creation' },
  { id: 'firstRun', label: 'First run', detail: 'Every list empty' },
];

/** Simulated network latency, so skeletons and disabled states are real. */
export const LATENCY = {
  read: 260,
  search: 180,
  /** The two-second wait the composer is designed around. */
  resolve: 1900,
  commit: 420,
} as const;

export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
