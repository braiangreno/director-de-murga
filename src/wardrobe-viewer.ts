import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadModularCharacter, sanitizeCharacterSelection, FACE_OPTIONS, HAIR_OPTIONS, OUTFIT_OPTIONS, HAT_OPTIONS, MAKEUP_OPTIONS, PALETTE_OPTIONS, SKIN_TONE_OPTIONS, HAIR_COLOR_OPTIONS, ANIMATION_OPTIONS, HEIGHT_LIMITS, type CharacterSelection, type CharacterAnimation, type ModularCharacter } from './character-system';
import './wardrobe-viewer.css';
import { DEFAULT_VISUAL_SETTINGS, FrameBudget, getRenderProfile, type VisualSettings } from './render-policy';

export interface WardrobeViewerOptions {
  visualSettings?: VisualSettings;
  title?: string;
  subtitle?: string;
  hideApplyToAll?: boolean;
  /** Called once after an opened viewer closes, not when its assets finish loading. */
  onClose?: () => void;
  members?: { id: string; name: string }[];
  selectedMemberId?: string;
  getSelection?: (memberId: string) => CharacterSelection;
  onMemberChange?: (memberId: string) => void;
  onApplyToAll?: (look: CharacterSelection) => void;
  /** Omit for the full catalog. An explicit list must contain at least one valid ID. */
  allowedOutfitIds?: readonly string[];
  /** Omit for all palettes. Restrictions also apply when switching members. */
  allowedPaletteIds?: readonly string[];
}
type StudioTab = 'wardrobe' | 'character' | 'movement';
const studio = { animation: 'idle' as CharacterAnimation, paused: false, compare: false };
let closeActiveViewer: (() => void) | undefined;
if (import.meta.hot) import.meta.hot.dispose(() => closeActiveViewer?.());
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const paths: Record<string, string> = {
  sparkle: '<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/>',
  shirt: '<path d="m8 3-5 3 2 5 3-1v11h8V10l3 1 2-5-5-3c0 4-8 4-8 0Z"/>',
  coat: '<path d="m8 3-5 3 2 6 3-2v8h8v-8l3 2 2-6-5-3-4 3-4-3Zm4 3v12M8 18l-1 4m9-4 1 4"/><path d="m8 3 2 6 2-3 2 3 2-6"/>',
  longcoat: '<path d="m8 3-5 3 2 6 3-2-1 11h4l1-5 1 5h4l-1-11 3 2 2-6-5-3-4 3-4-3Zm4 3v10"/><path d="m8 3 2 6 2-3 2 3 2-6"/>',
  face: '<path d="M5 9c0-10 14-10 14 0v5c0 9-14 9-14 0V9Z"/><path d="M8 10h.1M16 10h.1m-7 6q3 2 6 0M5 8q5 0 8-5"/>',
  movement: '<circle cx="13" cy="4" r="2"/><path d="m5 9 7-2 5 5 4-2M12 7l-2 8-5 6m5-6 5 1 1 5"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 9M4 4v6h6"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  people: '<circle cx="8" cy="7" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M2 21v-3c0-7 12-7 12 0v3m1-7q7-1 7 5v2"/>',
  play: '<path d="m8 4 12 8-12 8V4Z"/>', pause: '<path d="M8 4v16M16 4v16"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>', check: '<path d="m5 12 4 4L19 6"/>',
};
const icon = (name: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.sparkle}</svg>`;
const offOption = (list: readonly { id: string }[]) => list.find(item => item.id.includes('none')) ?? list[0];
const onOption = (list: readonly { id: string }[]) => list.find(item => !item.id.includes('none')) ?? list[0];

/** The caller owns persistent selections; camera and playback preferences belong to this studio. */
export async function openWardrobeViewer(selection: CharacterSelection, onChange: (next: CharacterSelection) => void, options: WardrobeViewerOptions = {}): Promise<void> {
  const outfitsRestricted = options.allowedOutfitIds !== undefined, palettesRestricted = options.allowedPaletteIds !== undefined;
  const availableOutfits = outfitsRestricted ? OUTFIT_OPTIONS.filter(item => options.allowedOutfitIds!.includes(item.id)) : OUTFIT_OPTIONS;
  const availablePalettes = palettesRestricted ? PALETTE_OPTIONS.filter(item => options.allowedPaletteIds!.includes(item.id)) : PALETTE_OPTIONS;
  if (!availableOutfits.length || !availablePalettes.length) throw new RangeError('El probador necesita al menos un traje y una paleta permitidos.');
  const noOutfitId = offOption(OUTFIT_OPTIONS).id, outfitCardsAvailable = availableOutfits.filter(item => item.id !== noOutfitId);
  const outfitToggleAllowed = availableOutfits.some(item => item.id === noOutfitId) && outfitCardsAvailable.length > 0;
  const restricted = outfitsRestricted || palettesRestricted;
  function constrainSelection(value: CharacterSelection): CharacterSelection {
    const next = sanitizeCharacterSelection(value);
    if (!availableOutfits.some(item => item.id === next.outfitId)) next.outfitId = availableOutfits[0].id;
    if (!availablePalettes.some(item => item.id === next.paletteId)) next.paletteId = availablePalettes[0].id;
    return next;
  }
  closeActiveViewer?.();
  let current = constrainSelection(selection), memberId = options.selectedMemberId ?? options.members?.[0]?.id;
  const rememberedOutfits = new Map<string, string>();
  const rememberOutfit = () => { if (current.outfitId !== offOption(OUTFIT_OPTIONS).id) rememberedOutfits.set(memberId ?? '', current.outfitId); };
  rememberOutfit();
  let tab: StudioTab = 'wardrobe';
  let closed = false, wasOpened = false, generation = 0, frame = 0, lastTick = 0, needFrame = true;
  let contextLost = false, ready = false, comparisonPending = false;
  let renderer: THREE.WebGLRenderer | undefined, controls: OrbitControls | undefined;
  let primary: ModularCharacter | undefined, secondary: ModularCharacter | undefined;
  let canvasEvents: AbortController | undefined;
  const events = new AbortController(), oldFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const oldOverflow = document.body.style.overflow, scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeeeae3);
  const camera = new THREE.PerspectiveCamera(35, 1, .05, 40), homeTarget = new THREE.Vector3(0, 1.12, 0), homePosition = new THREE.Vector3();
  const platforms = new THREE.Group(), geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [];
  let homeDistance = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const visualSettings = options.visualSettings ?? DEFAULT_VISUAL_SETTINGS;
  const motionReduced = () => visualSettings.reducedMotion || reducedMotion.matches;
  let profile = getRenderProfile(visualSettings.quality, window.devicePixelRatio || 1);
  let inView = true, renderedFrames = 0;
  const frameBudget = new FrameBudget();
  const poseTime = () => motionReduced() ? 1 : 0;
  if (motionReduced()) studio.paused = true;
  const dialog = document.createElement('dialog'); dialog.className = 'wardrobe-viewer'; dialog.setAttribute('aria-labelledby', 'wardrobe-viewer-title');
  dialog.innerHTML = `
    <header class="wv-header"><span class="wv-mark">${icon('sparkle')}</span><div class="wv-heading"><p class="wv-eyebrow">${escape(options.subtitle ?? 'DALE TU IDENTIDAD')}</p><h2 id="wardrobe-viewer-title">${escape(options.title ?? 'Taller de vestuario')}</h2></div><span class="wv-version">${restricted ? 'Diseño seleccionado' : 'Base funcional'}</span><button class="wv-close" type="button" aria-label="Cerrar taller" autofocus>${icon('close')}</button></header>
    <div class="wv-content"><section class="wv-preview" aria-label="Personaje en 3D">
      <div class="wv-preview-top"><span class="wv-preview-label">${icon('eye')} LUZ NEUTRA</span><label class="wv-compare"><input type="checkbox" data-wv-compare disabled>${icon('people')}<span>Comparar</span></label></div>
      <div class="wv-stage" aria-busy="true"></div><div class="wv-loading"><span class="wv-loading-symbol" aria-hidden="true">${icon('sparkle')}</span><span class="wv-loading-message">Preparando el taller…</span><button class="wv-retry" type="button" hidden>Volver a intentar</button></div>
      <div class="wv-character-labels" aria-hidden="true"><span class="wv-label-primary"></span><span class="wv-label-secondary" hidden></span></div>
      <div class="wv-camera" role="group" aria-label="Cámara del taller"><button type="button" data-wv-camera="in" aria-label="Acercar" disabled>+</button><button type="button" data-wv-camera="out" aria-label="Alejar" disabled>−</button><button type="button" data-wv-camera="face" disabled>${icon('face')}<span>Rostro</span></button><button type="button" data-wv-camera="home" disabled>${icon('reset')}<span>Vista inicial</span></button></div>
      <p class="wv-camera-help" id="wardrobe-camera-help">Arrastrá para girar · rueda o pellizco para acercar<span class="wv-sr-only">. Teclado: flechas para girar, más y menos para zoom, Inicio para restablecer.</span></p>
    </section><section class="wv-options" aria-label="Personalizar personaje">
      ${options.members?.length ? `<label class="wv-member"><span>COMPONENTE</span><select aria-label="Componente a personalizar" data-wv-member disabled>${options.members.map(member => `<option value="${escape(member.id)}" ${member.id === memberId ? 'selected' : ''}>${escape(member.name)}</option>`).join('')}</select></label>` : ''}
      <div class="wv-tabs" role="tablist" aria-label="Opciones del taller">${([['wardrobe', 'Vestuario', 'shirt'], ['character', 'Rasgos', 'face'], ['movement', 'Movimiento', 'movement']] as const).map(([id, label, glyph]) => `<button type="button" id="wv-tab-${id}" role="tab" aria-controls="wv-edit-panel" aria-selected="${id === tab}" tabindex="${id === tab ? '0' : '-1'}" data-wv-tab="${id}">${icon(glyph)}<span>${label}</span></button>`).join('')}</div>
      <div class="wv-edit-panel" id="wv-edit-panel" role="tabpanel" aria-labelledby="wv-tab-wardrobe"></div>
      <div class="wv-options-foot">${options.onApplyToAll && !options.hideApplyToAll ? `<button class="wv-apply" type="button" data-wv-apply disabled>${icon('people')} Vestir a toda la murga</button><p>Comparte la ropa y sus colores; conserva los rasgos de cada integrante.</p>` : '<p>Misma base, distintas caras, peinados y alturas.</p>'}</div>
    </section></div><footer class="wv-footer"><p class="wv-status" role="status" aria-live="polite" aria-atomic="true">Cargando el personaje y las piezas…</p><button class="wv-done" type="button">Listo ${icon('check')}</button></footer>`;
  const host = dialog.querySelector<HTMLDivElement>('.wv-stage')!, panel = dialog.querySelector<HTMLDivElement>('.wv-edit-panel')!, loading = dialog.querySelector<HTMLDivElement>('.wv-loading')!;
  const loadingMessage = dialog.querySelector<HTMLElement>('.wv-loading-message')!, status = dialog.querySelector<HTMLElement>('.wv-status')!, retry = dialog.querySelector<HTMLButtonElement>('.wv-retry')!, comparison = dialog.querySelector<HTMLInputElement>('[data-wv-compare]')!;
  const displayName = () => options.members?.find(member => member.id === memberId)?.name ?? 'Tu personaje';
  const say = (message: string) => { status.textContent = message; };
  function optionButtons(field: keyof CharacterSelection, list: readonly { id: string; label: string }[], color = false) {
    return list.map(item => { const selected = current[field] === item.id, swatch = (item as { color?: string }).color;
      return `<button type="button" class="${color ? 'wv-swatch' : 'wv-option-button'} ${selected ? 'is-selected' : ''}" data-wv-field="${field}" data-wv-value="${escape(item.id)}" aria-pressed="${selected}" aria-label="${escape(item.label)}" title="${escape(item.label)}" ${!ready ? 'disabled' : ''}>${color && swatch ? `<span style="--swatch:${escape(swatch)}" aria-hidden="true">${selected ? icon('check') : ''}</span><small>${escape(item.label)}</small>` : escape(item.label)}</button>`;
    }).join('');
  }
  function outfitCards() {
    return outfitCardsAvailable.map(item => {
      const detail = item as { description?: string; length?: string }, selected = item.id === current.outfitId;
      const long = /long|larg/i.test(detail.length ?? ''), medium = /medium|medio/i.test(detail.length ?? '');
      const length = detail.length ? long ? 'Largo' : medium ? 'Medio' : 'Corto' : '';
      return `<button type="button" class="wv-outfit ${selected ? 'is-selected' : ''}" data-wv-field="outfitId" data-wv-value="${escape(item.id)}" aria-label="${escape(item.label)}" aria-pressed="${selected}" ${!ready ? 'disabled' : ''}><span class="wv-outfit-icon" aria-hidden="true">${icon(long ? 'longcoat' : 'coat')}</span><span class="wv-outfit-copy"><strong>${escape(item.label)}</strong>${detail.description ? `<small>${escape(detail.description)}</small>` : ''}${length ? `<span class="wv-outfit-length">${length}</span>` : ''}</span>${selected ? icon('check') : ''}</button>`;
    }).join('');
  }
  function paletteSwatches(item: { primary: string; secondary: string; trim: string; accent?: string; deepFabric?: string; trouser?: string }) {
    return [item.primary, item.secondary, item.accent, item.deepFabric, item.trouser, item.trim].filter((color): color is string => Boolean(color)).map(color => `<i style="background:${escape(color)}"></i>`).join('');
  }
  function renderPanel() {
    const focused = document.activeElement instanceof HTMLElement && panel.contains(document.activeElement) ? document.activeElement : null;
    const focusField = focused?.dataset.wvField, focusValue = focused?.dataset.wvValue;
    const focusPiece = focused?.dataset.wvPiece, focusAnimation = focused?.dataset.wvAnimation, focusPause = focused?.hasAttribute('data-wv-pause');
    const toggle = (field: keyof CharacterSelection, label: string, list: readonly { id: string }[], glyph: string) => {
      const checked = current[field] !== offOption(list).id;
      return `<label class="wv-piece ${checked ? 'is-selected' : ''}"><input type="checkbox" data-wv-piece="${field}" ${checked ? 'checked' : ''} ${!ready ? 'disabled' : ''}><span class="wv-piece-icon">${icon(glyph)}</span><strong>${label}</strong></label>`;
    };
    if (tab === 'wardrobe') panel.innerHTML = `
      <div class="wv-section-heading"><h3>El conjunto</h3><span>${outfitsRestricted ? 'Diseño de tu vestuarista' : '3 piezas independientes'}</span></div>
      <div class="wv-pieces">${outfitToggleAllowed ? toggle('outfitId', 'Traje', availableOutfits, 'shirt') : `<div class="wv-piece wv-piece-fixed ${current.outfitId !== noOutfitId ? 'is-selected' : ''}" aria-label="${current.outfitId !== noOutfitId ? 'Traje seleccionado' : 'Sin traje'}"><span class="wv-piece-icon">${icon('shirt')}</span><strong>${current.outfitId !== noOutfitId ? 'Traje elegido' : 'Sin traje'}</strong><span class="wv-fixed-mark">${icon('check')}</span></div>`}${toggle('hatId', 'Sombrero', HAT_OPTIONS, 'sparkle')}${toggle('makeupId', 'Maquillaje', MAKEUP_OPTIONS, 'face')}</div>
      <div class="wv-catalog-nav" aria-label="Explorar vestuario"><button type="button" data-wv-jump="outfits">${icon('shirt')} ${outfitCardsAvailable.length} ${outfitCardsAvailable.length === 1 ? 'traje' : 'trajes'}</button><button type="button" data-wv-jump="palettes">${icon('sparkle')} ${availablePalettes.length} ${availablePalettes.length === 1 ? 'paleta' : 'paletas'}</button></div>
      <section class="wv-catalog-section" data-wv-section="outfits" aria-labelledby="wv-outfit-heading"><div class="wv-section-heading"><h3 id="wv-outfit-heading">${outfitsRestricted ? 'Corte elegido' : 'Elegí el corte'}</h3><span>${outfitsRestricted ? 'Tu propuesta elegida' : 'El color lo elegís después'}</span></div><div class="wv-outfits ${outfitCardsAvailable.length === 1 ? 'wv-single-option' : ''}">${outfitCards()}</div></section>
      <section class="wv-catalog-section" data-wv-section="palettes" aria-labelledby="wv-palette-heading"><div class="wv-section-heading"><h3 id="wv-palette-heading">Paleta del espectáculo</h3><span>${palettesRestricted ? 'Colores de la propuesta' : 'Ropa y sombrero'}</span></div><div class="wv-palettes ${availablePalettes.length === 1 ? 'wv-single-option' : ''}">${availablePalettes.map(item => `<button class="wv-palette ${current.paletteId === item.id ? 'is-selected' : ''}" type="button" data-wv-field="paletteId" data-wv-value="${escape(item.id)}" aria-label="${escape(item.label)}" aria-pressed="${current.paletteId === item.id}" ${!ready ? 'disabled' : ''}><span class="wv-palette-colors" aria-hidden="true">${paletteSwatches(item)}</span><strong>${escape(item.label)}</strong>${current.paletteId === item.id ? icon('check') : ''}</button>`).join('')}</div></section>
      <p class="wv-panel-note">${restricted ? 'Estás probando el diseño seleccionado. Podés personalizar los rasgos, el sombrero y el maquillaje, y verlo en movimiento.' : 'Cada corte se combina con todas las paletas. Probalo también en movimiento.'}</p>`;
    else if (tab === 'character') panel.innerHTML = `<div class="wv-traits-row"><div><h3>Rostro</h3><div class="wv-option-group">${optionButtons('faceId', FACE_OPTIONS)}</div></div><div><h3>Peinado</h3><div class="wv-option-group">${optionButtons('hairId', HAIR_OPTIONS)}</div></div></div><div class="wv-color-section"><h3>Tono de piel</h3><div class="wv-swatches">${optionButtons('skinToneId', SKIN_TONE_OPTIONS, true)}</div></div><div class="wv-color-section"><h3>Color de pelo</h3><div class="wv-swatches">${optionButtons('hairColorId', HAIR_COLOR_OPTIONS, true)}</div></div><label class="wv-height"><span><strong>Altura</strong><output>${(1.7 * current.heightScale).toFixed(2).replace('.', ',')} m</output></span><input type="range" min="${HEIGHT_LIMITS.min}" max="${HEIGHT_LIMITS.max}" step="${HEIGHT_LIMITS.step}" value="${current.heightScale}" data-wv-height aria-label="Altura del personaje" aria-valuetext="${(1.7 * current.heightScale).toFixed(2)} metros" ${!ready ? 'disabled' : ''}><span class="wv-height-scale"><small>1,53 m</small><small>1,87 m</small></span></label>`;
    else panel.innerHTML = `<div class="wv-section-heading"><h3>Probá el movimiento</h3><button type="button" class="wv-pause" data-wv-pause aria-pressed="${studio.paused || motionReduced()}" ${!ready || motionReduced() ? 'disabled' : ''}>${icon(studio.paused ? 'play' : 'pause')}${studio.paused || motionReduced() ? 'Reproducir' : 'Pausar'}</button></div><div class="wv-animations">${ANIMATION_OPTIONS.filter(item => item.id !== 'none').map(item => `<button type="button" class="wv-animation ${studio.animation === item.id ? 'is-selected' : ''}" data-wv-animation="${escape(item.id)}" aria-pressed="${studio.animation === item.id}" ${!ready ? 'disabled' : ''}>${icon(item.id === 'idle' ? 'face' : 'movement')}<span>${escape(item.label)}</span>${studio.animation === item.id ? icon('check') : ''}</button>`).join('')}</div><p class="wv-panel-note">${motionReduced()?'La reducción de movimiento está activa. Podés elegir una pose; para animarla, revisá los ajustes del juego y del dispositivo. ':''}Compará dos personajes con la misma ropa para revisar cómo sigue cada gesto.</p>`;
    panel.setAttribute('aria-labelledby', `wv-tab-${tab}`);
    dialog.querySelectorAll<HTMLButtonElement>('[data-wv-tab]').forEach(button => { const selected = button.dataset.wvTab === tab; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; });
    if (focusField && focusValue) panel.querySelector<HTMLButtonElement>(`[data-wv-field="${CSS.escape(focusField)}"][data-wv-value="${CSS.escape(focusValue)}"]`)?.focus({ preventScroll: true });
    else if (focusPiece) panel.querySelector<HTMLInputElement>(`[data-wv-piece="${CSS.escape(focusPiece)}"]`)?.focus({ preventScroll: true });
    else if (focusAnimation) panel.querySelector<HTMLButtonElement>(`[data-wv-animation="${CSS.escape(focusAnimation)}"]`)?.focus({ preventScroll: true });
    else if (focusPause) panel.querySelector<HTMLButtonElement>('[data-wv-pause]')?.focus({ preventScroll: true });
  }
  function updateLabels() {
    comparison.checked = studio.compare; dialog.querySelector('.wv-label-primary')!.textContent = displayName();
    const label = dialog.querySelector<HTMLElement>('.wv-label-secondary')!; label.hidden = !studio.compare; label.textContent = `Mismo vestuario · ${current.heightScale > 1 ? '1,53' : '1,87'} m`;
    dialog.querySelector('[data-wv-camera="face"] span')!.textContent = studio.compare ? 'Rostros' : 'Rostro';
    dialog.classList.toggle('wv-is-comparing', studio.compare);
  }
  function setReady(value: boolean) {
    ready = value;
    dialog.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('[data-wv-compare], [data-wv-member], [data-wv-camera], [data-wv-apply]').forEach(control => { control.disabled = !value; });
    if (controls) controls.enabled = value; renderPanel();
  }
  function draw(time: number) {
    frame = 0;
    if (closed || contextLost || !renderer || document.hidden || !inView) { lastTick = 0; host.dataset.renderState = 'paused'; return; }
    const animate = ready && !studio.paused && !motionReduced() && studio.animation !== 'none';
    host.dataset.renderState = animate ? 'running' : 'still';
    const scheduled = frameBudget.shouldRender(time, profile.fps);
    if (scheduled) {
      const delta = lastTick ? Math.min((time - lastTick) / 1000, .06) : 0; lastTick = time;
      if (animate) { primary?.update(delta); if (studio.compare) secondary?.update(delta); }
      renderer.render(scene, camera); host.dataset.renderedFrames = String(++renderedFrames); needFrame = false;
    }
    if (!animate) lastTick = 0;
    // Keep camera/selection changes pending until the quality profile allows a draw.
    if (animate || needFrame) frame = requestAnimationFrame(draw);
  }
  function requestRender() { needFrame = true; if (!closed && !contextLost && renderer && !document.hidden && inView && !frame) frame = requestAnimationFrame(draw); }
  function resize() {
    if (closed || !renderer || !controls) return;
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    profile = getRenderProfile(visualSettings.quality, window.devicePixelRatio || 1);
    host.dataset.renderQuality = visualSettings.quality; host.dataset.fpsLimit = String(profile.fps); host.dataset.pixelRatio = String(profile.pixelRatio);
    renderer.setPixelRatio(profile.pixelRatio); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    const oldDistance = homeDistance, scale = studio.compare ? 1.1 : current.heightScale, fitHeight = 2.72 * scale, fitWidth = studio.compare ? 3.65 : 1.95 * scale;
    homeTarget.set(0, fitHeight / 2 - .02, 0); homeDistance = Math.max(fitHeight, fitWidth / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) + .15;
    homePosition.copy(homeTarget).add(new THREE.Vector3(.13, .065, 1).normalize().multiplyScalar(homeDistance)); controls.minDistance = .65; controls.maxDistance = Math.max(9, homeDistance * 2.5);
    if (oldDistance) camera.position.sub(controls.target).multiplyScalar(homeDistance / oldDistance).add(controls.target);
    else { controls.target.copy(homeTarget); camera.position.copy(homePosition); }
    controls.update(); requestRender();
  }
  function resetCamera() { if (controls) { controls.target.copy(homeTarget); camera.position.copy(homePosition); controls.update(); requestRender(); } }
  function zoomCamera(factor: number) {
    if (!controls) return; const offset = camera.position.clone().sub(controls.target); offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance)); camera.position.copy(controls.target).add(offset); controls.update(); requestRender();
  }
  function cameraKey(event: KeyboardEvent) {
    if (!ready || !controls || event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    if (event.key === 'Home') resetCamera(); else if (['+', '=', '-'].includes(event.key)) zoomCamera(event.key === '-' ? 1.15 : 1 / 1.15);
    else { const offset = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)); offset.theta += event.key === 'ArrowLeft' ? -.09 : event.key === 'ArrowRight' ? .09 : 0; offset.phi = THREE.MathUtils.clamp(offset.phi + (event.key === 'ArrowUp' ? -.07 : event.key === 'ArrowDown' ? .07 : 0), controls.minPolarAngle, controls.maxPolarAngle); camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(offset)); controls.update(); requestRender(); }
  }
  function comparisonSelection(): CharacterSelection { return { ...current, faceId: FACE_OPTIONS.find(item => item.id !== current.faceId)?.id ?? current.faceId, hairId: HAIR_OPTIONS.find(item => item.id !== current.hairId && !item.id.includes('none'))?.id ?? current.hairId, heightScale: current.heightScale > 1 ? .9 : 1.1 }; }
  function layoutCharacters() {
    if (primary) primary.root.position.x = studio.compare ? -.83 : 0;
    if (secondary) { secondary.root.visible = studio.compare; secondary.root.position.x = .83; }
    if (platforms.children[0]) platforms.children[0].position.x = studio.compare ? -.83 : 0;
    if (platforms.children[1]) { platforms.children[1].visible = studio.compare; platforms.children[1].position.x = .83; }
    updateLabels(); requestRender();
  }
  async function ensureComparison() {
    if (studio.compare && secondary) { primary?.mixer.setTime(poseTime()); secondary.mixer.setTime(poseTime()); lastTick = 0; layoutCharacters(); return; }
    if (!studio.compare || comparisonPending || !primary) { layoutCharacters(); return; }
    comparisonPending = true; const token = generation; say('Preparando la comparación…');
    try {
      const model = await loadModularCharacter(comparisonSelection());
      if (closed || token !== generation) { model.dispose(); return; }
      secondary = model; secondary.setSelection(comparisonSelection()); scene.add(secondary.root); secondary.setAnimation(studio.animation); primary?.setAnimation(studio.animation); primary?.mixer.setTime(poseTime()); secondary.mixer.setTime(poseTime()); lastTick = 0; layoutCharacters(); say(studio.compare ? 'Mismo vestuario; cambian el rostro, el pelo y la altura.' : 'Listo para seguir creando.');
    } catch { if (!closed && token === generation) { studio.compare = false; layoutCharacters(); resize(); resetCamera(); say('No se pudo abrir la comparación. Podés activarla para volver a intentar.'); } }
    finally { if (token === generation) comparisonPending = false; }
  }
  function changeSelection(patch: Partial<CharacterSelection>, announce = true) {
    current = constrainSelection({ ...current, ...patch }); primary?.setSelection(current); secondary?.setSelection(comparisonSelection());
    rememberOutfit();
    if ('heightScale' in patch) resize(); updateLabels(); requestRender();
    if (announce) { renderPanel(); say(`Apariencia de ${displayName()} actualizada.`); } onChange({ ...current });
  }
  function releaseView() {
    cancelAnimationFrame(frame); frame = 0; lastTick = 0; frameBudget.reset(); canvasEvents?.abort(); canvasEvents = undefined;
    controls?.removeEventListener('change', requestRender); controls?.dispose(); controls = undefined; primary?.dispose(); secondary?.dispose(); primary = secondary = undefined;
    geometries.splice(0).forEach(geometry => geometry.dispose()); materials.splice(0).forEach(material => material.dispose());
    scene.traverse(object => { if (object instanceof THREE.DirectionalLight) object.shadow.dispose(); }); scene.clear(); platforms.clear();
    if (renderer) { renderer.renderLists.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); renderer = undefined; } homeDistance = 0;
  }
  function showError(message: string) { setReady(false); host.setAttribute('aria-busy', 'false'); loading.hidden = false; loadingMessage.textContent = message; retry.hidden = false; say(message); }
  function makeView() {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' }); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1; renderer.shadowMap.enabled = profile.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = renderer.domElement; canvas.tabIndex = 0; canvas.setAttribute('role', 'region'); canvas.setAttribute('aria-label', 'Personaje 3D interactivo'); canvas.setAttribute('aria-describedby', 'wardrobe-camera-help'); host.append(canvas);
    controls = new OrbitControls(camera, canvas); controls.enabled = false; controls.enableDamping = false; controls.autoRotate = false; controls.enablePan = true; controls.screenSpacePanning = true; controls.rotateSpeed = .65; controls.zoomSpeed = .75; controls.minPolarAngle = .15; controls.maxPolarAngle = Math.PI / 2 + .06; controls.addEventListener('change', requestRender);
    canvasEvents = new AbortController(); canvas.addEventListener('keydown', cameraKey, { signal: canvasEvents.signal });
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); if (closed) return; contextLost = true; cancelAnimationFrame(frame); frame = 0; showError('La vista se interrumpió. Volvé a intentarlo.'); }, { signal: canvasEvents.signal });
    const ambient = new THREE.HemisphereLight(0xffffff, 0xa8a6a1, 1.4), key = new THREE.DirectionalLight(0xffffff, 2.7), fill = new THREE.DirectionalLight(0xffffff, .9);
    key.position.set(-3, 5, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.normalBias = .006; Object.assign(key.shadow.camera, { left: -3, right: 3, top: 4, bottom: -2, near: .1, far: 15 }); fill.position.set(4, 3, -3); scene.add(ambient, key, fill, platforms);
    const geometry = new THREE.CylinderGeometry(.69, .72, .055, 48); geometries.push(geometry);
    for (const color of [0xd7d0c6, 0xd8d2d3]) { const material = new THREE.MeshStandardMaterial({ color, roughness: .9 }); materials.push(material); const platform = new THREE.Mesh(geometry, material); platform.position.y = -.034; platform.receiveShadow = true; platforms.add(platform); }
    layoutCharacters(); resize();
  }
  async function load() {
    const token = ++generation; comparisonPending = false; releaseView(); contextLost = false; setReady(false); loading.hidden = false; retry.hidden = true; loadingMessage.textContent = 'Preparando el taller…'; host.setAttribute('aria-busy', 'true'); say('Cargando el personaje y las piezas…');
    try { makeView(); const model = await loadModularCharacter(current); if (closed || token !== generation) { model.dispose(); return; } primary = model; primary.setSelection(current); primary.setAnimation(studio.animation); primary.mixer.setTime(poseTime()); scene.add(primary.root); layoutCharacters(); resize(); resetCamera(); host.setAttribute('aria-busy', 'false'); if (!contextLost) { loading.hidden = true; setReady(true); say(restricted ? 'Tu diseño está listo. Personalizá los rasgos y probalo en movimiento.' : 'Tu taller está listo. Elegí, combiná y probá.'); } requestRender(); if (studio.compare) void ensureComparison(); }
    catch (error) { if (!closed && token === generation) { console.warn('Wardrobe studio could not load its character:', error); releaseView(); showError('No pudimos cargar el taller. Volvé a intentar.'); } }
  }
  function close() {
    if (closed) return; closed = true; generation++; events.abort(); observer.disconnect(); viewObserver.disconnect(); releaseView(); if (dialog.open) dialog.close(); dialog.remove(); document.body.style.overflow = oldOverflow; if (closeActiveViewer === close) closeActiveViewer = undefined; if (oldFocus?.isConnected) oldFocus.focus({ preventScroll: true });
    if (wasOpened) options.onClose?.();
  }
  const observer = new ResizeObserver(resize);
  const viewObserver = new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? false; cancelAnimationFrame(frame); frame = 0; lastTick = 0; frameBudget.reset(); host.dataset.renderState = 'paused'; if (inView) requestRender(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); }, { signal: events.signal }); dialog.addEventListener('close', close, { signal: events.signal });
  dialog.addEventListener('click', event => {
    event.stopPropagation(); const button = (event.target as Element).closest<HTMLButtonElement>('button'); if (button?.disabled) return;
    if (button?.matches('.wv-close, .wv-done')) close(); else if (button === retry) void load();
    else if (button?.dataset.wvTab) { tab = button.dataset.wvTab as StudioTab; renderPanel(); panel.scrollTop = 0; }
    else if (button?.dataset.wvJump) { const section = panel.querySelector<HTMLElement>(`[data-wv-section="${button.dataset.wvJump}"]`); if (section) panel.scrollTo({ top: section.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop - 54, behavior: motionReduced() ? 'instant' : 'smooth' }); }
    else if (button?.dataset.wvField && button.dataset.wvValue) changeSelection({ [button.dataset.wvField]: button.dataset.wvValue });
    else if (button?.dataset.wvAnimation) { studio.animation = button.dataset.wvAnimation as CharacterAnimation; studio.paused = motionReduced(); primary?.setAnimation(studio.animation); secondary?.setAnimation(studio.animation); primary?.mixer.setTime(poseTime()); secondary?.mixer.setTime(poseTime()); lastTick = 0; renderPanel(); requestRender(); say(`${motionReduced()?'Pose':'Movimiento'}: ${ANIMATION_OPTIONS.find(item => item.id === studio.animation)?.label ?? studio.animation}.`); }
    else if (button?.hasAttribute('data-wv-pause')) { studio.paused = !studio.paused; lastTick = 0; renderPanel(); requestRender(); say(studio.paused ? 'Movimiento pausado.' : 'Movimiento en marcha.'); }
    else if (button?.hasAttribute('data-wv-apply')) { options.onApplyToAll?.({ ...current }); say('Vestuario aplicado a toda la murga. Cada integrante conserva sus rasgos.'); }
    else if (button?.dataset.wvCamera) {
      if (button.dataset.wvCamera === 'home') resetCamera();
      else if (button.dataset.wvCamera === 'face' && controls) {
        if (studio.compare) {
          const averageHeight = (current.heightScale + comparisonSelection().heightScale) / 2;
          const distance = Math.max(1.25, 2.45 / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) + .15;
          controls.target.set(0, 1.53 * averageHeight, .12); camera.position.set(0, 1.55 * averageHeight, distance + .12);
        } else { const scale = current.heightScale; controls.target.set(0, 1.47 * scale, .12); camera.position.set(.06, 1.49 * scale, 1.35 * scale); }
        controls.update(); requestRender();
      } else zoomCamera(button.dataset.wvCamera === 'in' ? 1 / 1.2 : 1.2);
    }
    else if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); }
  }, { signal: events.signal });
  dialog.addEventListener('change', event => {
    event.stopPropagation(); const input = event.target; if (!ready || !(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) return;
    if (input.hasAttribute('data-wv-compare') && input instanceof HTMLInputElement) { studio.compare = input.checked; layoutCharacters(); resize(); resetCamera(); void ensureComparison(); say(studio.compare ? 'Mismo vestuario; cambian el rostro, el pelo y la altura.' : 'Vista de un personaje.'); }
    else if (input.hasAttribute('data-wv-member')) { memberId = input.value; options.onMemberChange?.(memberId); if (options.getSelection) current = constrainSelection(options.getSelection(memberId)); rememberOutfit(); primary?.setSelection(current); secondary?.setSelection(comparisonSelection()); updateLabels(); renderPanel(); resize(); requestRender(); say(`Personalizando a ${displayName()}.`); }
    else if (input.dataset.wvPiece && input instanceof HTMLInputElement) { const field = input.dataset.wvPiece; if (field === 'outfitId' && !outfitToggleAllowed) { renderPanel(); return; } const list = field === 'outfitId' ? availableOutfits : field === 'hatId' ? HAT_OPTIONS : MAKEUP_OPTIONS; const selected = input.checked ? field === 'outfitId' ? rememberedOutfits.get(memberId ?? '') ?? onOption(list).id : onOption(list).id : offOption(list).id; changeSelection({ [field]: selected }); }
  }, { signal: events.signal });
  dialog.addEventListener('input', event => {
    const input = event.target; if (!ready || !(input instanceof HTMLInputElement) || !input.hasAttribute('data-wv-height')) return;
    event.stopPropagation(); changeSelection({ heightScale: Number(input.value) }, false); const height = (1.7 * current.heightScale).toFixed(2); input.setAttribute('aria-valuetext', `${height} metros`); panel.querySelector('output')!.textContent = `${height.replace('.', ',')} m`;
  }, { signal: events.signal });
  dialog.addEventListener('keydown', event => {
    event.stopPropagation(); const focused = document.activeElement as HTMLElement | null;
    if (focused?.hasAttribute('data-wv-tab') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const tabs = [...dialog.querySelectorAll<HTMLButtonElement>('[data-wv-tab]')], index = tabs.indexOf(focused as HTMLButtonElement); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; tab = tabs[next].dataset.wvTab as StudioTab; renderPanel(); tabs[next].focus(); }
    else if (event.key === 'Tab') { const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), canvas[tabindex="0"]')].filter(element => element.tabIndex >= 0 && element.getClientRects().length); const first = focusable[0], last = focusable[focusable.length - 1]; if (event.shiftKey && focused === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && focused === last) { event.preventDefault(); first?.focus(); } }
  }, { signal: events.signal });
  document.addEventListener('visibilitychange', () => { cancelAnimationFrame(frame); frame = 0; lastTick = 0; frameBudget.reset(); host.dataset.renderState = 'paused'; if (!document.hidden) requestRender(); }, { signal: events.signal });
  reducedMotion.addEventListener('change', event => { if (event.matches) studio.paused = true; renderPanel(); requestRender(); }, { signal: events.signal });
  updateLabels(); renderPanel(); document.body.append(dialog); closeActiveViewer = close;
  try { dialog.showModal(); wasOpened = true; document.body.style.overflow = 'hidden'; observer.observe(host); viewObserver.observe(host); await load(); } catch { close(); }
}
