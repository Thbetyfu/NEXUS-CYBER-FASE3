# Start from golang 1.22 alpine base
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install git for downloading dependencies
RUN apk add --no-cache git

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download all dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the Go app
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/gateway

# Start a new smaller stage
FROM alpine:3.20

WORKDIR /app

# Add runtime certificates, timezone data, and iptables utilities for the local gateway container
RUN apk --no-cache add ca-certificates tzdata iptables docker-cli

# Copy the Pre-built binary file from the previous stage
COPY --from=builder /app/main .

# Expose port 8080 and 9090
EXPOSE 8080 9090

# Run the executable
CMD ["./main"]
