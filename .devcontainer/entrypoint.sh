#!/usr/bin/env bash
set -euo pipefail

# This entrypoint runs as root so it can fix permissions on mounted volumes,
# then drops privileges and runs the actual command as the `node` user.

as_node_test_writable() {
  local path="$1"

  if command -v runuser >/dev/null 2>&1; then
    runuser -u node -- test -w "$path" 2>/dev/null
    return $?
  fi

  # Fallback: `su` exists on Debian images; root -> node does not require a password.
  su node -s /bin/bash -c "test -w \"${path}\"" 2>/dev/null
}

exec_as_node() {
  if command -v runuser >/dev/null 2>&1; then
    exec runuser -u node -- "$@"
  fi

  # Safe-ish quoting for common commands (devcontainers / compose); avoids bash -lc PATH overrides.
  local quoted=""
  for arg in "$@"; do
    quoted+=" $(printf '%q' "$arg")"
  done
  exec su node -s /bin/bash -c "${quoted# }"
}

ensure_writable_as_node() {
  local path="$1"

  mkdir -p "$path"

  # If `node` can't write, fix ownership once.
  if ! as_node_test_writable "$path"; then
    echo "[entrypoint] Fixing ownership for: $path"
    chown -R node:node "$path" || true
  fi
}

ensure_writable_as_node "/app/node_modules"
ensure_writable_as_node "/home/node/.bun"

if [ "$#" -eq 0 ]; then
  set -- sleep infinity
fi

exec_as_node "$@"


