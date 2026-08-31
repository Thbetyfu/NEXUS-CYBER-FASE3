# Channel Starter lab hosts — one entry per generated subdomain.

$script:ChannelStarterSitesRoot = Join-Path $PSScriptRoot "..\..\channel-starter\sites"
$script:ChannelStarterMarker = "# nexus-channel-starter"

function Get-ChannelStarterHostsRegistryPath {
    $path = Join-Path $script:ChannelStarterSitesRoot "_caddy\hosts-registry.json"
    if (Test-Path -LiteralPath $path) { return $path }
    return $null
}

function Get-ChannelStarterHostEntries {
    $registryPath = Get-ChannelStarterHostsRegistryPath
    if (-not $registryPath) { return @() }

    try {
        $raw = Get-Content -LiteralPath $registryPath -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        return @()
    }

    $names = @()
    foreach ($entry in @($raw.entries)) {
        if ($entry.subdomain) {
            $names += [string]$entry.subdomain
        }
    }
    return $names | Select-Object -Unique
}

function Set-ChannelStarterLabHosts {
    param(
        [Parameter(Mandatory = $true)][string]$IP
    )

    if (-not (Get-Command Test-NexusHostsAdmin -ErrorAction SilentlyContinue)) {
        . (Join-Path $PSScriptRoot "Hosts.ps1")
    }
    if (-not (Test-NexusHostsAdmin)) {
        return @{
            ok = $false
            reason = "admin_required"
            names = @(Get-ChannelStarterHostEntries)
        }
    }

    $names = @(Get-ChannelStarterHostEntries)
    if ($names.Count -eq 0) { return @{ ok = $true; reason = "no_sites"; names = @() } }

    $hostsFile = Join-Path $env:SystemRoot "System32\drivers\etc\hosts"
    $lines = @()
    if (Test-Path -LiteralPath $hostsFile) {
        $lines = @(Get-Content -LiteralPath $hostsFile)
    }

    $kept = $lines | Where-Object { $_ -notmatch [regex]::Escape($script:ChannelStarterMarker) }
    foreach ($name in $names) {
        $kept = $kept | Where-Object { $_ -notmatch "(^|\s)$([regex]::Escape($name))(\s|$)" }
        $kept += "$IP`t$name`t$script:ChannelStarterMarker"
    }

    try {
        Set-Content -LiteralPath $hostsFile -Value $kept -Encoding ASCII
        return @{ ok = $true; reason = "updated"; names = $names }
    } catch {
        return @{ ok = $false; reason = $_.Exception.Message; names = $names }
    }
}

function Write-ChannelStarterAccessLines {
    param([string]$IP = "127.0.0.1")

    $names = @(Get-ChannelStarterHostEntries)
    if ($names.Count -eq 0) {
        Write-Host "  Channel Starter: (belum ada site — jalankan channel-starter/cli.py generate)"
        return
    }

    Write-Host "  Channel Starter ($($names.Count) site, HTTP via hosts):"
    foreach ($name in $names) {
        Write-Host "    http://$name"
    }
}
