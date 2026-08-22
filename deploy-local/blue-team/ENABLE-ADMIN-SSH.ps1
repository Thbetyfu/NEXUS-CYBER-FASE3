# Optional OpenSSH for the *owner* laptop (Cursor / admin), not for red team.
# Not the gateway SSH tarpit (that is TCP 2222 inside some compose files).

$ErrorActionPreference = "Stop"
$RuleName = "NexusCyber-Admin-SSH"
$HotspotCidrs = @("192.168.137.0/24", "192.168.2.0/24", "192.168.173.0/24")

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($id)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
    Write-Host "[GAGAL] Jalankan ENABLE-ADMIN-SSH.bat sebagai Administrator." -ForegroundColor Red
    exit 1
}

$allow = @("100.64.0.0/10")
$envPath = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envPath) {
    Get-Content -LiteralPath $envPath | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#") -or $line -notmatch "=") { return }
        $pair = $line.Split("=", 2)
        if ($pair[0].Trim() -eq "NEXUS_ADMIN_SSH_ALLOW" -and $pair[1].Trim()) {
            $allow = @($pair[1].Trim().Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        }
    }
}

Write-Host "Mengaktifkan OpenSSH Server (bukan tarpit Nexus :2222)..." -ForegroundColor Cyan
$cap = Get-WindowsCapability -Online | Where-Object { $_.Name -like "OpenSSH.Server*" } | Select-Object -First 1
if (-not $cap) {
    Write-Host "[GAGAL] Windows tidak menyediakan OpenSSH.Server." -ForegroundColor Red
    exit 1
}
if ($cap.State -ne "Installed") {
    Add-WindowsCapability -Online -Name $cap.Name | Out-Null
}

Start-Service sshd
Set-Service -Name sshd -StartupType Automatic
if (Get-Service ssh-agent -ErrorAction SilentlyContinue) {
    Set-Service -Name ssh-agent -StartupType Manual
}

Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
$defaultSsh = Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -ErrorAction SilentlyContinue
if ($defaultSsh) {
    Disable-NetFirewallRule -Name "OpenSSH-Server-In-TCP"
}

New-NetFirewallRule -DisplayName $RuleName -Direction Inbound -Protocol TCP -LocalPort 22 -Action Allow -RemoteAddress $allow | Out-Null

foreach ($cidr in $HotspotCidrs) {
    $blockName = "$RuleName-BlockHotspot-$($cidr.Replace('/', '-'))"
    Get-NetFirewallRule -DisplayName $blockName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    New-NetFirewallRule -DisplayName $blockName -Direction Inbound -Protocol TCP -LocalPort 22 -Action Block -RemoteAddress $cidr | Out-Null
}

$authKeys = Join-Path $env:USERPROFILE ".ssh\authorized_keys"
Write-Host "[OK] sshd berjalan. Firewall mengizinkan TCP 22 hanya dari: $($allow -join ', ')" -ForegroundColor Green
Write-Host "     Hotspot lab ($($HotspotCidrs -join ', ')) diblokir ke port 22 — red team tidak boleh SSH." -ForegroundColor Yellow
Write-Host "     Tempel kunci publik laptop kerja ke: $authKeys" -ForegroundColor Cyan
Write-Host "     Di Cursor (laptop kerja): Remote-SSH ke IP Tailscale atau Ethernet blue team, user Windows Anda." -ForegroundColor Cyan
Write-Host "     Jangan SSH ke IP hotspot 192.168.137.1 dari kartu red team." -ForegroundColor Yellow
