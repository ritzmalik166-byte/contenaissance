# Pulls the creatives used on www.contenaissance.com and re-encodes them for the site.
# Full clips (opened in the player, with sound) are capped at 1280px on the long side.
# Previews (muted autoplay loops inside cards) are short, silent and 960px max so scroll stays smooth.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$base = 'https://contenaissance.blob.core.windows.net/ct-assets'
$clips = [ordered]@{
  '01' = '01.mp4'; '03' = '03.mp4'; '09' = '09.mp4'; '10' = '10.mp4'; '12' = '12.mp4'; '13' = '13.mp4'
  '14' = '14.mp4'; '15' = '15.mp4'; 'auto' = 'auto.mp4'; 'mzha' = 'Mzha%20Nhi%20Aaya-02.1.mp4'
}
$cache = '.raw/live'
$fit = { param($max) "scale='if(gt(iw,ih),min($max,iw),-2)':'if(gt(iw,ih),-2,min($max,ih))'" }

New-Item -ItemType Directory -Force $cache, public/videos/preview, public/posters | Out-Null

foreach ($name in $clips.Keys) {
  $src = "$cache/$name.mp4"
  if (-not (Test-Path $src)) { curl.exe -sSfL -o $src "$base/$($clips[$name])" }

  $full = "public/videos/$name.mp4"
  ffmpeg -hide_banner -loglevel error -y -i $src -vf "$(& $fit 1280),fps=30" -c:v libx264 -preset slow -crf 28 `
    -maxrate 1200k -bufsize 2400k -pix_fmt yuv420p -c:a aac -b:a 96k -ac 2 -movflags +faststart $full
  ffmpeg -hide_banner -loglevel error -y -i $src -t 10 -vf "$(& $fit 960),fps=24" -c:v libx264 -preset slow -crf 30 `
    -maxrate 600k -bufsize 1200k -pix_fmt yuv420p -an -movflags +faststart "public/videos/preview/$name.mp4"
  ffmpeg -hide_banner -loglevel error -y -ss 1 -i $src -frames:v 1 -vf (& $fit 960) -q:v 5 "public/posters/$name.jpg"

  "{0,-5} full {1,6:N0} KB  preview {2,5:N0} KB" -f $name, ((Get-Item $full).Length / 1KB),
    ((Get-Item "public/videos/preview/$name.mp4").Length / 1KB)
}
