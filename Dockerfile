# ---- Build Stage ----
# Use an official Node.js runtime as the base image
FROM node:24-alpine AS build

# Set the working directory in the container
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml to the working directory
COPY package.json pnpm-lock.yaml ./

# Install project dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application source code to the working directory
COPY . .

# Build the Next.js application for production (static export)
RUN pnpm build

# ---- Production Stage ----
# Use the official Caddy image for a lean production server
FROM caddy:2-alpine

# Copy the built static files from the build stage to Caddy's webroot
COPY --from=build /app/out /usr/share/caddy

# Copy the Caddyfile configuration
COPY Caddyfile /etc/caddy/Caddyfile

# Format the Caddyfile
RUN caddy fmt --overwrite /etc/caddy/Caddyfile

# Expose the port Caddy will listen on
EXPOSE 8080