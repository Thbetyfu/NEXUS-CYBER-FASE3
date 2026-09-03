# Lab hostname helpers (default PROTECTED_HOST = portfolio; extra tepi via host map).

$script:HostsHelperDir = $PSScriptRoot

function Get-NexusDeployEnvPath {
    $envPath = Join-Path $script:HostsHelperDir "..\.env"
    if (Test-Path $envPath) { return $envPath }
    $example = Join-Path $script:HostsHelperDir "..\.env.example"
    if (Test-Path $example) { return $example }
    return $null
}

function Get-NexusEnvProtectedHostFromFile {
    param([Parameter(Mandatory = $true)][string]$Path)
    $found = $null
    Get-Content -LiteralPath $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#") -or $line -notmatch "=") { return }
        $pair = $line.Split("=", 2)
        if ($pair[0].Trim() -eq "PROTECTED_HOST" -and $pair[1].Trim()) {
            $found = $pair[1].Trim()
        }
    }
    return $found
}

function Get-NexusProtectedHost {
    $name = "portfolio.nexus-lab.test"
    $envPath = Get-NexusDeployEnvPath
    if ($envPath) {
        $fromEnv = Get-NexusEnvProtectedHostFromFile -Path $envPath
        if ($fromEnv) { $name = $fromEnv }
    }
    # Do not read PROTECTED_HOST from channel-starter-upsell.env — tepi adds
    # hosts to nexus-host-map.json instead of replacing portfolio.
    $name = $name -replace '^https?://', ''
    $name = $name.Split("/")[0]
    $name = $name.Split(":")[0]
    return $name.ToLower()
}

function Test-NexusHostsAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($id)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Set-NexusLabHostsEntry {
    param(
        [Parameter(Mandatory = $true)][string]$IP,
        [Parameter(Mandatory = $true)][string]$Name
    )
    if (-not $IP -or -not $Name) { return $false }
    if (-not (Test-NexusHostsAdmin)) { return $false }
    $hostsFile = Join-Path $env:SystemRoot "System32\drivers\etc\hosts"
    $marker = "# nexus-cyber-lab"
    $lines = @()
    if (Test-Path $hostsFile) {
        $lines = @(Get-Content -LiteralPath $hostsFile)
    }
    $kept = $lines | Where-Object { $_ -notmatch "(^|\s)$([regex]::Escape($Name))(\s|$)" }
    $kept += "$IP`t$Name`t$marker"
    try {
        Set-Content -LiteralPath $hostsFile -Value $kept -Encoding ASCII
        return $true
    } catch {
        return $false
    }
}
