const cwd = "/home/ovehe/projects/VS Projects/TEEI/TEEI_CSR_Platform";
const baseProcess = {
  script: "pnpm",
  cwd,
  interpreter: "none",
  watch: false,
  autorestart: true,
  max_restarts: 3,
  min_uptime: 180000,
  restart_delay: 20000,
  exp_backoff_restart_delay: 5000,
  kill_timeout: 30000,
  listen_timeout: 120000,
  log_date_format: "YYYY-MM-DD HH:mm:ss Z",
};
const services = [
  { name: "csr-api-gateway", filter: "@teei/api-gateway", port: 6501, memory: "750M" },
  { name: "csr-unified-profile", filter: "@teei/unified-profile", port: 6502, memory: "750M" },
  { name: "csr-kintell-connector", filter: "@teei/kintell-connector", port: 6503, memory: "512M" },
  { name: "csr-buddy-service", filter: "@teei/buddy-service", port: 6504, memory: "512M" },
  { name: "csr-buddy-connector", filter: "@teei/buddy-connector", port: 6505, memory: "512M" },
  { name: "csr-upskilling-connector", filter: "@teei/upskilling-connector", port: 6506, memory: "512M" },
  { name: "csr-q2q-ai", filter: "@teei/q2q-ai", port: 6507, memory: "1G" },
  { name: "csr-safety-moderation", filter: "@teei/safety-moderation", port: 6508, memory: "750M" },
  { name: "csr-corp-cockpit", filter: "@teei/corp-cockpit-astro", port: 6509, memory: "2G", extraArgs: ["--", "--host", "0.0.0.0", "--port", "6509"] },
];
module.exports = {
  apps: services.map((svc) => ({
    ...baseProcess,
    name: svc.name,
    args: ["--filter", svc.filter, "dev", ...(svc.extraArgs || [])],
    max_memory_restart: svc.memory,
    error_file: "./logs/" + svc.name + "-error.log",
    out_file: "./logs/" + svc.name + "-out.log",
    merge_logs: true,
    env: { NODE_ENV: "development", ...(svc.port ? { PORT: svc.port } : {}), ...(svc.env || {}) },
  })),
};
