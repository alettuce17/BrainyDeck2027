$ErrorActionPreference = "SilentlyContinue"

function Check-Command($name, $install) {
  $cmd = Get-Command $name
  if ($cmd) {
    $version = & $name --version 2>$null | Select-Object -First 1
    Write-Host "[OK] $name $version" -ForegroundColor Green
  } else {
    Write-Host "[MISSING] $name" -ForegroundColor Yellow
    Write-Host "  Install with: $install"
  }
}

Write-Host "FlashMind AI requirement check`n" -ForegroundColor Cyan
Check-Command "node" "winget install OpenJS.NodeJS.LTS"
Check-Command "npm"  "Installed automatically with Node.js"
Check-Command "git"  "winget install Git.Git"
Check-Command "docker" "Optional only - https://www.docker.com/products/docker-desktop/"

Write-Host "`nRequired: Node.js/npm + Git"
Write-Host "Optional: Docker"
Write-Host "Not required: Python, Flask, XAMPP, MySQL, local PostgreSQL"
