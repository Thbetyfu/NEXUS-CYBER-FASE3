# Shared Windows Mobile Hotspot helpers for the blue-team lab.

$script:HotspotScriptDir = $PSScriptRoot
$script:NexusFirewallRule = "NexusCyber-deploy-local-WAF"
. (Join-Path $PSScriptRoot "Hosts.ps1")

function Get-NexusLabSettings {
    $ssid = "NEXUS-BLUE-LAB"
    $pass = "NexusBlue1"
    $envPath = Join-Path $script:HotspotScriptDir "..\.env"
    if (Test-Path $envPath) {
        Get-Content -LiteralPath $envPath | ForEach-Object {
            $line = $_.Trim()
            if ($line -eq "" -or $line.StartsWith("#") -or $line -notmatch "=") { return }
            $pair = $line.Split("=", 2)
            $key = $pair[0].Trim()
            $value = $pair[1].Trim()
            if ($key -eq "NEXUS_HOTSPOT_SSID" -and $value) { $ssid = $value }
            if ($key -eq "NEXUS_HOTSPOT_PASS" -and $value) { $pass = $value }
        }
    }
    return [pscustomobject]@{ Ssid = $ssid; Passphrase = $pass; ProtectedHost = (Get-NexusProtectedHost) }
}

function Test-NexusAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($id)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Wait-WinRT {
    param($Operation, [int]$Seconds = 25)
    if ($null -eq $Operation) { return $null }
    $deadline = [datetime]::UtcNow.AddSeconds($Seconds)
    while ($Operation.Status -eq 0) {
        if ([datetime]::UtcNow -gt $deadline) {
            throw "Timeout menunggu API hotspot Windows."
        }
        Start-Sleep -Milliseconds 100
    }
    if ($Operation.Status -ne 1) {
        throw "Operasi hotspot Windows gagal (status $($Operation.Status))."
    }
    try { return $Operation.GetResults() } catch { return $null }
}

function Get-NexusTetheringManager {
    [Windows.Networking.Connectivity.NetworkInformation, Windows.Networking.Connectivity, ContentType = WindowsRuntime] | Out-Null
    [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager, Windows.Networking.NetworkOperators, ContentType = WindowsRuntime] | Out-Null

    $profile = [Windows.Networking.Connectivity.NetworkInformation]::GetInternetConnectionProfile()
    if ($null -eq $profile) {
        throw "Tidak ada koneksi internet yang bisa di-share. Colok Ethernet (disarankan) atau nyalakan hotspot manual di Settings."
    }
    return [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager]::CreateFromConnectionProfile($profile)
}

function Start-NexusMobileHotspot {
    $settings = Get-NexusLabSettings
    Write-Host "[HOTSPOT] SSID lab: $($settings.Ssid)" -ForegroundColor Yellow

    try {
        $mgr = Get-NexusTetheringManager
        $ap = $mgr.GetCurrentAccessPointConfiguration()
        $ap.Ssid = $settings.Ssid
        $ap.Passphrase = $settings.Passphrase
        Wait-WinRT ($mgr.ConfigureAccessPointAsync($ap)) | Out-Null

        # 1 = On
        if ([int]$mgr.TetheringOperationalState -ne 1) {
            $result = Wait-WinRT ($mgr.StartTetheringAsync())
            $status = 0
            if ($result -and $result.PSObject.Properties["Status"]) {
                $status = [int]$result.Status
            }
            if ($status -ne 0) {
                throw "StartTethering status=$status (0 = sukses). Adapter Wi-Fi harus mendukung Mobile Hotspot."
            }
        }
        Write-Host "[OK] Mobile Hotspot Windows menyala." -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[PERINGATAN] Hotspot otomatis gagal: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "            Membuka Settings > Mobile hotspot. Nyalakan tombolnya, SSID/password samakan dengan kartu lab." -ForegroundColor Yellow
        Start-Process "ms-settings:network-mobilehotspot"
        return $false
    }
}

function Stop-NexusMobileHotspot {
    try {
        $mgr = Get-NexusTetheringManager
        if ([int]$mgr.TetheringOperationalState -eq 1) {
            Wait-WinRT ($mgr.StopTetheringAsync()) | Out-Null
            Write-Host "[OK] Mobile Hotspot dimatikan." -ForegroundColor Green
        }
    } catch {
        Write-Host "[i] Hotspot tidak diubah ($($_.Exception.Message))" -ForegroundColor DarkGray
    }
}

function Enable-NexusWafFirewall {
    if (-not (Test-NexusAdmin)) {
        Write-Host "[PERINGATAN] Tanpa Administrator, firewall mungkin menolak laptop red team." -ForegroundColor Yellow
        return
    }
    foreach ($port in @(80, 8080)) {
        netsh advfirewall firewall delete rule name="$script:NexusFirewallRule-$port" 1>$null 2>$null
        netsh advfirewall firewall add rule name="$script:NexusFirewallRule-$port" dir=in action=allow protocol=TCP localport=$port profile=any 1>$null
    }
    Write-Host "[OK] Firewall mengizinkan port 80 dan 8080 (lab)." -ForegroundColor Green
}

function Get-NexusHotspotIPv4 {
    $preferred = @("192.168.137.1", "192.168.2.1", "192.168.173.1")
    foreach ($ip in $preferred) {
        $hit = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -eq $ip }
        if ($hit) { return $ip }
    }

    $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike "127.*" -and
            $_.IPAddress -notlike "169.254.*" -and
            $_.PrefixOrigin -ne "WellKnown"
        } |
        Select-Object -ExpandProperty IPAddress -Unique

    foreach ($ip in $candidates) {
        if ($ip -like "192.168.137.*" -or $ip -like "192.168.2.*" -or $ip -like "192.168.173.*") {
            return $ip
        }
    }
    if ($candidates) { return @($candidates)[0] }
    return $null
}

function Wait-NexusHotspotIPv4 {
    param([int]$Seconds = 20)
    for ($i = 0; $i -lt $Seconds; $i++) {
        $ip = Get-NexusHotspotIPv4
        if ($ip) { return $ip }
        Start-Sleep -Seconds 1
    }
    return $null
}

function Write-NexusBlueCard {
    param(
        [string]$OutputPath,
        [string]$HotspotIp
    )
    $settings = Get-NexusLabSettings
    $url = if ($HotspotIp) { "http://$HotspotIp" } else { "http://<IP-hotspot-blue-team>" }
    $hostsIp = if ($HotspotIp) { $HotspotIp } else { "<IP-hotspot>" }
    $named = "http://$($settings.ProtectedHost)"
    $lines = @(
        "========================================"
        "  KARTU BLUE TEAM  |  Nexus Cyber lab"
        "========================================"
        ""
        "Wi-Fi (hotspot laptop ini)"
        "  Nama (SSID) : $($settings.Ssid)"
        "  Password    : $($settings.Passphrase)"
        ""
        "Red team: join Wi-Fi di atas, lalu double-click JOIN.bat"
        "atau buka di browser:"
        "  $url"
        "  $named   (setelah baris hosts: $hostsIp $($settings.ProtectedHost))"
        ""
        "Jangan tes ke URL Vercel. Pintu yang dilindungi Nexus adalah URL di atas."
        "SOC :8081 / dasbor :3001 tidak dibuka ke hotspot."
        "========================================"
    )
    $text = $lines -join [Environment]::NewLine
    Set-Content -LiteralPath $OutputPath -Value $text -Encoding UTF8
    return $text
}
