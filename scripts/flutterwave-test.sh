#!/usr/bin/env bash
set -euo pipefail

# Flutterwave local API test helper
# Requires a running app (e.g. npm run dev) and a real checkout_id in your DB.

BASE_URL="${BASE_URL:-http://localhost:5173}"
CHECKOUT_ID="${CHECKOUT_ID:-}"
AMOUNT="${AMOUNT:-1000}"
CURRENCY="${CURRENCY:-RWF}"
PAYER_NAME="${PAYER_NAME:-Test User}"
PAYER_EMAIL="${PAYER_EMAIL:-test@example.com}"
PHONE="${PHONE:-250788123456}"
TX_REF="${TX_REF:-}"
TRANSACTION_ID="${TRANSACTION_ID:-}"
WEBHOOK_HASH="${FLW_WEBHOOK_SECRET_HASH:-}"

usage() {
  cat <<EOF
Usage:
  CHECKOUT_ID=<uuid> ./scripts/flutterwave-test.sh init
  CHECKOUT_ID=<uuid> TX_REF=<tx_ref> ./scripts/flutterwave-test.sh verify
  CHECKOUT_ID=<uuid> TRANSACTION_ID=<id> ./scripts/flutterwave-test.sh verify
  CHECKOUT_ID=<uuid> TX_REF=<tx_ref> FLW_WEBHOOK_SECRET_HASH=<hash> ./scripts/flutterwave-test.sh webhook

Optional env:
  BASE_URL (default: http://localhost:5173)
  AMOUNT, CURRENCY, PAYER_NAME, PAYER_EMAIL, PHONE

Notes:
  - 'init' returns a Flutterwave checkout link.
  - 'verify' needs TX_REF or TRANSACTION_ID from Flutterwave callback/response.
  - 'webhook' should use a real TX_REF from a transaction; server re-verifies against Flutterwave.
EOF
}

require_checkout() {
  if [[ -z "$CHECKOUT_ID" ]]; then
    echo "❌ CHECKOUT_ID is required"
    exit 1
  fi
}

cmd_init() {
  require_checkout
  echo "➡️ Initializing card payment for checkout: $CHECKOUT_ID"
  curl -sS -X POST "$BASE_URL/api/flutterwave-create-payment" \
    -H "Content-Type: application/json" \
    -d "{\"checkoutId\":\"$CHECKOUT_ID\",\"amount\":$AMOUNT,\"currency\":\"$CURRENCY\",\"payerName\":\"$PAYER_NAME\",\"payerEmail\":\"$PAYER_EMAIL\",\"phoneNumber\":\"$PHONE\",\"description\":\"Local Flutterwave test\"}" | cat
  echo
}

cmd_verify() {
  require_checkout
  if [[ -z "$TX_REF" && -z "$TRANSACTION_ID" ]]; then
    echo "❌ TX_REF or TRANSACTION_ID is required for verify"
    exit 1
  fi

  local url="$BASE_URL/api/flutterwave-verify-payment?checkoutId=$CHECKOUT_ID"
  if [[ -n "$TX_REF" ]]; then
    url+="&tx_ref=$TX_REF"
  fi
  if [[ -n "$TRANSACTION_ID" ]]; then
    url+="&transaction_id=$TRANSACTION_ID"
  fi

  echo "➡️ Verifying payment: $url"
  curl -sS "$url" | cat
  echo
}

cmd_webhook() {
  require_checkout
  if [[ -z "$TX_REF" ]]; then
    echo "❌ TX_REF is required for webhook simulation"
    exit 1
  fi

  echo "➡️ Posting webhook simulation for tx_ref: $TX_REF"
  local header=( -H "Content-Type: application/json" )
  if [[ -n "$WEBHOOK_HASH" ]]; then
    header+=( -H "verif-hash: $WEBHOOK_HASH" )
  fi

  curl -sS -X POST "$BASE_URL/api/flutterwave-webhook" \
    "${header[@]}" \
    -d "{\"event\":\"charge.completed\",\"data\":{\"tx_ref\":\"$TX_REF\",\"meta\":{\"checkout_id\":\"$CHECKOUT_ID\"}}}" | cat
  echo
}

main() {
  local cmd="${1:-}"
  case "$cmd" in
    init) cmd_init ;;
    verify) cmd_verify ;;
    webhook) cmd_webhook ;;
    ""|help|-h|--help) usage ;;
    *)
      echo "❌ Unknown command: $cmd"
      usage
      exit 1
      ;;
  esac
}

main "$@"
