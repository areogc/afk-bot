export interface LogEntry {
  timestamp: number;
  message: string;
}

const MAX_ENTRIES = 300;
const entries: LogEntry[] = [];

export function addLog(message: string): void {
  const entry: LogEntry = { timestamp: Date.now(), message };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();
  console.log(`[${new Date(entry.timestamp).toISOString()}] ${message}`);
}

export function getLogs(): LogEntry[] {
  return entries.slice();
}
