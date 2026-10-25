$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$img = Join-Path $root 'public\images'
New-Item -ItemType Directory -Force $img | Out-Null

$site = 'https://www.contenaissance.com'
$blob = 'https://contenaissance.blob.core.windows.net/ct-assets'
$images = @{
  'logo.png' = "$site/assets/favicon.png"; 'fav-icon.png' = "$site/assets/fav-icon.png"
  'chatgpt.png' = "$site/assets/chatgpt.png"; 'claude.png' = "$site/assets/claude.png"; 'gemini.png' = "$site/assets/gemini.png"
  'copilot.png' = "$blob/copilot.png"; 'grok.png' = "$blob/grok.png"; 'pika.png' = "$blob/pika.png"
}
foreach ($k in $images.Keys) {
  $out = Join-Path $img $k
  if (-not (Test-Path $out)) { try { Invoke-WebRequest -Uri $images[$k] -OutFile $out -UseBasicParsing; "image $k" } catch { "FAILED $k" } }
}
"done"
