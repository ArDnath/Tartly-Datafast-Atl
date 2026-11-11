#!/usr/bin/env bash
#
# Apply the `main` ruleset checked in at .github/rulesets/main-protection.json.
#
# Repository rulesets need a public repository, or a paid GitHub plan for a
# private one. A private repository on GitHub Free returns HTTP 403: "Upgrade
# to GitHub Pro or make this repository public to enable this feature."
#
# Usage:
#   bash scripts/apply-branch-protection.sh
#
# Requires: gh (authenticated with admin permission on the repository).
set -Eeuo pipefail

cd "$(dirname "$0")/.."

RULESET_FILE=".github/rulesets/main-protection.json"
RULESET_NAME="main-protection"

command -v gh >/dev/null 2>&1 || {
  echo "error: GitHub CLI (gh) is required" >&2
  exit 1
}
[ -f "$RULESET_FILE" ] || {
  echo "error: missing $RULESET_FILE" >&2
  exit 1
}

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)

if ! EXISTING_ID=$(gh api "repos/$REPO/rulesets" \
  --jq ".[] | select(.name == \"$RULESET_NAME\") | .id" 2>&1); then
  echo "error: cannot read rulesets for $REPO" >&2
  echo "$EXISTING_ID" >&2
  echo "Rulesets need a public repository, or GitHub Pro/Team for a private one." >&2
  exit 1
fi

if [ -n "$EXISTING_ID" ]; then
  echo "Updating ruleset $RULESET_NAME ($EXISTING_ID) on $REPO"
  gh api -X PUT "repos/$REPO/rulesets/$EXISTING_ID" --input "$RULESET_FILE" >/dev/null
else
  echo "Creating ruleset $RULESET_NAME on $REPO"
  gh api -X POST "repos/$REPO/rulesets" --input "$RULESET_FILE" >/dev/null
fi

echo "Active ruleset:"
gh api "repos/$REPO/rulesets" \
  --jq ".[] | select(.name == \"$RULESET_NAME\") | {id, name, enforcement, target}"
