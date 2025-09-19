# =========================
# TrackIt Multi-Stage Dockerfile
# =========================
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore as distinct layers
COPY TrackIt.csproj ./
RUN dotnet restore TrackIt.csproj

# Copy the remaining source
COPY . .

# Publish (self-contained false, framework-dependent)
RUN dotnet publish TrackIt.csproj -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
# Non-root user optional (commented if permissions issues arise)
# RUN useradd -m appuser && chown -R appuser /app
# USER appuser

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# Copy published output
COPY --from=build /app/publish .

# Health check (adjust path if you add a ping endpoint later)
HEALTHCHECK CMD curl -f http://localhost:8080/swagger/v1/swagger.json || exit 0

ENTRYPOINT ["dotnet", "TrackIt.dll"]
