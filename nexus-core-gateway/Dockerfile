# Start from Debian-based Go (static binary). Alpine golang tags have
# shipped a 0-byte `/usr/local/go/bin/go` on some Docker Desktop pulls.
FROM golang:1.23-bookworm AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o nexus-gateway ./cmd/gateway

FROM alpine:3.20

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata iptables docker-cli

COPY --from=builder /app/nexus-gateway .

EXPOSE 8080 9090

CMD ["./nexus-gateway"]
