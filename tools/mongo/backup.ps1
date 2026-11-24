# Dumps the production database to a dated archive. It only reads from production.
# Usage (from the repository root):  .\tools\mongo\backup.ps1
# Setup and settings: src/lib/mongoose/mongoSandbox.readme.md

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'mongoCommon.ps1')

$settings = Read-EnvLocal
$backupUri = $settings['MONGO_BACKUP_URI']
if (-not $backupUri) {
    throw 'Add MONGO_BACKUP_URI=<connection string of the read-only Atlas user> to .env.local.'
}

$backupDir = Get-BackupDir -Settings $settings
if (-not (Test-Path -LiteralPath $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$mongodump = Find-MongoTool -Name 'mongodump'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$archivePath = Join-Path $backupDir "sg-$stamp.gz"

# A failed dump must never look like a backup, so it is written under another name first.
$partialPath = "$archivePath.partial"

# The URI goes in a config file so the password is not visible in the process list.
$configPath = Join-Path $env:TEMP ("sgMongoDump-" + [guid]::NewGuid().ToString('N') + '.yaml')

try {
    $configText = "uri: '" + $backupUri.Replace("'", "''") + "'`n"
    [System.IO.File]::WriteAllText($configPath, $configText, (New-Object System.Text.UTF8Encoding($false)))

    Write-Host "Dumping database '$ProductionDb' to $archivePath"
    Invoke-MongoTool -ToolPath $mongodump -ToolArgs @(
        "--config=$configPath",
        "--db=$ProductionDb",
        '--gzip',
        "--archive=$partialPath"
    )
    Move-Item -LiteralPath $partialPath -Destination $archivePath
}
finally {
    if (Test-Path -LiteralPath $configPath) { Remove-Item -LiteralPath $configPath -Force }
    if (Test-Path -LiteralPath $partialPath) { Remove-Item -LiteralPath $partialPath -Force }
}

$sizeMb = [math]::Round((Get-Item -LiteralPath $archivePath).Length / 1MB, 1)
Write-Host "Backup complete: $archivePath ($sizeMb MB)"
