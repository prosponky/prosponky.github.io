param([switch]$ForceRefresh)
$ErrorActionPreference = 'Stop'
$workspace = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $workspace
$config = Get-Content -LiteralPath (Join-Path $workspace 'tmp/local-inventory-recovery/task-tools.json') -Raw | ConvertFrom-Json
foreach ($tool in @($config.node, $config.git, $config.gh)) {
    if (-not (Test-Path -LiteralPath $tool -PathType Leaf)) { throw "Scheduled inventory dependency is missing: $tool" }
}
$env:Path = ((@($config.node, $config.git, $config.gh) | ForEach-Object { Split-Path $_ -Parent }) -join ';') + ';' + $env:Path
if ($config.ghConfigDir) { $env:GH_CONFIG_DIR = $config.ghConfigDir }
$null = & $config.gh auth status 2>&1
@{ checkedAt = (Get-Date).ToUniversalTime().ToString('o'); githubAuthenticated = ($LASTEXITCODE -eq 0) } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $workspace 'tmp/local-inventory-recovery/task-auth-check.json') -Encoding utf8
$logPath = Join-Path $workspace ('tmp/local-inventory-recovery/task-' + (Get-Date -Format 'yyyy-MM-dd-HHmmss') + '.log')
$arguments = @((Join-Path $PSScriptRoot 'local-inventory-recovery.mjs'), '--publish')
if ($ForceRefresh) { $arguments += '--force' }
& $config.node @arguments *> $logPath
$workerResult = $LASTEXITCODE
& $config.node (Join-Path $PSScriptRoot 'audit-unattended-inventory.mjs') *> ($logPath + '.audit.log')
$auditResult = $LASTEXITCODE
@{ checkedAt = (Get-Date).ToUniversalTime().ToString('o'); cogginWorkerExitCode = $workerResult; allStoreAuditExitCode = $auditResult } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $workspace 'tmp/local-inventory-recovery/task-outcomes.json') -Encoding utf8
# This task owns Coggin recovery. The all-store audit records browser-only gaps
# separately; it cannot turn a successful Coggin recovery into a false failure.
exit $workerResult
