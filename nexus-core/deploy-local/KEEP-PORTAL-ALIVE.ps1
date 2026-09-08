# Channel Portal keep-alive (Windows): Next.js :3003 + Cloudflare *quick* tunnel only.
# Idempotent: skip start if GET http://127.0.0.1:3003/gate is 200; skip new cloudflared
# if a :3003 tunnel process already exists. Never tunnels :3001 / :8081 / :11434.
# Quick tunnel hostname is NOT permanent (no Cloudflare DNS zone on this account).
# Scheduled task: -InstallTask  (name NexusPortalKeepAlive)

param(
    [switch]$InstallTask,
    [switch]$UninstallTask,
    [switch]$Quiet
)

$ErrorActionPreference = "Continue"
$TaskName = "NexusPortalKeepAlive"
$PortalPort = 3003
$TunnelOrigin = "http://127.0.0.1:$PortalPort"

$DeployLocal = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $DeployLocal "..\..")).Path
$GaasWeb = Join-Path $RepoRoot "nexus-gaas-web"
$UrlFile = Join-Path $DeployLocal "PORTAL-TUNNEL-URL.txt"
$CfLogOut = Join-Path $DeployLocal "PORTAL-TUNNEL-cloudflared.out.log"
$CfLogErr = Join-Path $DeployLocal "PORTAL-TUNNEL-cloudflared.err.log"
$TaskXmlPath = Join-Path $DeployLocal "NexusPortalKeepAlive.task.xml"

function Write-Info([string]$Msg) {
    if (-not $Quiet) { Write-Host $Msg }
}

function Test-LocalGateOk {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$PortalPort/gate" -UseBasicParsing -TimeoutSec 8
        return ($r.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Get-PortalCloudflared {
    Get-CimInstance Win32_Process -Filter "Name = 'cloudflared.exe'" -ErrorAction SilentlyContinue |
        Where-Object {
            $cl = $_.CommandLine
            if ([string]::IsNullOrWhiteSpace($cl)) { return $false }
            if ($cl -match "127\.0\.0\.1:3001|localhost:3001|127\.0\.0\.1:8081|localhost:8081|:11434") {
                return $false
            }
            return ($cl -match "127\.0\.0\.1:$PortalPort" -or $cl -match "localhost:$PortalPort")
        }
}

function Read-SavedTunnelUrl {
    if (-not (Test-Path -LiteralPath $UrlFile)) { return $null }
    $text = Get-Content -LiteralPath $UrlFile -Raw -ErrorAction SilentlyContinue
    if ($text -match "https://[a-z0-9-]+\.trycloudflare\.com") {
        return $Matches[0].TrimEnd("/")
    }
    return $null
}

function Test-PublicGateOk([string]$BaseUrl) {
    if ([string]::IsNullOrWhiteSpace($BaseUrl)) { return $false }
    $u = $BaseUrl.TrimEnd("/") + "/gate"
    try {
        $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 15
        return ($r.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Write-TunnelUrlFile([string]$BaseUrl, [string]$Note) {
    $gate = if ($BaseUrl) { "$($BaseUrl.TrimEnd('/'))/gate" } else { "(none yet)" }
    $primary = if ($BaseUrl) { $BaseUrl.TrimEnd("/") } else { "" }
    $lines = @(
        $primary
        ""
        "# Nexus Channel Portal  - Cloudflare quick tunnel (NOT WAF, NOT SOC, NOT :11434)"
        "# Written by KEEP-PORTAL-ALIVE.ps1  $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        "# $Note"
        "# Quick hostname is NOT permanent. Named tunnel needs a Cloudflare DNS zone (buy/add domain later)."
        "# 524 on public URL = hung Node on :3003. NXDOMAIN = trycloudflare name gone (cloudflared recreated or dropped)."
        "# Live:"
        "#   $gate"
        "# Local: http://127.0.0.1:3003/gate    Operator: http://127.0.0.1:3003/operator/topup"
    )
    Set-Content -LiteralPath $UrlFile -Value ($lines -join "`r`n") -Encoding UTF8
}

function Install-KeepAliveTask {
    $ps1 = Join-Path $DeployLocal "KEEP-PORTAL-ALIVE.ps1"
    $xml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Nexus Channel Portal keep-alive: Next :3003 + cloudflared quick tunnel to 127.0.0.1:3003 only. Never SOC :3001/:8081 or Ollama :11434.</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <Delay>PT20S</Delay>
    </LogonTrigger>
    <CalendarTrigger>
      <Repetition>
        <Interval>PT5M</Interval>
        <Duration>P1D</Duration>
        <StopAtDurationEnd>false</StopAtDurationEnd>
      </Repetition>
      <StartBoundary>2026-09-08T00:00:00</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>3</Count>
    </RestartOnFailure>
    <StartWhenAvailable>true</StartWhenAvailable>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT8M</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>powershell.exe</Command>
      <Arguments>-NoProfile -ExecutionPolicy Bypass -File "$ps1" -Quiet</Arguments>
      <WorkingDirectory>$DeployLocal</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
"@
    Set-Content -LiteralPath $TaskXmlPath -Value $xml -Encoding Unicode
    $out = schtasks /Create /TN $TaskName /XML $TaskXmlPath /F 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Scheduled task '$TaskName' (logon + every 5 min, IgnoreNew, restart on failure x3)."
        Write-Host "     Does not kill an already-live tunnel."
        return $true
    }
    Write-Host "[!] Could not register task (often UAC). Run as the logged-in owner:"
    Write-Host "    schtasks /Create /TN $TaskName /XML `"$TaskXmlPath`" /F"
    Write-Host "    or: schtasks /Create /TN $TaskName /SC ONLOGON /RL LIMITED /F /TR `"powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ps1 -Quiet`""
    Write-Host $out
    return $false
}

function Uninstall-KeepAliveTask {
    schtasks /Delete /TN $TaskName /F 2>&1 | Out-Host
}

function Ensure-PortalNode {
    if (Test-LocalGateOk) {
        Write-Info "[OK] Channel Portal GET /gate 200 on 0.0.0.0:$PortalPort  - not starting a second copy."
        return $true
    }
    $listen = netstat -ano 2>$null | Select-String ":$PortalPort\s+.*LISTENING"
    if ($listen) {
        Write-Info "[!] Port $PortalPort is listening but GET /gate is not 200 (hung Node → public 524). Not starting a second copy."
        return $false
    }
    if (-not (Test-Path -LiteralPath (Join-Path $GaasWeb "package.json"))) {
        Write-Info "[ERROR] Missing $GaasWeb"
        return $false
    }
    Write-Info "[START] npm run dev -H 0.0.0.0 -p $PortalPort"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory $GaasWeb -WindowStyle Minimized
    for ($i = 0; $i -lt 36; $i++) {
        Start-Sleep -Seconds 5
        if (Test-LocalGateOk) {
            Write-Info "[OK] Portal GET /gate 200 after start."
            return $true
        }
    }
    Write-Info "[!] Portal did not become GET /gate 200 within ~3 min."
    return $false
}

function Find-Cloudflared {
    $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $guess = @(
        "$env:USERPROFILE\bin\cloudflared.exe",
        "$env:LOCALAPPDATA\cloudflared\cloudflared.exe"
    )
    foreach ($g in $guess) {
        if (Test-Path -LiteralPath $g) { return $g }
    }
    return $null
}

function Ensure-PortalTunnel {
    $existing = @(Get-PortalCloudflared)
    $saved = Read-SavedTunnelUrl
    $publicOk = Test-PublicGateOk $saved

    if ($existing.Count -gt 0) {
        Write-Info "[OK] cloudflared already targeting $TunnelOrigin (PIDs $($existing.ProcessId -join ', '))  - not starting another, not killing."
        if ($publicOk) {
            Write-TunnelUrlFile $saved "Verified public GET /gate 200; existing process kept."
            Write-Info "[OK] Public $saved/gate 200"
        } elseif ($saved) {
            Write-TunnelUrlFile $saved "Process live; this PC could not verify public GET (router DNS NXDOMAIN vs hung Node 524)."
            Write-Info "[i] Saved URL $saved  - public probe failed; left process alone."
        } else {
            Write-TunnelUrlFile "" "Process live but no saved trycloudflare URL. Do not kill; hostname is in the cloudflared window/log."
        }
        return $true
    }

    if ($publicOk) {
        Write-Info "[OK] Public $saved/gate 200 even without a local process match  - not starting a new tunnel."
        Write-TunnelUrlFile $saved "Public GET /gate 200."
        return $true
    }

    $exe = Find-Cloudflared
    if (-not $exe) {
        Write-Info "[ERROR] cloudflared not found. winget install --id Cloudflare.cloudflared -e"
        return $false
    }

    Write-Info "[START] $exe tunnel --url $TunnelOrigin"
    foreach ($lf in @($CfLogOut, $CfLogErr)) {
        if (Test-Path -LiteralPath $lf) {
            Move-Item -LiteralPath $lf -Destination ($lf + ".old") -Force -ErrorAction SilentlyContinue
        }
    }
    $p = Start-Process -FilePath $exe -ArgumentList @("tunnel", "--url", $TunnelOrigin) -RedirectStandardOutput $CfLogOut -RedirectStandardError $CfLogErr -WindowStyle Hidden -PassThru
    $found = $null
    for ($i = 0; $i -lt 24; $i++) {
        Start-Sleep -Seconds 2
        $log = ""
        foreach ($lf in @($CfLogOut, $CfLogErr)) {
            if (Test-Path -LiteralPath $lf) {
                $log += (Get-Content -LiteralPath $lf -Raw -ErrorAction SilentlyContinue)
            }
        }
        if ($log -match "https://[a-z0-9-]+\.trycloudflare\.com") {
            $found = $Matches[0].TrimEnd("/")
            break
        }
        if ($p.HasExited) { break }
    }
    if ($found) {
        Write-TunnelUrlFile $found "New quick tunnel PID $($p.Id). Hostname changes if this process dies and keep-alive starts another."
        Write-Info "[OK] Tunnel URL $found"
        return $true
    }
    Write-TunnelUrlFile $saved "Started cloudflared PID $($p.Id) but URL not parsed yet. See PORTAL-TUNNEL-cloudflared.*.log"
    Write-Info "[!] cloudflared started but trycloudflare URL not in log yet."
    return $true
}

# --- entry ---
if ($UninstallTask) {
    Uninstall-KeepAliveTask
    exit 0
}

Write-Info "============================================================"
Write-Info "  NEXUS  - Channel Portal keep-alive (:3003 only)"
Write-Info "  NEVER tunnel :3001 :8081 :11434"
Write-Info "  Quick tunnel URL is not permanent (no DNS zone)."
Write-Info "============================================================"

Ensure-PortalNode | Out-Null
Ensure-PortalTunnel | Out-Null

if ($InstallTask) {
    Install-KeepAliveTask | Out-Null
}

Write-Info "URL file (gitignored): $UrlFile"
Write-Info "Task name: $TaskName"
Write-Info "Install: KEEP-PORTAL-ALIVE.bat install"
Write-Info "Manual:  KEEP-PORTAL-ALIVE.bat   or   START-PORTAL-PILOT.bat"

