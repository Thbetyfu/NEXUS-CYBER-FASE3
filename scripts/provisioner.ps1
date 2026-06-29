param (
    [Parameter(Mandatory=$true)]
    [string]$Action,

    [Parameter(Mandatory=$true)]
    [string]$Domain,

    [int]$Port
)

$SafeName = $Domain.Replace(".", "-")
$TempDir = "$env:TEMP\nexus-saas\$SafeName"
$ComposeFile = "$TempDir\docker-compose.yml"

if ($Action -eq "up") {
    if (-not $Port) {
        Write-Error "Port is required for up action"
        Exit 1
    }

    Write-Host "Provisioning Windows container for $Domain on port $Port..."
    New-Item -ItemType Directory -Path "$TempDir\html" -Force | Out-Null

    $HtmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>Nexus Cyber SaaS Target - $Domain</title>
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
        <p style="font-size: 11px; color: #4b5563; margin-top: 15px;">Domain: $Domain | Port: $Port</p>
    </div>
</body>
</html>
"@

    Set-Content -Path "$TempDir\html\index.html" -Value $HtmlContent

    $ComposeContent = @"
version: '3.8'
services:
  web:
    image: nginx:alpine
    container_name: nexus-tenant-$SafeName
    ports:
      - "$Port:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    restart: always
"@

    Set-Content -Path $ComposeFile -Value $ComposeContent

    # Run docker compose
    $OldLocation = Get-Location
    Set-Location $TempDir
    docker compose up -d
    Set-Location $OldLocation
    Write-Host "SUCCESS: Container started for $Domain on port $Port"

} elseif ($Action -eq "down") {
    Write-Host "Destroying container for $Domain..."
    if (Test-Path $ComposeFile) {
        $OldLocation = Get-Location
        Set-Location $TempDir
        docker compose down
        Set-Location $OldLocation
        Remove-Item -Recurse -Force $TempDir
        Write-Host "SUCCESS: Container destroyed for $Domain"
    } else {
        Write-Warning "No docker-compose found for $Domain"
    }
}
