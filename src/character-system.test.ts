import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import {
  CharacterSystem, DEFAULT_CHARACTER_SELECTION, DEFAULT_STUDIO_SELECTION,
  parseCharacterSelection, parseStudioSelection, sanitizeCharacterSelection,
  createEnsembleSelection, validateCharacterAsset, PALETTE_OPTIONS, FACE_OPTIONS, OUTFIT_OPTIONS,
} from './character-system';

test('malformed cosmetic saves are sanitized without keeping unexpected fields', () => {
  for (const raw of [null, '', '{broken', 'null', '[]', '42', '"text"']) {
    assert.deepEqual(parseCharacterSelection(raw), DEFAULT_CHARACTER_SELECTION);
  }
  const selection = parseCharacterSelection(JSON.stringify({
    faceId: 'face-angular', hairId: 'hair-none', paletteId: 'javascript:alert(1)',
    bodyId: '/external.glb', skinToneId: {}, unknown: true, heightScale: '1.1',
  }));
  assert.equal(selection.faceId, 'face-angular');
  assert.equal(selection.hairId, 'hair-none');
  assert.equal(selection.paletteId, DEFAULT_CHARACTER_SELECTION.paletteId);
  assert.equal(selection.heightScale, 1);
  assert.equal(selection.bodyId, 'murga-base-v1');
  assert.equal(Object.hasOwn(selection, 'unknown'), false);
  const legacy = { ...DEFAULT_CHARACTER_SELECTION, outfitId: 'outfit-murga', paletteId: 'carmine', faceId: 'face-angular' };
  assert.deepEqual(parseCharacterSelection(JSON.stringify(legacy)), legacy, 'existing costume IDs retain saved appearances when the catalog expands');
});

test('uniform height clamps to safe limits and rejects nonfinite numbers', () => {
  assert.equal(sanitizeCharacterSelection({ heightScale: 900 }).heightScale, 1.1);
  assert.equal(sanitizeCharacterSelection({ heightScale: -2 }).heightScale, .9);
  assert.equal(sanitizeCharacterSelection({ heightScale: .974 }).heightScale, .97);
  for (const value of [NaN, Infinity, -Infinity]) assert.equal(sanitizeCharacterSelection({ heightScale: value }).heightScale, 1);
});

test('studio playback preferences validate independently from the character', () => {
  assert.deepEqual(parseStudioSelection(null), DEFAULT_STUDIO_SELECTION);
  const parsed = parseStudioSelection('{"animation":"armsup","paused":true,"compare":"yes","faceId":"face-angular"}');
  assert.equal(parsed.animation, 'armsup');
  assert.equal(parsed.paused, true);
  assert.equal(parsed.compare, false);
  assert.equal(parsed.faceId, 'face-angular');
  assert.equal(parseStudioSelection('{"animation":"run"}').animation, 'idle');
});

test('ensemble variations preserve uniform and palette while retaining a customizable first actor', () => {
  const base = sanitizeCharacterSelection({ paletteId: 'carmine', hatId: 'hat-none', outfitId: 'none', heightScale: 1.06 });
  assert.deepEqual(createEnsembleSelection(base, 0), base);
  const ensemble = Array.from({ length: 17 }, (_, index) => createEnsembleSelection(base, index));
  assert(ensemble.some(member => member.faceId !== base.faceId));
  assert(new Set(ensemble.map(member => member.heightScale)).size > 1);
  assert(ensemble.every(member => member.paletteId === 'carmine' && member.hatId === 'hat-none' && member.outfitId === 'none'));
  assert.deepEqual(createEnsembleSelection(base, 11), ensemble[11]);
  assert.deepEqual(createEnsembleSelection(base, NaN), base);
});

async function readCanonical(): Promise<GLTF> {
  const bytes = await readFile(new URL('../public/models/character-system/canonical.glb', import.meta.url));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  // Node has no browser image decoder. Only image decoding is substituted;
  // geometry, joints, weights, inverse binds, materials and clips are the shipped GLB.
  const loader = new GLTFLoader();
  loader.register(() => ({ name: 'NodeTextureDecodeStub', loadTexture: () => Promise.resolve(new THREE.Texture()) }));
  return loader.parseAsync(buffer, '');
}
function body(root: THREE.Object3D): THREE.SkinnedMesh {
  return firstSkinned(root.getObjectByName('Body')!);
}
function firstSkinned(root: THREE.Object3D): THREE.SkinnedMesh {
  let mesh: THREE.SkinnedMesh | undefined;
  root.traverse(object => { if (!mesh && object instanceof THREE.SkinnedMesh) mesh = object; });
  assert(mesh, `${root.name} must contain a skinned primitive`);
  return mesh;
}
function color(root: THREE.Object3D, name: string): THREE.Color {
  let found: THREE.Color | undefined;
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material instanceof THREE.MeshStandardMaterial && material.name === name) found = material.color;
    }
  });
  assert(found, `Material ${name} must exist`);
  return found;
}
function deformedVertex(mesh: THREE.SkinnedMesh, vertex: number): THREE.Vector3 {
  return mesh.getVertexPosition(vertex, new THREE.Vector3());
}

test('shipped GLB satisfies the canonical contract and has real distinct variants', async () => {
  const gltf = await readCanonical();
  validateCharacterAsset(gltf);
  const round = firstSkinned(gltf.scene.getObjectByName('Face_Round')!);
  const angular = firstSkinned(gltf.scene.getObjectByName('Face_Angular')!);
  assert.notEqual(round.geometry, angular.geometry);
  assert.notDeepEqual(Array.from(round.geometry.getAttribute('position').array), Array.from(angular.geometry.getAttribute('position').array));
  const socket = gltf.scene.getObjectByName('head_hat')!;
  assert(socket.parent instanceof THREE.Bone);
  assert.equal(gltf.scene.getObjectByName('Hat_Floral')!.parent, socket);
  const system = new CharacterSystem(gltf);
  assert.equal(system.dispose(), true);
});

test('actual actors share geometry but keep appearance, skeleton and palette independent', async () => {
  const system = new CharacterSystem(await readCanonical());
  const a = system.createCharacter(), b = system.createCharacter();
  try {
    const bodyA = body(a.root), bodyB = body(b.root);
    assert.equal(bodyA.geometry, bodyB.geometry);
    assert.notEqual(bodyA.material, bodyB.material);
    assert.notEqual(bodyA.skeleton, bodyB.skeleton);
    bodyA.skeleton.bones.forEach((bone, index) => assert.notEqual(bone, bodyB.skeleton.bones[index]));
    const skeletons = new Set<THREE.Skeleton>();
    a.root.traverse(object => { if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton); });
    assert.equal(skeletons.size, 1, 'each actor uploads one shared skeleton for every garment');
    const originalB = color(b.root, 'Cloth').getHexString();
    const originalTrouserB = color(b.root, 'Trouser').getHexString();
    const originalAccentB = color(b.root, 'SatinRed').getHexString();
    const originalDeepFabricB = color(b.root, 'SatinBurgundy').getHexString();
    const originalLips = color(a.root, 'Coral').getHexString();
    // Exercise all palettes, then restore the first. Secondary fabric channels
    // belong to this actor; neither another actor nor lip pigment may change.
    for (const palette of [...PALETTE_OPTIONS, PALETTE_OPTIONS[0]]) {
      a.setSelection({ paletteId: palette.id });
      assert.equal(color(a.root, 'SatinRed').getHexString(), new THREE.Color(palette.accent).getHexString());
      assert.equal(color(a.root, 'SatinBurgundy').getHexString(), new THREE.Color(palette.deepFabric).getHexString());
      assert.equal(color(b.root, 'SatinRed').getHexString(), originalAccentB);
      assert.equal(color(b.root, 'SatinBurgundy').getHexString(), originalDeepFabricB);
      assert.equal(color(a.root, 'Coral').getHexString(), originalLips);
    }
    a.setSelection({ paletteId: 'carmine', faceId: 'face-angular', hairId: 'hair-sweep', hatId: 'hat-none', skinToneId: 'skin-deep', hairColorId: 'hair-gray' });
    assert.equal(color(a.root, 'Cloth').getHexString(), new THREE.Color(PALETTE_OPTIONS.find(option => option.id === 'carmine')!.primary).getHexString());
    assert.equal(color(b.root, 'Cloth').getHexString(), originalB);
    assert.equal(color(a.root, 'Trouser').getHexString(), new THREE.Color(PALETTE_OPTIONS.find(option => option.id === 'carmine')!.trouser).getHexString());
    assert.equal(color(b.root, 'Trouser').getHexString(), originalTrouserB);
    assert.notEqual(color(a.root, 'Skin').getHexString(), color(b.root, 'Skin').getHexString());
    assert.notEqual(color(a.root, 'Hair').getHexString(), color(b.root, 'Hair').getHexString());
    assert.equal(a.getSocket('Face_Round')!.visible, false);
    assert.equal(b.getSocket('Face_Round')!.visible, true);
    assert.equal(a.getSocket('Hair_Sweep')!.visible, true);
    assert.equal(a.getSocket('Hair_Sweep_Hat')!.visible, false);
    assert.equal(b.getSocket('Hair_Curls_Hat')!.visible, true);
    a.setSelection({ hatId: 'hat-carnival', heightScale: 1.1 });
    assert.equal(a.getSocket('Hair_Sweep')!.visible, false);
    assert.equal(a.getSocket('Hair_Sweep_Hat')!.visible, true);
    assert.deepEqual(a.root.scale.toArray(), [1.1, 1.1, 1.1]);
    assert.deepEqual(b.root.scale.toArray(), [1, 1, 1]);
    assert.equal(a.selection.paletteId, 'carmine', 'partial changes retain earlier choices');
    a.setSelection({ outfitId: 'none', makeupId: 'none' });
    assert.equal(a.getSocket('Outfit_Emerald')!.visible, false);
    assert.equal(a.getSocket('Makeup_Classic')!.visible, false);
    assert.equal(bodyA.visible, true, 'clothing never hides the shared body');
  } finally { a.dispose(); b.dispose(); system.dispose(); }
});

test('real GLB animation deforms one actor and reset restores bind pose', async () => {
  const system = new CharacterSystem(await readCanonical());
  const a = system.createCharacter(), b = system.createCharacter();
  try {
    a.setAnimation('none'); b.setAnimation('none');
    const meshA = body(a.root), meshB = body(b.root);
    const indices = meshA.geometry.getAttribute('skinIndex'), weights = meshA.geometry.getAttribute('skinWeight');
    const armJoints = meshA.skeleton.bones.flatMap((bone, index) => /UpperArm|Forearm|Hand/.test(bone.name) ? [index] : []);
    let vertex = -1;
    for (let i = 0; i < indices.count && vertex < 0; i++) for (let slot = 0; slot < 4; slot++) {
      if (armJoints.includes(indices.getComponent(i, slot)) && weights.getComponent(i, slot) > .7) vertex = i;
    }
    assert(vertex >= 0, 'body has arm-weighted vertices');
    const initial = deformedVertex(meshA, vertex), untouched = deformedVertex(meshB, vertex);
    a.setAnimation('armsup');
    for (let frame = 0; frame < 15; frame++) a.update(.1);
    assert(deformedVertex(meshA, vertex).distanceTo(initial) > .02, 'arm geometry actually deforms');
    assert(deformedVertex(meshB, vertex).distanceTo(untouched) < 1e-7, 'second rig remains still');
    a.setAnimation('none');
    assert(deformedVertex(meshA, vertex).distanceTo(initial) < 1e-5, 'none restores base pose');
    const socket = a.getSocket('head_hat')!;
    assert(socket.parent instanceof THREE.Bone);
  } finally { a.dispose(); b.dispose(); system.dispose(); }
});

test('four facial selections reshape the shared head and makeup without changing another actor or body below the neck', async () => {
  assert.equal(FACE_OPTIONS.length, 4);
  const system = new CharacterSystem(await readCanonical());
  const a = system.createCharacter(), b = system.createCharacter();
  try {
    a.setAnimation('none'); b.setAnimation('none');
    const bodyA = body(a.root), bodyB = body(b.root);
    const makeupA = firstSkinned(a.getSocket('Makeup_Classic')!);
    const makeupB = firstSkinned(b.getSocket('Makeup_Classic')!);
    assert.equal(bodyA.geometry, bodyB.geometry);
    assert.notEqual(bodyA.morphTargetInfluences, bodyB.morphTargetInfluences);
    assert.equal(makeupA.geometry, makeupB.geometry);
    assert.notEqual(makeupA.morphTargetInfluences, makeupB.morphTargetInfluences);
    const baseline = Array.from({ length: bodyA.geometry.getAttribute('position').count }, (_, vertex) => deformedVertex(bodyA, vertex));
    const shapes: THREE.Vector3[][] = [];
    for (const face of FACE_OPTIONS) {
      assert.equal(parseCharacterSelection(JSON.stringify({ faceId: face.id })).faceId, face.id);
      a.setSelection({ faceId: face.id });
      const shaped = baseline.map((_, vertex) => deformedVertex(bodyA, vertex));
      shapes.push(shaped);
      baseline.forEach((original, vertex) => {
        if (original.y < 1.20) assert(original.distanceTo(shaped[vertex]) < 1e-6, `${face.id} leaves torso/shoulders/limbs intact`);
      });
      for (const target of FACE_OPTIONS.flatMap(option => option.morph ? [option.morph] : [])) {
        const expected = face.morph === target ? 1 : 0;
        assert.equal(bodyA.morphTargetInfluences![bodyA.morphTargetDictionary![target]], expected);
        assert.equal(makeupA.morphTargetInfluences![makeupA.morphTargetDictionary![target]], expected, 'makeup matches head shape');
      }
      assert(bodyB.morphTargetInfluences!.every(influence => influence === 0));
      assert(makeupB.morphTargetInfluences!.every(influence => influence === 0));
      for (const option of FACE_OPTIONS) assert.equal(a.getSocket(option.node)!.visible, option.id === face.id);
    }
    for (let first = 0; first < shapes.length; first++) for (let second = first + 1; second < shapes.length; second++) {
      const maximumDifference = Math.max(...shapes[first].map((vertex, index) => vertex.distanceTo(shapes[second][index])));
      assert(maximumDifference > .008, `${FACE_OPTIONS[first].id}/${FACE_OPTIONS[second].id} need distinct actual head shapes`);
    }
    a.setSelection({ faceId: 'face-angular', makeupId: 'none' });
    a.setAnimation('sing'); a.update(.1); a.setAnimation('none');
    assert.equal(bodyA.morphTargetInfluences![bodyA.morphTargetDictionary!.Face_Angular], 1, 'animation changes preserve the selected face');
    a.setSelection({ makeupId: 'makeup-classic' });
    assert.equal(makeupA.morphTargetInfluences![makeupA.morphTargetDictionary!.Face_Angular], 1, 'makeup reappears with the selected shape');
    a.setSelection({ faceId: 'face-round' });
    assert(bodyA.morphTargetInfluences!.every(influence => influence === 0));
    assert(makeupA.morphTargetInfluences!.every(influence => influence === 0));
  } finally { a.dispose(); b.dispose(); system.dispose(); }
});

test('trousers have two separate lower legs bound to the corresponding thigh and shin', async () => {
  const system = new CharacterSystem(await readCanonical());
  const character = system.createCharacter();
  try {
    character.setAnimation('none');
    const trousers: THREE.SkinnedMesh[] = [];
    character.getSocket('Outfit_Emerald')!.traverse(object => {
      if (!(object instanceof THREE.SkinnedMesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.some(material => material.name === 'Trouser')) {
        assert.equal(materials.length, 1, 'GLTF exports a separate primitive for the trouser channel');
        trousers.push(object);
      }
    });
    assert(trousers.length > 0, 'outfit includes actual trouser geometry');
    const samples: Array<{ mesh: THREE.SkinnedMesh; vertex: number; side: 'L' | 'R'; original: THREE.Vector3 }> = [];
    const joints = new Set<string>();
    let leftTriangles = 0, rightTriangles = 0;
    for (const mesh of trousers) {
      const index = mesh.geometry.getIndex(), position = mesh.geometry.getAttribute('position');
      const triangleIndices = index ? Array.from(index.array) : Array.from({ length: position.count }, (_, i) => i);
      const vertices = [...new Set(triangleIndices)];
      const rest = new Map(vertices.map(vertex => [vertex, deformedVertex(mesh, vertex)]));
      for (let offset = 0; offset < triangleIndices.length; offset += 3) {
        const points = triangleIndices.slice(offset, offset + 3).map(vertex => rest.get(vertex)!);
        if (Math.max(...points.map(point => point.y)) >= .67) continue;
        const allLeft = points.every(point => point.x > 0), allRight = points.every(point => point.x < 0);
        assert(allLeft || allRight, 'cloth below the crotch cannot bridge the gap between legs');
        if (allLeft) leftTriangles++; else rightTriangles++;
        if (Math.max(...points.map(point => point.y)) < .60) {
          assert(points.every(point => Math.abs(point.x) > .01), 'knees and shins retain an open central gap');
        }
      }
      const indices = mesh.geometry.getAttribute('skinIndex'), weights = mesh.geometry.getAttribute('skinWeight');
      for (const vertex of vertices) {
        const original = rest.get(vertex)!;
        if (original.y >= .67) continue; // Pelvis legitimately owns the waistband and seat.
        const side = original.x > 0 ? 'L' : 'R';
        for (let slot = 0; slot < 4; slot++) {
          if (weights.getComponent(vertex, slot) < 1e-5) continue;
          const boneName = mesh.skeleton.bones[indices.getComponent(vertex, slot)].name;
          assert([`Thigh_${side}`, `Shin_${side}`, `Foot_${side}`].includes(boneName), `${boneName} cannot drive the opposite trouser leg or a skirt`);
          joints.add(boneName);
        }
        samples.push({ mesh, vertex, side, original });
      }
    }
    assert(leftTriangles > 20 && rightTriangles > 20, 'both trouser legs contain substantial independent surfaces');
    for (const joint of ['Thigh_L', 'Shin_L', 'Thigh_R', 'Shin_R']) assert(joints.has(joint), `${joint} participates in trouser deformation`);
    character.setAnimation('walk');
    for (let frame = 0; frame < 3; frame++) character.update(.1);
    for (const side of ['L', 'R']) {
      const displacement = Math.max(...samples.filter(sample => sample.side === side).map(sample => deformedVertex(sample.mesh, sample.vertex).distanceTo(sample.original)));
      assert(displacement > .025, `${side} trouser leg must actually move with the walking rig`);
    }
  } finally { character.dispose(); system.dispose(); }
});

test('disposing an actor releases private resources while another actor and template stay usable', async () => {
  const system = new CharacterSystem(await readCanonical());
  const a = system.createCharacter(), b = system.createCharacter();
  const meshA = body(a.root), geometry = meshA.geometry;
  let geometryDisposed = 0, materialDisposed = 0;
  geometry.addEventListener('dispose', () => geometryDisposed++);
  const materialA = Array.isArray(meshA.material) ? meshA.material[0] : meshA.material;
  materialA.addEventListener('dispose', () => materialDisposed++);
  meshA.skeleton.computeBoneTexture();
  const textureA = meshA.skeleton.boneTexture!;
  let boneTextureDisposed = 0;
  textureA.addEventListener('dispose', () => boneTextureDisposed++);
  assert.equal(system.dispose(), false);
  a.dispose(); a.dispose();
  assert.equal(materialDisposed, 1);
  assert.equal(boneTextureDisposed, 1);
  assert.equal(geometryDisposed, 0);
  assert.equal(system.activeCharacters, 1);
  b.setAnimation('walk'); b.update(.08);
  b.setSelection({ paletteId: 'indigo' });
  assert.equal(b.selection.paletteId, 'indigo');
  b.dispose();
  assert.equal(system.dispose(), true);
  assert.equal(geometryDisposed, 1);
  assert.equal(system.dispose(), true);
  assert.equal(geometryDisposed, 1);
  assert.throws(() => system.createCharacter(), /disposed/);
});

test('every real costume has distinct geometry, exclusive visibility and all palette combinations stay isolated', async () => {
  const system = new CharacterSystem(await readCanonical());
  const a = system.createCharacter(), control = system.createCharacter();
  const outfits = OUTFIT_OPTIONS.filter(outfit => outfit.node);
  const channels = { Cloth: 'primary', Ruffles: 'secondary', Trim: 'trim', Trouser: 'trouser', SatinRed: 'accent', SatinBurgundy: 'deepFabric' } as const;
  const controlColors = Object.fromEntries(Object.keys(channels).map(name => [name, color(control.root, name).getHexString()]));
  const controlFace = ['Skin', 'Hair', 'Coral'].map(name => color(control.root, name).getHexString());
  const fingerprints = new Set<string>();
  try {
    for (const outfit of outfits) {
      a.setAnimation('none');
      a.setSelection({ outfitId: outfit.id });
      const node = a.getSocket(outfit.node!)!;
      const partFingerprints: string[] = [];
      const meshes: THREE.SkinnedMesh[] = [];
      node.traverse(object => {
        if (!(object instanceof THREE.SkinnedMesh)) return;
        meshes.push(object);
        const hash = createHash('sha256');
        const position = object.geometry.getAttribute('position').array;
        hash.update(new Uint8Array(position.buffer, position.byteOffset, position.byteLength));
        const index = object.geometry.getIndex()?.array;
        if (index) hash.update(new Uint8Array(index.buffer, index.byteOffset, index.byteLength));
        partFingerprints.push(hash.digest('hex'));
        assert.equal(object.skeleton, body(a.root).skeleton, 'the selected costume uses the actor rig');
        assert.equal(object.castShadow, true, 'every costume participates in silhouette shadows');
      });
      assert(meshes.length > 0);
      const fingerprint = partFingerprints.sort().join(':');
      assert(!fingerprints.has(fingerprint), `${outfit.id} must be a geometric costume, not only another material label`);
      fingerprints.add(fingerprint);
      for (const palette of PALETTE_OPTIONS) {
        a.setSelection({ paletteId: palette.id });
        for (const [material, field] of Object.entries(channels)) {
          assert.equal(color(node, material).getHexString(), new THREE.Color(palette[field as keyof typeof palette]).getHexString(), `${outfit.id}/${palette.id}/${material}`);
          assert.equal(color(control.root, material).getHexString(), controlColors[material]);
        }
        for (const candidate of outfits) assert.equal(a.getSocket(candidate.node!)!.visible, candidate.id === outfit.id);
        assert.deepEqual(['Skin', 'Hair', 'Coral'].map(name => color(a.root, name).getHexString()), controlFace, 'wardrobe palettes preserve facial colors');
        assert.equal(control.selection.outfitId, 'outfit-murga');
      }
      const samples = meshes.flatMap(mesh => {
        const indices = mesh.geometry.getAttribute('skinIndex'), weights = mesh.geometry.getAttribute('skinWeight');
        const referenced = new Set(mesh.geometry.getIndex()?.array ?? Array.from({ length: indices.count }, (_, i) => i));
        const result: Array<{ mesh: THREE.SkinnedMesh; vertex: number; before: THREE.Vector3 }> = [];
        for (const vertex of referenced) {
          if ([0, 1, 2, 3].some(slot => weights.getComponent(vertex, slot) > .3 && /UpperArm|Forearm/.test(mesh.skeleton.bones[indices.getComponent(vertex, slot)].name))) {
            result.push({ mesh, vertex, before: deformedVertex(mesh, vertex) });
          }
        }
        return result;
      });
      assert(samples.length > 0, `${outfit.id} includes sleeves attached to the arms`);
      a.setAnimation('conduct');
      for (let frame = 0; frame < 3; frame++) a.update(.1);
      assert(Math.max(...samples.map(sample => deformedVertex(sample.mesh, sample.vertex).distanceTo(sample.before))) > .025, `${outfit.id} must deform with the arm animation`);
    }
    a.setSelection({ outfitId: 'none' });
    outfits.forEach(outfit => assert.equal(a.getSocket(outfit.node!)!.visible, false));
    a.setSelection({ outfitId: 'outfit-murga' });
    assert.equal(a.getSocket('Outfit_Emerald')!.visible, true);
    assert.deepEqual(control.selection, DEFAULT_CHARACTER_SELECTION);
  } finally { a.dispose(); control.dispose(); system.dispose(); }
});

test('contract rejects wrong weights, missing garment, detached socket, and mismatched binds', async () => {
  const template = await readCanonical();
  const variant = () => ({ scene: cloneSkeleton(template.scene) as THREE.Group, animations: template.animations });
  const missing = variant(); missing.scene.getObjectByName('Outfit_Emerald')!.removeFromParent();
  assert.throws(() => validateCharacterAsset(missing), /missing node/);
  const unweighted = variant();
  const badMesh = body(unweighted.scene);
  badMesh.geometry = badMesh.geometry.clone();
  badMesh.geometry.getAttribute('skinWeight').setXYZW(0, .1, 0, 0, 0);
  assert.throws(() => validateCharacterAsset(unweighted), /Unnormalized skin weights/);
  badMesh.geometry.dispose();
  const socket = variant(); socket.scene.add(socket.scene.getObjectByName('Hat_Floral')!);
  assert.throws(() => validateCharacterAsset(socket), /head_hat/);
  const binding = variant();
  const garment = firstSkinned(binding.scene.getObjectByName('Outfit_Emerald')!);
  garment.skeleton.boneInverses = garment.skeleton.boneInverses.map(matrix => matrix.clone());
  garment.skeleton.boneInverses[0].elements[12] += .1;
  assert.throws(() => validateCharacterAsset(binding), /inverse bind/);
  const mapping = variant();
  const garment2 = firstSkinned(mapping.scene.getObjectByName('Outfit_Emerald')!);
  garment2.skeleton.bones = [...garment2.skeleton.bones].reverse();
  assert.throws(() => validateCharacterAsset(mapping), /ordered joint/);
  const morph = variant();
  const makeup = firstSkinned(morph.scene.getObjectByName('Makeup_Classic')!);
  makeup.morphTargetDictionary = { ...makeup.morphTargetDictionary };
  delete makeup.morphTargetDictionary.Face_Angular;
  assert.throws(() => validateCharacterAsset(morph), /facial morph/);
  new CharacterSystem(template).dispose();
});
