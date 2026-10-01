"""Isolate Mila's facial skin without changing body positions, UVs or normals.

Run with Python, NumPy and Pillow. This does not call generation services.
The GLB keeps the original buffer and attributes; only index partitions/materials
are added. The source retexture is sampled only by the face material at runtime.
"""
from __future__ import annotations
import copy
import hashlib
import io
import json
from pathlib import Path
import struct
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/models/components/mila-the-mighty.glb'
RETEXTURE = ROOT / 'meshy_output/20260929_224556_murga-modular-esmeralda_01a0effd/maquillaje/model.glb'
OUT = ROOT / 'public/models/components/mila-modular.glb'
TEXTURE = ROOT / 'public/models/wardrobe/maquillaje-blanco-rulos-01.webp'
AUDIT = ROOT / 'meshy_output/modular-murga/face-audit'


class Glb:
    def __init__(self, path: Path):
        self.raw = path.read_bytes()
        assert struct.unpack_from('<III', self.raw) == (0x46546C67, 2, len(self.raw))
        offset = 12
        self.doc, self.binary = None, None
        while offset < len(self.raw):
            length, kind = struct.unpack_from('<II', self.raw, offset)
            data = self.raw[offset + 8:offset + 8 + length]
            if kind == 0x4E4F534A:
                self.doc = json.loads(data)
            elif kind == 0x004E4942:
                self.binary = data
            offset += length + 8
        assert self.doc and self.binary

    def accessor(self, index):
        a = self.doc['accessors'][index]
        view = self.doc['bufferViews'][a['bufferView']]
        components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        dtype = np.dtype({5121: 'u1', 5123: '<u2', 5125: '<u4', 5126: '<f4'}[a['componentType']])
        return np.ndarray((a['count'], components), dtype=dtype, buffer=self.binary,
                          offset=view.get('byteOffset', 0) + a.get('byteOffset', 0),
                          strides=(view.get('byteStride', components * dtype.itemsize), dtype.itemsize)).copy()

    def texture(self, index):
        texture = self.doc['textures'][index]
        source = texture.get('source', texture.get('extensions', {}).get('EXT_texture_webp', {}).get('source'))
        image = self.doc['images'][source]
        view = self.doc['bufferViews'][image['bufferView']]
        offset = view.get('byteOffset', 0)
        return Image.open(io.BytesIO(self.binary[offset:offset + view['byteLength']])).convert('RGB')


def nearest(source, destination):
    distances, indices = [], []
    for start in range(0, len(source), 128):
        square = ((source[start:start + 128, None, :] - destination[None, :, :]) ** 2).sum(2)
        closest = square.argmin(1)
        indices.extend(closest)
        distances.extend(np.sqrt(square[np.arange(len(closest)), closest]))
    return np.array(distances), np.array(indices)


def sample(image, uv):
    # glTF UV and GLTFLoader.flipY=false correspond to image rows increasing in v.
    pixels = np.asarray(image)
    xy = uv * np.array([image.width - 1, image.height - 1])
    xy = np.rint(xy).astype(int)
    xy = np.clip(xy, [0, 0], [image.width - 1, image.height - 1])
    return pixels[xy[..., 1], xy[..., 0]].astype(float)


def write_glb(doc, binary, path):
    doc['buffers'][0]['byteLength'] = len(binary)
    payload = json.dumps(doc, ensure_ascii=False, separators=(',', ':')).encode()
    payload += b' ' * (-len(payload) % 4)
    binary += b'\0' * (-len(binary) % 4)
    raw = struct.pack('<III', 0x46546C67, 2, 28 + len(payload) + len(binary))
    raw += struct.pack('<II', len(payload), 0x4E4F534A) + payload
    raw += struct.pack('<II', len(binary), 0x004E4942) + binary
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)


def main():
    AUDIT.mkdir(parents=True, exist_ok=True)
    base, generated = Glb(BASE), Glb(RETEXTURE)
    primitive = base.doc['meshes'][0]['primitives'][0]
    ret_primitive = generated.doc['meshes'][0]['primitives'][0]
    position = base.accessor(primitive['attributes']['POSITION'])
    uv = base.accessor(primitive['attributes']['TEXCOORD_0'])
    normals = base.accessor(primitive['attributes']['NORMAL'])
    triangles = base.accessor(primitive['indices']).reshape(-1, 3)
    ret_position = generated.accessor(ret_primitive['attributes']['POSITION'])
    ret_uv = generated.accessor(ret_primitive['attributes']['TEXCOORD_0'])
    ret_triangles = generated.accessor(ret_primitive['indices']).reshape(-1, 3)
    base_center = (position.min(0) + position.max(0)) / 2
    ret_center = (ret_position.min(0) + ret_position.max(0)) / 2
    ret_scale = np.ptp(position, axis=0)[1] / np.ptp(ret_position, axis=0)[1]
    ret_aligned = (ret_position - ret_center) * ret_scale + base_center
    distance, ret_to_base = nearest(ret_aligned[ret_triangles].mean(1), position[triangles].mean(1))
    assert len(set(ret_to_base.tolist())) == len(triangles), 'Retexture changed triangle topology'
    assert float(distance.max()) < 1e-6, 'Retexture changed geometry'
    uv_error = 0.0
    for r, b in enumerate(ret_to_base):
        for vertex in ret_triangles[r]:
            corners = triangles[b]
            source = corners[np.linalg.norm(position[corners] - ret_aligned[vertex], axis=1).argmin()]
            uv_error = max(uv_error, float(np.abs(uv[source] - ret_uv[vertex]).max()))
    assert uv_error == 0, 'Different UVs require reprojection, not atlas replacement'

    atlas = base.texture(base.doc['materials'][primitive['material']]['pbrMetallicRoughness']['baseColorTexture']['index'])
    generated_atlas = generated.texture(generated.doc['materials'][ret_primitive['material']]['pbrMetallicRoughness']['baseColorTexture']['index'])
    normalized = (position - base_center) * 1.7
    normalized[:, 1] += .85
    centers = normalized[triangles].mean(1)
    face_normals = normals[triangles].mean(1)
    weights = np.array([[1/3, 1/3, 1/3], [.6, .2, .2], [.2, .6, .2], [.2, .2, .6], [.45, .45, .1], [.45, .1, .45], [.1, .45, .45]])
    colors = sample(atlas, np.einsum('sk,tkc->tsc', weights, uv[triangles]))
    red, green, blue = colors[..., 0], colors[..., 1], colors[..., 2]
    skin = (red > 125) & (green > 65) & (green < red * .91) & (blue < green * .9) & (green > red * .37)
    skin_fraction = skin.mean(1)
    # Conservative facial envelope plus source skin color and outward-facing normals.
    # Hair, eyeballs, ear shells and neck are not selected by height alone.
    envelope = (centers[:, 1] > 1.20) & (centers[:, 1] < 1.575) & (np.abs(centers[:, 0]) < .163) & (centers[:, 2] > .115)
    selected = envelope & (face_normals[:, 2] > .06) & (skin_fraction >= 3/7)
    # These two mixed hairline triangles contain visible forehead islands. Only
    # their skin-colored texels may change; their original brown hair stays intact.
    hairline_boundaries = [220, 1911]
    selected[hairline_boundaries] = True
    face_ids = np.flatnonzero(selected)
    assert 40 < len(face_ids) < 600, f'Unexpected face triangle count: {len(face_ids)}'

    doc = copy.deepcopy(base.doc)
    binary = bytearray(base.binary)
    vertex_regions = normalized[triangles]
    # Oblique wrist planes follow both lowered arms; a horizontal cut would
    # wrongly remove fingers or retain the whole forearm. Retain border triangles.
    hand_vertex = (np.abs(vertex_regions[:, :, 0]) > .36) & (
        (np.abs(vertex_regions[:, :, 0]) - .435) * .75 + (.765 - vertex_regions[:, :, 1]) * .6 > 0)
    hands = hand_vertex.any(1)
    feet = (vertex_regions[:, :, 1] <= .13).any(1)
    below_neck = (vertex_regions[:, :, 1] < 1.145).all(1)
    garment_at_neckline = (skin_fraction < 2/7) & (vertex_regions[:, :, 1] < 1.16).all(1)
    under_outfit = (below_neck | garment_at_neckline) & ~hands & ~feet & ~selected
    dark_hair = (red > 18) & (red < 120) & (green < red * .86) & (blue < green * 1.1)
    # Upper cap and rear gathered hair only. Side strands below the ears remain.
    hat_region = (centers[:, 1] > 1.485) | ((centers[:, 2] < -.085) & (centers[:, 1] > 1.33))
    under_hat = hat_region & (dark_hair.mean(1) >= 4/7) & ~selected & ~under_outfit
    groups = {'MilaBody': ~(selected | under_outfit | under_hat), 'MilaFace': selected,
              'MilaUnderOutfit': under_outfit, 'MilaUnderHat': under_hat}
    doc['materials'] = [copy.deepcopy(base.doc['materials'][0]) for _ in groups]
    for material, name in zip(doc['materials'], groups):
        material['name'] = name
    primitives = []
    for material, (name, mask_group) in enumerate(groups.items()):
        ids = np.flatnonzero(mask_group)
        binary.extend(b'\0' * (-len(binary) % 4))
        offset = len(binary)
        indices = triangles[ids].astype('<u4').ravel()
        binary.extend(indices.tobytes())
        view_index = len(doc['bufferViews'])
        doc['bufferViews'].append({'buffer': 0, 'byteOffset': offset, 'byteLength': indices.nbytes, 'target': 34963})
        accessor_index = len(doc['accessors'])
        doc['accessors'].append({'bufferView': view_index, 'componentType': 5125, 'count': len(indices), 'type': 'SCALAR'})
        output_primitive = copy.deepcopy(primitive)
        output_primitive.update(material=material, indices=accessor_index)
        primitives.append(output_primitive)
    doc['meshes'][0]['name'] = 'MilaModular'
    doc['meshes'][0]['primitives'] = primitives
    write_glb(doc, bytes(binary), OUT)
    TEXTURE.parent.mkdir(parents=True, exist_ok=True)
    mask = Image.new('L', (1024, 1024))
    draw = ImageDraw.Draw(mask)
    for triangle in triangles[selected]:
        draw.polygon([tuple(point) for point in uv[triangle] * 1023], fill=255)
    mask.save(AUDIT / 'facial-triangles-uv-mask.png')
    boundary_mask = Image.new('L', mask.size)
    boundary_draw = ImageDraw.Draw(boundary_mask)
    for triangle in triangles[hairline_boundaries]:
        boundary_draw.polygon([tuple(point) for point in uv[triangle] * 1023], fill=255)
    original_pixels = np.asarray(atlas)
    r, g, b = [original_pixels[:, :, channel].astype(float) for channel in range(3)]
    boundary_skin = (r > 120) & (g > 62) & (g > r*.37) & (g < r*.94) & (b < g*.94)
    # Include a three-texel gutter for bilinear sampling and mip maps. The face
    # primitive is isolated, so gutter pixels cannot recolor other body materials.
    # Preserve the brown hair within mixed hairline triangles including its gutter.
    paint_mask = np.array(mask.filter(ImageFilter.MaxFilter(7)))
    paint_mask[(np.asarray(boundary_mask.filter(ImageFilter.MaxFilter(7))) > 0) & ~boundary_skin] = 0
    # Compose only the isolated facial UV pixels; output lossless WebP guarantees
    # every pixel outside this mask remains byte-for-byte identical to base RGB.
    ret_pixels = np.asarray(generated_atlas.resize((1024, 1024), Image.Resampling.LANCZOS))
    composed = original_pixels.copy()
    composed[paint_mask > 0] = ret_pixels[paint_mask > 0]
    Image.fromarray(composed).save(TEXTURE, 'WEBP', lossless=True, method=6)
    Image.fromarray(paint_mask).save(AUDIT / 'makeup-paint-mask.png')
    decoded = np.asarray(Image.open(TEXTURE).convert('RGB'))
    assert np.array_equal(decoded[paint_mask == 0], original_pixels[paint_mask == 0])
    preview = atlas.copy().convert('RGBA')
    tint = Image.new('RGBA', preview.size, (0, 255, 120, 0))
    tint.putalpha(mask.point(lambda p: 150 if p else 0))
    Image.alpha_composite(preview, tint).save(AUDIT / 'facial-atlas-selection.png')

    output = Glb(OUT)
    checks = {semantic: np.array_equal(base.accessor(index), output.accessor(index)) for semantic, index in primitive['attributes'].items()}
    assert all(checks.values())
    partitions = [output.accessor(p['indices']).reshape(-1, 3) for p in primitives]
    assert sum(len(part) for part in partitions) == len(triangles)
    assert set(map(tuple, np.concatenate(partitions).tolist())) == set(map(tuple, triangles.tolist()))
    report = {
        'source': str(BASE.relative_to(ROOT)), 'sourceSha256': hashlib.sha256(base.raw).hexdigest(),
        'retexture': str(RETEXTURE.relative_to(ROOT)), 'output': str(OUT.relative_to(ROOT)),
        'texture': str(TEXTURE.relative_to(ROOT)), 'textureSize': [1024, 1024],
        'coordinateSystem': 'original raw body coordinates, unchanged; +Y up, +Z front',
        'runtime': {'bodyMaterial': 'MilaBody', 'faceMaterial': 'MilaFace', 'textureColorSpace': 'sRGB', 'flipY': False, 'replaceOnly': 'MilaFace.map',
                    'optionalOcclusionMaterials': ['MilaUnderOutfit', 'MilaUnderHat'],
                    'occlusionScope': 'model-specific exploratory partitions; not universal garment fitting'},
        'unchangedAttributes': checks, 'originalBufferPrefixUnchanged': output.binary[:len(base.binary)] == base.binary,
        'baseTriangles': len(triangles), 'faceTriangles': len(face_ids), 'nonFaceTriangles': int((~selected).sum()),
        'groups': {name: {'triangles': int(region.sum()), 'triangleIds': np.flatnonzero(region).tolist(),
                          'normalizedBounds': {'min': normalized[triangles[region]].min((0, 1)).tolist(), 'max': normalized[triangles[region]].max((0, 1)).tolist()}}
                   for name, region in groups.items()},
        'faceTriangleIds': face_ids.tolist(), 'faceBoundsNormalized': {'min': normalized[triangles[selected]].min((0,1)).tolist(), 'max': normalized[triangles[selected]].max((0,1)).tolist()},
        'retextureCorrespondence': {'trianglesMatched': len(ret_to_base), 'maximumCenterError': float(distance.max()), 'maximumUvError': uv_error, 'retexturePositionScaleToBase': float(ret_scale)},
        'materialSlotsPreserved': ['normalTexture', 'metallicRoughnessTexture'],
        'selection': {'normalizedCentroidY': [1.20, 1.575], 'absoluteXMax': .163, 'frontZMin': .115, 'normalZMin': .06, 'minimumSkinSamples': '3 of 7', 'skinRgbRule': 'R>125,G>65,.37R<G<.91R,B<.9G'},
        'hairlineBoundaryTriangles': hairline_boundaries,
        'outsideMakeupMaskPixelsIdentical': True,
        'textureEncoding': 'lossless WebP; original RGB retained outside face paint mask',
        'textureGutterPixels': 3,
        'outputSha256': hashlib.sha256(OUT.read_bytes()).hexdigest(),
        'textureSha256': hashlib.sha256(TEXTURE.read_bytes()).hexdigest(),
        'occlusionSelection': {'outfit': 'below neck except guarded feet and oblique wrist planes', 'hat': 'dark-brown source pixels on upper cap or rear gathered hair; face and low side strands excluded'},
        'visualReview': 'pending',
    }
    review_path = AUDIT / 'visual-review.json'
    if review_path.exists():
        review = json.loads(review_path.read_text(encoding='utf8'))
        if all(review.get(key) == report[key] for key in ('outputSha256', 'textureSha256')):
            report['visualReview'] = review
    (AUDIT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf8')
    features = [{'triangle': int(i), 'center': centers[i].round(5).tolist(), 'normal': face_normals[i].round(4).tolist(), 'medianRgb': np.median(colors[i], axis=0).astype(int).tolist(), 'skinFraction': float(skin_fraction[i]), 'selected': bool(selected[i])} for i in np.flatnonzero(centers[:,1] > 1.17)]
    (AUDIT / 'head-triangle-features.json').write_text(json.dumps(features, indent=2), encoding='utf8')
    print(json.dumps({key: report[key] for key in ['output','faceTriangles','nonFaceTriangles','unchangedAttributes','faceBoundsNormalized','retextureCorrespondence']}, indent=2))


if __name__ == '__main__':
    main()
