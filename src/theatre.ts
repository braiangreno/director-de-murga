import * as THREE from 'three';

interface Beam {
  mesh: THREE.Mesh;
  source: THREE.Vector3;
  target: THREE.Vector3;
  phase: number;
}

/** A stylized, open-front theatre shell. Coordinates share the ensemble's stage. */
export class TeatroDeVerano {
  readonly root = new THREE.Group();
  private beams: Beam[] = [];
  private ledTexture: THREE.CanvasTexture;
  private beamMaterials: THREE.MeshBasicMaterial[] = [];
  private up = new THREE.Vector3(0, 1, 0);
  private direction = new THREE.Vector3();
  private endpoint = new THREE.Vector3();

  constructor() {
    this.root.name = 'teatro-de-verano-concha-abierta';
    this.root.userData.bounds = { min: [-9.85, -.1, -7.75], max: [9.85, 10.4, 5.15] };
    const dark = new THREE.MeshStandardMaterial({ color: 0x10101c, roughness: .91 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x82778d, roughness: .48, metalness: .7 });
    const black = new THREE.MeshStandardMaterial({ color: 0x15121e, roughness: .65, metalness: .35 });
    const box = new THREE.BoxGeometry(1, 1, 1);
    // The deck follows the shell behind the opening instead of leaving rectangular
    // back corners visible through its curved sides when the camera orbits.
    const deckOutline = new THREE.Shape();
    deckOutline.moveTo(-9.5, -4.95); deckOutline.lineTo(9.5, -4.95); deckOutline.lineTo(9.5, .6);
    deckOutline.absellipse(0, .6, 9.5, 6.8, 0, Math.PI, false, 0); deckOutline.closePath();
    const deckGeometry = new THREE.ExtrudeGeometry(deckOutline, { depth: .46, bevelEnabled: false, curveSegments: 32 });
    deckGeometry.rotateX(-Math.PI / 2); deckGeometry.translate(0, -.03, 0);
    const deck = new THREE.Mesh(deckGeometry, dark); deck.name = 'tarima-negra'; deck.receiveShadow = true; this.root.add(deck);
    this.addBox(box, black, [18.65, .25, .2], [0, .08, 4.98], 'frente-tarima');
    const backZ = -6.53, backInset = .92;
    const backSection = Math.sqrt(1 - ((backZ + .6) / 6.8) ** 2) * backInset;
    const backdropOutline = new THREE.Shape();
    backdropOutline.absellipse(0, 0, 9.5 * backSection, 9.6 * backSection, 0, Math.PI, false, 0);
    backdropOutline.closePath();
    const backdropGeometry = new THREE.ExtrudeGeometry(backdropOutline, { depth: .12, bevelEnabled: false, curveSegments: 32 });
    backdropGeometry.translate(0, .44, backZ);
    const backdrop = new THREE.Mesh(backdropGeometry, black);
    backdrop.name = 'fondo-escenico-ajustado-a-boveda'; this.root.add(backdrop);
    this.buildShell();

    // Three actual lights; all the visible shafts and LED panels are unlit meshes.
    for (const side of [-1, 1]) {
      const wash = new THREE.PointLight(side < 0 ? 0xb639ff : 0xff32a7, 23, 18, 1.3);
      wash.position.set(side * 6.6, 4.3, -3.3);
      wash.castShadow = false;
      wash.name = 'wash-violeta-concha';
      this.root.add(wash);
    }
    const front = new THREE.SpotLight(0xdadfff, 26, 23, .88, .95, 1);
    front.position.set(0, 8.4, 1.8); front.target.position.set(0, .5, -.7);
    front.castShadow = false; front.name = 'luz-frontal-elenco';
    this.root.add(front, front.target);

    const beamTexture = this.makeBeamTexture();
    for (const color of [0xd1eeff, 0x9148ff, 0xfa3dff]) {
      this.beamMaterials.push(new THREE.MeshBasicMaterial({ color, map: beamTexture, transparent: true, opacity: .34, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, toneMapped: false }));
    }
    const barGeometry = new THREE.CylinderGeometry(1, 1, 1, 5);
    const bars: { from: THREE.Vector3; to: THREE.Vector3; radius: number }[] = [];
    const fixtureMatrices: THREE.Matrix4[] = [];
    const lenses: { matrix: THREE.Matrix4; color: THREE.Color }[] = [];
    const fixtureGeometry = new THREE.CylinderGeometry(.13, .17, .38, 10);
    const lensGeometry = new THREE.CircleGeometry(.115, 10);
    const coneGeometry = new THREE.CylinderGeometry(.035, .8, 1, 12, 1, true);
    const dummy = new THREE.Object3D();
    const configurations = [
      { y: 8.3, z: -1, width: 9.4 },
      { y: 6.8, z: -2.75, width: 11.6 },
      { y: 5.45, z: -4.45, width: 10.5 },
    ];
    configurations.forEach((truss, row) => {
      const half = truss.width / 2, step = truss.width / 18;
      for (const dy of [-.19, .19]) for (const dz of [-.15, .15]) bars.push({ from: new THREE.Vector3(-half, truss.y + dy, truss.z + dz), to: new THREE.Vector3(half, truss.y + dy, truss.z + dz), radius: .024 });
      for (let i = 0; i <= 18; i++) {
        const x = -half + i * step;
        bars.push({ from: new THREE.Vector3(x, truss.y - .19, truss.z + .15), to: new THREE.Vector3(x, truss.y + .19, truss.z + .15), radius: .015 });
        if (i < 18) for (const dz of [-.15, .15]) bars.push({ from: new THREE.Vector3(x, truss.y - .19, truss.z + dz), to: new THREE.Vector3(x + step, truss.y + .19, truss.z + dz), radius: .014 });
      }
      for (const x of [-half + .4, half - .4]) {
        const ceilingY = .44 + 9.6 * Math.sqrt(1 - (x / 9.5) ** 2 - ((truss.z + .6) / 6.8) ** 2);
        bars.push({ from: new THREE.Vector3(x, truss.y + .22, truss.z), to: new THREE.Vector3(x, ceilingY - .06, truss.z), radius: .012 });
      }
      for (let i = 0; i < 7; i++) {
        const x = (i - 3) * (truss.width - 1.4) / 6;
        const source = new THREE.Vector3(x, truss.y - .66, truss.z);
        const target = new THREE.Vector3(x * .68 + Math.sin(i * 2.4 + row) * .65, .55, .9 - row * 1.25);
        dummy.position.copy(source).add(new THREE.Vector3(0, .17, 0));
        dummy.quaternion.setFromUnitVectors(this.up, this.direction.copy(source).sub(target).normalize());
        dummy.scale.set(1, 1, 1); dummy.updateMatrix(); fixtureMatrices.push(dummy.matrix.clone());
        dummy.position.copy(source); dummy.lookAt(target); dummy.updateMatrix();
        const colorIndex = (i + row * 2) % 3;
        lenses.push({ matrix: dummy.matrix.clone(), color: new THREE.Color([0xe7faff, 0xb780ff, 0xff78ee][colorIndex]) });
        const beam = new THREE.Mesh(coneGeometry, this.beamMaterials[colorIndex]);
        beam.name = 'haz-de-luz'; beam.renderOrder = 2;
        this.root.add(beam); this.beams.push({ mesh: beam, source, target, phase: i * 1.7 + row * 2.3 });
      }
    });
    const trussMesh = new THREE.InstancedMesh(barGeometry, metal, bars.length);
    trussMesh.name = 'tres-varas-reticuladas';
    bars.forEach((bar, index) => { this.between(dummy, bar.from, bar.to, bar.radius); trussMesh.setMatrixAt(index, dummy.matrix); });
    trussMesh.computeBoundingSphere(); this.root.add(trussMesh);
    const fixtures = new THREE.InstancedMesh(fixtureGeometry, black, fixtureMatrices.length);
    fixtures.name = 'focos-colgantes'; fixtureMatrices.forEach((matrix, i) => fixtures.setMatrixAt(i, matrix));
    fixtures.computeBoundingSphere(); this.root.add(fixtures);
    const bulbs = new THREE.InstancedMesh(lensGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, side: THREE.DoubleSide }), lenses.length);
    bulbs.name = 'lentes-encendidas'; lenses.forEach((lens, i) => { bulbs.setMatrixAt(i, lens.matrix); bulbs.setColorAt(i, lens.color); });
    bulbs.computeBoundingSphere(); this.root.add(bulbs);

    this.ledTexture = this.makeLedTexture();
    const ledMaterial = new THREE.MeshBasicMaterial({ map: this.ledTexture, color: 0x68dfff, toneMapped: false });
    // Freestanding LED cabinets sit on the deck, behind the ensemble. Their full
    // volume (including the rear corners) stays inside the curved theatre shell.
    const panels = [
      { x: -6.6, z: -3.2, width: 1.25, height: 3.4 },
      { x: -4.3, z: -4.25, width: 1.2, height: 3.15 },
      { x: -1.85, z: -5.05, width: 1.35, height: 2.8 },
      { x: 1.85, z: -5.05, width: 1.35, height: 2.8 },
      { x: 4.3, z: -4.25, width: 1.2, height: 3.15 },
      { x: 6.6, z: -3.2, width: 1.25, height: 3.4 },
    ];
    const deckHeight = .43, baseHeight = .1, cabinetDepth = .28, bezel = .06;
    panels.forEach(({ x, z, width, height }, i) => {
      const screen = new THREE.Group();
      screen.name = `pantalla-led-${i + 1}`;
      screen.position.set(x, deckHeight, z);
      const centerY = baseHeight + height / 2;
      screen.add(
        this.addBox(box, metal, [width + .24, baseHeight, .52], [0, baseHeight / 2, -cabinetDepth / 2], 'base-led-sobre-tarima'),
        this.addBox(box, black, [width, height, cabinetDepth], [0, centerY, -cabinetDepth / 2], 'gabinete-led-con-marco'),
        this.addBox(box, ledMaterial, [width - bezel * 2, height - bezel * 2, .024], [0, centerY, .004], 'superficie-led'),
      );
      screen.children.forEach(child => { if (child instanceof THREE.Mesh && child.name !== 'superficie-led') child.castShadow = true; });
      this.root.add(screen);
    });
    // Small monitor wedges keep the apron readable without obscuring the markers.
    for (const x of [-6.5, -3.25, 0, 3.25, 6.5]) {
      const wedge = this.addBox(box, black, [1.15, .38, .7], [x, .66, 4.3], 'retorno-de-escenario');
      wedge.rotation.x = -.18;
    }
    this.update(0, true);
  }

  private addBox(geometry: THREE.BoxGeometry, material: THREE.Material, size: number[], position: number[], name: string) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(size[0], size[1], size[2]); mesh.position.set(position[0], position[1], position[2]); mesh.name = name;
    this.root.add(mesh); return mesh;
  }

  private between(object: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, radius: number) {
    this.direction.copy(to).sub(from);
    object.position.copy(from).add(to).multiplyScalar(.5);
    object.scale.set(radius, this.direction.length(), radius);
    object.quaternion.setFromUnitVectors(this.up, this.direction.normalize()); object.updateMatrix();
  }

  private buildShell() {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#956577'; context.fillRect(0, 0, 1024, 512);
    const columns = 40, rows = 16, w = canvas.width / columns, h = canvas.height / rows;
    for (let row = 0; row < rows; row++) for (let column = -1; column < columns + 1; column++) {
      const shade = Math.sin(column * 15.71 + row * 5.13) * .5 + .5;
      const offset = row % 2 ? w * .5 : 0;
      context.fillStyle = `rgb(${63 + shade * 28},${34 + shade * 17},${51 + shade * 25})`;
      context.fillRect(column * w + offset + 1.6, row * h + 1.5, w - 3.2, h - 3);
      context.strokeStyle = 'rgba(232,167,157,.16)';
      context.strokeRect(column * w + offset + 2.2, row * h + 2.2, w - 4.4, h - 4.4);
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
    const groups: { start: number; count: number; material: number }[] = [];
    const across = 48, deep = 18, thickness = .24;
    const point = (i: number, j: number, outer: boolean) => {
      const theta = i / across * Math.PI, phi = j / deep * Math.PI / 2, extra = outer ? thickness : 0;
      return new THREE.Vector3((9.5 + extra) * Math.cos(theta) * Math.cos(phi), .44 + (9.6 + extra) * Math.sin(theta) * Math.cos(phi), -.6 - (6.8 + extra) * Math.sin(phi));
    };
    // Separate inner/outer faces plus the opening and floor edges form a real
    // shell volume. The outer surface is visible as the camera moves sideways.
    for (const outer of [false, true]) {
      const start = indices.length, offset = positions.length / 3;
      for (let j = 0; j <= deep; j++) for (let i = 0; i <= across; i++) {
        positions.push(...point(i, j, outer).toArray()); uvs.push(i / across, j / deep);
        if (i < across && j < deep) {
          const a = offset + j * (across + 1) + i, b = a + 1, c = a + across + 2, d = a + across + 1;
          if (outer) indices.push(a, c, b, a, d, c);
          else indices.push(a, b, c, a, c, d);
        }
      }
      groups.push({ start, count: indices.length - start, material: outer ? 1 : 0 });
    }
    const edgeStart = indices.length;
    const edge = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => {
      const offset = positions.length / 3;
      for (const vertex of [a, b, c, d]) positions.push(...vertex.toArray());
      uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
      indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
    };
    for (let i = 0; i < across; i++) edge(point(i, 0, false), point(i, 0, true), point(i + 1, 0, true), point(i + 1, 0, false));
    for (let j = 0; j < deep; j++) {
      edge(point(0, j, false), point(0, j + 1, false), point(0, j + 1, true), point(0, j, true));
      edge(point(across, j, false), point(across, j, true), point(across, j + 1, true), point(across, j + 1, false));
    }
    groups.push({ start: edgeStart, count: indices.length - edgeStart, material: 2 });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    groups.forEach(group => geometry.addGroup(group.start, group.count, group.material));
    const shell = new THREE.Mesh(geometry, [
      new THREE.MeshStandardMaterial({ map: texture, color: 0xcfa7cc, roughness: .96, emissive: 0x41103b, emissiveIntensity: .3 }),
      new THREE.MeshStandardMaterial({ map: texture, color: 0x73525e, roughness: .94, emissive: 0x281324, emissiveIntensity: .08 }),
      new THREE.MeshStandardMaterial({ color: 0x805264, roughness: .88 }),
    ]);
    shell.name = 'boveda-curva-reticula-terracota'; shell.receiveShadow = true; this.root.add(shell);
  }

  private makeBeamTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 128;
    const context = canvas.getContext('2d')!;
    const fade = context.createLinearGradient(0, 0, 0, 128);
    fade.addColorStop(0, 'rgba(255,255,255,.82)'); fade.addColorStop(.12, 'rgba(255,255,255,.48)'); fade.addColorStop(.65, 'rgba(255,255,255,.18)'); fade.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = fade; context.fillRect(0, 0, 32, 128);
    return new THREE.CanvasTexture(canvas);
  }

  private makeLedTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#071b4e'; context.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 4) {
      const offset = Math.sin(y * .029) * 37 + y * .33;
      for (let x = 0; x < 256; x += 4) {
        const band = ((x + offset) % 110) / 110;
        context.fillStyle = band < .2 ? '#72fff0' : band < .46 ? '#20aeff' : band < .64 ? '#8747ff' : '#102b78';
        context.fillRect(x, y, 3, 2);
      }
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  update(time: number, reducedMotion: boolean) {
    const seconds = reducedMotion ? 0 : time * .001;
    this.beams.forEach(beam => {
      this.endpoint.copy(beam.target);
      this.endpoint.x += reducedMotion ? 0 : Math.sin(seconds * .34 + beam.phase) * .65;
      this.endpoint.z += reducedMotion ? 0 : Math.cos(seconds * .27 + beam.phase) * .32;
      this.direction.copy(beam.source).sub(this.endpoint);
      beam.mesh.position.copy(beam.source).add(this.endpoint).multiplyScalar(.5);
      beam.mesh.scale.set(1, this.direction.length(), 1);
      beam.mesh.quaternion.setFromUnitVectors(this.up, this.direction.normalize());
    });
    this.ledTexture.offset.set(seconds * .015 % 1, seconds * .009 % 1);
    // Slow breathing only; reduced motion restores one fixed lighting composition.
    this.beamMaterials.forEach((material, index) => { material.opacity = .34 + (reducedMotion ? 0 : Math.sin(seconds * .7 + index * 2) * .035); });
  }
}
