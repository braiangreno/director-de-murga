import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import catalog from '../public/models/character-system/catalog.json';

export interface CharacterSelection {
  bodyId: string;
  faceId: string;
  hairId: string;
  outfitId: string;
  hatId: string;
  makeupId: string;
  paletteId: string;
  heightScale: number;
  skinToneId: string;
  hairColorId: string;
}
export type CharacterAnimation = 'idle' | 'sing' | 'walk' | 'conduct' | 'percussion' | 'armsup' | 'elbowsbend' | 'none';
export interface StudioSelection extends CharacterSelection {
  animation: CharacterAnimation;
  paused: boolean;
  compare: boolean;
}
export interface OutfitOption {
  id: string;
  label: string;
  description: string;
  length: 'short' | 'long' | 'none';
  node: string | null;
  /** Unscaled maximum width sampled from idle/singing, including visible accessories. */
  stageWidth?: number;
  /** Unscaled front Z in the central torso region during percussion. */
  frontClearance?: number;
}

export const FACE_OPTIONS = Object.freeze(catalog.faces);
export const HAIR_OPTIONS = Object.freeze(catalog.hair);
export const OUTFIT_OPTIONS = Object.freeze(catalog.outfits as OutfitOption[]);
export const HAT_OPTIONS = Object.freeze(catalog.hats);
export const MAKEUP_OPTIONS = Object.freeze(catalog.makeup);
export const PALETTE_OPTIONS = Object.freeze(catalog.palettes);
export const SKIN_TONE_OPTIONS = Object.freeze(catalog.skinTones);
export const HAIR_COLOR_OPTIONS = Object.freeze(catalog.hairColors);
export const ANIMATION_OPTIONS = Object.freeze(catalog.animations as Array<{ id: CharacterAnimation; label: string; clip: string | null }>);
export const HEIGHT_LIMITS = Object.freeze(catalog.heightLimits);
export const DEFAULT_CHARACTER_SELECTION: Readonly<CharacterSelection> = Object.freeze({ ...catalog.defaults });
export const DEFAULT_STUDIO_SELECTION: Readonly<StudioSelection> = Object.freeze({ ...DEFAULT_CHARACTER_SELECTION, animation: 'idle', paused: false, compare: false });

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function optionId(value: unknown, options: readonly { id: string }[], fallback: string): string {
  return typeof value === 'string' && options.some(option => option.id === value) ? value : fallback;
}
function readJson(raw: string | null): unknown {
  try { return raw === null || raw.length > 20_000 ? null : JSON.parse(raw); } catch { return null; }
}

/** Invalid fields fall back independently; unknown keys never enter a saved selection. */
export function sanitizeCharacterSelection(value: unknown): CharacterSelection {
  const saved = record(value), fallback = DEFAULT_CHARACTER_SELECTION;
  const height = typeof saved.heightScale === 'number' && Number.isFinite(saved.heightScale) ? saved.heightScale : fallback.heightScale;
  return {
    bodyId: catalog.bodyId,
    faceId: optionId(saved.faceId, FACE_OPTIONS, fallback.faceId),
    hairId: optionId(saved.hairId, HAIR_OPTIONS, fallback.hairId),
    outfitId: optionId(saved.outfitId, OUTFIT_OPTIONS, fallback.outfitId),
    hatId: optionId(saved.hatId, HAT_OPTIONS, fallback.hatId),
    makeupId: optionId(saved.makeupId, MAKEUP_OPTIONS, fallback.makeupId),
    paletteId: optionId(saved.paletteId, PALETTE_OPTIONS, fallback.paletteId),
    heightScale: Math.round(THREE.MathUtils.clamp(height, HEIGHT_LIMITS.min, HEIGHT_LIMITS.max) * 100) / 100,
    skinToneId: optionId(saved.skinToneId, SKIN_TONE_OPTIONS, fallback.skinToneId),
    hairColorId: optionId(saved.hairColorId, HAIR_COLOR_OPTIONS, fallback.hairColorId),
  };
}
export function parseCharacterSelection(raw: string | null): CharacterSelection { return sanitizeCharacterSelection(readJson(raw)); }
export function parseStudioSelection(raw: string | null): StudioSelection {
  const saved = record(readJson(raw));
  return {
    ...sanitizeCharacterSelection(saved),
    animation: optionId(saved.animation, ANIMATION_OPTIONS, 'idle') as CharacterAnimation,
    paused: typeof saved.paused === 'boolean' ? saved.paused : false,
    compare: typeof saved.compare === 'boolean' ? saved.compare : false,
  };
}

/** Index zero remains the selected character. Wardrobe and palette stay shared. */
export function createEnsembleSelection(base: CharacterSelection, index: number): CharacterSelection {
  const selection = sanitizeCharacterSelection(base);
  const n = Number.isSafeInteger(index) ? Math.abs(index) : 0;
  if (n === 0) return selection;
  return sanitizeCharacterSelection({
    ...selection,
    faceId: FACE_OPTIONS[n % FACE_OPTIONS.length].id,
    hairId: HAIR_OPTIONS[n % HAIR_OPTIONS.length].id,
    hairColorId: HAIR_COLOR_OPTIONS[(n * 3) % HAIR_COLOR_OPTIONS.length].id,
    skinToneId: SKIN_TONE_OPTIONS[(n + 1) % SKIN_TONE_OPTIONS.length].id,
    heightScale: selection.heightScale * [1, .96, 1.04, .98, 1.02][n % 5],
  });
}

function meshMaterials(mesh: THREE.Mesh): THREE.Material[] { return Array.isArray(mesh.material) ? mesh.material : [mesh.material]; }
function isFiniteMatrix(matrix: THREE.Matrix4): boolean { return matrix.elements.every(Number.isFinite) && Math.abs(matrix.determinant()) > 1e-10; }
const variantNames = [...catalog.faces.map(o => o.node), ...catalog.hair.flatMap(o => [o.node, o.hatNode]), ...catalog.outfits.map(o => o.node), ...catalog.hats.map(o => o.node), ...catalog.makeup.map(o => o.node)].filter((name): name is string => !!name);
const facialMorphNames = FACE_OPTIONS.map(face => face.morph).filter((name): name is string => !!name);
const facialMorphRoots = ['Body', 'Makeup_Classic'] as const;
const silhouetteNodes = new Set(['Body', 'Hat_Floral', ...OUTFIT_OPTIONS.flatMap(outfit => outfit.node ? [outfit.node] : [])]);

function facialMorphMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  for (const name of facialMorphRoots) root.getObjectByName(name)?.traverse(object => {
    if (object instanceof THREE.Mesh && object.morphTargetInfluences) meshes.push(object);
  });
  return meshes;
}

/** Fail clearly before cloning an incompatible or malformed asset. */
export function validateCharacterAsset(gltf: Pick<GLTF, 'scene' | 'animations'>): void {
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  for (const name of [catalog.bodyNode, catalog.hatSocket, ...variantNames]) {
    if (!scene.getObjectByName(name)) throw new Error(`Character asset missing node: ${name}`);
  }
  const hat = scene.getObjectByName('Hat_Floral')!;
  let underSocket = false;
  for (let node: THREE.Object3D | null = hat.parent; node; node = node.parent) if (node.name === catalog.hatSocket) underSocket = true;
  if (!underSocket) throw new Error('Hat_Floral must inherit the head_hat socket');
  const clips = new Set(gltf.animations.map(clip => clip.name));
  for (const animation of ANIMATION_OPTIONS) if (animation.clip && !clips.has(animation.clip)) throw new Error(`Character asset missing animation: ${animation.clip}`);
  const bones = new Map<string, THREE.Bone>();
  let referenceSkin: THREE.SkinnedMesh | undefined;
  let skinnedCount = 0;
  scene.traverse(object => {
    if (!(object instanceof THREE.SkinnedMesh)) return;
    skinnedCount++;
    const { geometry, skeleton } = object;
    if (!skeleton || !skeleton.bones.length || skeleton.boneInverses.length !== skeleton.bones.length) throw new Error(`Invalid skeleton: ${object.name}`);
    if (!isFiniteMatrix(object.bindMatrix) || !isFiniteMatrix(object.bindMatrixInverse) || skeleton.boneInverses.some(matrix => !isFiniteMatrix(matrix))) throw new Error(`Invalid bind data: ${object.name}`);
    if (referenceSkin) {
      const reference = referenceSkin.skeleton;
      const sameMatrix = (a: THREE.Matrix4, b: THREE.Matrix4) => a.elements.every((value, index) => Math.abs(value - b.elements[index]) < 1e-5);
      if (skeleton.bones.length !== reference.bones.length || skeleton.bones.some((bone, index) => bone !== reference.bones[index])) throw new Error(`Incompatible ordered joint mapping: ${object.name}`);
      if (skeleton.boneInverses.some((matrix, index) => !sameMatrix(matrix, reference.boneInverses[index])) || !sameMatrix(object.bindMatrix, referenceSkin.bindMatrix)) throw new Error(`Incompatible inverse bind transforms: ${object.name}`);
    } else referenceSkin = object;
    const position = geometry.getAttribute('position'), indices = geometry.getAttribute('skinIndex'), weights = geometry.getAttribute('skinWeight');
    if (!position || !indices || !weights || indices.itemSize !== 4 || weights.itemSize !== 4 || indices.count !== position.count || weights.count !== position.count) throw new Error(`Invalid skin attributes: ${object.name}`);
    skeleton.bones.forEach(bone => {
      if (!bone || !bone.name) throw new Error('Every joint needs a unique name');
      if (bones.has(bone.name) && bones.get(bone.name) !== bone) throw new Error(`Disconnected duplicate joint: ${bone.name}`);
      bones.set(bone.name, bone);
      let contained = false;
      for (let node: THREE.Object3D | null = bone; node; node = node.parent) if (node === scene) contained = true;
      if (!contained) throw new Error(`Joint outside character root: ${bone.name}`);
    });
    for (let vertex = 0; vertex < position.count; vertex++) {
      let sum = 0;
      for (let slot = 0; slot < 4; slot++) {
        const joint = indices.getComponent(vertex, slot), weight = weights.getComponent(vertex, slot);
        if (!Number.isInteger(joint) || joint < 0 || joint >= skeleton.bones.length || !Number.isFinite(weight) || weight < 0 || weight > 1) throw new Error(`Invalid skin influence: ${object.name}`);
        sum += weight;
      }
      if (Math.abs(sum - 1) > .002) throw new Error(`Unnormalized skin weights: ${object.name}`);
      if (![position.getX(vertex), position.getY(vertex), position.getZ(vertex)].every(Number.isFinite)) throw new Error('Non-finite character vertex');
    }
  });
  for (const name of [catalog.bodyNode, ...variantNames.filter(name => name !== 'Hat_Floral')]) {
    let skinned = false;
    scene.getObjectByName(name)!.traverse(object => { if (object instanceof THREE.SkinnedMesh) skinned = true; });
    if (!skinned) throw new Error(`Character part must share the rig: ${name}`);
  }
  if (skinnedCount < 2) throw new Error('Character requires skinned body and garment');
  for (const name of facialMorphRoots) {
    let count = 0;
    scene.getObjectByName(name)!.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      count++;
      const position = object.geometry.getAttribute('position');
      for (const target of facialMorphNames) {
        const index = object.morphTargetDictionary?.[target];
        const attribute = index === undefined ? undefined : object.geometry.morphAttributes.position?.[index];
        if (index === undefined || !object.morphTargetInfluences || !attribute || attribute.count !== position.count || attribute.itemSize !== 3) throw new Error(`Missing or invalid facial morph ${target}: ${name}`);
        for (let vertex = 0; vertex < attribute.count; vertex++) {
          if (![attribute.getX(vertex), attribute.getY(vertex), attribute.getZ(vertex)].every(Number.isFinite)) throw new Error(`Non-finite facial morph ${target}: ${name}`);
        }
      }
    });
    if (!count) throw new Error(`Facial morph part is empty: ${name}`);
  }
  const bodyBox = new THREE.Box3().setFromObject(scene.getObjectByName(catalog.bodyNode)!);
  if (Math.abs(bodyBox.min.y) > .025 || Math.abs(bodyBox.max.y - catalog.nominalHeight) > .06) throw new Error('Canonical body must be 1.70 m tall with feet at y=0');
}

function disposeTemplate(gltf: Pick<GLTF, 'scene'>): void {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>(), skeletons = new Set<THREE.Skeleton>();
  gltf.scene.traverse(object => {
    if (object instanceof THREE.Mesh) { geometries.add(object.geometry); meshMaterials(object).forEach(material => materials.add(material)); }
    if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
  });
  materials.forEach(material => Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); }));
  const bitmaps = new Set<ImageBitmap>();
  textures.forEach(texture => {
    if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) bitmaps.add(texture.image);
    texture.dispose();
  });
  bitmaps.forEach(bitmap => bitmap.close());
  skeletons.forEach(skeleton => skeleton.dispose());
  materials.forEach(material => material.dispose()); geometries.forEach(geometry => geometry.dispose());
}

export class ModularCharacter {
  readonly root = new THREE.Group();
  readonly mixer: THREE.AnimationMixer;
  private current: CharacterSelection;
  private readonly model: THREE.Object3D;
  private readonly privateMaterials = new Set<THREE.Material>();
  private readonly privateSkeletons = new Set<THREE.Skeleton>();
  private readonly faceShapeMeshes: THREE.Mesh[];
  private readonly outfitNodes: THREE.Object3D[] = [];
  private disposed = false;
  private animation: CharacterAnimation = 'none';

  constructor(private readonly owner: CharacterSystem, selection: CharacterSelection) {
    this.current = sanitizeCharacterSelection(selection);
    this.root.name = 'ModularMurgaCharacter';
    this.model = cloneSkeleton(owner.template.scene);
    const materialCopies = new Map<THREE.Material, THREE.Material>();
    let sharedSkeleton: THREE.Skeleton | undefined;
    this.model.traverse(object => {
      // A newly exported GLB can arrive before the catalog during development.
      // Hide all top-level clothing variants, including not-yet-published cuts,
      // while leaving each variant's material primitives enabled underneath it.
      if (object.name.startsWith('Outfit_') && !object.parent?.name.startsWith('Outfit_')) this.outfitNodes.push(object);
      if (object instanceof THREE.Mesh) {
        // Geometry and target attributes stay shared; each actor chooses its own
        // facial shape without editing the asset or another actor's weights.
        if (object.morphTargetInfluences) object.morphTargetInfluences = [...object.morphTargetInfluences];
        const copies = meshMaterials(object).map(material => {
          let copy = materialCopies.get(material);
          if (!copy) { copy = material.clone(); materialCopies.set(material, copy); this.privateMaterials.add(copy); }
          return copy;
        });
        object.material = Array.isArray(object.material) ? copies : copies[0];
        // The body, costume and hat define the silhouette. Small facial layers
        // need not repeat their draw calls in the shadow pass for all 17 actors.
        let castsSilhouette = false;
        for (let node: THREE.Object3D | null = object; node; node = node.parent) {
          if (silhouetteNodes.has(node.name)) castsSilhouette = true;
        }
        object.castShadow = castsSilhouette; object.receiveShadow = true;
      }
      if (object instanceof THREE.SkinnedMesh) {
        if (!sharedSkeleton) {
          sharedSkeleton = object.skeleton;
          sharedSkeleton.boneInverses = sharedSkeleton.boneInverses.map(matrix => matrix.clone());
          this.privateSkeletons.add(sharedSkeleton);
        } else {
          // Every part passed the same ordered bind contract; one skeleton per
          // actor also means one GPU bone texture, rather than one per garment.
          if (object.skeleton !== sharedSkeleton) object.skeleton.dispose();
          object.skeleton = sharedSkeleton;
        }
        object.frustumCulled = false;
      }
    });
    this.faceShapeMeshes = facialMorphMeshes(this.model);
    this.root.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    this.setSelection(this.current);
    this.setAnimation('idle');
  }
  get selection(): Readonly<CharacterSelection> { return { ...this.current }; }
  get currentAnimation(): CharacterAnimation { return this.animation; }
  getSocket(name: string): THREE.Object3D | undefined { return this.model.getObjectByName(name); }
  setSelection(next: Partial<CharacterSelection>): void {
    if (this.disposed) return;
    this.current = sanitizeCharacterSelection({ ...this.current, ...next });
    const selected = this.current;
    variantNames.forEach(name => { this.model.getObjectByName(name)!.visible = false; });
    this.outfitNodes.forEach(outfit => { outfit.visible = false; });
    const enable = (name: string | null | undefined) => { if (name) this.model.getObjectByName(name)!.visible = true; };
    const face = FACE_OPTIONS.find(option => option.id === selected.faceId)!;
    enable(face.node);
    this.faceShapeMeshes.forEach(mesh => {
      facialMorphNames.forEach(name => { mesh.morphTargetInfluences![mesh.morphTargetDictionary![name]] = face.morph === name ? 1 : 0; });
    });
    const hair = HAIR_OPTIONS.find(option => option.id === selected.hairId)!;
    const hat = HAT_OPTIONS.find(option => option.id === selected.hatId)!;
    enable(hat.node ? hair.hatNode : hair.node);
    enable(hat.node);
    enable(OUTFIT_OPTIONS.find(option => option.id === selected.outfitId)!.node);
    enable(MAKEUP_OPTIONS.find(option => option.id === selected.makeupId)!.node);
    const palette = PALETTE_OPTIONS.find(option => option.id === selected.paletteId)!;
    const skin = SKIN_TONE_OPTIONS.find(option => option.id === selected.skinToneId)!;
    const hairColor = HAIR_COLOR_OPTIONS.find(option => option.id === selected.hairColorId)!;
    const colors: Record<string, string> = {
      Skin: skin.color, Hair: hairColor.color, Cloth: palette.primary, Ruffles: palette.secondary,
      Trim: palette.trim, Trouser: palette.trouser, SatinRed: palette.accent, SatinBurgundy: palette.deepFabric,
    };
    this.privateMaterials.forEach(material => {
      if (material instanceof THREE.MeshStandardMaterial && colors[material.name]) material.color.set(colors[material.name]);
    });
    this.root.scale.setScalar(selected.heightScale);
    this.root.userData.characterSelection = { ...selected };
    this.root.updateMatrixWorld(true);
  }
  setAnimation(name: CharacterAnimation): void {
    if (this.disposed) return;
    const option = ANIMATION_OPTIONS.find(animation => animation.id === name);
    if (!option || this.animation === name) return;
    this.mixer.stopAllAction();
    this.animation = name;
    if (option.clip) {
      const clip = this.owner.template.animations.find(candidate => candidate.name === option.clip)!;
      this.mixer.clipAction(clip).reset().play();
      this.mixer.update(0);
    }
    this.root.updateMatrixWorld(true);
  }
  update(delta: number): void {
    if (this.disposed || !Number.isFinite(delta) || delta <= 0) return;
    this.mixer.update(Math.min(delta, .1));
    this.root.updateMatrixWorld(true);
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.model);
    this.privateSkeletons.forEach(skeleton => skeleton.dispose());
    this.privateMaterials.forEach(material => material.dispose());
    this.privateSkeletons.clear(); this.privateMaterials.clear();
    this.root.removeFromParent(); this.root.clear();
    this.owner.releaseCharacter();
  }
}

/** Owns immutable geometry/textures; instances own only rig, materials and mixer. */
export class CharacterSystem {
  private instances = 0;
  private disposed = false;
  constructor(readonly template: Pick<GLTF, 'scene' | 'animations'>) { validateCharacterAsset(template); }
  get activeCharacters(): number { return this.instances; }
  createCharacter(selection: CharacterSelection = { ...DEFAULT_CHARACTER_SELECTION }): ModularCharacter {
    if (this.disposed) throw new Error('Character system already disposed');
    const character = new ModularCharacter(this, selection);
    this.instances++;
    return character;
  }
  releaseCharacter(): void { this.instances = Math.max(0, this.instances - 1); }
  dispose(): boolean {
    if (this.instances > 0) return false;
    if (!this.disposed) { this.disposed = true; disposeTemplate(this.template); }
    return true;
  }
}

let systemPromise: Promise<CharacterSystem> | undefined;
let loadedSystem: CharacterSystem | undefined;
export function loadCharacterSystem(): Promise<CharacterSystem> {
  if (!systemPromise) {
    systemPromise = new GLTFLoader().loadAsync(catalog.bodyUrl).then(gltf => {
      try { loadedSystem = new CharacterSystem(gltf); return loadedSystem; }
      catch (error) { disposeTemplate(gltf); throw error; }
    }).catch(error => { systemPromise = undefined; loadedSystem = undefined; throw error; });
  }
  return systemPromise;
}
export async function createCharacter(selection: CharacterSelection = { ...DEFAULT_CHARACTER_SELECTION }): Promise<ModularCharacter> {
  return (await loadCharacterSystem()).createCharacter(selection);
}
export const loadModularCharacter = createCharacter;
/** Call only for full application teardown, never when just one view closes. */
export function disposeCharacterSystemCache(): boolean {
  if (systemPromise && !loadedSystem) return false;
  if (loadedSystem && !loadedSystem.dispose()) return false;
  loadedSystem = undefined; systemPromise = undefined;
  return true;
}
