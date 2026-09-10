<#
.SYNOPSIS
    Life OS ThinkPad Maintenance & Ephemeral Purge Daemon (Phase 5).
.DESCRIPTION
    Maintains downloads hygiene, auto-routes documents to Google Drive VFS,
    purges voice rants older than 48 hours, cleans temporary Windows buffers,
    and supervises binder_compiler.py in the background with continuous health checking.
.PARAMETER DryRun
    Performs a dry run showing what maintenance actions would be executed without making changes.
.PARAMETER Once
    Runs the maintenance routine and checks binder_compiler once, then exits without looping.
#>
[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Once
)

$ConfirmPreference = 'None'
$ErrorActionPreference = 'Continue'

$PSScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Definition }
if (-not $PSScriptRoot) { $PSScriptRoot = "C:\Users\gianf\Desktop\Life_OS_Docs" }

$DownloadsPath = if (Test-Path "$env:USERPROFILE\Downloads") { "$env:USERPROFILE\Downloads" } else { "C:\Users\gianf\Downloads" }
$DriveInboxDesktop = "G:\My Drive\Life_OS\00_INBOX\_INBOX_DESKTOP"
$RantBufferPath = "G:\My Drive\Life_OS\03_SYSTEM_VAULTS\Ephemeral_Rants.json"
$LogFile = Join-Path $PSScriptRoot "daemon.log"

function Write-Log {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,
        [ValidateSet("INFO", "WARN", "ERROR", "SUCCESS")]
        [string]$Level = "INFO"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] [$Level] $Message"
    Write-Host $logLine
    try {
        Add-Content -Path $LogFile -Value $logLine -ErrorAction SilentlyContinue
    } catch {}
}

function Start-BinderCompiler {
    $compilerScript = Join-Path $PSScriptRoot "binder_compiler.py"
    if (-not (Test-Path $compilerScript)) {
        Write-Log "binder_compiler.py not found at: $compilerScript" "ERROR"
        return
    }

    Write-Log "Starting binder_compiler.py in background (hidden window)..." "INFO"
    Start-Process -FilePath "python.exe" `
        -ArgumentList "-u `"$compilerScript`"" `
        -WorkingDirectory $PSScriptRoot `
        -WindowStyle Hidden

    Start-Sleep -Seconds 2
    $check = Get-CimInstance Win32_Process | Where-Object { 
        $_.CommandLine -like "*binder_compiler.py*" -and $_.Name -like "*python*" 
    }
    if ($check) {
        $pids = ($check | Select-Object -ExpandProperty ProcessId) -join ", "
        Write-Log "binder_compiler.py started successfully (PID: $pids)." "SUCCESS"
    } else {
        Write-Log "Notice: binder_compiler.py launched in background." "INFO"
    }
}

function Invoke-MaintenanceRoutine {
    param([switch]$IsDryRun)

    Write-Log "==========================================" "INFO"
    Write-Log "Starting Life OS ThinkPad Janitor Run..." "INFO"
    Write-Log "Downloads Path: $DownloadsPath" "INFO"
    Write-Log "Drive Inbox:    $DriveInboxDesktop" "INFO"
    Write-Log "Rants Buffer:   $RantBufferPath" "INFO"
    if ($IsDryRun) {
        Write-Log "[DRY RUN MODE ENABLED]" "WARN"
    }
    Write-Log "==========================================" "INFO"

    # 1. Delete installer binaries older than 14 days
    if (Test-Path $DownloadsPath) {
        $cutoff14Days = (Get-Date).AddDays(-14)
        $Binaries = Get-ChildItem -Path $DownloadsPath -Include *.exe, *.msi, *.iso -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.LastWriteTime -lt $cutoff14Days }

        foreach ($file in $Binaries) {
            if ($IsDryRun) {
                Write-Log "[DryRun] Would delete binary: $($file.FullName)" "WARN"
            } else {
                Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
                Write-Log "Deleted binary: $($file.Name)" "INFO"
            }
        }

        # 2. Move documents older than 3 days to the Drive inbox
        if (Test-Path $DriveInboxDesktop) {
            $cutoff3Days = (Get-Date).AddDays(-3)
            $Docs = Get-ChildItem -Path $DownloadsPath -Include *.pdf, *.docx, *.xlsx, *.pptx -Recurse -File -ErrorAction SilentlyContinue |
                Where-Object { $_.LastWriteTime -lt $cutoff3Days }

            foreach ($doc in $Docs) {
                if ($IsDryRun) {
                    Write-Log "[DryRun] Would move to Drive Inbox: $($doc.FullName) -> $DriveInboxDesktop" "INFO"
                } else {
                    Move-Item -Path $doc.FullName -Destination $DriveInboxDesktop -Force -ErrorAction SilentlyContinue
                    Write-Log "Moved to Drive Inbox: $($doc.Name)" "SUCCESS"
                }
            }
        } else {
            Write-Log "Notice: Drive Desktop Inbox ($DriveInboxDesktop) is currently unavailable." "WARN"
        }
    }

    # 3. Purge ephemeral voice rants older than 48 hours
    if (Test-Path $RantBufferPath) {
        try {
            $rants = @(Get-Content -Path $RantBufferPath -Raw | ConvertFrom-Json)
            $cutoff48h = (Get-Date).AddHours(-48)
            $retained = @($rants | Where-Object { 
                try { [DateTime]$_.timestamp -gt $cutoff48h } catch { $true }
            })
            
            if ($IsDryRun) {
                Write-Log "[DryRun] Ephemeral rants check: total $($rants.Count), retained $($retained.Count)" "INFO"
            } else {
                $retained | ConvertTo-Json -Depth 5 | Set-Content -Path $RantBufferPath
                Write-Log "Ephemeral rants purged. Retained entries: $($retained.Count)" "INFO"
            }
        } catch {
            Write-Log "Warning: Could not process Ephemeral_Rants.json: $($_.Exception.Message)" "WARN"
        }
    }

    # 4. Clean Windows temp buffers & Recycle Bin
    if (-not $IsDryRun) {
        Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
        try {
            $sh = New-Object -ComObject Shell.Application
            $rb = $sh.Namespace(0xA)
            $rb.Items() | ForEach-Object {
                try { Remove-Item -LiteralPath $_.Path -Recurse -Force -ErrorAction SilentlyContinue } catch {}
            }
            Write-Log "Temporary files and accessible Recycle Bin items cleared." "INFO"
        } catch {
            Write-Log "Notice: Recycle Bin clean skipped: $($_.Exception.Message)" "INFO"
        }
    } else {
        Write-Log "[DryRun] Would clear `$env:TEMP and empty Recycle Bin." "INFO"
    }

    Write-Log "==========================================" "INFO"
    Write-Log "Life OS Maintenance Run Complete." "SUCCESS"
    Write-Log "==========================================" "INFO"
}

# --- Main Entry Point ---

# Check single instance for the daemon loop using a named Mutex
if (-not $Once -and -not $DryRun) {
    $mutexCreated = $false
    $daemonMutex = New-Object System.Threading.Mutex($true, "Local\LifeOS_Maintenance_Daemon", [ref]$mutexCreated)
    if (-not $mutexCreated) {
        Write-Log "Another maintenance_daemon.ps1 supervisor is already running. Exiting." "WARN"
        return
    }
}

# STEP 1: Ensure binder_compiler.py is running immediately
if (-not $DryRun) {
    $compilerProc = Get-CimInstance Win32_Process | Where-Object { 
        $_.CommandLine -like "*binder_compiler.py*" -and $_.Name -like "*python*" 
    }
    if (-not $compilerProc) {
        Start-BinderCompiler
    } else {
        $pids = ($compilerProc | Select-Object -ExpandProperty ProcessId) -join ", "
        Write-Log "binder_compiler.py is already active (PID: $pids)." "INFO"
    }
}

# STEP 2: Run initial maintenance pass
Invoke-MaintenanceRoutine -IsDryRun:$DryRun

if ($Once -or $DryRun) {
    Write-Log "Maintenance daemon single pass completed. Exiting." "INFO"
    return
}

# STEP 3: Continuous supervisor loop
$lastMaintenance = Get-Date
$checkIntervalSeconds = 30
$maintenanceIntervalHours = 12

Write-Log "Life OS Maintenance Daemon active. Monitoring binder_compiler.py (health check: ${checkIntervalSeconds}s)..." "INFO"

while ($true) {
    Start-Sleep -Seconds $checkIntervalSeconds

    # Health check binder_compiler.py: restart if stopped
    $compilerProc = Get-CimInstance Win32_Process | Where-Object { 
        $_.CommandLine -like "*binder_compiler.py*" -and $_.Name -like "*python*" 
    }
    if (-not $compilerProc) {
        Write-Log "HEALTH CHECK: binder_compiler.py is stopped or terminated! Restarting now..." "WARN"
        Start-BinderCompiler
    }

    # Periodic maintenance routine
    if ((Get-Date) -gt $lastMaintenance.AddHours($maintenanceIntervalHours)) {
        Invoke-MaintenanceRoutine
        $lastMaintenance = Get-Date
    }
}
