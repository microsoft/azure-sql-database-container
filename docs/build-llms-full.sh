#!/usr/bin/env bash
# Generates docs/llms-full.txt: the concatenated full-text corpus of the agent
# skills and build prompts, for AI agents that want everything in one fetch (the
# machine-readable surface that complements the /llms.txt index). Static file,
# served as-is by GitHub Pages. Regenerate after any skill/prompt content change:
#   bash docs/build-llms-full.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/docs/llms-full.txt"

{
  echo "# Azure SQL Developer: full text for LLMs"
  echo
  echo "The concatenated full text of the agent skills and build prompts. For the"
  echo "index, see https://microsoft.github.io/azure-sql-database-container/llms.txt"
  echo
  echo "The load-bearing facts every skill holds true are in the Accuracy baseline"
  echo "below; each skill repeats them so it stands alone."
  echo
  echo "============================================================"
  echo "## Accuracy baseline"
  echo "============================================================"
  awk '/^## Accuracy baseline/{p=1} p' "$ROOT/skills/README.md"
  echo
  echo "============================================================"
  echo "# Agent skills"
  echo "============================================================"
  for f in "$ROOT"/skills/azuresql-db-*/SKILL.md; do
    echo
    echo "------------------------------------------------------------"
    cat "$f"
    echo
  done
  echo "============================================================"
  echo "# Build prompts"
  echo "============================================================"
  for f in "$ROOT"/docs/prompts/*.md; do
    echo
    echo "------------------------------------------------------------"
    cat "$f"
    echo
  done
} > "$OUT"

echo "wrote $OUT ($(wc -l < "$OUT") lines, $(wc -c < "$OUT") bytes)"
