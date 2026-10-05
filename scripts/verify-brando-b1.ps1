# Local verification only. No commit, push, tag, merge, deploy or production operation.
$ErrorActionPreference = 'Stop'
function Invoke-B1Check {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Check failed: $Program $($Arguments -join ' ')" }
}
$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot
if ($env:DATABASE_URL -or $env:NODE_ENV -eq 'production' -or (Test-Path '.env')) {
    throw 'Use an isolated local checkout without DATABASE_URL, production mode or .env.'
}
if ((& node -p "process.versions.node.split('.')[0]") -ne '24') { throw 'Node 24.x is required.' }
if ((& pnpm --version) -ne '12.4.2') { throw 'pnpm 12.4.2 is required.' }
Invoke-B1Check 'pnpm' @('install','--frozen-lockfile')
if (!(Test-Path '.venv/Scripts/python.exe')) {
    Invoke-B1Check 'python' @('-m','venv','.venv')
}
$python = Join-Path $repoRoot '.venv/Scripts/python.exe'
Invoke-B1Check $python @('-m','pip','install','-r','requirements-foundation.txt')
Invoke-B1Check 'pnpm' @('typecheck')
Invoke-B1Check 'pnpm' @('lint')
Invoke-B1Check 'pnpm' @('skills:check')
Invoke-B1Check $python @('scripts/foundation_check.py')
Invoke-B1Check 'pnpm' @('test')
Invoke-B1Check 'pnpm' @('exec','playwright','test','--config','playwright.brando.config.ts')
# Refuse to test an unrelated server or existing developer database on the standard ports.
foreach ($port in @(3000,55432)) {
    if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
        throw "Port $port is already occupied. Close that local instance cleanly before retrying."
    }
}
Write-Host 'Opening the isolated checkout DEMO. Existing migrations run only on its new local database.'
Start-Process -FilePath 'powershell.exe' -WorkingDirectory $repoRoot -ArgumentList @('-NoExit','-Command','pnpm competition:start') | Out-Null
$ready = $false
for ($attempt = 0; $attempt -lt 120; $attempt++) {
    try {
        $health = Invoke-RestMethod 'http://127.0.0.1:3000/health' -TimeoutSec 2
        if ($health.application -eq 'brandopolis-competition' -and $health.status -eq 'ready') { $ready = $true; break }
    } catch { }
    Start-Sleep -Seconds 1
}
if (!$ready) { throw 'Local DEMO did not become ready. Inspect its separate terminal.' }
Invoke-B1Check 'pnpm' @('test:e2e')
Invoke-B1Check 'pnpm' @('test:visual')
Invoke-B1Check 'pnpm' @('test:pilot:e2e')
Invoke-B1Check $python @('design/brandopolis-ui/validation/validate.py','--integrated')
Invoke-B1Check 'git' @('diff','--check')
Write-Host 'Automated local gates passed. Review Brando visually; production remains frozen.'
Write-Host 'The DEMO remains open for inspection. Stop it with Ctrl+C in its own terminal.'
