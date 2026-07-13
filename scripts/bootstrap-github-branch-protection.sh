#!/usr/bin/env bash
# Enforce PR management on main: required CI check + PR reviews gate.
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-liqidchaos/tableflow}"
API="https://api.github.com/repos/${REPO}/branches/main/protection"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  # Prefer env token; fall back to git credential helper (PAT).
  cred="$(printf 'protocol=https\nhost=github.com\n\n' | git credential-osxkeychain get 2>/dev/null || true)"
  user="$(printf '%s\n' "$cred" | awk -F= '/^username=/{print $2}')"
  pass="$(printf '%s\n' "$cred" | awk -F= '/^password=/{print $2}')"
  if [[ -z "$pass" ]]; then
    echo "Set GITHUB_TOKEN or configure git credentials for github.com" >&2
    exit 1
  fi
  AUTH=(-u "${user}:${pass}")
else
  AUTH=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
fi

payload='{
  "required_status_checks": {
    "strict": true,
    "contexts": ["test"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}'

curl -sS -X PUT "${AUTH[@]}" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  -d "$payload" \
  "$API" | jq '{url, required_status_checks, enforce_admins, allow_force_pushes}'

echo "Branch protection applied on ${REPO}#main (required check: test)."
