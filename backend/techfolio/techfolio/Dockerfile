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
# Stage 2: Runtime (minimal image)
# ============================================================
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy only the built JAR from the build stage
COPY --from=build /app/target/*.jar app.jar

# Render exposes the PORT env var; Spring Boot reads server.port
ENV PORT=10000
EXPOSE 10000

# JVM flags tuned for Render free tier (512MB RAM)
#   -Xmx300m        → hard heap cap
#   -Xss512k        → smaller thread stacks
#   -XX:+UseSerialGC → low-overhead GC for small heaps
ENTRYPOINT ["java", \
  "-Xmx300m", \
  "-Xss512k", \
  "-XX:+UseSerialGC", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar", \
  "--server.port=${PORT}"]
