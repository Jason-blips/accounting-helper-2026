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

# Default DB path inside container; override with DB_PATH on Render
ENV DB_PATH=/app/data/accounting.db
RUN mkdir -p /app/data

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8000
ENTRYPOINT ["java", "-jar", "app.jar"]
