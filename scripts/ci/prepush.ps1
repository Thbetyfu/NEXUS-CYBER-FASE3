# Fast gate used by pre-push hooks (Windows).
$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Root

Write-Host "==> NEX-RED unit tests" -ForegroundColor Cyan
python -m unittest discover -s NEX-RED/tests -v
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Go gateway vet + tests" -ForegroundColor Cyan
Push-Location (Join-Path $Root "nexus-core-gateway")
go vet ./...
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
go test ./...
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "==> deploy-local compose syntax" -ForegroundColor Cyan
    docker compose --project-directory (Join-Path $Root "deploy-local") -f (Join-Path $Root "deploy-local\docker-compose.yml") config --quiet
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
    Write-Host "[i] Docker tidak ada; lewati cek compose." -ForegroundColor Yellow
}

Write-Host "[OK] prepush checks passed" -ForegroundColor Green
