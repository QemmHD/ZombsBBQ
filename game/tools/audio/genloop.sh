#!/bin/bash
# Keep retrying generation while the CLI's daily quota is in force: one candidate per target first,
# then a second, then a third. Stops when everything is generated or after MAX_MIN minutes.
cd "$(dirname "$0")/.."
MAX_MIN=${MAX_MIN:-330}
start=$(date +%s)
while true; do
  for per in 1 2 3; do
    python -I tools/gen.py generate --jobs 2 --max-per $per 2>> gen.log
    rc=$?
    echo "$(date -u +%H:%M) pass max-per=$per rc=$rc wavs=$(ls gen/*/*.wav 2>/dev/null | wc -l)" >> genloop.log
    [ $rc -eq 2 ] && break
  done
  [ $rc -eq 0 ] && { echo "done" >> genloop.log; exit 0; }
  now=$(date +%s); [ $(( (now - start) / 60 )) -ge $MAX_MIN ] && { echo "gave up (time)" >> genloop.log; exit 1; }
  sleep 900
done
