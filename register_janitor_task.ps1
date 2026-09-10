<#
.SYNOPSIS
    Registers the Life OS Maintenance Janitor & Background Supervisor in Windows Task Scheduler.
.DESCRIPTION
    Configures maintenance_daemon.ps1 to run silently in the background at user logon
    with hidden window, restart on failure, unlimited execution time, and highest priority.
    Automatically elevates to Administrator if not already elevated.
#>

$taskName = "LifeOS_ThinkPad_Janitor"
$PSScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Definition }
if (-not $PSScriptRoot) { $PSScriptRoot = "C:\Users\gianf\Desktop\Life_OS_Docs" }
$scriptPath = Join-Path $PSScriptRoot "maintenance_daemon.ps1"
$logFile = Join-Path $PSScriptRoot "daemon.log"

# Check for Administrator elevation
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "================================================================" -ForegroundColor Yellow
    Write-Host "Administrator privileges required to register Scheduled Tasks." -ForegroundColor Yellow
    Write-Host "Requesting elevation..." -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Yellow
    
    try {
        $proc = Start-Process powershell.exe `
            -Verb RunAs `
            -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" `
            -PassThru -Wait
            
        if ($proc.ExitCode -eq 0) {
            Write-Host "Elevated registration completed successfully!" -ForegroundColor Green
        } else {
            Write-Host "Elevated process finished with code $($proc.ExitCode)." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Notice: Cannot auto-prompt UAC elevation from an automated/headless subshell." -ForegroundColor Yellow
        Write-Host "To complete registration with Administrator privileges, please either:" -ForegroundColor Cyan
        Write-Host "  1. Right-click 'register_as_admin.cmd' and select 'Run as administrator'" -ForegroundColor Cyan
        Write-Host "  2. Or run this command in an elevated PowerShell terminal:" -ForegroundColor Cyan
        Write-Host "     powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -ForegroundColor Cyan
    }
    return
}

Write-Host "Registering scheduled task: $taskName..." -ForegroundColor Cyan

# 1. Action: Execute PowerShell silently with hidden window
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""

# 2. Trigger: Trigger automatically at user logon
$trigger = New-ScheduledTaskTrigger -AtLogOn

# 3. Settings: Restart on failure, allow battery execution, no execution timeout (runs continuously as daemon)
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -Priority 4

# 4. Principal: Run with highest privileges under the interactive user
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
        -Description "Life OS ThinkPad Janitor & Daemon Supervisor: Maintains downloads hygiene, routes files to Drive VFS, purges ephemeral rants, and supervises binder_compiler.py in the background." `
        -Force | Out-Null

    Write-Host "SUCCESS: Task '$taskName' registered successfully!" -ForegroundColor Green
    Add-Content -Path $logFile -Value "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] [SUCCESS] Scheduled Task '$taskName' registered successfully." -ErrorAction SilentlyContinue

    # Start the task now so it activates immediately
    Write-Host "Starting '$taskName' immediately..." -ForegroundColor Cyan
    Start-ScheduledTask -TaskName $taskName
    
    Start-Sleep -Seconds 2
    Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State, @{N='RunLevel';E={$_.Principal.RunLevel}} | Format-List
    Write-Host "Task is active. Operational logs are written to: $logFile" -ForegroundColor Green
    Add-Content -Path $logFile -Value "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] [SUCCESS] Scheduled Task '$taskName' activated." -ErrorAction SilentlyContinue
} catch {
    Write-Host "ERROR registering scheduled task: $($_.Exception.Message)" -ForegroundColor Red
    Add-Content -Path $logFile -Value "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] [ERROR] Failed to register task '$taskName': $($_.Exception.Message)" -ErrorAction SilentlyContinue
    throw $_
}
