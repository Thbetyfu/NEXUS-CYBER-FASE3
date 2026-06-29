#!/bin/bash
# Multi-Tenant container provisioner for Nexus Cyber SaaS
# Usage: ./provisioner.sh <up|down> <domain> <port>

ACTION=$1
DOMAIN=$2
PORT=$3

if [ -z "$ACTION" ] || [ -z "$DOMAIN" ]; then
    echo "Usage: ./provisioner.sh <up|down> <domain> [port]"
    exit 1
fi

# Sanitize domain name to be used as container/folder name
SAFE_NAME=$(echo "$DOMAIN" | tr '.' '-')
COMPOSE_DIR="/tmp/nexus-saas/$SAFE_NAME"
COMPOSE_FILE="$COMPOSE_DIR/docker-compose.yml"

if [ "$ACTION" == "up" ]; then
    if [ -z "$PORT" ]; then
        echo "Error: port required for up action"
        exit 1
    fi

    echo "Provisioning container for $DOMAIN on port $PORT..."
    mkdir -p "$COMPOSE_DIR/html"

    # Create webpage template
    cat <<EOF > "$COMPOSE_DIR/html/index.html"
<!DOCTYPE html>
<html>
<head>
    <title>Nexus Cyber SaaS Target - $DOMAIN</title>
    <style>
        body {
            background: #030712;
            color: #f3f4f6;
            font-family: system-ui, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }
        .card {
            background: #111827;
            border: 1px solid #1f2937;
            border-radius: 12px;
            padding: 32px;
            text-align: center;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
        }
        h1 { color: #10b981; margin-top: 0; }
        p { color: #9ca3af; }
        .badge {
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>Nexus Protected Site</h1>
        <p>This tenant website has been dynamically provisioned by the Nexus SaaS Engine.</p>
        <div style="margin-top: 20px;">
            <span class="badge">SECURED BY NEXUS WAF</span>
        </div>
        <p style="font-size: 11px; color: #4b5563; margin-top: 15px;">Domain: $DOMAIN | Port: $PORT</p>
    </div>
</body>
</html>
EOF

    # Create docker-compose.yml
    cat <<EOF > "$COMPOSE_FILE"
version: '3.8'
services:
  web:
    image: nginx:alpine
    container_name: nexus-tenant-$SAFE_NAME
    ports:
      - "$PORT:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    restart: always
EOF

    # Start the container
    docker compose -f "$COMPOSE_FILE" up -d
    echo "SUCCESS: Container started for $DOMAIN on port $PORT"

elif [ "$ACTION" == "down" ]; then
    echo "Destroying container for $DOMAIN..."
    if [ -f "$COMPOSE_FILE" ]; then
        docker compose -f "$COMPOSE_FILE" down
        rm -rf "$COMPOSE_DIR"
        echo "SUCCESS: Container destroyed for $DOMAIN"
    else
        echo "Warning: No docker-compose found at $COMPOSE_FILE"
    fi
fi
