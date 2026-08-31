$ErrorActionPreference = "Continue"
Set-Location -LiteralPath (Join-Path $PSScriptRoot "..\..")

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  BLUE TEAM  |  kumpulkan dataset NEX-AI dari log WAF" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Label = keputusan gateway (bukan LLM). Tidak membuat payload serangan." -ForegroundColor Yellow
Write-Host ""

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "[GAGAL] Python tidak ada di PATH." -ForegroundColor Red
    exit 1
}

$script = Join-Path (Get-Location) "NEX-AI\scripts\collect_lab_dataset.py"
if (-not (Test-Path $script)) {
    Write-Host "[GAGAL] Tidak ketemu $script" -ForegroundColor Red
    exit 1
}

& python $script
exit $LASTEXITCODE
