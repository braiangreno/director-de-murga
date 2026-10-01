import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

type StageRole = 'chorister' | 'bombo' | 'redoblante' | 'platillos' | 'director';
type Point = readonly [number, number, number];
type Surface = 'body' | 'joints' | 'shell' | 'head' | 'metal';
type Shape = 'ball' | 'cylinder' | 'torso' | 'box' | 'ring';

/**
 * A neutral, faceless stand-in, facing +Z with its feet on y=0.
 * Parts are merged by material: two meshes per singer/director, at most five
 * per percussionist. The returned group exclusively owns its GPU resources;
 * dispose its mesh geometries/materials when replacing it with an artist GLB.
 */
export function createStagePlaceholder(role: StageRole, color: number): THREE.Group {
  const group = new THREE.Group();
  group.name = `stage-placeholder-${role}`;
  group.userData = { role, placeholder: true, nominalHeight: 1.7 };

  const templates = new Map<Shape, THREE.BufferGeometry>();
  const batches = new Map<Surface, THREE.BufferGeometry[]>();
  const mergedGeometries: THREE.BufferGeometry[] = [];
  const materials: THREE.MeshStandardMaterial[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const identity = new THREE.Quaternion();
  const palette: Record<Surface, THREE.MeshStandardMaterialParameters> = {
    body: { color, roughness: .92, metalness: 0, flatShading: true },
    joints: { color: new THREE.Color(color).multiplyScalar(.58), roughness: .98, metalness: 0, flatShading: true },
    shell: { color: 0x635348, roughness: .9, metalness: 0, flatShading: true },
    head: { color: 0xe4ddcc, roughness: .96, metalness: 0, flatShading: true },
    metal: { color: role === 'platillos' ? 0xb69a57 : 0x8c949c, roughness: .6, metalness: .45, flatShading: true },
  };

  function shape(kind: Shape): THREE.BufferGeometry {
    let geometry = templates.get(kind);
    if (!geometry) {
      switch (kind) {
        case 'ball': geometry = new THREE.SphereGeometry(1, 10, 7); break;
        case 'cylinder': geometry = new THREE.CylinderGeometry(1, 1, 1, 10); break;
        case 'torso': geometry = new THREE.CylinderGeometry(1.1, .78, 1, 10); break;
        case 'box': geometry = new THREE.BoxGeometry(1, 1, 1); break;
        case 'ring': geometry = new THREE.TorusGeometry(1, .038, 4, 18); break;
      }
      templates.set(kind, geometry);
    }
    return geometry;
  }

  function part(surface: Surface, kind: Shape, at: Point, scale: Point, rotation = identity): void {
    const transform = new THREE.Matrix4().compose(new THREE.Vector3(...at), rotation, new THREE.Vector3(...scale));
    const geometry = shape(kind).clone().applyMatrix4(transform);
    const batch = batches.get(surface) ?? [];
    batch.push(geometry);
    batches.set(surface, batch);
  }

  function limb(surface: Surface, start: Point, end: Point, radius: number): void {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
    const axis = b.clone().sub(a);
    const length = axis.length();
    const middle = a.add(b).multiplyScalar(.5);
    part(surface, 'cylinder', middle.toArray() as [number, number, number], [radius, length, radius],
      new THREE.Quaternion().setFromUnitVectors(up, axis.normalize()));
  }

  function arm(side: -1 | 1, elbow: Point, hand: Point): void {
    const shoulder: Point = [side * .155, 1.285, 0];
    limb('body', shoulder, elbow, .043);
    limb('body', elbow, hand, .035);
    part('joints', 'ball', elbow, [.041, .041, .041]);
    part('body', 'ball', shoulder, [.052, .054, .049]);
    part('body', 'ball', hand, [.032, .043, .029]);
  }

  try {
    // Compact neutral mannequin; the widest upper arms stay within 0.49 m.
    for (const side of [-1, 1] as const) {
      const hip: Point = [side * .073, .88, 0];
      const knee: Point = [side * .079, .49, .012];
      const ankle: Point = [side * .084, .12, 0];
      limb('body', hip, knee, .059);
      limb('body', knee, ankle, .047);
      part('joints', 'ball', knee, [.052, .048, .052]);
      part('body', 'box', [side * .084, .045, .048], [.112, .09, .224]);
    }
    part('joints', 'ball', [0, .895, 0], [.123, .091, .089]);
    part('body', 'torso', [0, 1.105, 0], [.139, .43, .092]);
    part('body', 'ball', [0, 1.279, 0], [.154, .069, .098]);
    limb('joints', [0, 1.319, 0], [0, 1.423, 0], .043);
    part('body', 'ball', [0, 1.557, .005], [.111, .146, .105]);

    if (role === 'director') {
      arm(-1, [-.19, 1.407, .055], [-.147, 1.554, .22]);
      arm(1, [.197, 1.372, .09], [.186, 1.454, .315]);
    } else if (role === 'chorister') {
      arm(-1, [-.19, 1.091, .024], [-.169, .907, .075]);
      arm(1, [.19, 1.091, .024], [.169, .907, .075]);
    } else if (role === 'bombo') {
      arm(-1, [-.19, 1.12, .1], [-.162, 1.075, .405]);
      arm(1, [.19, 1.12, .1], [.162, 1.075, .405]);
      const front = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
      part('shell', 'cylinder', [0, .958, .306], [.185, .226, .185], front);
      for (const z of [.19, .422]) {
        part('head', 'cylinder', [0, .958, z], [.18, .008, .18], front);
        part('metal', 'ring', [0, .958, z], [.185, .185, .185]);
      }
      for (const side of [-1, 1] as const) {
        limb('shell', [side * .162, 1.075, .405], [side * .095, 1.164, .47], .009);
        part('head', 'ball', [side * .095, 1.164, .47], [.026, .026, .026]);
      }
    } else if (role === 'redoblante') {
      arm(-1, [-.19, 1.114, .08], [-.139, 1.05, .258]);
      arm(1, [.19, 1.114, .08], [.139, 1.05, .258]);
      part('shell', 'cylinder', [0, .89, .244], [.174, .142, .174]);
      part('head', 'cylinder', [0, .965, .244], [.17, .009, .17]);
      const horizontal = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
      for (const y of [.818, .965]) part('metal', 'ring', [0, y, .244], [.174, .174, .174], horizontal);
      for (const side of [-1, 1] as const) {
        limb('shell', [side * .153, 1.065, .238], [-side * .067, .999, .367], .007);
      }
    } else {
      arm(-1, [-.19, 1.113, .075], [-.104, 1.152, .282]);
      arm(1, [.19, 1.113, .075], [.104, 1.152, .282]);
      for (const side of [-1, 1] as const) {
        const normal = new THREE.Vector3(side * .36, .08, .93).normalize();
        const rotation = new THREE.Quaternion().setFromUnitVectors(up, normal);
        part('metal', 'cylinder', [side * .105, 1.154, .327], [.109, .008, .109], rotation);
        part('metal', 'ball', [side * .105 + normal.x * .01, 1.154 + normal.y * .01, .327 + normal.z * .01], [.039, .016, .039], rotation);
      }
    }

    for (const [surface, parts] of batches) {
      const geometry = mergeGeometries(parts, false);
      if (!geometry) throw new Error(`Unable to merge ${role} placeholder ${surface}`);
      mergedGeometries.push(geometry);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const material = new THREE.MeshStandardMaterial(palette[surface]);
      materials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `${role}-${surface}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  } catch (error) {
    mergedGeometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    throw error;
  } finally {
    // Merging copies the data; temporary parts and reusable construction templates
    // never remain attached to the figure and must not survive construction.
    batches.forEach(parts => parts.forEach(geometry => geometry.dispose()));
    templates.forEach(geometry => geometry.dispose());
  }
}
