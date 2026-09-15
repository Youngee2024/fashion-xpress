param(
  [Parameter(Mandatory = $true)][string]$Tiles,
  [Parameter(Mandatory = $true)][string]$Output,
  [Parameter(Mandatory = $true)][int]$Width,
  [Parameter(Mandatory = $true)][int]$Height
)

Add-Type -AssemblyName System.Drawing
$canvas = New-Object System.Drawing.Bitmap($Width, $Height)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
try {
  Get-ChildItem -LiteralPath $Tiles -Filter '*.png' | Sort-Object Name | ForEach-Object {
    $y = [int]$_.BaseName
    $tile = [System.Drawing.Image]::FromFile($_.FullName)
    try { $graphics.DrawImageUnscaled($tile, 0, $y) } finally { $tile.Dispose() }
  }
  $canvas.Save($Output, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $graphics.Dispose()
  $canvas.Dispose()
}
