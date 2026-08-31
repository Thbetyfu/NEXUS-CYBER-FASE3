Set-Location -LiteralPath $PSScriptRoot
Write-Host "Mematikan Nexus Cyber deploy-local..." -ForegroundColor Cyan
docker compose --project-name nexus-local down
if ($LASTEXITCODE -ne 0) {
    Write-Host "[GAGAL] docker compose down gagal." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Stack dimatikan. Data Postgres masih di volume Docker." -ForegroundColor Green
