$ErrorActionPreference = 'Stop'
$taskProject = Split-Path -Parent $PSScriptRoot
$taskSource = Join-Path $taskProject 'meshy_output/mila-the-mighty_01a0efe7/original.glb'
$taskWork = Join-Path $taskProject 'meshy_output/mila-the-mighty_01a0efe7/mobile-preparation'
$taskOutput = Join-Path $taskProject 'public/models/components/mila-the-mighty.glb'
$taskOriginalHash = (Get-FileHash -LiteralPath $taskSource -Algorithm SHA256).Hash
New-Item -ItemType Directory -Force -Path $taskWork | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $taskOutput) | Out-Null

function Invoke-MilaTransform {
    param([string[]]$TransformArguments)
    & npx --yes --package '@gltf-transform/cli@4.5.1' gltf-transform @TransformArguments
    if ($LASTEXITCODE -ne 0) { throw "glTF Transform failed: $($TransformArguments[0])" }
}

# Individual operations deliberately exclude remeshing, simplification,
# quantization, Draco, Meshopt, and any change to node transforms.
$taskDedup = Join-Path $taskWork 'deduplicated.glb'
$taskPruned = Join-Path $taskWork 'pruned.glb'
$taskResized = Join-Path $taskWork 'resized-1024.glb'
Invoke-MilaTransform @('dedup', $taskSource, $taskDedup)
Invoke-MilaTransform @('prune', $taskDedup, $taskPruned, '--keep-attributes', 'true', '--keep-indices', 'true', '--keep-leaves', 'true', '--keep-solid-textures', 'true')
Invoke-MilaTransform @('resize', $taskPruned, $taskResized, '--width', '1024', '--height', '1024', '--filter', 'lanczos3')
Invoke-MilaTransform @('webp', $taskResized, $taskOutput, '--quality', '90', '--effort', '80')
if ((Get-FileHash -LiteralPath $taskSource -Algorithm SHA256).Hash -ne $taskOriginalHash) { throw 'Original asset changed unexpectedly.' }
Write-Output "Prepared $taskOutput"
