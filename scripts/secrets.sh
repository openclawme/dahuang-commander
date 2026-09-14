#!/bin/bash
# 小程序上传密钥加密/解密工具（AES-256-CBC + PBKDF2）
# 口令存放：环境变量 SECRETS_PASSPHRASE 优先，否则读 /home/admin/Gemini/.secrets-passphrase.txt
# 用法：
#   bash scripts/secrets.sh lock    # 加密 private.*.key → secrets/mp-key.enc
#   bash scripts/secrets.sh unlock  # 解密 secrets/mp-key.enc → dahuang-commander-mp/private.*.key
set -euo pipefail

PASS_FILE=/home/admin/Gemini/.secrets-passphrase.txt
PASS="${SECRETS_PASSPHRASE:-}"
if [ -z "$PASS" ] && [ -f "$PASS_FILE" ]; then PASS=$(cat "$PASS_FILE"); fi
if [ -z "$PASS" ]; then
  echo "找不到口令：请设置 SECRETS_PASSPHRASE 环境变量，或创建 $PASS_FILE" >&2
  exit 1
fi

KEY=dahuang-commander-mp/private.wx6ac4406ed64d11ed.key

case "${1:-}" in
  lock)
    openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -in "$KEY" -out secrets/mp-key.enc -pass pass:"$PASS"
    echo "✅ 上传密钥已加密为 secrets/mp-key.enc，记得 git commit 并 push"
    ;;
  unlock)
    if [ ! -f secrets/mp-key.enc ]; then echo "找不到 secrets/mp-key.enc" >&2; exit 1; fi
    openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -salt -in secrets/mp-key.enc -out "$KEY" -pass pass:"$PASS"
    chmod 600 "$KEY"
    echo "✅ 上传密钥已恢复到 $KEY（权限 600）"
    ;;
  *)
    echo "用法: bash scripts/secrets.sh {lock|unlock}" >&2
    exit 1
    ;;
esac
