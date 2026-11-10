$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $workspace '.local'
New-Item -ItemType Directory -Force -Path $localRoot | Out-Null
$binary = Get-ChildItem -LiteralPath $localRoot -Filter mongod.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $binary) {
  $archive = Join-Path $localRoot 'mongodb.zip'
  & curl.exe --fail --location --retry 2 --continue-at - --output $archive 'https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-8.0.25.zip'
  if ($LASTEXITCODE -ne 0) { throw 'MongoDB download failed; rerun to resume.' }
  Expand-Archive -LiteralPath $archive -DestinationPath $localRoot -Force
  $binary = Get-ChildItem -LiteralPath $localRoot -Filter mongod.exe -Recurse | Select-Object -First 1
}
$listener = Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue
if ($listener) { Write-Output 'Port 27017 already has a listener; checking it is MongoDB is done by db:check.'; exit 0 }
$data = Join-Path $localRoot 'mongo-data'
$log = Join-Path $localRoot 'mongo.log'
New-Item -ItemType Directory -Force -Path $data | Out-Null
$arguments = '--dbpath "' + $data + '" --logpath "' + $log + '" --bind_ip 127.0.0.1 --port 27017'
$process = Start-Process -FilePath $binary.FullName -ArgumentList $arguments -WindowStyle Hidden -PassThru
Write-Output ('MongoDB started locally. Process: ' + $process.Id)
