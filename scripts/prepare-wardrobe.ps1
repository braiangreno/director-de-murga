$ErrorActionPreference = 'Stop'
$taskProject = Split-Path -Parent $PSScriptRoot
$taskOriginals = Join-Path $taskProject 'meshy_output/20260929_224556_murga-modular-esmeralda_01a0effd'
$taskOutputDir = Join-Path $taskProject 'public/models/wardrobe'
New-Item -ItemType Directory -Force -Path $taskOutputDir | Out-Null
function Invoke-WardrobeTransform {
    param([string[]]$TransformArguments)
    & npx --yes --package '@gltf-transform/cli@4.5.1' gltf-transform @TransformArguments
    if ($LASTEXITCODE -ne 0) { throw "glTF Transform failed: $($TransformArguments[0])" }
}
foreach ($taskPart in @('traje', 'sombrero')) {
    $taskSource = Join-Path $taskOriginals "$taskPart/model.glb"
    $taskHash = (Get-FileHash -LiteralPath $taskSource -Algorithm SHA256).Hash
    $taskWork = Join-Path $taskOriginals "$taskPart/mobile-preparation"
    New-Item -ItemType Directory -Force -Path $taskWork | Out-Null
    Invoke-WardrobeTransform @('dedup', $taskSource, (Join-Path $taskWork 'dedup.glb'))
    Invoke-WardrobeTransform @('prune', (Join-Path $taskWork 'dedup.glb'), (Join-Path $taskWork 'pruned.glb'), '--keep-attributes', 'true', '--keep-indices', 'true', '--keep-leaves', 'true', '--keep-solid-textures', 'true')
    Invoke-WardrobeTransform @('resize', (Join-Path $taskWork 'pruned.glb'), (Join-Path $taskWork 'resized.glb'), '--width', '1024', '--height', '1024')
    Invoke-WardrobeTransform @('webp', (Join-Path $taskWork 'resized.glb'), (Join-Path $taskWork 'webp.glb'), '--quality', '90', '--effort', '80')
    if ((Get-FileHash -LiteralPath $taskSource -Algorithm SHA256).Hash -ne $taskHash) { throw "Original changed: $taskPart" }
    Copy-Item -LiteralPath (Join-Path $taskWork 'webp.glb') -Destination (Join-Path $taskOutputDir "$taskPart-esmeralda-01.glb")
}
& node (Join-Path $PSScriptRoot 'prepare-wardrobe-fit.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Wardrobe fitting or geometry verification failed.' }
