# ============================================================
# Stage 1: Build
# ============================================================
FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /app

# Copy Maven wrapper and pom first (layer caching for dependencies)
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw

# Download dependencies (cached unless pom.xml changes)
RUN ./mvnw dependency:go-offline -B

# Copy source and build the JAR (skip tests for faster builds)
COPY src/ src/
RUN ./mvnw package -DskipTests -B

# ============================================================
# Stage 2: Extract (exploded JAR for faster class loading)
# ============================================================
FROM eclipse-temurin:21-jre-alpine AS extract

WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Extract the Spring Boot fat JAR into an exploded layout.
# This lets the JVM load classes directly from the filesystem
# instead of unpacking a nested JAR on every cold start (~15s faster).
RUN java -Djarmode=tools -jar app.jar extract --destination app-extracted

# ============================================================
# Stage 3: Runtime (minimal image + exploded layout)
# ============================================================
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy only the extracted (exploded) application
COPY --from=extract /app/app-extracted/ ./

# Render exposes the PORT env var; Spring Boot reads server.port
ENV PORT=10000
EXPOSE 10000

# JVM flags tuned for Render free tier (512MB RAM)
#   -Xmx300m                → hard heap cap
#   -Xss512k                → smaller thread stacks
#   -XX:+UseSerialGC        → low-overhead GC for small heaps
#   -XX:TieredStopAtLevel=1 → faster JIT warmup, less memory
ENTRYPOINT ["sh", "-c", "java -Xmx300m -Xss512k -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Djava.security.egd=file:/dev/./urandom -jar app.jar --server.port=${PORT}"]


