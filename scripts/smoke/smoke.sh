#!/usr/bin/env bash
# Smoke test en caliente del API LizCo. Requiere curl + node.
# Variables:
#   API=http://localhost:4000   (base URL del API)
#   LIZCO_API_REQUEST_PUBKEY_JWK=...  (clave pública para emitir JWE; o PUBKEY_FILE)
#
# Ejemplo:
#   LIZCO_API_REQUEST_PUBKEY_FILE=.jwe-pub.json API=http://localhost:4000 bash scripts/smoke/smoke.sh

set -euo pipefail

# Git Bash (MSYS) convierte argumentos /v1/... en rutas de Windows, lo que
# rompe la verificación path-bound del JWE. Excluir solo ese prefijo deja
# intacta la conversión de /dev/null.
export MSYS2_ARG_CONV_EXCL="${MSYS2_ARG_CONV_EXCL:-/v1}"
: "${API:?set API base url, e.g. http://localhost:4000}"

MINT() { node scripts/smoke/mint.mjs "$@"; }
PASS() { printf '\033[32m PASS: %s\033[0m\n' "$1"; }
FAIL() { printf '\033[31m FAIL: %s\033[0m\n' "$1"; exit 1; }

echo '== 1. /health (exento del guard) =='
body=$(curl -fsS "$API/health" || true)
echo "   $body"
printf '%s' "$body" | grep -q '"status":"ok"' && PASS health || FAIL health

echo '== 2. GET /v1/catalog/packages SIN token (debe 401) =='
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/v1/catalog/packages")
[[ "$code" == "401" ]] && PASS "rejects missing token ($code)" || FAIL "expected 401 got $code"

echo '== 3. GET /v1/catalog/packages CON token válido =='
TOK=$(MINT GET /v1/catalog/packages)
res=$(curl -fsS -H "X-LizCo-Request-Token: $TOK" "$API/v1/catalog/packages" || true)
echo "   $res" | head -c 200; echo
printf '%s' "$res" | grep -q '"items"' && PASS "catalog read" || FAIL "catalog read"

echo '== 4. POST /v1/contact con bodyHash inválido (mint sin body, envío con body) =='
TOK=$(MINT POST /v1/contact)
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
  -H "Content-Type: application/json" -H "X-LizCo-Request-Token: $TOK" \
  -d '{"name":"x","email":"x@x.co","subject":"info","message":"y"}' \
  "$API/v1/contact")
[[ "$code" == "401" ]] && PASS "rejects body tamper ($code)" || FAIL "expected 401 got $code"

echo '== 5. POST /v1/contact correcto =='
PAYLOAD='{"name":"Smoke","email":"smoke@lizco.local","subject":"info","message":"hello"}'
TOK=$(MINT POST /v1/contact "$PAYLOAD")
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Content-Type: application/json" \
  -H "X-LizCo-Request-Token: $TOK" -d "$PAYLOAD" "$API/v1/contact")
[[ "$code" == "200" || "$code" == "201" ]] && PASS "contact ok ($code)" || FAIL "contact expected 2xx got $code"

echo '== 6. Replay del mismo token (debe 401) =='
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Content-Type: application/json" \
  -H "X-LizCo-Request-Token: $TOK" -d "$PAYLOAD" "$API/v1/contact")
[[ "$code" == "401" ]] && PASS "rejects replay ($code)" || FAIL "expected 401 got $code"

echo '== 7. method mismatch (firma GET, envío POST) =='
TOK=$(MINT GET /v1/contact)
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Content-Type: application/json" \
  -H "X-LizCo-Request-Token: $TOK" -d '{}' "$API/v1/contact")
[[ "$code" == "401" ]] && PASS "rejects method mismatch ($code)" || FAIL "expected 401 got $code"

echo '== 8. path mismatch (firma /v1/contact, llamo /v1/newsletter) =='
TOK=$(MINT POST /v1/contact "$PAYLOAD")
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Content-Type: application/json" \
  -H "X-LizCo-Request-Token: $TOK" -d '{"email":"a@a.co"}' "$API/v1/newsletter")
[[ "$code" == "401" ]] && PASS "rejects path mismatch ($code)" || FAIL "expected 401 got $code"

echo '== 9. GET /v1/catalog/destinations CON token =='
TOK=$(MINT GET /v1/catalog/destinations)
res=$(curl -fsS -H "X-LizCo-Request-Token: $TOK" "$API/v1/catalog/destinations" || true)
printf '%s' "$res" | grep -q '"items"' && PASS "catalog destinations" || FAIL "catalog destinations"

echo '== 10. GET /v1/catalog/blogs CON token =='
TOK=$(MINT GET /v1/catalog/blogs)
res=$(curl -fsS -H "X-LizCo-Request-Token: $TOK" "$API/v1/catalog/blogs" || true)
printf '%s' "$res" | grep -q '"items"' && PASS "catalog blogs" || FAIL "catalog blogs"

echo '== 11. GET /v1/booking/quote — precio exacto del tarifario (Modelo B) =='
TOK=$(MINT GET /v1/booking/quote)
res=$(curl -fsS -H "X-LizCo-Request-Token: $TOK"   "$API/v1/booking/quote?packageSlug=santa-marta-colombia&date=2026-08-21&hotelId=b1000002-0000-0000-0000-000000000001&occupancy=multiple&adults=1" || true)
echo "   $res" | head -c 200; echo
printf '%s' "$res" | grep -q '"perAdultUsd":455' && PASS "quote tarifario (455 USD)" || FAIL "quote tarifario"

echo ''
printf '\033[32m PASS all smoke checks\033[0m\n'
