Add-Type -AssemblyName System.Drawing

$dir = Join-Path $PSScriptRoot "..\public\icons"
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

foreach ($size in @(192, 512)) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(255, 45, 95, 232))
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(240, 255, 255, 255))
  $scale = $size / 512.0
  $g.FillRectangle($brush, [int](156 * $scale), [int](156 * $scale), [int](88 * $scale), [int](120 * $scale))
  $g.FillRectangle($brush, [int](268 * $scale), [int](156 * $scale), [int](88 * $scale), [int](72 * $scale))
  $g.FillRectangle($brush, [int](268 * $scale), [int](252 * $scale), [int](88 * $scale), [int](120 * $scale))
  $g.FillRectangle($brush, [int](156 * $scale), [int](316 * $scale), [int](88 * $scale), [int](72 * $scale))
  $g.FillEllipse($brush, [int](372 * $scale), [int](116 * $scale), [int](40 * $scale), [int](40 * $scale))
  $path = Join-Path $dir "icon-$size.png"
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  Write-Output "Wrote $path"
}
