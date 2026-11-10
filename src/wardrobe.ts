import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface WardrobeSelection { outfit: boolean; hat: boolean; makeup: boolean }
export const DEFAULT_WARDROBE: Readonly<WardrobeSelection> = { outfit: true, hat: true, makeup: true };

export function parseWardrobeSelection(value: string | null): WardrobeSelection {
  try {
    const saved: unknown = JSON.parse(value ?? 'null');
    if (saved && typeof saved === 'object' && ['outfit', 'hat', 'makeup'].every(key => typeof (saved as Record<string, unknown>)[key] === 'boolean')) {
      const { outfit, hat, makeup } = saved as WardrobeSelection;
      return { outfit, hat, makeup };
    }
  } catch { /* An absent or obsolete cosmetic preference uses the first complete look. */ }
  return { ...DEFAULT_WARDROBE };
}

function resources(roots: THREE.Object3D[], extraTextures: THREE.Texture[] = []) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set(extraTextures);
  roots.forEach(root => root.traverse(object => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
    }
  }));
  materials.forEach(material => Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); }));
  return () => {
    const bitmaps = new Set<ImageBitmap>();
    textures.forEach(texture => {
      if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) bitmaps.add(texture.image);
      texture.dispose();
    });
    bitmaps.forEach(bitmap => bitmap.close());
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
  };
}

export class MilaWardrobe {
  readonly root = new THREE.Group();
  private faceMaterials: THREE.MeshStandardMaterial[] = [];
  private originalMaps = new Map<THREE.MeshStandardMaterial, THREE.Texture | null>();
  private underOutfit: THREE.Mesh[] = [];
  private underHat: THREE.Mesh[] = [];
  private release: () => void;
  private disposed = false;

  constructor(body: THREE.Group, private outfit: THREE.Group, private hat: THREE.Group,
    private makeup: THREE.Texture, selection: WardrobeSelection) {
    this.root.name = 'mila-vestuario-modular';
    // Normalize the body once; accessories already share this frame. A tall hat must not shrink Mila.
    const box = new THREE.Box3().setFromObject(body), center = box.getCenter(new THREE.Vector3());
    const height = box.max.y - box.min.y;
    if (!Number.isFinite(height) || height <= 0) throw new Error('Invalid body bounds');
    const bodyFrame = new THREE.Group(), scale = 1.7 / height;
    bodyFrame.name = 'mila-cuerpo';
    bodyFrame.scale.setScalar(scale);
    bodyFrame.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    bodyFrame.add(body);
    this.outfit.name = 'mila-traje'; this.hat.name = 'mila-sombrero';
    this.root.add(bodyFrame, this.outfit, this.hat);
    body.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material.name === 'MilaUnderOutfit') this.underOutfit.push(object);
        if (material.name === 'MilaUnderHat') this.underHat.push(object);
        if (material instanceof THREE.MeshStandardMaterial && material.name === 'MilaFace') {
          this.faceMaterials.push(material); this.originalMaps.set(material, material.map);
        }
      }
    });
    if (!this.faceMaterials.length) throw new Error('MilaFace material missing');
    this.makeup.colorSpace = THREE.SRGBColorSpace; this.makeup.flipY = false;
    this.root.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
    this.release = resources([this.root], [makeup]);
    this.setSelection(selection);
  }

  setSelection(selection: WardrobeSelection) {
    if (this.disposed) return;
    this.outfit.visible = selection.outfit; this.hat.visible = selection.hat;
    this.underOutfit.forEach(mesh => { mesh.visible = !selection.outfit; });
    this.underHat.forEach(mesh => { mesh.visible = !selection.hat; });
    this.faceMaterials.forEach(material => {
      material.map = selection.makeup ? this.makeup : this.originalMaps.get(material)!;
      material.needsUpdate = true;
    });
    this.root.userData.wardrobe = { ...selection };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.release(); this.root.clear(); this.originalMaps.clear();
  }
}

export async function loadMilaWardrobe(selection: WardrobeSelection): Promise<MilaWardrobe> {
  const loader = new GLTFLoader();
  const results = await Promise.allSettled([
    loader.loadAsync('models/components/mila-modular.glb'),
    loader.loadAsync('models/wardrobe/traje-esmeralda-01.glb'),
    loader.loadAsync('models/wardrobe/sombrero-esmeralda-01.glb'),
    new THREE.TextureLoader().loadAsync('models/wardrobe/maquillaje-blanco-rulos-01.webp'),
  ] as const);
  const roots: THREE.Group[] = [], textures: THREE.Texture[] = [];
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      if (result.value instanceof THREE.Texture) textures.push(result.value);
      else roots.push(result.value.scene);
    }
  });
  const [body, outfit, hat, makeup] = results;
  if (body.status !== 'fulfilled' || outfit.status !== 'fulfilled' || hat.status !== 'fulfilled' || makeup.status !== 'fulfilled') {
    resources(roots, textures)(); throw new Error('No se pudieron cargar las piezas del vestuario.');
  }
  try { return new MilaWardrobe(body.value.scene, outfit.value.scene, hat.value.scene, makeup.value, selection); }
  catch (error) { resources(roots, textures)(); throw error; }
}
