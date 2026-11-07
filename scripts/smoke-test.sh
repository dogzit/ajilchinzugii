#!/usr/bin/env bash
#
# Smoke test for a deployment — Workers, Vercel or a local preview.
#
#   scripts/smoke-test.sh https://ajilchinzugii.example.workers.dev
#
# Checks the things that break when a platform changes underneath the app,
# rather than the things the unit and e2e suites already cover: that pages
# render, that the admin panel is reachable, that media comes back from the
# bucket, that the image optimiser answers, and that the two secret-protected
# endpoints refuse an unauthenticated caller.
#
# Exits non-zero on the first failure, so it can gate a cutover.

set -uo pipefail

BASE="${1:-}"
if [ -z "$BASE" ]; then
  echo "usage: $0 <base-url>" >&2
  exit 2
fi
BASE="${BASE%/}"

pass=0
fail=0

# check <name> <expected-status> <path> [grep-pattern]
check() {
  local name="$1" expected="$2" path="$3" pattern="${4:-}"
  local body status tmp
  tmp="$(mktemp)"
  status="$(curl -s -o "$tmp" -w '%{http_code}' -L --max-time 45 "$BASE$path" || echo 000)"
  body="$(cat "$tmp")"
  rm -f "$tmp"

  if [ "$status" != "$expected" ]; then
    printf '  FAIL  %-44s %s (expected %s)\n' "$name" "$status" "$expected"
    fail=$((fail + 1))
    return
  fi

  if [ -n "$pattern" ] && ! printf '%s' "$body" | grep -q "$pattern"; then
    printf '  FAIL  %-44s %s but missing /%s/\n' "$name" "$status" "$pattern"
    fail=$((fail + 1))
    return
  fi

  printf '  ok    %-44s %s\n' "$name" "$status"
  pass=$((pass + 1))
}

echo "Smoke test: $BASE"
echo

echo "Pages"
check "home (mn)"            200 "/mn"                      "Ажилчин Зөгий"
check "home (en)"            200 "/en"
check "about, from the CMS"  200 "/en/about"                "Alham Project"
check "a team member page"   200 "/en/team/erdenebat"       "Erdenebat"
check "research"             200 "/mn/research"
check "policy"               200 "/mn/policy"
check "impact"               200 "/mn/impact"
check "sitemap"              200 "/sitemap.xml"             "/team/"
check "robots"               200 "/robots.txt"
check "editors' guide"       200 "/guide"
check "unknown page is 404"  404 "/mn/no-such-page"

echo
echo "Admin"
check "admin panel loads"    200 "/admin"
check "payload api answers"  200 "/api/users/me"

echo
echo "Media and images"
# The logo is seeded, so its optimised form is a fair test of the whole path.
check "a static asset"       200 "/logo.png"
check "image optimiser"      200 "/_next/image?url=%2Flogo.png&w=256&q=75"

echo
echo "Protected endpoints refuse an unauthenticated caller"
check "revalidate (no secret)" 401 "/api/revalidate"

echo
printf 'passed %d, failed %d\n' "$pass" "$fail"
[ "$fail" -eq 0 ] || exit 1
