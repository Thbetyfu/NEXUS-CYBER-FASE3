# Shared discovery helpers for the red-team lab (reachability only, no attack payloads).

$script:ProbeScriptDir = $PSScriptRoot

function Get-NexusExpectedSsid {
    $ssid = "NEXUS-BLUE-LAB"
    $envPath = Join-Path $script:ProbeScriptDir "..\.env"
    if (-not (Test-Path $envPath)) {
        $envPath = Join-Path $script:ProbeScriptDir "..\.env.example"
    }
    if (Test-Path $envPath) {
        Get-Content -LiteralPath $envPath | ForEach-Object {
            $line = $_.Trim()
            if ($line -eq "" -or $line.StartsWith("#") -or $line -notmatch "=") { return }
            $pair = $line.Split("=", 2)
            if ($pair[0].Trim() -eq "NEXUS_HOTSPOT_SSID" -and $pair[1].Trim()) {
                $ssid = $pair[1].Trim()
            }
        }
    }
    return $ssid
}

function Get-CurrentWifiSsid {
    $lines = netsh wlan show interfaces 2>$null
    if (-not $lines) { return $null }
    foreach ($line in $lines) {
        if ($line -match "BSSID") { continue }
        if ($line -match "^\s*SSID\s*:\s*(.+)\s*$") {
            return $Matches[1].Trim()
        }
    }
    return $null
}

function Get-DefaultGatewayIPv4 {
    try {
        $route = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction Stop |
            Sort-Object RouteMetric |
            Select-Object -First 1
        if ($route -and $route.NextHop -and $route.NextHop -ne "0.0.0.0") {
            return $route.NextHop
        }
    } catch { }
    return $null
}

function Test-HttpEndpoint {
    param([string]$Url)
    try {
        $req = [System.Net.WebRequest]::Create($Url)
        $req.Method = "GET"
        $req.Timeout = 3000
        $req.AllowAutoRedirect = $true
        $resp = $req.GetResponse()
        $code = [int]$resp.StatusCode
        $resp.Close()
        return $code -gt 0
    } catch {
        $web = $_.Exception.InnerException
        if ($_.Exception.Response) { return $true }
        if ($web -and $web.Response) { return $true }
        $msg = $_.Exception.Message
        if ($msg -match "\(40\d\)|\(50\d\)") { return $true }
        return $false
    }
}

function Find-NexusWafTarget {
    $guesses = New-Object System.Collections.Generic.List[string]
    $gw = Get-DefaultGatewayIPv4
    if ($gw) { $guesses.Add($gw) }
    foreach ($ip in @("192.168.137.1", "192.168.2.1", "192.168.173.1")) {
        if (-not $guesses.Contains($ip)) { $guesses.Add($ip) }
    }

    foreach ($ip in $guesses) {
        foreach ($port in @(80, 8080)) {
            $url = if ($port -eq 80) { "http://$ip" } else { "http://${ip}:${port}" }
            if (Test-HttpEndpoint -Url $url) {
                return [pscustomobject]@{ Ip = $ip; Port = $port; Url = $url }
            }
        }
    }
    return $null
}

function Save-NexusRedTarget {
    param([string]$Path, [string]$Url)
    Set-Content -LiteralPath $Path -Value $Url -Encoding UTF8
}

function Read-NexusRedTarget {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return $null }
    $url = (Get-Content -LiteralPath $Path -Raw).Trim()
    if ($url -match "^https?://") { return $url }
    return $null
}
