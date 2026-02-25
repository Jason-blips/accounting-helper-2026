# Build stage: JDK 17 for Maven
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app

# Install Maven (Alpine has no mvn by default); we use the wrapper
RUN apk add --no-cache bash

COPY . .
RUN chmod +x mvnw && ./mvnw clean package -DskipTests -q

# Run stage: JRE 17
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Default DB path; 持久化盘挂载到 /app/data 时使用
ENV DB_PATH=/app/data/accounting.db
RUN mkdir -p /app/data

COPY --from=builder /app/target/*.jar app.jar
# 若需种子库：在 backend-java 下建 database/ 并放入 accounting.db，再取消下一行注释
# COPY database/ /app/database/
COPY entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/app/entrypoint.sh"]
