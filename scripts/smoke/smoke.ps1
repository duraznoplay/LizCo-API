<#
  Smoke test en caliente del API LizCo para Windows/PowerShell.
  Requiere: node + PowerShell 5.1+.

  Uso:
    $env:API = 'http://localhost:4000'
    $env:LIZCO_API_REQUEST_PUBKEY_FILE = '.jwe-pub.json'
    pwsh -File scripts/smoke/smoke.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$api = $env:API
if (-not $api) { Write-Error 'Set $env:API (e.g. http://localhost:4000) before running'; exit 1 }

function Pass([string]$msg) { Write-Host " PASS: $msg" -ForegroundColor Green }
function Fail([string]$msg) { Write-Host " FAIL: $msg" -ForegroundColor Red; exit 1 }

function Mint([string]$method, [string]$path, [string]$bodyStr) {
  # Windows PowerShell loses inner double quotes when forwarding to native commands.
  # Workaround: write the body to a temp file in UTF-8 without BOM and point
  # mint.mjs at it via LIZCO_MINT_BODY_FILE.
  $tmp = $null
  if ($bodyStr) {
    $tmp = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllBytes($tmp, [System.Text.Encoding]::UTF8.GetBytes($bodyStr))
    $env:LIZCO_MINT_BODY_FILE = $tmp
  } else {
    Remove-Item Env:LIZCO_MINT_BODY_FILE -ErrorAction SilentlyContinue
  }
  try {
    $tok = & node 'scripts/smoke/mint.mjs' $method $path
    if ($LASTEXITCODE -ne 0 -or -not $tok) { Fail "mint failed ($LASTEXITCODE)" }
    return $tok
  } finally {
    if ($tmp -and (Test-Path $tmp)) { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
    Remove-Item Env:LIZCO_MINT_BODY_FILE -ErrorAction SilentlyContinue
  }
}

function HttpCode([hashtable]$params) {
  try {
    $r = Invoke-WebRequest @params -UseBasicParsing
    return [int]$r.StatusCode
  } catch {
    $resp = $_.Exception.Response
    if ($resp) { return [int]$resp.StatusCode.value__ }
    return 0
  }
}

function HttpGet([hashtable]$params) {
  try {
    return Invoke-WebRequest @params -UseBasicParsing
  } catch {
    $resp = $_.Exception.Response
    if (-not $resp) { throw }
    return [pscustomobject]@{
      StatusCode = [int]$resp.StatusCode.value__
      Content    = ''
    }
  }
}

Write-Host '== 1. /health (exento del guard) =='
try {
  $r = Invoke-RestMethod -Uri "$api/health" -Method GET
  if ($r.status -eq 'ok') { Pass 'health' } else { Fail "health returned: $($r | ConvertTo-Json -Compress)" }
} catch { Fail "health threw: $_" }

Write-Host '== 2. GET /v1/catalog/packages SIN token (debe 401) =='
$code = HttpCode @{ Uri = "$api/v1/catalog/packages"; Method = 'GET' }
if ($code -eq 401) { Pass "rejects missing token ($code)" } else { Fail "expected 401 got $code" }

Write-Host '== 3. GET /v1/catalog/packages CON token válido (200 si DB; 500 si no hay Supabase) =='
$tok = Mint 'GET' '/v1/catalog/packages' $null
$r = HttpGet @{ Uri = "$api/v1/catalog/packages"; Headers = @{ 'X-LizCo-Request-Token' = $tok } }
if ($r.StatusCode -eq 200) { Pass 'catalog read' }
elseif ($r.StatusCode -in 500,502) { Pass 'guard ok (DB pending — esperado sin Supabase)' }
else { Fail "unexpected $($r.StatusCode)" }

function PostBytes([string]$url, [string]$token, [string]$payload) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
  $req = [System.Net.HttpWebRequest]::Create($url)
  $req.Method = 'POST'
  $req.ContentType = 'application/json'
  $req.Headers.Add('X-LizCo-Request-Token', $token)
  $req.ContentLength = $bytes.Length
  try {
    $stream = $req.GetRequestStream()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()
    $resp = $req.GetResponse()
    return [int]$resp.StatusCode
  } catch [System.Net.WebException] {
    $resp = $_.Exception.Response
    if ($resp) { return [int]$resp.StatusCode } else { return 0 }
  }
}

Write-Host '== 4. POST /v1/contact body tampered (mint sin body, envío con body) -> 401 =='
$tok = Mint 'POST' '/v1/contact' $null
$code = PostBytes "$api/v1/contact" $tok '{"name":"x","email":"x@x.co","subject":"info","message":"y"}'
if ($code -eq 401) { Pass "rejects body tamper ($code)" } else { Fail "expected 401 got $code" }

Write-Host '== 5. POST /v1/contact correcto (200 si DB; 500 si no hay Supabase) =='
$payload = '{"name":"Smoke","email":"smoke@lizco.local","subject":"info","message":"hello"}'
$tok = Mint 'POST' '/v1/contact' $payload
$code = PostBytes "$api/v1/contact" $tok $payload
if ($code -in 200,201) { Pass "contact ok ($code)" }
elseif ($code -in 500,502) { Pass 'guard ok (DB pending — esperado)' }
else { Fail "unexpected $code" }

Write-Host '== 6. Replay del mismo token (debe 401) =='
$code = PostBytes "$api/v1/contact" $tok $payload
if ($code -eq 401) { Pass "rejects replay ($code)" } else { Fail "expected 401 got $code" }

Write-Host '== 7. method mismatch (firma GET, envío POST) -> 401 =='
$tok = Mint 'GET' '/v1/contact' $null
$code = PostBytes "$api/v1/contact" $tok '{}'
if ($code -eq 401) { Pass "rejects method mismatch ($code)" } else { Fail "expected 401 got $code" }

Write-Host '== 8. path mismatch (firma /v1/contact, llamo /v1/newsletter) -> 401 =='
$tok = Mint 'POST' '/v1/contact' $payload
$code = PostBytes "$api/v1/newsletter" $tok '{"email":"a@a.co"}'
if ($code -eq 401) { Pass "rejects path mismatch ($code)" } else { Fail "expected 401 got $code" }

Write-Host ''
Write-Host ' PASS all smoke checks' -ForegroundColor Green
