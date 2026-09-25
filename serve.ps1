# Servidor estático mínimo para previsualizar la web: powershell -File serve.ps1 [-Port 5178]
param([int]$Port = 5178)
$root = $PSScriptRoot
$types = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css'; '.js'='application/javascript'; '.jpg'='image/jpeg'; '.png'='image/png'; '.svg'='image/svg+xml'; '.mp4'='video/mp4'; '.json'='application/json' }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Sirviendo $root en http://localhost:$Port/"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ($path -eq '') { $path = 'index.html' }
    $file = Join-Path $root $path
    if (Test-Path $file -PathType Container) { $file = Join-Path $file "index.html" }
    if (-not (Test-Path $file -PathType Leaf)) { $res.StatusCode = 404; $res.Close(); continue }
    $ext = [IO.Path]::GetExtension($file).ToLower()
    $res.ContentType = if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' }
    $res.Headers.Add('Accept-Ranges', 'bytes')
    $bytes = [IO.File]::ReadAllBytes($file)
    $range = $ctx.Request.Headers['Range']
    if ($range -match 'bytes=(\d*)-(\d*)') {
      $start = if ($matches[1]) { [long]$matches[1] } else { 0 }
      $end = if ($matches[2]) { [long]$matches[2] } else { $bytes.Length - 1 }
      $len = $end - $start + 1
      $res.StatusCode = 206
      $res.Headers.Add('Content-Range', "bytes $start-$end/$($bytes.Length)")
      $res.ContentLength64 = $len
      $res.OutputStream.Write($bytes, $start, $len)
    } else {
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    }
  } catch { } finally { try { $res.Close() } catch { } }
}
