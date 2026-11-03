# Spinex website: Next.js app. The production build runs when the container starts, so it can read the
# database (like `npm run live`). A container that restarts keeps its build; a new image builds again.
FROM node:20-bookworm-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "[ -f .next/BUILD_ID ] || npm run build; exec npx next start -p 3000"]
