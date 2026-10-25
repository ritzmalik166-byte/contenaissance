# Builds the site's motion clips from the generated stills in .raw/gen.
# Each still gets a slow camera move, a vignette and the Contenaissance logo composited bottom-centre
# (bottom-centre survives the portrait crops used by cards). Outputs full clip, preview and poster.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$logo = 'public/images/logo.png'
$frames = 300
$moves = @{
  in   = "z='1+0.16*on/$frames':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
  out  = "z='1.16-0.16*on/$frames':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
  panr = "z='1.14':x='(iw-iw/zoom)*on/$frames':y='ih/2-(ih/zoom/2)'"
  panl = "z='1.14':x='(iw-iw/zoom)*(1-on/$frames)':y='ih/2-(ih/zoom/2)'"
}
$clips = [ordered]@{
  '01' = 'in'; '03' = 'out'; '09' = 'panr'; 'mzha' = 'in'; '10' = 'panl'; 'auto' = 'out'
  '12' = 'in'; '13' = 'out'; '14' = 'panr'; '15' = 'in'; 'ai' = 'panl'
}

New-Item -ItemType Directory -Force public/videos/preview, public/posters | Out-Null

foreach ($name in $clips.Keys) {
  $src = ".raw/gen/gen-$name.jpg"
  $move = $moves[$clips[$name]]
  $full = "public/videos/$name.mp4"
  $graph = "[0]scale=3840:-2,zoompan=$($move):d=$($frames):s=1280x720:fps=30,vignette=PI/5[v];" +
           "[1]scale=190:-1,format=rgba,colorchannelmixer=aa=0.92[l];" +
           "[v][l]overlay=(W-w)/2:H-h-28:format=auto,format=yuv420p"
  ffmpeg -hide_banner -loglevel error -y -loop 1 -framerate 30 -i $src -i $logo -filter_complex $graph `
    -frames:v $frames -c:v libx264 -preset slow -crf 25 -movflags +faststart -an $full
  ffmpeg -hide_banner -loglevel error -y -i $full -vf "scale=960:-2" -c:v libx264 -preset slow -crf 29 `
    -movflags +faststart -an "public/videos/preview/$name.mp4"
  ffmpeg -hide_banner -loglevel error -y -ss 0.5 -i $full -frames:v 1 -q:v 4 "public/posters/$name.jpg"
  "{0,-5} {1,6:N0} KB" -f $name, ((Get-Item $full).Length / 1KB)
}
