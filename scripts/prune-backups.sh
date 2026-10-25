#!/usr/bin/env bash
# Keeps the last 30 daily dumps and the last 12 monthly ones.
#
# Retention is done here rather than with a bucket lifecycle rule so that the
# two schedules can differ, and so the decision is visible in the repository.
set -euo pipefail

: "${BACKUP_BUCKET:?BACKUP_BUCKET is not set}"
: "${R2_ENDPOINT:?R2_ENDPOINT is not set}"

prune() {
  local prefix="$1" keep="$2"
  # Newest first; everything past `keep` goes.
  local doomed
  doomed=$(aws s3 ls "s3://$BACKUP_BUCKET/$prefix" --endpoint-url "$R2_ENDPOINT" \
    | awk '{print $4}' | sort -r | tail -n "+$((keep + 1))")

  if [ -z "$doomed" ]; then
    echo "$prefix: nothing to prune (keeping $keep)"
    return
  fi

  while IFS= read -r name; do
    [ -z "$name" ] && continue
    echo "$prefix: removing $name"
    aws s3 rm "s3://$BACKUP_BUCKET/$prefix$name" --endpoint-url "$R2_ENDPOINT"
  done <<< "$doomed"
}

prune "db/daily/" 30
prune "db/monthly/" 12
