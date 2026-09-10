<#
.SYNOPSIS
    Registers the Life OS Maintenance Janitor in Windows Task Scheduler.
.DESCRIPTION
    Configures maintenance_daemon.ps1 to run silently in the background at user logon
    with hidden window, restart on failure, and high priority.
    Requires Administrator elevation to write to Windows Task Scheduler.
#>

$taskName = "LifeOS_ThinkPad_Janitor"
$scriptPath = "C:\Users\gianf\Desktop\Life_OS_Docs\maintenance_daemon.ps1"

# Check for Administrator elevation
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "================================================================" -ForegroundColor Yellow
    Write-Host "NOTICE: Administrator privileges are required to register tasks." -ForegroundColor Yellow
    Write-Host "To register the task, run an elevated PowerShell prompt:" -ForegroundColor Cyan
    Write-Host "Start-Process powershell -Verb RunAs -ArgumentList `"-ExecutionPolicy Bypass -File '$PSCommandPath'`"" -ForegroundColor White
    Write-Host "================================================================" -ForegroundColor Yellow
    return
}

Write-Host "Registering scheduled task: $taskName..." -ForegroundColor Cyan

# 1. Action: Execute PowerShell silently with hidden window
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""

# 2. Trigger: Trigger automatically at user logon
$trigger = New-ScheduledTaskTrigger -AtLogOn

# 3. Settings: Restart on failure, allow battery execution, priority 4 (High)
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 5) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -Priority 4

# 4. Principal: Run with highest privileges under the user
$principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType Interactive `
    -RunLevel Highest

try {
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Principal $principal `
        -Settings $settings `
        -Description "Life OS ThinkPad Janitor: Maintains downloads hygiene, routes files to Drive VFS, and purges ephemeral rants." `
        -Force | Out-Null

    Write-Host "SUCCESS: Task '$taskName' registered successfully!" -ForegroundColor Green
    Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State, @{N='RunLevel';E={$_.Principal.RunLevel}} | Format-List
} catch {
    Write-Host "ERROR registering scheduled task: $($_.Exception.Message)" -ForegroundColor Red
    throw $_
}
