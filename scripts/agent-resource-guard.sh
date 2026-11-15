#!/usr/bin/env bash
# Lightweight resource watchdog for autonomous build sessions.
# Samples every 15s; writes one line per sample to /tmp/opencode.
# Warns when the machine is close to swapping or CPU-saturated.
set -u

LOG_DIR="${TMPDIR:-/tmp}/opencode"
LOG="$LOG_DIR/revenuelens-resources.log"
mkdir -p "$LOG_DIR"

MEM_WARN_MB="${MEM_WARN_MB:-700}"
LOAD_WARN="${LOAD_WARN:-10}"

mem_available_mb() {
  awk '/^MemAvailable:/ {printf "%d", $2/1024}' /proc/meminfo
}

swap_used_mb() {
  awk '/^SwapTotal:/ {t=$2} /^SwapFree:/ {f=$2} END {printf "%d", (t-f)/1024}' /proc/meminfo
}

top_rss() {
  ps -eo rss,comm --sort=-rss --no-headers | head -3 |
    awk '{printf "%s:%dMB ", $2, $1/1024}'
}

while true; do
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  avail=$(mem_available_mb)
  swap=$(swap_used_mb)
  load1=$(cut -d' ' -f1 /proc/loadavg)
  procs=$(ps -eo comm --no-headers | wc -l)
  printf '%s avail=%sMB swap_used=%sMB load1=%s procs=%s top=[%s]\n' \
    "$ts" "$avail" "$swap" "$load1" "$procs" "$(top_rss)" >>"$LOG"
  if [ "$avail" -lt "$MEM_WARN_MB" ]; then
    printf '%s ALERT low-memory avail=%sMB\n' "$ts" "$avail" >>"$LOG"
  fi
  awk -v l="$load1" -v w="$LOAD_WARN" 'BEGIN{exit !(l>w)}' &&
    printf '%s ALERT high-load load1=%s\n' "$ts" "$load1" >>"$LOG"
  tail -n 2000 "$LOG" >"$LOG.tmp" && mv "$LOG.tmp" "$LOG"
  sleep 15
done
