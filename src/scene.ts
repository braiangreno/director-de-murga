import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EVENTS, TABLADOS_START_DAY, type State } from './simulation';
import { TeatroDeVerano } from './theatre';
import { createStagePlaceholder } from './stage-placeholders';
import { loadModularCharacter, OUTFIT_OPTIONS, type CharacterSelection, type ModularCharacter } from './character-system';
import { memberAppearance, parseCosmetics, type CosmeticsState } from './cosmetics-state';
import { attachStageInstruments } from './stage-instruments';
import { DEFAULT_VISUAL_SETTINGS, FrameBudget, getRenderProfile, parseVisualSettings, type VisualSettings } from './render-policy';

export type SceneVenue = 'rehearsal' | 'carnival' | 'theatre';
export function getSceneVenue(state: State): SceneVenue {
  if (state.productionStarted && EVENTS.some(event => event.day === state.day && !(event.day === EVENTS[0].day && state.admissionExempt))) return 'theatre';
  return state.day >= TABLADOS_START_DAY ? 'carnival' : 'rehearsal';
}

type VisualRole = 'chorister' | 'bombo' | 'redoblante' | 'platillos' | 'director';
interface PositionSlot {
  memberId: string;
  index: number;
  role: VisualRole;
  markerLabel: string;
  root: THREE.Group;
  anchor: THREE.Vector3;
  heading: number;
  assetKey: string | null;
  loaded: boolean;
  visualWidth: number;
  character?: ModularCharacter;
  disposeInstruments?: () => void;
  error?: string;
}

const teal = 0x1bc8be, coral = 0xff7759, gold = 0xffd447;
const ROLE_APPEARANCE: Record<VisualRole, { color: number; label: string; ink: string }> = {
  chorister: { color: teal, label: 'CORO', ink: '#25183f' },
  bombo: { color: coral, label: 'BOM', ink: '#25183f' },
  redoblante: { color: 0xb38aec, label: 'RED', ink: '#25183f' },
  platillos: { color: gold, label: 'PLA', ink: '#25183f' },
  director: { color: 0xdb247b, label: 'DIR', ink: '#ffffff' },
};

function characterStageWidth(appearance: CharacterSelection): number {
  // Authored from the singing/idle envelope, rather than the wide A-pose or hat height.
  const outfit = OUTFIT_OPTIONS.find(option => option.id === appearance.outfitId) as { stageWidth?: number } | undefined;
  const fittedWidth = outfit?.stageWidth;
  return (typeof fittedWidth === 'number' && Number.isFinite(fittedWidth) && fittedWidth > 0 ? fittedWidth : .69) * appearance.heightScale;
}

export class MurgaScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  private controls: OrbitControls;
  private homeDistance = 0;
  private homePosition = new THREE.Vector3();
  private slots: PositionSlot[] = [];
  private troupe = new THREE.Group();
  private rehearsalYard = new THREE.Group();
  private carnivalStage = new THREE.Group();
  private theatre = new TeatroDeVerano();
  private venue: SceneVenue = 'rehearsal';
  private ambientLight = new THREE.HemisphereLight(0xfff8ef, 0x655288, 2.5);
  private sun = new THREE.DirectionalLight(0xfff8ef, 2.6);
  private fill = new THREE.DirectionalLight(0x9df6ef, 1.1);
  private motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  private reduced = this.motionPreference.matches;
  private visualSettings: VisualSettings = { ...DEFAULT_VISUAL_SETTINGS };
  private profile = getRenderProfile(this.visualSettings.quality, window.devicePixelRatio);
  private frameBudget = new FrameBudget();
  private externalPaused = false;
  private contextLost = false;
  private intersecting = typeof IntersectionObserver === 'undefined';
  private hasSize = false;
  private schedulerReady = false;
  private loopActive = false;
  private renderRequest: number | null = null;
  private dirty = true;
  private renderedFrames = 0;
  private animationTime = 0;
  private state?: State;
  private performingUntil = 0;
  private lastFrame: number | null = null;
  private lastDiagnostics = 0;
  private observer: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;
  private disposed = false;
  private cosmetics = parseCosmetics(null);

  constructor(private host: HTMLElement, private onModel: (loaded: boolean) => void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(this.profile.pixelRatio);
    this.renderer.shadowMap.enabled = this.profile.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x21123f, 0);
    this.renderer.domElement.setAttribute('role', 'region');
    this.renderer.domElement.setAttribute('aria-roledescription', 'escenario 3D interactivo');
    this.renderer.domElement.setAttribute('aria-describedby', 'camera-help');
    this.renderer.domElement.tabIndex = 0;
    host.append(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = false;
    this.controls.rotateSpeed = .55;
    this.controls.zoomSpeed = .7;
    this.controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    this.controls.addEventListener('change', this.onCameraChange);
    this.renderer.domElement.addEventListener('keydown', this.onCameraKey);
    this.scene.add(this.ambientLight);
    const sun = this.sun;
    sun.position.set(-5, 12, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
    sun.shadow.normalBias = .04; this.scene.add(sun);
    const fill = this.fill;
    fill.position.set(8, 4, -5); this.scene.add(fill);
    this.buildRehearsalYard(); this.buildCarnivalStage();
    this.scene.add(this.rehearsalYard, this.carnivalStage, this.theatre.root, this.troupe);
    this.setEnvironment('rehearsal');
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host); this.resize();
    this.renderer.domElement.addEventListener('webglcontextlost', this.onLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onRestored);
    this.motionPreference.addEventListener('change', this.onMotionChange);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    if (typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver(entries => {
        if (this.disposed) return;
        const entry = entries[entries.length - 1];
        if (!entry) return;
        this.intersecting = entry.isIntersecting && entry.intersectionRatio > 0;
        this.refreshRenderState();
      });
      this.intersectionObserver.observe(host);
    }
    this.schedulerReady = true;
    this.refreshRenderState();
  }

  private onLost = (event: Event) => {
    event.preventDefault(); this.contextLost = true;
    this.host.classList.add('context-lost'); this.refreshRenderState();
  };
  private onRestored = () => {
    if (this.disposed) return;
    this.contextLost = false; this.host.classList.remove('context-lost');
    this.resize(); this.refreshRenderState(); this.invalidate();
  };
  private onMotionChange = () => {
    this.reduced = this.motionPreference.matches || this.visualSettings.reducedMotion;
    this.refreshRenderState(); this.invalidate();
  };
  private onVisibilityChange = () => this.refreshRenderState();
  private onCameraChange = () => this.invalidate();

  setVisualSettings(settings: VisualSettings) {
    if (this.disposed) return;
    this.visualSettings = parseVisualSettings(JSON.stringify(settings));
    this.reduced = this.motionPreference.matches || this.visualSettings.reducedMotion;
    this.frameBudget.reset();
    this.lastFrame = null;
    this.resize(); this.refreshRenderState(); this.invalidate();
  }

  /** External permission, e.g. while an opaque modal owns the screen. */
  setPaused(paused: boolean) {
    if (this.disposed || this.externalPaused === paused) return;
    this.externalPaused = paused; this.refreshRenderState();
  }

  private canRender() {
    return this.schedulerReady && !this.disposed && !document.hidden && !this.contextLost
      && !this.externalPaused && this.intersecting && this.hasSize;
  }

  private refreshRenderState() {
    if (!this.schedulerReady) return;
    const active = this.canRender();
    const running = active && !this.reduced;
    this.host.dataset.renderState = !active ? 'paused' : running ? 'running' : 'still';
    this.host.dataset.renderQuality = this.visualSettings.quality;
    this.host.dataset.renderedFrames = String(this.renderedFrames);
    this.host.dataset.fpsLimit = String(this.profile.fps);
    this.host.dataset.pixelRatio = String(this.profile.pixelRatio);
    if (running !== this.loopActive) {
      this.loopActive = running;
      this.frameBudget.reset(); this.lastFrame = null;
      this.renderer.setAnimationLoop(running ? this.frame : null);
    }
    if (!active || running) {
      if (this.renderRequest !== null) cancelAnimationFrame(this.renderRequest);
      this.renderRequest = null;
    }
    if (!active) {
      this.dirty = true;
      this.frameBudget.reset(); this.lastFrame = null;
    } else if (!running) this.invalidate();
  }

  private invalidate() {
    this.dirty = true;
    if (!this.canRender() || !this.reduced || this.renderRequest !== null) return;
    this.renderRequest = requestAnimationFrame(this.renderStill);
  }

  private renderStill = (time: number) => {
    this.renderRequest = null;
    if (!this.canRender() || !this.reduced || !this.dirty) return;
    if (!this.frameBudget.shouldRender(time, this.profile.fps)) { this.invalidate(); return; }
    this.draw(time, false);
  };
  private onCameraKey = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') this.resetCamera();
    else if (['+', '=', '-'].includes(event.key)) this.zoomCamera(event.key === '-' ? 1.15 : 1 / 1.15);
    else {
      const offset = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
      offset.theta += event.key === 'ArrowLeft' ? -.08 : event.key === 'ArrowRight' ? .08 : 0;
      offset.phi += event.key === 'ArrowUp' ? -.06 : event.key === 'ArrowDown' ? .06 : 0;
      this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(offset));
      this.controls.update();
    }
  };

  resetCamera() {
    this.camera.position.copy(this.homePosition);
    this.controls.update();
  }

  zoomCamera(factor: number) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance));
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }
  private material(color: number, roughness = .85) { return new THREE.MeshStandardMaterial({ color, roughness }); }
  private box(w: number, h: number, d: number, color: number, x: number, y: number, z: number, parent: THREE.Object3D) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.material(color));
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  private cylinder(top: number, bottom: number, h: number, color: number, x: number, y: number, z: number, parent: THREE.Object3D, segments = 16) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, h, segments), this.material(color));
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }

  private buildRehearsalYard() {
    const room = this.rehearsalYard;
    room.name = 'patio-abierto-de-ensayo';
    this.box(15.8, .12, 9.1, 0x583374, 0, -.05, 0, room);
    this.box(15, .4, 8.3, 0x72509a, 0, .2, 0, room);
    this.box(15, .06, 8.3, 0xe9dbf4, 0, .43, 0, room);
    for (let x = -7.2; x < 7.5; x += .8) this.box(.016, .01, 8.2, 0xb591cd, x, .465, 0, room);
    // Open rehearsal yard: only low furniture, no enclosing walls or canopy.
    this.box(15, .12, .16, 0xdb247b, 0, .39, -4.12, room);
    this.box(2.5, .1, .85, 0xffd447, 4.1, 1.32, -2.95, room);
    for (const x of [3.15, 5.05]) this.box(.12, .87, .58, 0x68428a, x, .86, -2.95, room);
    this.box(.57, .015, .38, 0xfff8ef, 4, 1.385, -2.97, room);
    for (const x of [-4.9, 4.9]) {
      this.box(.64, .13, 2.45, 0xffd447, x, .88, 2.6, room);
      for (const z of [1.7, 3.5]) this.box(.46, .42, .12, 0x68428a, x, .65, z, room);
    }
    this.box(1.35, .46, .63, 0x1bc8be, 3.8, .72, 2.8, room);
    this.box(1.4, .06, .66, 0x62ded5, 3.8, .98, 2.8, room);
    for (const x of [-5.75, 5.75]) {
      this.cylinder(.05, .07, 3.7, 0x68428a, x, 2.32, -3.55, room);
      this.box(.65, .17, .3, 0xffd447, x, 4.18, -3.55, room);
      this.box(.54, .06, .22, 0xfff8ef, x, 4.065, -3.55, room);
    }
  }

  private buildCarnivalStage() {
    const stage = this.carnivalStage;
    stage.name = 'escenario-abierto-de-carnaval';
    this.cylinder(8.6, 8.6, .28, 0x583374, 0, -.32, 0, stage, 64);
    this.cylinder(7.17, 7.3, .6, 0xdb247b, 0, .03, 0, stage, 64);
    this.cylinder(7.2, 7.2, .13, 0xead6f3, 0, .37, 0, stage, 64);
    for (let i = -6; i <= 6; i++) this.box(.024, .01, Math.sqrt(7.17 ** 2 - i * i) * 2, 0xbe9cd3, i, .442, 0, stage);
    this.box(3.2, .18, 1, 0xff7759, 0, -.1, 7.3, stage);
    this.box(2.8, .25, .65, 0xffd447, 0, .12, 6.85, stage);
    // Freestanding lighting and string lights leave the back, sides and sky open.
    for (const x of [-5.8, 5.8]) {
      this.cylinder(.08, .12, 4.8, 0x68428a, x, 2.65, -2.8, stage);
      this.box(1.1, .12, .18, gold, x, 5.08, -2.8, stage);
      for (const offset of [-.33, .33]) {
        const spotlight = this.cylinder(.16, .16, .3, 0x25183f, x + offset, 4.88, -2.67, stage);
        spotlight.rotation.x = Math.PI / 4;
      }
    }
    const points: THREE.Vector3[] = [];
    for (const x of [-6.6, 6.6]) this.cylinder(.055, .09, 5.65, 0x68428a, x, 2.575, 2.2, stage);
    for (let i = 0; i <= 30; i++) {
      const x = -6.6 + i * .44, y = 5.4 - Math.sin(i / 30 * Math.PI) * 1.25;
      points.push(new THREE.Vector3(x, y, 2.2));
      if (i % 2 === 0) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(.073, 8, 6), new THREE.MeshStandardMaterial({ color: 0xfff8ef, emissive: 0xffd447, emissiveIntensity: 1.5 }));
        bulb.position.set(x, y - .1, 2.2); stage.add(bulb);
      } else {
        const flag = new THREE.Mesh(new THREE.ConeGeometry(.21, .42, 3), this.material([teal, coral, gold][i % 3]));
        flag.position.set(x, y - .24, 2.2); flag.rotation.z = Math.PI; stage.add(flag);
      }
    }
    stage.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x5c3976 })));
    for (const x of [-4.7, 4.7]) {
      this.box(.7, 1.25, .65, 0x432958, x, 1.03, 2.2, stage);
      for (const y of [.8, 1.35]) {
        const speaker = this.cylinder(.23, .23, .03, 0x21123f, x, y, 2.54, stage);
        speaker.rotation.x = Math.PI / 2;
      }
    }
    for (let i = 0; i < 10; i++) {
      const angle = .28 + i * .29, x = Math.cos(angle) * 8.4, z = Math.sin(angle) * 8.4;
      this.cylinder(.2, .3, .5, [0x704294, 0x1bc8be, 0xff7759][i % 3], x, .18, z, stage);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6), this.material(0xc79977));
      head.position.set(x, .55, z); stage.add(head);
    }
  }

  private positionMarker(role: VisualRole, label: string) {
    const marker = new THREE.Group();
    const appearance = ROLE_APPEARANCE[role];
    marker.name = `posicion-pendiente-${role}-${label}`;
    marker.add(createStagePlaceholder(role, appearance.color));
    const radius = role === 'chorister' ? .28 : .38;
    this.cylinder(radius, radius, .045, appearance.color, 0, .027, 0, marker, role === 'director' ? 4 : 24);
    const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 112;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = `#${appearance.color.toString(16).padStart(6, '0')}`;
      context.beginPath();
      if (typeof context.roundRect === 'function') context.roundRect(4, 4, 184, 104, 18);
      else context.rect(4, 4, 184, 104);
      context.fill();
      context.strokeStyle = '#fff8ef'; context.lineWidth = 5; context.stroke();
      context.font = '800 48px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillStyle = appearance.ink; context.fillText(label, 96, 57);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
      const width = role === 'chorister' ? .45 : .66;
      badge.scale.set(width, width * 112 / 192, 1); badge.position.set(0, .14, .34); marker.add(badge);
    }
    if (role === 'director') {
      const beat = new THREE.Mesh(new THREE.TorusGeometry(.51, .024, 6, 32, Math.PI * 1.5), new THREE.MeshBasicMaterial({color: gold}));
      beat.rotation.x = -Math.PI / 2; beat.position.y = .07; marker.add(beat);
    }
    return marker;
  }

  private positionSlot(slot: PositionSlot, chorusIndex: number, chorusCount: number) {
    if (slot.role === 'chorister') {
      const x = (chorusIndex - (chorusCount - 1) / 2) * .69;
      slot.root.position.set(x, .47, -.15 + Math.abs(x) * .09);
      slot.root.rotation.y = x * -.025;
    } else if (slot.role === 'director') {
      slot.root.position.set(0, .47, 2.45); slot.root.rotation.y = Math.PI;
    } else {
      const batteryIndex = ['bombo', 'redoblante', 'platillos'].indexOf(slot.role);
      slot.root.position.set((batteryIndex - 1) * 1.5, .47, -2.35); slot.root.rotation.y = 0;
    }
    slot.anchor.copy(slot.root.position); slot.heading = slot.root.rotation.y;
  }

  private spaceChorus() {
    const chorus = this.slots.filter(slot => slot.role === 'chorister');
    const gap = .13;
    const width = chorus.reduce((sum, slot) => sum + slot.visualWidth, 0) + Math.max(0, chorus.length - 1) * gap;
    let cursor = -width / 2;
    for (const slot of chorus) {
      const x = cursor + slot.visualWidth / 2;
      slot.anchor.set(x, .47, -.15 + Math.abs(x) * .09);
      slot.heading = x * -.025;
      slot.root.position.copy(slot.anchor); slot.root.rotation.y = slot.heading;
      cursor += slot.visualWidth + gap;
    }
  }

  private setEnvironment(venue: SceneVenue) {
    const changed = this.venue !== venue;
    this.venue = venue;
    this.rehearsalYard.visible = venue === 'rehearsal';
    this.carnivalStage.visible = venue === 'carnival';
    this.theatre.root.visible = venue === 'theatre';
    this.ambientLight.intensity = venue === 'theatre' ? .65 : 2.5;
    this.sun.intensity = venue === 'theatre' ? 1.2 : 2.6;
    this.fill.intensity = venue === 'theatre' ? .65 : 1.1;
    this.host.dataset.environment = venue;
    const name = venue === 'theatre' ? 'Teatro de Verano, con bóveda curva, pantallas y haces de luz violeta, azul y blanco.'
      : venue === 'carnival' ? 'Tablado de carnaval al aire libre.' : 'Patio de ensayo al aire libre.';
    this.renderer.domElement.setAttribute('aria-label', `${name} Arrastrá para girar y usá zoom para acercarte. Batería detrás del coro; director al centro, adelante, mirando al elenco. Elenco 3D con cuerpo y vestuario compartidos.`);
    if (changed) this.resize(true);
    this.invalidate();
  }

  private syncModels() {
    this.slots.forEach(slot => {
      if (slot.assetKey === 'murga-human-v1') return;
      slot.assetKey = 'murga-human-v1';
      slot.error = undefined;
      void this.loadComponent(slot);
    });
    this.spaceChorus(); this.reportModels();
  }

  private async loadComponent(slot: PositionSlot) {
    let character: ModularCharacter | undefined;
    try {
      character = await loadModularCharacter(memberAppearance(this.cosmetics, slot.memberId, slot.index));
      if (this.disposed || !this.slots.includes(slot)) { character.dispose(); return; }
      character.setSelection(memberAppearance(this.cosmetics, slot.memberId, slot.index));
      this.clearSlot(slot);
      slot.character = character; slot.root.add(character.root); slot.loaded = true;
      slot.disposeInstruments = attachStageInstruments(character, slot.role);
      slot.visualWidth = characterStageWidth(character.selection);
      character.setAnimation(slot.role === 'director' ? 'conduct' : slot.role === 'chorister' ? 'sing' : 'percussion');
      character.update((slot.index % 5) * .02);
      slot.error = undefined;
      this.spaceChorus(); this.reportModels(); this.invalidate();
    } catch (error) {
      if (!this.disposed && this.slots.includes(slot)) {
        this.clearSlot(slot); slot.loaded = false; slot.visualWidth = .46;
        slot.root.add(this.positionMarker(slot.role, slot.markerLabel));
        slot.assetKey = null;
        slot.error = error instanceof Error ? error.message : 'No se pudo cargar el personaje';
        this.spaceChorus(); this.reportModels(); this.invalidate();
      }
      character?.dispose();
    }
  }

  setCosmetics(cosmetics: CosmeticsState) {
    if (this.disposed) return;
    this.cosmetics = cosmetics;
    this.slots.forEach(slot => {
      const appearance = memberAppearance(cosmetics, slot.memberId, slot.index);
      const previousOutfit = slot.character?.selection.outfitId;
      slot.character?.setSelection(appearance);
      if (slot.character && previousOutfit !== appearance.outfitId) {
        slot.disposeInstruments?.();
        slot.disposeInstruments = attachStageInstruments(slot.character, slot.role);
      }
      if (slot.loaded) slot.visualWidth = characterStageWidth(appearance);
    });
    this.spaceChorus(); this.invalidate();
  }

  private reportModels() {
    const loaded = this.slots.length > 0 && this.slots.every(slot => slot.loaded);
    const firstError = this.slots.find(slot => slot.error)?.error;
    this.host.dataset.wardrobeStatus = loaded ? 'ready' : firstError ? 'unavailable' : 'loading';
    if (firstError) this.host.dataset.characterError = firstError;
    else delete this.host.dataset.characterError;
    this.host.dataset.modelsLoaded = String(this.slots.filter(slot => slot.loaded).length);
    this.onModel(loaded);
  }

  private resize(reset = false) {
    if (this.disposed) return;
    this.profile = getRenderProfile(this.visualSettings.quality, window.devicePixelRatio);
    if (this.renderer.getPixelRatio() !== this.profile.pixelRatio) this.renderer.setPixelRatio(this.profile.pixelRatio);
    if (this.renderer.shadowMap.enabled !== this.profile.shadows) {
      this.renderer.shadowMap.enabled = this.profile.shadows;
      this.scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => { material.needsUpdate = true; });
      });
    }
    const { width, height } = this.host.getBoundingClientRect();
    this.hasSize = width > 0 && height > 0;
    if (!this.hasSize) { this.refreshRenderState(); return; }
    const previousOffset = this.camera.position.clone().sub(this.controls.target);
    const previousHomeDistance = this.homeDistance;
    this.renderer.setSize(width, height); this.camera.aspect = width / height;
    const theatre = this.venue === 'theatre';
    this.camera.fov = 42;
    this.controls.target.set(0, theatre ? 3.6 : 1.7, theatre ? -1.1 : 0);
    this.controls.minAzimuthAngle = theatre ? -.55 : -Math.PI;
    this.controls.maxAzimuthAngle = theatre ? .55 : Math.PI;
    this.controls.minPolarAngle = theatre ? 1 : .65;
    this.controls.maxPolarAngle = 1.49;
    const halfHeight = theatre ? 8 : 5.8, halfWidth = theatre ? 10.6 : 9.2;
    this.homeDistance = Math.max(halfHeight, halfWidth / this.camera.aspect) / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) + 1.8;
    this.controls.minDistance = theatre ? 12 : 7;
    this.controls.maxDistance = this.homeDistance * 1.4;
    const homeOffset = new THREE.Vector3().setFromSpherical(new THREE.Spherical(this.homeDistance, theatre ? 1.27 : 1.12, theatre ? .32 : .42));
    this.homePosition.copy(this.controls.target).add(homeOffset);
    if (reset || !previousHomeDistance) this.camera.position.copy(this.homePosition);
    else this.camera.position.copy(this.controls.target).add(previousOffset.multiplyScalar(this.homeDistance / previousHomeDistance));
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.refreshRenderState(); this.invalidate();
  }

  private frame = (time: number) => {
    if (!this.canRender() || this.reduced) { this.refreshRenderState(); return; }
    if (!this.frameBudget.shouldRender(time, this.profile.fps)) return;
    this.draw(time, true);
  };

  private draw(time: number, animate: boolean) {
    const delta = animate && this.lastFrame !== null ? Math.min(Math.max((time - this.lastFrame) / 1000, 0), .1) : 0;
    this.lastFrame = animate ? time : null;
    this.animationTime += delta * 1000;
    const motionTime = this.animationTime;
    const energy = this.state ? this.state.members.reduce((sum, member) => sum + member.energy, 0) / 1700 : 1;
    if (animate) this.slots.forEach((slot, index) => {
      slot.root.position.copy(slot.anchor); slot.root.rotation.set(0, slot.heading, 0);
      slot.character?.update(delta);
      if (slot.role === 'director') {
        // Bone animation drives the arms; the director takes small steps at the front.
        const beat = motionTime * (motionTime < this.performingUntil ? .0084 : .0048);
        const strength = .5 + .5 * energy;
        slot.root.position.x += Math.sin(beat) * .18 * strength;
        slot.root.position.z += Math.sin(beat * 2) * .055 * strength;
        slot.root.rotation.y += Math.sin(beat * .5) * .14 * strength;
        slot.root.rotation.z = Math.sin(beat) * .055 * strength;
      } else if (slot.loaded && !slot.character) {
        slot.root.rotation.z = Math.sin(motionTime * (motionTime < this.performingUntil ? .005 : .0013) + index * .7) * .025 * energy;
      }
    });
    if (this.venue === 'theatre') this.theatre.update(motionTime, !animate);
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
    this.renderedFrames++;
    this.host.dataset.renderedFrames = String(this.renderedFrames);
    if (!animate || this.renderedFrames === 1 || time - this.lastDiagnostics > 1000) {
      this.lastDiagnostics = time;
      this.host.dataset.renderCalls = String(this.renderer.info.render.calls);
      this.host.dataset.renderTriangles = String(this.renderer.info.render.triangles);
      this.host.dataset.characterSystem = 'murga-human-v1';
    }
  }

  update(state: State, previewTheatre = false) {
    if (this.disposed) return;
    this.state = state; this.setEnvironment(previewTheatre ? 'theatre' : getSceneVenue(state));
    const previous = new Map(this.slots.map(slot => [slot.memberId, slot]));
    const roles: VisualRole[] = state.members.map((member, index) => {
      const fallback: VisualRole = index < 13 ? 'chorister' : (['bombo', 'redoblante', 'platillos', 'director'] as const)[index - 13] ?? 'chorister';
      const role = 'role' in member ? member.role as VisualRole : fallback;
      return Object.hasOwn(ROLE_APPEARANCE, role) ? role : fallback;
    });
    const chorusCount = roles.filter(role => role === 'chorister').length;
    let chorusIndex = 0;
    this.slots = state.members.map((member, index) => {
      const role = roles[index];
      const markerLabel = role === 'chorister' ? `C${chorusIndex + 1}` : ROLE_APPEARANCE[role].label;
      let slot = previous.get(member.id);
      if (slot) {
        previous.delete(member.id);
        if ((slot.markerLabel !== markerLabel || slot.role !== role) && !slot.loaded) {
          this.clearGroup(slot.root); slot.root.add(this.positionMarker(role, markerLabel));
        }
        slot.index = index; slot.role = role; slot.markerLabel = markerLabel;
      }
      else {
        slot = { memberId: member.id, index, role, markerLabel, root: new THREE.Group(), anchor: new THREE.Vector3(), heading: 0, assetKey: null, loaded: false, visualWidth: .46 };
        slot.root.add(this.positionMarker(role, markerLabel)); this.troupe.add(slot.root);
      }
      this.positionSlot(slot, chorusIndex, chorusCount);
      if (role === 'chorister') chorusIndex++;
      return slot;
    });
    this.host.dataset.ensemble = `${chorusCount}/${roles.filter(role => ['bombo', 'redoblante', 'platillos'].includes(role)).length}/${roles.filter(role => role === 'director').length}`;
    previous.forEach(slot => { this.troupe.remove(slot.root); this.clearSlot(slot); });
    this.syncModels(); this.invalidate();
  }

  celebrate() { this.performingUntil = this.animationTime + 3500; this.invalidate(); }

  private clearSlot(slot: PositionSlot) {
    slot.disposeInstruments?.(); slot.disposeInstruments = undefined;
    if (slot.character) {
      slot.root.remove(slot.character.root); slot.character.dispose(); slot.character = undefined;
    }
    this.clearGroup(slot.root);
  }

  private clearGroup(group: THREE.Group) {
    group.children.forEach(child => this.disposeObject(child)); group.clear();
  }

  private disposeObject(root: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    const bitmaps = new Set<ImageBitmap>();
    root.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometries.add(object.geometry);
        (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
      }
      else if (object instanceof THREE.Sprite) materials.add(object.material);
    });
    materials.forEach(material => Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); }));
    textures.forEach(texture => {
      if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) bitmaps.add(texture.image);
      texture.dispose();
    });
    bitmaps.forEach(bitmap => bitmap.close()); materials.forEach(material => material.dispose()); geometries.forEach(geometry => geometry.dispose());
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.observer.disconnect(); this.intersectionObserver?.disconnect();
    this.renderer.setAnimationLoop(null); this.loopActive = false;
    if (this.renderRequest !== null) cancelAnimationFrame(this.renderRequest);
    this.renderRequest = null;
    this.host.dataset.renderState = 'paused';
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.controls.removeEventListener('change', this.onCameraChange);
    this.controls.dispose();
    this.renderer.domElement.removeEventListener('keydown', this.onCameraKey);
    this.slots.forEach(slot => this.clearSlot(slot));
    this.disposeObject(this.scene);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onRestored);
    this.motionPreference.removeEventListener('change', this.onMotionChange);
    this.renderer.dispose();
  }
}
