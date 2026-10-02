interface StatusResponse {
  connected: boolean;
  username: string;
  host: string;
  port: number;
  startTime: number;
  lastActivity: number;
  reconnectAttempts: number;
}

interface LogEntry {
  timestamp: number;
  message: string;
}

const statusEl = document.getElementById("status") as HTMLDivElement;
const logsEl = document.getElementById("logs") as HTMLDivElement;

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function renderStatus(status: StatusResponse): void {
  const uptime = formatDuration(Date.now() - status.startTime);
  const dotClass = status.connected ? "online" : "offline";
  const label = status.connected ? "Connected" : "Disconnected";

  statusEl.innerHTML = `
    <div class="badge"><span class="dot ${dotClass}"></span>${label}</div>
    <div class="row"><span>Username</span><span>${status.username}</span></div>
    <div class="row"><span>Server</span><span>${status.host}:${status.port}</span></div>
    <div class="row"><span>Uptime</span><span>${uptime}</span></div>
    <div class="row"><span>Reconnects</span><span>${status.reconnectAttempts}</span></div>
  `;
}

function renderLogs(logs: LogEntry[]): void {
  logsEl.innerHTML = logs
    .slice()
    .reverse()
    .map((entry) => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      return `<div class="log-line">[${time}] ${entry.message}</div>`;
    })
    .join("");
}

async function refresh(): Promise<void> {
  try {
    const [statusRes, logsRes] = await Promise.all([
      fetch("/api/status"),
      fetch("/api/logs"),
    ]);
    renderStatus(await statusRes.json());
    renderLogs(await logsRes.json());
  } catch {
    statusEl.innerHTML = `<div class="badge"><span class="dot offline"></span>Unreachable</div>`;
  }
}

refresh();
setInterval(refresh, 5000);
