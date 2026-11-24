# MongoDB backup and local sandbox

How to set up a development machine so that it can:

- take an on-demand **backup** of the production database (a dated archive file), and
- run a local **sandbox** copy of it, which the app can be pointed at instead of production.

The copy runs one way only: production -> archive -> sandbox. Nothing here writes to production.

    production (Atlas) --backup.ps1--> sg-<date>-<time>.gz --resetSandbox.ps1--> local sgSandbox

- The archive is the backup. Nothing opens or changes it.
- The sandbox is disposable. Reset it from an archive whenever you want a clean state.
- The archives hold production customer data. They live outside the repository and are never
  committed.

## 1. Install (once per machine)

Download all three from https://www.mongodb.com/try/download and install with the default options:

| Download | Provides | Version on the first machine (2026-11) |
|---|---|---|
| MongoDB Community Server | `mongod`, the local server, as a Windows service named `MongoDB` | 9.0.8 |
| MongoDB Database Tools | `mongodump`, `mongorestore` | 100.20.1 |
| MongoDB Shell | `mongosh` | 2.14.3 |

- Keep "Install MongoDB as a Service" ticked in the server installer. The service starts with
  Windows and listens on `127.0.0.1:27017` (IPv4 only) with no password.
- The installers do not add the tools to PATH. That is fine: the scripts find them in
  `C:\Program Files\MongoDB\` and `%LOCALAPPDATA%\Programs\mongosh\`.
- The local server version must be the same as or newer than the Atlas cluster's version. An
  archive from a newer server may not restore into an older one.
- Check the service: `Get-Service MongoDB` should show `Running`.

## 2. Atlas (once, plus one step per machine)

- **Read-only database user (once).** In Atlas: Database Access -> Add New Database User, with
  the built-in role "Only read any database". This is a *database* user, not an Atlas
  organization or project member. The backup script uses it, so the script cannot write to
  production even if it is edited wrongly.
- **Connection string.** Cluster -> Connect -> Drivers gives the `mongodb+srv://...` string.
  Put the read-only user's name and password in it. Percent-encode any special characters in
  the password (for example `@` becomes `%40`).
- **IP access list (per machine).** Network Access must include the public IP address of each
  machine that runs a backup.

## 3. Settings in `.env.local` (per machine)

`.env.local` is ignored by git. Add these lines:

    # Database the app uses. Keep exactly one of these two lines uncommented.
    MONGO_DB_URI=mongodb+srv://<app user>:<password>@<cluster host>/?<options>
    # MONGO_DB_URI=mongodb://127.0.0.1:27017/sgSandbox

    # Backup: the read-only Atlas user.
    MONGO_BACKUP_URI=mongodb+srv://<read-only user>:<password>@<cluster host>/

    # Backup folder, one line per computer. It must be outside the repository.
    MONGO_BACKUP_DIR_TOWEROFPOWER=D:\Backups\sgMongo
    MONGO_BACKUP_DIR_<OTHER_COMPUTER>=C:\Backups\sgMongo

- The scripts read `MONGO_BACKUP_DIR_<COMPUTERNAME>` first and fall back to a plain
  `MONGO_BACKUP_DIR`. So the same lines can be copied to every machine.
- `<COMPUTERNAME>` is the output of `$env:COMPUTERNAME`, in upper case, with every character
  that is not a letter or a digit replaced by `_` (`DEV-LAPTOP` becomes `DEV_LAPTOP`).
- Do not put a `#` comment on the same line as a value.
- Write `127.0.0.1` in the sandbox line, not `localhost`. Node resolves `localhost` to the IPv6
  address `::1`, and the local server listens on IPv4 only.
- When the SeaFile server is ready, point the folder line at the SeaFile-synced folder. Nothing
  else changes.

## 4. Take a backup

From the repository root, in PowerShell:

    .\tools\mongo\backup.ps1

- It dumps the production database (`test`, because the production URI names no database) to
  `<backup folder>\sg-<yyyyMMdd>-<HHmmss>.gz`.
- A dump that fails leaves no `.gz` file behind.
- Run it when no mirror sync is in progress. A dump of a live database is not an exact
  point-in-time snapshot.
- Old archives are not deleted automatically. Remove the ones you no longer need by hand.
- If PowerShell refuses to run scripts:
  `powershell -ExecutionPolicy Bypass -File .\tools\mongo\backup.ps1`

## 5. Reset the sandbox

    .\tools\mongo\resetSandbox.ps1                              # newest archive
    .\tools\mongo\resetSandbox.ps1 -Archive sg-20261123-210000.gz

- It drops the local `sgSandbox` database and restores the archive into it. Everything in the
  sandbox is lost, including collections created by code under development.
- The target is fixed to `mongodb://127.0.0.1:27017`. The script has no way to restore into
  Atlas.
- Every reset is also a test that the archive restores.

## 6. Switch the app between production and the sandbox

1. In `.env.local`, comment one `MONGO_DB_URI` line and uncomment the other.
2. Restart the dev server. The connection is cached for the life of the process, so a running
   server keeps using the old database.

**The sandbox only isolates MongoDB.** The RealGreen API key is a separate setting, so the app
still talks to the live RealGreen account. Anything that writes to RealGreen from the sandbox
writes for real.

To keep the sandbox's mirror data current between resets, run a delta sync locally while
pointed at the sandbox.

## 7. Restoring production from a backup

There is deliberately no script for this. Restoring over production is a manual decision:
check the archive in the sandbox first, then run `mongorestore` by hand against the cluster
with a user that has write access.

Atlas can also keep its own snapshots (Cloud Backup, available on M10). Check whether it is
turned on for the cluster. The local archive is then a second copy kept off the cluster.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `mongodump.exe was not found` | The Database Tools or the Shell are not installed (section 1). |
| `Add MONGO_BACKUP_URI=...` or `Add MONGO_BACKUP_DIR_...` | The setting is missing from `.env.local` (section 3). |
| Backup: `server selection error` or a timeout | This machine's IP address is not on the Atlas access list. |
| Backup: `authentication failed` | Wrong user or password, or special characters in the password are not percent-encoded. |
| Reset: `ECONNREFUSED 127.0.0.1:27017` | The `MongoDB` service is not running: `Start-Service MongoDB` (as administrator). |
| App: `connect ECONNREFUSED ::1:27017` | The sandbox line in `.env.local` says `localhost`. Use `127.0.0.1` (section 3). |
| Backup: `AuthenticationFailed` naming `SCRAM-SHA-1` | The user in `MONGO_BACKUP_URI` is not a database user of the cluster's project (section 2). |
| The app still shows the other database | The dev server was not restarted after the switch. |

## Files

- `tools/mongo/backup.ps1`: production -> archive.
- `tools/mongo/resetSandbox.ps1`: archive -> local `sgSandbox`.
- `tools/mongo/mongoCommon.ps1`: shared settings and helpers (database names, the fixed sandbox
  server, reading `.env.local`, finding the tools).
- The scripts are ASCII only. Windows PowerShell misreads other characters in a script that has
  no byte order mark.
