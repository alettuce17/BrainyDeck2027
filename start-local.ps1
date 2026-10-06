$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is not installed. Run: winget install OpenJS.NodeJS.LTS" -ForegroundColor Red
  exit 1
}
if (-not (Test-Path "node_modules")) {
  Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
  npm install
}
Write-Host "Starting FlashMind AI..." -ForegroundColor Green
npm run dev
