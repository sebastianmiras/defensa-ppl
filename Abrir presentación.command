#!/usr/bin/env bash
set -u

cd -- "$(dirname -- "$0")" || exit 1

PORT=5174
while ! python3 - "$PORT" <<'PY'
import socket
import sys

port = int(sys.argv[1])
with socket.socket() as sock:
    try:
        sock.bind(("127.0.0.1", port))
    except OSError:
        raise SystemExit(1)
PY
do
  PORT=$((PORT + 1))
done

python3 server.py --port "$PORT" &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

URL="http://127.0.0.1:${PORT}/"
for _ in {1..40}; do
  if curl --silent --fail "$URL" >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done

open "$URL"
printf '\nPrograma docente abierto en %s\n' "$URL"
printf 'Mantén esta ventana abierta durante la presentación.\n'
printf 'Pulsa Control+C para cerrar el servidor.\n\n'
wait "$SERVER_PID"
