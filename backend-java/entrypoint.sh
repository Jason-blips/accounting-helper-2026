#!/bin/sh
# 若持久化盘上还没有数据库，且镜像里带了种子库，则复制过去（仅首次）
if [ ! -f "${DB_PATH:-/app/data/accounting.db}" ] && [ -f /app/database/accounting.db ]; then
  mkdir -p "$(dirname "${DB_PATH:-/app/data/accounting.db}")"
  cp /app/database/accounting.db "${DB_PATH:-/app/data/accounting.db}"
fi
exec java -jar /app/app.jar
