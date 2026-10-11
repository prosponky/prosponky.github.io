$ErrorActionPreference = 'Stop'
$workspace = Split-Path $PSScriptRoot -Parent
if ((Get-TimeZone).Id -ne 'Eastern Standard Time') { throw 'This schedule requires the confirmed Eastern Windows time zone.' }
$taskName = 'Pocket Desking Official Coggin Recovery'
$toolConfig = @{}
foreach ($name in @('node', 'git', 'gh')) { $toolConfig[$name] = (Get-Command $name -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source }
$toolConfig.ghConfigDir = if ($env:GH_CONFIG_DIR) { $env:GH_CONFIG_DIR } else { Join-Path $env:APPDATA 'GitHub CLI' }
$shellPath = (Get-Command pwsh -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$reportDir = Join-Path $workspace 'tmp/local-inventory-recovery'
New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
$toolConfig | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $reportDir 'task-tools.json') -Encoding utf8
$action = New-ScheduledTaskAction -Execute $shellPath -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -File "' + (Join-Path $PSScriptRoot 'run-local-inventory-recovery.ps1') + '"') -WorkingDirectory $workspace
$triggers = @((New-ScheduledTaskTrigger -Daily -At '7:00 AM'), (New-ScheduledTaskTrigger -Daily -At '12:00 PM'))
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    $expectedScript = Join-Path $PSScriptRoot 'run-local-inventory-recovery.ps1'
    if (-not ($existing.Actions.Arguments -like ('*' + $expectedScript + '*'))) { throw 'Task name belongs to a different action; no replacement made.' }
    Export-ScheduledTask -TaskName $taskName | Set-Content -LiteralPath (Join-Path $reportDir 'task-before-update.xml')
}
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Settings $settings -Principal $principal -Description 'Recover complete official Coggin maps and verify publication at 7 a.m. and noon Eastern. No dealer access-denial retries. Requires the existing Windows user session; can run locked.' -Force | Out-Null
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State
Get-ScheduledTaskInfo -TaskName $taskName | Select-Object NextRunTime, LastTaskResult
