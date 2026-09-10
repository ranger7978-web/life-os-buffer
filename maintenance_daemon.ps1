<#
.SYNOPSIS
    Life OS ThinkPad Maintenance & Ephemeral Purge Daemon (Phase 5).
.DESCRIPTION
    Maintains downloads hygiene, auto-routes documents to Google Drive VFS,
    purges voice rants older than 48 hours, and cleans temporary Windows buffers.
.PARAMETER WhatIf
    Performs a dry run showing what actions would be executed without making changes.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [switch]$DryRun
)

$DownloadsPath = if (Test-Path "$env:USERPROFILE\Downloads") { "$env:USERPROFILE\Downloads" } else { "C:\Users\gianf\Downloads" }
$DriveInboxDesktop = "G:\My Drive\Life_OS\00_INBOX\_INBOX_DESKTOP"
$RantBufferPath = "G:\My Drive\Life_OS\03_SYSTEM_VAULTS\Ephemeral_Rants.json"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Starting Life OS ThinkPad Janitor Run..." -ForegroundColor Cyan
Write-Host "Downloads Path: $DownloadsPath" -ForegroundColor Gray
Write-Host "Drive Inbox:    $DriveInboxDesktop" -ForegroundColor Gray
Write-Host "Rants Buffer:   $RantBufferPath" -ForegroundColor Gray
if ($DryRun -or $PSCmdlet.ShouldProcess("dryrun", "dryrun") -eq $false) {
    Write-Host "[DRY RUN MODE ENABLED]" -ForegroundColor Yellow
}
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Delete installer binaries older than 14 days
if (Test-Path $DownloadsPath) {
    $cutoff14Days = (Get-Date).AddDays(-14)
    $Binaries = Get-ChildItem -Path $DownloadsPath -Include *.exe, *.msi, *.iso -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoff14Days }

    foreach ($file in $Binaries) {
        if ($DryRun) {
            Write-Host "[DryRun] Would delete binary: $($file.FullName)" -ForegroundColor Yellow
        } else {
            Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
            Write-Host "Deleted binary: $($file.Name)" -ForegroundColor Yellow
        }
    }

    # 2. Move documents older than 3 days to the Drive inbox
    if (Test-Path $DriveInboxDesktop) {
        $cutoff3Days = (Get-Date).AddDays(-3)
        $Docs = Get-ChildItem -Path $DownloadsPath -Include *.pdf, *.docx, *.xlsx, *.pptx -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.LastWriteTime -lt $cutoff3Days }

        foreach ($doc in $Docs) {
            if ($DryRun) {
                Write-Host "[DryRun] Would move to Drive Inbox: $($doc.FullName) -> $DriveInboxDesktop" -ForegroundColor Green
            } else {
                Move-Item -Path $doc.FullName -Destination $DriveInboxDesktop -Force -ErrorAction SilentlyContinue
                Write-Host "Moved to Drive Inbox: $($doc.Name)" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "Notice: Drive Desktop Inbox ($DriveInboxDesktop) is currently unavailable." -ForegroundColor DarkYellow
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
        
        if ($DryRun) {
            Write-Host "[DryRun] Ephemeral rants check: total $($rants.Count), retained $($retained.Count)" -ForegroundColor Cyan
        } else {
            $retained | ConvertTo-Json -Depth 5 | Set-Content -Path $RantBufferPath
            Write-Host "Ephemeral rants purged. Retained entries: $($retained.Count)" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "Warning: Could not process Ephemeral_Rants.json: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 4. Clean Windows temp buffers & Recycle Bin
if (-not $DryRun) {
    Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
    Clear-RecycleBin -Force -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Temporary files and Recycle Bin cleared." -ForegroundColor DarkGray
} else {
    Write-Host "[DryRun] Would clear `$env:TEMP and empty Recycle Bin." -ForegroundColor DarkGray
}

Write-Host "==========================================" -ForegroundColor Green
Write-Host "Life OS Maintenance Run Complete." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
