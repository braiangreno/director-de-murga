import * as THREE from 'three';
import { OUTFIT_OPTIONS, type ModularCharacter } from './character-system';

/** Props have their own resources; the character keeps ownership of its shared rig. */
export function attachStageInstruments(character: ModularCharacter, role: string): () => void {
  if (!['bombo', 'redoblante', 'platillos'].includes(role)) return () => {};
  const groups: THREE.Group[] = [];
  const geometries = new Set<THREE.BufferGeometry>();
  const shell = new THREE.MeshStandardMaterial({ color: 0x9f285c, roughness: .5 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xdab35a, metalness: .65, roughness: .3 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xf3e5c3, roughness: .85 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x85542d, roughness: .8 });
  const materials = [shell, metal, skin, wood];
  function mesh(group: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, position: number[] = [0, 0, 0]) {
    geometries.add(geometry);
    const result = new THREE.Mesh(geometry, material);
    result.position.set(position[0], position[1], position[2]);
    result.castShadow = true; result.receiveShadow = true; group.add(result); return result;
  }
  function attached(socketName: string, worldPosition: THREE.Vector3) {
    const group = new THREE.Group(); group.name = `${role}-${socketName}`;
    group.position.copy(worldPosition); character.root.add(group);
    character.root.updateMatrixWorld(true);
    character.getSocket(socketName)?.attach(group);
    groups.push(group); return group;
  }
  if (role === 'platillos') {
    for (const [socket, sign] of [['hand_l', 1], ['hand_r', -1]] as const) {
      const target = character.getSocket(socket);
      const group = new THREE.Group(); group.name = `platillo-${socket}`;
      (target ?? character.root).add(group); groups.push(group);
      group.position.z = .025;
      const disc = mesh(group, new THREE.CylinderGeometry(.14, .14, .009, 24), metal);
      disc.rotation.z = sign * Math.PI / 2;
      const dome = mesh(group, new THREE.SphereGeometry(.043, 12, 8), metal);
      dome.scale.set(.35, 1, 1);
    }
  } else {
    const big = role === 'bombo', radius = big ? .22 : .18;
    const outfit = OUTFIT_OPTIONS.find(option => option.id === character.selection.outfitId) as { frontClearance?: number } | undefined;
    const front = outfit?.frontClearance;
    const clothFront = typeof front === 'number' && Number.isFinite(front) ? Math.max(.17, front) : .17;
    // Reserve space for the selected garment's chest folds before placing the drum's back face.
    const drumDepth = clothFront + (big ? .128 : radius) + .025;
    const drum = attached('back_instrument', new THREE.Vector3(0, big ? .85 : .83, drumDepth));
    const cylinder = mesh(drum, new THREE.CylinderGeometry(radius, radius, big ? .25 : .12, 24), shell);
    if (big) cylinder.rotation.x = Math.PI / 2;
    for (const sign of [-1, 1]) {
      const pos = big ? [0, 0, sign * .128] : [0, sign * .063, 0];
      const head = mesh(drum, new THREE.CylinderGeometry(radius, radius, .006, 24), skin, pos);
      const rim = mesh(drum, new THREE.TorusGeometry(radius, .012, 5, 24), metal, pos);
      if (big) head.rotation.x = Math.PI / 2;
      else rim.rotation.x = Math.PI / 2;
    }
    for (const socket of ['hand_l', 'hand_r']) {
      const hand = character.getSocket(socket), stick = new THREE.Group();
      stick.name = `${role}-baqueta-${socket}`; (hand ?? character.root).add(stick); groups.push(stick);
      const shaft = mesh(stick, new THREE.CylinderGeometry(.007, .007, .22, 7), wood, [0, 0, .09]);
      shaft.rotation.x = Math.PI / 2;
      if (big) mesh(stick, new THREE.SphereGeometry(.022, 10, 8), skin, [0, 0, .2]);
    }
  }
  return () => {
    groups.forEach(group => { group.removeFromParent(); group.clear(); });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
  };
}
