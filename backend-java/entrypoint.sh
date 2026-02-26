#!/bin/sh
# 确保数据库所在目录存在（持久化盘挂载路径可能尚未有该目录）
DB_FILE="${DB_PATH:-/app/data/accounting.db}"
mkdir -p "$(dirname "$DB_FILE")"
# 若持久化盘上还没有数据库，且镜像里带了种子库，则复制过去（仅首次）
if [ ! -f "$DB_FILE" ] && [ -f /app/database/accounting.db ]; then
  cp /app/database/accounting.db "$DB_FILE"
fi
exec java -jar /app/app.jar
