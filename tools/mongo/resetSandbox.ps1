# Replaces the local sandbox database with the contents of a backup archive.
# It never contacts production: the target server is fixed in mongoCommon.ps1.
# Usage (from the repository root):
#   .\tools\mongo\resetSandbox.ps1                          newest archive
#   .\tools\mongo\resetSandbox.ps1 -Archive sg-<stamp>.gz   a named archive, or a full path
# Setup and settings: src/lib/mongoose/mongoSandbox.readme.md

param([string]$Archive)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'mongoCommon.ps1')

if ($Archive -and (Test-Path -LiteralPath $Archive -PathType Leaf)) {
    $archivePath = (Resolve-Path -LiteralPath $Archive).Path
}
else {
    $backupDir = Get-BackupDir -Settings (Read-EnvLocal)
    if ($Archive) {
        $archivePath = Join-Path $backupDir $Archive
        if (-not (Test-Path -LiteralPath $archivePath -PathType Leaf)) {
            throw "Archive not found: $Archive (also looked in $backupDir)"
        }
    }
    else {
        # The stamp in the name sorts by time.
        $newest = Get-ChildItem -LiteralPath $backupDir -Filter 'sg-*.gz' -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending | Select-Object -First 1
        if (-not $newest) {
            throw "No sg-*.gz archive in $backupDir. Run .\tools\mongo\backup.ps1 first."
        }
        $archivePath = $newest.FullName
    }
}

$mongosh = Find-MongoTool -Name 'mongosh'
$mongorestore = Find-MongoTool -Name 'mongorestore'
$sandboxUri = "$SandboxServer/$SandboxDb"

Write-Host "Resetting '$SandboxDb' on $SandboxServer from $archivePath"

# mongorestore --drop only replaces collections that are in the archive. Dropping the
# database also removes collections that newer code created in the sandbox.
Invoke-MongoTool -ToolPath $mongosh -ToolArgs @($sandboxUri, '--quiet', '--eval', 'db.dropDatabase()') | Out-Null

Invoke-MongoTool -ToolPath $mongorestore -ToolArgs @(
    "--uri=$SandboxServer",
    '--gzip',
    "--archive=$archivePath",
    "--nsInclude=$ProductionDb.*",
    "--nsFrom=$ProductionDb.*",
    "--nsTo=$SandboxDb.*"
)

$collectionCount = Invoke-MongoTool -ToolPath $mongosh -ToolArgs @(
    $sandboxUri, '--quiet', '--eval', 'print(db.getCollectionNames().length)'
)
Write-Host "Sandbox ready: $collectionCount collections in '$SandboxDb'."
Write-Host "Point the app at it with MONGO_DB_URI=$sandboxUri and restart the dev server."
