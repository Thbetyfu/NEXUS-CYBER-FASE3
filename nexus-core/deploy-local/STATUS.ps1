Set-Location -LiteralPath $PSScriptRoot
Write-Host "Status Nexus Cyber deploy-local" -ForegroundColor Cyan
docker compose --project-name nexus-local ps
exit $LASTEXITCODE
