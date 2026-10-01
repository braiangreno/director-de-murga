import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/playfair-display/latin-500.css';
import '@fontsource/playfair-display/latin-600.css';
import '@fontsource/playfair-display/latin-500-italic.css';
import './style.css';
import './management.css';
import { Preferences } from '@capacitor/preferences';
import { MurgaScene, getSceneVenue } from './scene';
import { type CharacterSelection } from './character-system';
import { parseCosmetics, memberAppearance, dressEnsemble } from './cosmetics-state';
import { openWardrobeViewer } from './wardrobe-viewer';
import { recruitmentPanel, costumePanel, researchPanel, fameLabel, type MarketFilters } from './management-panels';
import { communityPanel, decisionPanel } from './community-panel';
import { careerPanel, identityPanel } from './career-panel';
import { setIdentity, validateIdentity } from './simulation';
import { contactCandidate, resolveDecision, getPendingDecision, getCommunitySummary } from './simulation';
import { scoutMember, nextSeason, getSeasonRenewalCost, getMemberReport, getRecruitmentAvailability, getCostumeProposals, chooseCostumeProposal, TOTAL_DAYS, REHEARSALS_START_DAY } from './simulation';
import { createGame, performAction, recruit, assignCord, buyUpgrade, buyLicense, getStats, getCalendar, getActionPreview, getActionAvailability, getContestSummary, getStandings, getUpgradeCost, parseSave, refreshCandidates, hireCreative, startSeason, revealEliminatedFallos, getProductionSummary, CREATIVE_ROLES, CREATIVE_ROLE_LABELS, CREATIVE_CANDIDATES, MEMBER_ROLE_LABELS, CORDS, EVENTS, MAX_UPGRADE, type State, type Action, type Upgrade, type CreativeRole, type Member } from './simulation';

const paths: Record<string,string> = {
  mask:'<path d="M3 5q9 5 18 0v7c0 6-9 10-9 10S3 18 3 12Z"/><path d="m6 10 3 1-3 1m12-2-3 1 3 1M8 16q4 4 8 0"/>',
  coin:'<circle cx="12" cy="12" r="9"/><path d="M15 8h-5a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H9m3-10v12"/>',
  voice:'<rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
  people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4m1-17a3 3 0 0 1 0 6m3 4a5 5 0 0 1 2 7"/>',
  music:'<path d="M9 18V5l11-3v13M9 9l11-3"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="15" rx="3" ry="3"/>',
  moon:'<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  star:'<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  book:'<path d="M12 5v16M12 5C8 2 5 3 2 4v15q6-2 10 2 4-4 10-2V4c-3-1-6-2-10 1Z"/>',
  shirt:'<path d="m8 3 4 3 4-3 6 5-4 5v8H6v-8L2 8Z"/>',
  calendar:'<rect x="3" y="5" width="18" height="17" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-14 4h3m4 0h3m-10 4h3"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5m0 4h.01"/>',
  trophy:'<path d="M7 3h10v7a5 5 0 0 1-10 0Zm5 12v5m-4 2h8M7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4"/>',
  refresh:'<path d="M3 10a9 9 0 1 1 1 7M3 3v7h7"/>',
  drum:'<ellipse cx="12" cy="8" rx="9" ry="4"/><path d="M3 8v9c0 5 18 5 18 0V8M3 9l6 11 6-11 6 8M5 2l8 4m6-4-8 4"/>',
  wand:'<path d="m4 20 13-13m-2-2 4 4M5 3v4M3 5h4m12 9v6m-3-3h6"/>',
  palette:'<path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h3c7 0 5-10-4-10Z"/><path d="M7 8h.01M12 6h.01M17 8h.01M6 13h.01"/>',
  expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  collapse:'<path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5"/>',
  plus:'<path d="M5 12h14M12 5v14"/>',
  minus:'<path d="M5 12h14"/>',
};
const icon = (name: string) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.star}</svg>`;
const money = (n: number) => '$ ' + Math.round(n).toLocaleString('es-UY');
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const signed = (n:number, suffix='') => `${n > 0 ? '+' : ''}${Math.round(n)}${suffix}`;
const KEY = 'director-de-murga-v6';
const WARDROBE_KEY = 'director-de-murga-character-system-v1';
const LEGACY_KEYS = ['director-de-murga-v5', 'director-de-murga-v4', 'director-de-murga-v3', 'director-de-murga-v2', 'director-de-murga-v1'];
const CREATIVE_DETAILS: Record<CreativeRole, {icon: string; brief: string; effect: string}> = {
  lyrics: {icon: 'book', brief: 'Encontrá la voz de tu espectáculo: humor, crítica y una historia para cantar.', effect: 'Aporta calidad a los textos.'},
  arrangements: {icon: 'music', brief: 'Transformá las melodías en un coro que emocione y se entienda con la batería.', effect: 'Mejora voces y arreglos, y la coordinación musical.'},
  costumes: {icon: 'shirt', brief: 'Dale al conjunto una silueta y una identidad que se reconozcan desde la última fila.', effect: 'Aporta calidad al vestuario del concurso.'},
  makeup: {icon: 'palette', brief: 'Convertí cada cara en un personaje: trazos, contrastes y color al servicio del espectáculo.', effect: 'Aporta calidad al maquillaje del concurso.'},
  staging: {icon: 'mask', brief: 'Conectá entradas, movimientos e interpretación para que cada escena tenga intención.', effect: 'Mejora la puesta en escena.'},
};
const roleIcon = (m: Member) => m.role === 'chorister' ? 'voice' : m.role === 'director' ? 'wand' : 'drum';
function eventDescription(day: number, exempt = false) {
  if (day === EVENTS[0].day && exempt) return 'Clasificada por la Liguilla anterior; solo resta confirmar la inscripción.';
  if (day === EVENTS[0].day) return 'Instancia de admisión · sin ingreso por actuación';
  if (day === EVENTS[1].day) return 'Primera rueda · todos continúan a la segunda';
  if (day === EVENTS[2].day) return 'Liguilla: las diez mejores sumas de las dos ruedas';
  return 'Fallos: gana la mayor suma de las tres ruedas';
}
const upgrades: {id:Upgrade;name:string;icon:string;weight:number;description:string}[] = [
  {id:'voices',name:'Voces y arreglos',icon:'music',weight:4,description:'Un coro que eriza la piel. Mejora el rendimiento vocal.'},
  {id:'lyrics',name:'Textos',icon:'book',weight:4,description:'Humor, crítica y un cuplé que el barrio recuerde.'},
  {id:'costumes',name:'Vestuario',icon:'shirt',weight:2,description:'Color, siluetas y detalles que cuentan tu historia.'},
  {id:'staging',name:'Puesta en escena',icon:'mask',weight:2,description:'Que cada movimiento acompañe lo que canta la murga.'},
];
async function boot() {
  let state = createGame();
  let cosmetics = parseCosmetics(null);
  let activeWardrobeMember = state.members[0].id;
  let wardrobeSaveQueue = Promise.resolve();
  try { cosmetics = parseCosmetics((await Preferences.get({ key: WARDROBE_KEY })).value); } catch { /* Cosmetic defaults do not affect the season save. */ }
  let saveWarning = '', initialNotice = '';
  try {
    const {value} = await Preferences.get({key: KEY});
    const saved = parseSave(value);
    if (saved) state = saved;
    else {
      if(value) await Preferences.set({key: `${KEY}-recovery-${Date.now()}`, value});
      let migrated = false;
      for (const key of LEGACY_KEYS) {
        const legacy = await Preferences.get({key});
        const restored = parseSave(legacy.value);
        if (!restored) continue;
        state = restored;
        await Preferences.set({key: KEY, value: JSON.stringify(state)});
        initialNotice = 'Partida actualizada: conservamos el elenco y el progreso. El guardado anterior sigue respaldado.';
        migrated = true;
        break;
      }
      if (!migrated && value) {
        initialNotice = 'No se pudo recuperar el guardado actual. Conservamos una copia para recuperación en este dispositivo.';
      }
    }
  } catch { initialNotice = 'No se pudo leer el guardado. Podés jugar, pero tu progreso podría no conservarse.'; }
  state.members.forEach((member,index) => { cosmetics.members[member.id] ??= memberAppearance(cosmetics,member.id,index); });
  let page = 'sede', replacement = state.members[0].id, modelReady = false, panelNotice = '';
  const market: MarketFilters = { query: '', fame: 'all', sort: 'cost', page: 0, offer: 'standard' };
  const talentLabel = (member: Member) => getMemberReport(state, member).label;
  let creativeRole: CreativeRole = CREATIVE_ROLES.find(role => !state.creativeTeam[role]) ?? 'lyrics';
  let theatrePreview = false;
  let sceneExpanded = false;
  let scene: MurgaScene | undefined, saveQueue = Promise.resolve(), toastTimer: ReturnType<typeof setTimeout>;
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <header class="topbar"><a class="brand" href="#" aria-label="Director de Murga, inicio"><span class="brand-mark">${icon('mask')}</span><span>DIRECTOR<span class="brand-small">DE MURGA</span></span></a><div class="resources" id="resources"></div><button class="icon-button help-button" data-open="help" aria-label="Cómo jugar">${icon('help')}</button></header>
    <main class="game"><section class="world"><div class="world-heading"><div class="eyebrow"><span class="live-dot"></span> CARNAVAL · MONTEVIDEO</div><h1>Que el barrio<br><em>vuelva a cantar.</em></h1><p>Tu murga. Tu historia. Tu carnaval.</p></div><div id="scene" class="scene"></div><div class="world-caption"><span class="caption-line"></span><span><span id="murga-name">La Vereda</span><br><small>Tu sede, tu punto de partida</small></span><span class="scene-stamp">EST. 2026</span></div><div class="scene-notice" id="scene-notice" hidden>Vista 3D no disponible. Podés seguir jugando con los controles.</div></section>
    <aside class="desk" id="desk" aria-label="Gestión de la murga"></aside></main>
    <nav class="bottom-nav" aria-label="Secciones del juego"><button class="selected" data-open="sede">${icon('mask')}<span>La sede</span></button><button data-open="plantel">${icon('people')}<span>El plantel</span><b>17</b></button><button data-open="taller">${icon('star')}<span>El taller</span></button><button data-open="comunidad">${icon('people')}<span>El barrio</span></button><button data-open="agenda">${icon('calendar')}<span>La temporada</span></button></nav>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
    <dialog id="panel"><div class="panel-header"><div><div class="eyebrow" id="panel-kicker"></div><h2 id="panel-title"></h2></div><button class="icon-button" data-close aria-label="Cerrar panel">${icon('close')}</button></div><div class="panel-content" id="panel-content"></div></dialog>`;
  const dialog = document.querySelector<HTMLDialogElement>('#panel')!;
  document.querySelector('.world')!.insertAdjacentHTML('beforeend', '<button class="venue-button" data-visit-theatre aria-pressed="false">Ver Teatro de Verano</button>');
  document.querySelector('.world')!.insertAdjacentHTML('beforeend', `<p class="camera-help" id="camera-help"><span class="camera-help-pointer">Arrastrá para girar · rueda para acercar</span><span class="camera-help-touch">Arrastrá para girar · pellizcá para acercar</span><span class="sr-only">Con teclado: flechas para girar, más y menos para zoom, Inicio para volver.</span></p><div class="scene-toolbar" role="group" aria-label="Cámara del escenario"><button data-camera="in" aria-label="Acercar cámara" title="Acercar">${icon('plus')}</button><button data-camera="out" aria-label="Alejar cámara" title="Alejar">${icon('minus')}</button><button data-camera="reset" aria-label="Restablecer vista" title="Vista inicial">${icon('refresh')}</button><button data-expand-scene aria-expanded="false" aria-controls="scene" aria-label="Ampliar escenario">${icon('expand')}<span>Ampliar</span></button></div>`);
  function expandScene(expanded: boolean) {
    sceneExpanded = expanded;
    const world = document.querySelector<HTMLElement>('.world')!;
    world.classList.toggle('is-expanded', expanded);
    document.body.classList.toggle('scene-expanded', expanded);
    for (const element of document.querySelectorAll<HTMLElement>('.topbar, .desk, .bottom-nav')) element.inert = expanded;
    if (expanded) { world.setAttribute('role', 'dialog'); world.setAttribute('aria-modal', 'true'); world.setAttribute('aria-label', 'Escenario 3D'); }
    else { world.removeAttribute('role'); world.removeAttribute('aria-modal'); world.removeAttribute('aria-label'); }
    const button = document.querySelector<HTMLButtonElement>('[data-expand-scene]')!;
    button.setAttribute('aria-expanded', String(expanded));
    button.setAttribute('aria-label', expanded ? 'Cerrar vista ampliada' : 'Ampliar escenario');
    button.innerHTML = `${icon(expanded ? 'collapse' : 'expand')}<span>${expanded ? 'Volver' : 'Ampliar'}</span>`;
    button.focus({ preventScroll: true });
  }
  document.querySelector('.scene-toolbar')!.insertAdjacentHTML('afterbegin', `<button data-wardrobe aria-label="Abrir taller de vestuario" title="Taller de vestuario">${icon('shirt')}<span>Vestuario</span></button>`);
  function saveCosmetics() {
    const activeIds = new Set([...state.members, ...state.candidates].map(member => member.id));
    cosmetics.members = Object.fromEntries(Object.entries(cosmetics.members).filter(([id]) => activeIds.has(id)));
    scene?.setCosmetics(stageCosmetics());
    const value = JSON.stringify(cosmetics);
    wardrobeSaveQueue = wardrobeSaveQueue.then(() => Preferences.set({ key: WARDROBE_KEY, value })).catch(() => { toast('El vestuario cambió, pero no pudimos guardar esta elección.'); });
  }
  function stageCosmetics() {
    const proposal=getCostumeProposals(state).find(item=>item.id===state.costumeProposalId);
    // Wardrobe follows the paid production. Facial identities remain in their own save.
    const dress = (look:CharacterSelection):CharacterSelection => ({...look,outfitId:proposal?.outfitId ?? 'none',paletteId:proposal?.paletteId ?? look.paletteId,hatId:proposal ? look.hatId : 'hat-none',makeupId:proposal ? look.makeupId : 'none'});
    return {...cosmetics,shared:dress(cosmetics.shared),members:Object.fromEntries(state.members.map((member,index)=>[member.id,dress(memberAppearance(cosmetics,member.id,index))]))};
  }
  function changeWardrobe(next: CharacterSelection) {
    cosmetics.members[activeWardrobeMember] = { ...next };
    saveCosmetics();
  }
  function showWardrobe(previewId?: string) {
    const proposal = getCostumeProposals(state).find(item => item.id === (previewId ?? state.costumeProposalId));
    if (!proposal) { openPanel('vestuario'); return; }
    if (dialog.open) dialog.close();
    if (!state.members.some(member => member.id === activeWardrobeMember)) activeWardrobeMember = state.members[0].id;
    const getSelection = (id: string): CharacterSelection => ({ ...memberAppearance(cosmetics, id, Math.max(0, state.members.findIndex(member => member.id === id))), outfitId: proposal.outfitId, paletteId: proposal.paletteId });
    void openWardrobeViewer(getSelection(activeWardrobeMember), previewId ? () => {} : changeWardrobe, {
      title: previewId ? 'Propuesta de vestuario' : 'Vestuario de la temporada',
      subtitle: previewId ? `${proposal.name} · vista previa, sin contratar confección` : `${proposal.name} · personalizá a cada integrante`,
      hideApplyToAll: Boolean(previewId),
      onClose: previewId ? () => openPanel('vestuario') : undefined,
      allowedOutfitIds: [proposal.outfitId], allowedPaletteIds: [proposal.paletteId],
      members: state.members.map(member => ({ id: member.id, name: member.name })),
      selectedMemberId: activeWardrobeMember,
      getSelection,
      onMemberChange: id => { activeWardrobeMember = id; },
      onApplyToAll: previewId ? undefined : look => { cosmetics = dressEnsemble(cosmetics, state.members, look); saveCosmetics(); toast('Vestuario aplicado a los 17 integrantes.'); },
    }).catch(() => toast('No pudimos abrir el taller. Volvé a intentarlo.'));
  }
  function toast(text: string) {
    const el = document.querySelector<HTMLElement>('#toast')!; el.textContent = text; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 5200);
  }
  function save() {
    const value = JSON.stringify(state);
    saveQueue = saveQueue.then(async () => { await Preferences.set({ key: KEY, value }); if (saveWarning) { saveWarning = ''; render(); } }).catch(() => { saveWarning = 'No pudimos guardar. Mantené la app abierta para conservar esta partida.'; render(); toast(saveWarning); });
  }
  function commit(next: State) { const focusedMember = (document.activeElement as HTMLElement)?.dataset.member; state = next; save(); render(); toast(state.lastMessage); if (dialog.open) { panelNotice=state.lastMessage; renderPanel(); } if (focusedMember) document.querySelector<HTMLSelectElement>(`select[data-member="${CSS.escape(focusedMember)}"]`)?.focus(); }
  function actionButton(action: Action, title: string, detail: string, glyph: string, style='') {
    const preview = getActionPreview(state, action), availability = getActionAvailability(state, action);
    const price=!availability.enabled?'No disponible':action==='compete'?(state.day===EVENTS[0].day?(state.admissionExempt?'Inscripción':'Admisión'):'Concurso'):preview.money?`${preview.money>0?'+':'−'} ${money(Math.abs(preview.money))}`:'Sin costo';
    return `<button class="action ${style}" data-action="${action}" ${availability.enabled?'':'disabled'} title="${escape(availability.reason || preview.label)}"><span class="action-icon">${icon(glyph)}</span><span class="action-copy"><strong>${title}</strong><small>${escape(!availability.enabled ? availability.reason : detail)}</small></span><span class="action-value">${price}${availability.enabled?`<small class="${preview.energy < 0?'expense':'gain'}">${action==='compete'?(state.admissionExempt&&state.day===EVENTS[0].day?'Sin costo':state.day===EVENTS[3].day?'Noche de fallos':'Sin caché'):`${signed(preview.energy)} energía`}</small>`:''}</span></button>`;
  }
  function communityDesk() {
    const summary=getCommunitySummary(state), pending=getPendingDecision(state);
    return `${pending?`<button class="decision-alert" data-open="decision"><span>${icon('book')}</span><span><small>EL ELENCO TE ESPERA</small><strong>${escape(pending.title)}</strong><em>Tomar una decisión ${icon('arrow')}</em></span></button>`:''}<button class="community-desk-link" data-open="comunidad"><span>${icon('people')} La vida de la murga</span><strong class="${summary.morale<45?'expense':''}">Ánimo ${Math.round(summary.morale)}<small>/100</small></strong></button>`;
  }
  function productionBudget() {
    const production = getProductionSummary(state);
    return `<div class="production-budget"><div><small>HONORARIOS TÉCNICOS · UYU</small><strong>${money(production.totalFees)}</strong></div><div><small>CAJA DISPONIBLE</small><strong>${money(state.money)}</strong></div></div>`;
  }
  function setupDesk() {
    const production = getProductionSummary(state);
    return `<div class="season-heading"><span>TEMPORADA ${state.season}</span><span>ABRIL · ARMADO</span></div>
      <div class="production-intro"><span>${icon('star')}</span><div><h2>Armá tu<br><em>espectáculo.</em></h2><p>Empezamos en abril. Convencé integrantes y elegí el equipo que va a preparar el espectáculo desde el invierno.</p></div></div>
      <button class="text-button identity-shortcut" data-open="identidad">${icon('mask')} Tu murga · ${escape(state.identity.name)} ${icon('arrow')}</button><div class="production-progress"><strong>${production.hired} de ${production.required} oficios contratados</strong><div>${CREATIVE_ROLES.map(role => `<span class="${state.creativeTeam[role] ? 'done' : ''}"></span>`).join('')}</div></div>
      <div class="production-list">${production.team.map(({role, label, candidate}) => `<button class="production-slot ${candidate ? 'filled' : ''}" data-choose-role="${role}"><span class="slot-icon">${icon(CREATIVE_DETAILS[role].icon)}</span><span class="slot-copy"><strong>${label}</strong><small>${candidate ? `${escape(candidate.name)} · ${money(candidate.fee)}` : 'Compará 3 perfiles y elegí'}</small></span><span class="slot-state">${icon(candidate ? 'check' : 'arrow')}</span></button>`).join('')}</div>
      <button class="outline-button team-summary" data-open="fichajes">${icon('people')} Buscar integrantes · ${state.candidates.length} perfiles ${icon('arrow')}</button><button class="outline-button team-summary" data-open="vestuario">${icon('shirt')} Propuestas de vestuario ${icon('arrow')}</button>
      ${productionBudget()}
      ${production.ready ? `<button class="primary-button production-start" data-start-production>Iniciar la campaña ${icon('arrow')}</button>` : `<button class="primary-button production-start" data-open="produccion">${icon('people')} Elegir equipo creativo ${icon('arrow')}</button>`}
      <p class="fineprint">El equipo creativo trabaja fuera de las 17 plazas del elenco. Contratar no consume jornadas. Reservá caja para preparar el espectáculo.</p>
      <div class="desk-foot"><span class="tiny-dot"></span> ${saveWarning ? 'Guardado no disponible' : 'Elecciones guardadas'}<button class="text-button" data-open="help">Cómo se juega ${icon('arrow')}</button></div>`;
  }
  function productionPanel() {
    const production = getProductionSummary(state);
    if (state.productionStarted) return `<div class="creative-brief"><h3>El equipo detrás del espectáculo</h3><p>Estos cinco oficios acompañan a ${escape(state.identity.name)} durante toda la temporada. Sus aportes ya se aplican a la preparación.</p></div><div class="team-roster">${production.team.map(({role,label,candidate}) => `<article class="production-slot filled"><span class="slot-icon">${icon(CREATIVE_DETAILS[role].icon)}</span><span class="slot-copy"><small>${label} · ${candidate?.level}</small><strong>${escape(candidate?.name ?? '')}</strong><small>${CREATIVE_DETAILS[role].effect}</small></span><span class="slot-state">${icon('check')}</span></article>`).join('')}</div>${productionBudget()}<p class="fineprint">Honorarios ya abonados. Elegís un equipo nuevo al comenzar otra temporada. El director escénico del elenco y el responsable técnico de puesta cumplen funciones distintas en el juego.</p>`;
    const selected = CREATIVE_CANDIDATES.find(c => c.id === state.creativeTeam[creativeRole]);
    const currentIndex = CREATIVE_ROLES.indexOf(creativeRole);
    const remainingRole = CREATIVE_ROLES.find(role => !state.creativeTeam[role]);
    return `<div class="production-role-tabs" role="group" aria-label="Oficio a contratar">${CREATIVE_ROLES.map((role, i) => `<button data-creative-role="${role}" aria-pressed="${creativeRole === role}" class="${creativeRole === role ? 'active' : ''} ${state.creativeTeam[role] ? 'filled' : ''}"><span>${state.creativeTeam[role] ? icon('check') : `0${i + 1}`}</span>${CREATIVE_ROLE_LABELS[role]}</button>`).join('')}</div>
      <div class="creative-brief"><div class="eyebrow">OFICIO ${currentIndex + 1} DE 5</div><h3>${CREATIVE_ROLE_LABELS[creativeRole]}</h3><p>${CREATIVE_DETAILS[creativeRole].brief}</p></div>
      <div class="creative-grid">${CREATIVE_CANDIDATES.filter(c => c.role === creativeRole).map((candidate, i) => {
        const chosen = candidate.id === selected?.id;
        const affordable = candidate.fee <= state.money + state.creativeFees[creativeRole] + (creativeRole === 'costumes' ? state.accounts.costume : 0);
        return `<article class="creative-card ${chosen ? 'is-selected' : ''}"><div class="creative-level">${icon(chosen ? 'check' : CREATIVE_DETAILS[creativeRole].icon)}<span>${candidate.level}</span>${chosen ? '<b>EN TU EQUIPO</b>' : ''}</div><span class="creative-monogram p${i}" aria-hidden="true">${escape(candidate.name.split(' ').map(word => word[0]).slice(0,2).join(''))}</span><h3>${escape(candidate.name)}</h3><p class="creative-nickname">“${escape(candidate.nickname)}”</p><p class="creative-impact">${CREATIVE_DETAILS[creativeRole].effect} Trayectoria pública: ${candidate.level.toLocaleLowerCase('es-UY')}. El resultado se conoce durante el trabajo.</p><p class="creative-fee"><strong>${money(candidate.fee)}</strong><small>por temporada</small></p><button class="${chosen ? 'outline-button' : 'primary-button'}" data-hire-creative="${candidate.id}" ${chosen || !affordable ? 'disabled' : ''}>${chosen ? 'Contratado' : !affordable ? 'No alcanza la caja' : selected ? 'Cambiar por este perfil' : 'Contratar'}</button></article>`;
      }).join('')}</div>
      ${creativeRole === 'costumes' ? '<button class="outline-button team-summary" data-open="vestuario">Ver las propuestas de tu vestuarista</button>' : ''}
      <div class="production-footer">${productionBudget()}<p class="fineprint">Podés cambiar tus elecciones antes de empezar: recuperás el honorario anterior. Los importes y perfiles son ficticios. Un equipo más caro deja menos caja para ensayos y mejoras.</p>
      ${!production.ready ? `<button class="outline-button" data-creative-role="${remainingRole ?? CREATIVE_ROLES[(currentIndex+1)%5]}">${production.hired}/5 contratados · ${selected ? 'Elegir el siguiente oficio' : 'Quedan oficios por cubrir'} ${icon('arrow')}</button>` : ''}
      <button class="primary-button production-start" data-start-production ${production.ready ? '' : 'disabled'}>${production.ready ? 'Empezar la preparación' : 'Completá los 5 oficios para empezar'} ${icon('arrow')}</button></div>`;
  }
  function render() {
    const stats = getStats(state), calendar = getCalendar(state), next = EVENTS.find(e => e.day >= state.day), ended = state.status !== 'playing';
    const actualVenue = getSceneVenue(state), theatreVisible = theatrePreview || actualVenue === 'theatre';
    document.querySelector<HTMLElement>('.world')!.dataset.venue = theatreVisible ? 'theatre' : actualVenue;
    document.querySelector('.world-heading h1')!.innerHTML = theatreVisible ? 'Teatro de Verano<br><em>Ramón Collazo.</em>' : !state.productionStarted ? 'Una idea.<br><em>Todo un carnaval.</em>' : calendar.tabladosOpen ? 'Ahora sí,<br><em>salimos a cantar.</em>' : 'El carnaval empieza<br><em>en el ensayo.</em>';
    document.querySelector('.world-heading p')!.textContent = theatreVisible ? theatrePreview && actualVenue !== 'theatre' ? 'Una visita al escenario. Tu temporada sigue en el mismo punto.' : `${calendar.eventName ?? 'Concurso Oficial'} · llegó la noche de cantar.` : !state.productionStarted ? 'Letra, música y color. Tu historia empieza con un equipo.' : calendar.tabladosOpen ? 'El concurso y los tablados, dos agendas distintas.' : 'Coro, batería y dirección preparando el espectáculo.';
    document.querySelector('#murga-name')!.textContent = state.identity.name;
    document.querySelector('.world-caption small')!.textContent = theatreVisible ? theatrePreview && actualVenue !== 'theatre' ? 'Vista del teatro · sin avanzar la temporada' : 'Concurso Oficial · Teatro de Verano' : calendar.tabladosOpen ? 'Tablado al aire libre' : 'Patio de ensayo · al aire libre';
    const caption = document.querySelector('.world-caption small')!;
    caption.textContent = `${state.identity.barrio} · ${caption.textContent}`;
    const venueButton = document.querySelector<HTMLButtonElement>('[data-visit-theatre]')!;
    venueButton.hidden = actualVenue === 'theatre';
    venueButton.textContent = theatrePreview ? 'Volver a la murga' : 'Ver Teatro de Verano';
    venueButton.setAttribute('aria-pressed', String(theatrePreview));
    document.querySelector('.scene-stamp')!.textContent = '13 CORO · 3 BATERÍA · 1 DIRECCIÓN';
    document.querySelector('#resources')!.innerHTML = `<div class="resource">${icon('coin')}<span><small>CAJA · UYU</small><strong>${money(state.money)}</strong></span></div><div class="resource ${stats.energy<40?'warning':''}">${icon('sun')}<span><small>ENERGÍA</small><strong>${Math.round(stats.energy)}<i>/100</i></strong></span><span class="mini-bar"><i style="height:${stats.energy}%"></i></span></div><div class="resource fan-resource">${icon('people')}<span><small>REPUTACIÓN</small><strong>${state.reputation}<i>/100</i></strong></span></div>`;
    document.querySelector('#desk')!.innerHTML = !state.productionStarted ? setupDesk() : `<div class="season-heading"><span>TEMPORADA ${state.season}</span><button data-open="agenda" class="text-button">Jornada ${Math.min(state.day+1,TOTAL_DAYS)}/${TOTAL_DAYS} ${icon('calendar')}</button></div><div class="date-row"><h2>${calendar.month}</h2><span class="chapter">${calendar.phaseLabel}</span></div>
      <div class="progress-track">${EVENTS.map(e => `<span class="${state.results.some(r=>r.name===e.name&&r.passed)?'done':state.day>=e.day?'current':''}" title="${e.name}"></span>`).join('')}</div>
      <div class="next-event"><span class="event-icon">${icon(ended?'trophy':'star')}</span><div><small>${ended?'FIN DE TEMPORADA':calendar.eventName?'LLEGÓ LA NOCHE':'PRÓXIMA PARADA'}</small><strong>${ended?(state.status==='won'?'¡La copa es del barrio!':'Volveremos a cantar'):next?.day===EVENTS[0].day&&state.admissionExempt?'Inscripción directa':next?.name??'Liguilla'}</strong><span>${ended?'Revisá tu recorrido en La temporada':calendar.eventName?(state.admissionExempt&&state.day===EVENTS[0].day?'Confirmá la inscripción: ya clasificaste por la Liguilla anterior.':'Tu murga está por salir al escenario'):`En ${calendar.daysUntil} jornada${calendar.daysUntil!==1?'s':''} · cuidá las voces`}</span></div></div>
      <div class="readiness"><div><span>Armonía del coro</span><strong>${Math.round(stats.harmony)}<small>/100</small></strong></div><div class="meter"><i style="width:${stats.harmony}%"></i></div><p>${stats.energy<40?'Las voces están cansadas. Un descanso puede salvar la noche.':stats.harmony<85?'Hay voces fuera de su cuerda. Revisá el plantel.':'El coro está bien acompañado. Ahora hay que hacerlo crecer.'}</p></div>
      <div class="section-label"><span>¿QUÉ HACEMOS HOY?</span><small>1 acción = 1 jornada</small></div>
      <div class="actions">${calendar.eventName&&!ended?actionButton('compete',state.day===EVENTS[0].day?(state.admissionExempt?'Confirmar inscripción':'Dar la prueba'):'¡Al escenario!',calendar.eventName,'trophy','primary'):''}${actionButton('rehearse','Ensayar','Coro, batería y dirección','music',!calendar.eventName?'primary':'')}${calendar.tabladosOpen?actionButton('popular','Circuito popular','2 tablados · saldo neto','people')+actionButton('commercial','Circuito comercial','2 tablados · saldo neto','coin'):''}${actionButton('rest',state.day<REHEARSALS_START_DAY?'Avanzar planificación':'Dar descanso',state.day<REHEARSALS_START_DAY?'Armado del plantel · ensayos desde julio':'Recuperar al elenco','moon')}</div>
      ${!calendar.tabladosOpen?`<p class="calendar-note">${icon('calendar')}<span><strong>Todavía no hay tablados</strong>El circuito abre a fines de enero. Las funciones previas son eventos puntuales; la admisión no es un tablado.</span></p>`:''}
      ${ended?`<button class="primary-button replay" data-open="resultado">${icon('trophy')} Ver resultado de temporada ${icon('arrow')}</button>`:''}
      <button class="team-summary outline-button" data-open="produccion">${icon('people')} Tu equipo creativo · 5 oficios ${icon('arrow')}</button><button class="license ${state.licensed?'paid':''}" data-license ${state.licensed||ended?'disabled':''}>${icon(state.licensed?'check':'book')}<span>${state.licensed?'Declaración de repertorio preparada':'Preparar declaración de repertorio'}</span>${state.licensed?'':icon('arrow')}</button><div class="desk-foot"><span class="tiny-dot"></span> ${saveWarning?'Guardado no disponible':'Guardado automático'}<button class="text-button" data-open="help">Guía del director ${icon('arrow')}</button></div>`;
    document.querySelector('#desk .date-row, #desk .production-intro')?.insertAdjacentHTML('afterend',communityDesk());
    scene?.setCosmetics(stageCosmetics());
    scene?.update(state, theatrePreview);
  }
  function openPanel(name: string) {
    if (name === 'sede') { dialog.close(); return; }
    if (name === 'produccion') creativeRole = CREATIVE_ROLES.find(role => !state.creativeTeam[role]) ?? creativeRole;
    page = name; panelNotice = ''; renderPanel(); if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    document.querySelectorAll<HTMLButtonElement>('.bottom-nav button').forEach(b => b.classList.toggle('selected',b.dataset.open===name));
  }
  function seasonPanel(showResult: boolean) {
    const summary = getContestSummary(state), calendar = getCalendar(state), stats = getStats(state);
    const eliminatedFallos = state.day === EVENTS[2].day && state.status === 'lost' && state.fallosRevealed;
    const finalFallos = state.day === EVENTS[3].day && state.status !== 'playing';
    const fallos = finalFallos || eliminatedFallos;
    const ended = state.status !== 'playing';
    const resultTitle = state.status === 'won' ? `¡Primer premio para ${state.identity.name}!` : state.status === 'lost' ? (state.day === EVENTS[0].day ? 'Esta vez no pasamos la admisión.' : state.day === EVENTS[2].day ? 'Esta vez no entramos a la Liguilla.' : `Terminamos en el puesto ${summary.rank ?? '—'}.`) : 'La temporada sigue en marcha.';
    const opening = `<article class="milestone ${calendar.tabladosOpen ? 'completed' : ''}"><span class="milestone-number">${icon('calendar')}</span><div><small>FINES DE ENERO · APERTURA</small><h3>Comienza el circuito de tablados</h3><p>Desde esta fase podés agendar actuaciones. Cada escenario tiene su propia programación.</p></div></article>`;
    return `${showResult ? `<div class="season-result">${icon('trophy')}<h3>${escape(resultTitle)}</h3><p>${escape(state.lastMessage)}</p></div>` : ''}
      <div class="phase-banner"><span>${icon('calendar')}</span><div><strong>${calendar.phaseLabel}</strong><p>${calendar.tabladosOpen ? 'Tablados y concurso transcurren en paralelo.' : 'Preparación del espectáculo. La financiación inicial sostiene los meses de preparación.'}</p></div></div>
      <div class="forecast"><div><small>${eliminatedFallos ? 'SUMA DE DOS RUEDAS' : finalFallos ? 'SUMA DE TRES RUEDAS' : 'PREPARACIÓN ESTIMADA'}</small><strong>${fallos ? summary.contestTotal.toFixed(1) : 'En ensayo'}<span>${fallos ? '/' + (eliminatedFallos ? '200' : '300') : ''}</span></strong></div><p>${eliminatedFallos ? 'Epílogo: llegó la Noche de Fallos. Tu participación cerró en la segunda rueda; estas son tus dos notas. La admisión no se suma.' : finalFallos ? `Puesto ${summary.rank ?? '—'} entre las finalistas. La admisión no se suma al concurso.` : 'El ensayo permite conocer al elenco, pero no anticipa una nota exacta. Las notas de las ruedas permanecen reservadas hasta los fallos.'}</p></div>
      <div class="timeline">${EVENTS.map((e, i) => {
        const result = state.results.find(r => r.name === e.name);
        let detail = eventDescription(e.day, state.admissionExempt);
        if (result) {
          if (i === 0 && state.admissionExempt) detail = 'Inscripción directa por la Liguilla anterior. Sin prueba ni puntaje.';
          else if (i === 0) detail = `${result.passed ? 'Admitida' : 'No admitida'} · índice del prototipo: ${result.score.toFixed(1)}. No suma al concurso.`;
          else if (fallos) detail = `${result.score.toFixed(1)} puntos del juego · se suma al total del concurso`;
          else if (i === 1) detail = 'Actuación cumplida · puntaje reservado · continúa a segunda rueda';
          else if (i === 2) detail = `${result.passed ? 'Clasificamos a la Liguilla' : 'No clasificamos a la Liguilla'} · puntajes reservados`;
        }
        return `${i === 1 ? opening : ''}<article class="milestone ${result ? 'completed' : ''}"><span class="milestone-number">${result ? icon(result.passed ? 'check' : 'close') : String(i + 1).padStart(2, '0')}</span><div><small>${['NOVIEMBRE · ADMISIÓN', 'FINES DE ENERO / FEBRERO', 'FEBRERO', 'FEBRERO / MARZO'][i]}</small><h3>${i===0&&state.admissionExempt?'Inscripción directa':e.name}</h3><p>${detail}</p></div></article>`;
      }).join('')}</div>
      ${finalFallos ? `<section class="standings"><h3>Noche de fallos</h3><p>Rivales ficticias · suma de las tres ruedas</p><table><thead><tr><th>Murga finalista</th><th>Total</th></tr></thead><tbody>${getStandings(state).filter(row => row.qualified).map(row => `<tr class="${row.isPlayer ? 'player-row' : ''}"><td>${escape(row.isPlayer ? state.identity.name : row.name)}${row.isPlayer ? ' · tu murga' : ''}</td><td>${row.total.toFixed(1)}</td></tr>`).join('')}</tbody></table></section>` : ''}
      ${state.status === 'lost' && state.day === EVENTS[2].day && !state.fallosRevealed ? `<div class="phase-banner"><div><strong>Tu participación terminó; los fallos todavía no.</strong><p>Avanzá al cierre del carnaval para conocer las notas de tus dos ruedas.</p><button class="primary-button" data-reveal-fallos>Ir a la Noche de Fallos ${icon('arrow')}</button></div></div>` : ''}
      <div class="log"><h3>La libreta del director</h3>${state.log.map(s => `<p>${escape(s)}</p>`).join('')}</div>
      <p class="fineprint">${TOTAL_DAYS} jornadas representativas de abril a marzo, no días consecutivos. El juego usa murgas rivales ficticias y una escala propia de 0–100 por rueda; no reproduce las planillas oficiales. ${ended ? 'Podés comenzar otra campaña.' : 'Los importes y el desgaste son valores de balance.'}</p>
      <button class="outline-button team-summary" data-open="trayectoria">${icon('book')} Historia de la murga ${icon('arrow')}</button><button class="outline-button" data-open="reset">${icon('refresh')} Nueva temporada</button>`;
  }
  function renderPanel() {
    const titles:Record<string,[string,string]>={trayectoria:['DE CARNAVAL EN CARNAVAL','Historia de la murga'],identidad:['EL NOMBRE QUE VAMOS A CANTAR','Nuestra identidad'],comunidad:['SE HACE ENTRE TODOS','La vida de la murga'],decision:['LA LIBRETA DEL DIRECTOR','Una decisión del año'],produccion:['DE LA IDEA AL ESCENARIO','Tu equipo creativo'],plantel:['13 VOCES · 3 INSTRUMENTOS · 1 DIRECCIÓN','El plantel'],fichajes:['NOMBRES, HISTORIAS Y CONVERSACIONES','Mercado de integrantes'],vestuario:['DISEÑO Y CONFECCIÓN','El vestuario'],economia:['FUENTES Y PRESUPUESTOS','El costo del carnaval'],taller:['EL OFICIO DE EMOCIONAR','El taller'],agenda:['DE ABRIL A MARZO','La temporada'],help:['TU PRIMER CARNAVAL','Guía del director'],resultado:['BAJÓ EL TELÓN','Resultado de temporada'],reset:['LA MURGA SIGUE','La próxima temporada']};
    const [kicker,title] = titles[page]??titles.help;
    document.querySelector('#panel-kicker')!.textContent=kicker; document.querySelector('#panel-title')!.textContent=title;
    dialog.classList.toggle('production-panel', page === 'produccion');
    let body = '';
    const locked = !state.productionStarted || state.status !== 'playing';
    if(page==='trayectoria') {
      body=careerPanel(state);
    } else if(page==='identidad') {
      body=identityPanel(state);
    } else if(page==='comunidad') {
      body=communityPanel(state);
    } else if(page==='decision') {
      body=decisionPanel(state);
    } else if(page==='produccion') {
      body = productionPanel();
    } else if(page==='plantel') {
      const groups = [
        {title:'El coro', detail:'13 coreutas · afinidad y balance de cuerdas', members:state.members.filter(m=>m.role==='chorister'), role:'chorister'},
        {title:'La batería', detail:'Bombo, redoblante y platillos · técnica que se descubre ensayando', members:state.members.filter(m=>['bombo','redoblante','platillos'].includes(m.role)), role:'bombo'},
        {title:'La dirección', detail:'Conduce y coordina al elenco', members:state.members.filter(m=>m.role==='director'), role:'director'},
      ];
      body=`<div class="panel-intro"><p><b>17 componentes, tres funciones.</b> Organizá las cuerdas del coro y cuidá la técnica de la batería y la conducción escénica.</p><button class="primary-button" data-open="fichajes" ${!getRecruitmentAvailability(state).enabled?'disabled':''}>${icon('people')} Buscar talentos</button></div>
        <div class="ensemble-summary"><span>${icon('voice')}<b>13</b> coreutas</span><span>${icon('drum')}<b>3</b> batería</span><span>${icon('wand')}<b>1</b> dirección</span></div>
        <p class="calendar-note">Las negociaciones empiezan en abril. Conservás integrantes, experiencia y vínculos al pasar de año.</p>
        <div class="cord-summary">${CORDS.map(c=>`<span>${c}<b>${state.members.filter(m=>m.role==='chorister'&&m.assignedCord===c).length}</b></span>`).join('')}</div>
        ${groups.map(group=>`<section class="member-section" data-role="${group.role}"><h3>${group.title}</h3><p>${group.detail}</p><div class="member-list">${group.members.map(m=>`<article class="member"><span class="portrait" data-role="${m.role}" aria-hidden="true">${icon(roleIcon(m))}</span><div class="member-name"><strong>${escape(m.nickname)}</strong><span>${escape(m.name)}</span><small>${m.role === 'chorister' ? `${m.cord} · ` : ''}${talentLabel(m)} · energía ${Math.round(m.energy)}</small><small>${fameLabel(m.fame)} · ${m.seasons} carnavales · ${Math.round(m.experience)} XP</small><small>Ánimo ${Math.round(m.morale)}/100 · ${m.loyalty>=70?'Vínculo fuerte':m.loyalty>=45?'Se siente parte':'Vínculo por cuidar'}</small></div>${m.role === 'chorister' ? `<label class="cord-select"><span class="sr-only">Cuerda de ${escape(m.name)}</span><select data-member="${m.id}" ${locked?'disabled':''}>${CORDS.map(c=>`<option ${c===m.assignedCord?'selected':''}>${c}</option>`).join('')}</select><small class="${m.cord===m.assignedCord?'gain':'expense'}">${m.cord===m.assignedCord?'En su cuerda':'Fuera de cuerda'}</small></label>` : `<span class="role-badge" data-role="${m.role}">${MEMBER_ROLE_LABELS[m.role]}</span>`}</article>`).join('')}</div></section>`).join('')}
        <p class="fineprint">Plantilla elegida para el juego: 13 + 3 + 1. Las cuerdas solo corresponden al coro. La batería y la dirección tienen habilidad y cansancio propios.</p>`;
    } else if(page==='fichajes') {
      if(!state.members.some(m=>m.id===replacement)) replacement=state.members[0].id;
      body=recruitmentPanel(state,replacement,market);
    } else if(page==='vestuario') {
      body=costumePanel(state);
    } else if(page==='economia') {
      body=researchPanel(state);
    } else if(page==='taller') {
      body=`<p class="intro-copy">${state.productionStarted ? 'Tu equipo creativo ya está trabajando. Invertí en el espectáculo sin consumir una jornada; reservá caja para ensayar.' : 'Contratá los cinco oficios y empezá la preparación para desarrollar el espectáculo.'}</p><button class="outline-button team-summary" data-open="produccion">${icon('people')} ${state.productionStarted ? 'Ver equipo creativo' : 'Elegir equipo creativo'} ${icon('arrow')}</button><div class="upgrade-grid">${upgrades.map(u=>`<article class="upgrade"><div class="upgrade-heading"><span class="upgrade-icon">${icon(u.icon)}</span><span class="weight">PESO ×${u.weight}</span></div><h3>${u.name}</h3><p>${u.description}</p><div class="upgrade-levels">${Array.from({length:MAX_UPGRADE},(_,i)=>`<span class="${i<state.upgrades[u.id]?'on':''}"></span>`).join('')}<small>Nv. ${state.upgrades[u.id]}</small></div><button class="primary-button" data-upgrade="${u.id}" ${state.upgrades[u.id]>=MAX_UPGRADE||state.money<getUpgradeCost(state,u.id)||locked?'disabled':''}>${state.upgrades[u.id]>=MAX_UPGRADE?'Al máximo':`Mejorar · ${money(getUpgradeCost(state,u.id))}`}</button></article>`).join('')}</div><p class="fineprint">Pesos de la evaluación del juego. El reglamento real contempla más rubros y una valoración global de la propuesta escénica.</p>`;
    } else if(page==='agenda'||page==='resultado') {
      body=seasonPanel(page==='resultado');
    } else if(page==='reset') {
      body=`<p class="intro-copy">${escape(state.identity.name)} vuelve en abril con su plantel, su reputación y las carreras que construiste. Las nuevas contrataciones y el equipo creativo se negocian para el año siguiente. La financiación de la nueva campaña y el saldo quedan registrados. Renovar este plantel costará ${money(getSeasonRenewalCost(state))}, descontados de la caja de la nueva temporada.</p>${state.status==='playing'?'<p class="calendar-note">Primero terminá la temporada actual. Los años de carrera no se ganan reiniciando una campaña.</p>':''}<div class="confirm-actions"><button class="outline-button" data-close>Volver</button><button class="primary-button" data-reset ${state.status==='playing'?'disabled':''}>Continuar a la temporada ${state.season+1}</button></div>`;
    } else {
      body=`<div class="guide-step"><b>01</b><div><h3>Primero, el equipo creativo</h3><p>Elegí letrista, arreglador/a coral, vestuarista, maquillador/a y puestista. Compará trayectoria y honorarios. Los diseños del vestuarista aparecen después de contratarlo: te presenta dos alternativas y elegís cuál confeccionar. Podés cambiar perfiles recuperando el pago anterior hasta que empieces la preparación; después trabajan contigo toda la temporada.</p></div></div>
      <div class="guide-step"><b>02</b><div><h3>De abril al invierno: armar y ensayar</h3><p>Armá el elenco mucho antes de noviembre: buscá artistas, escuchá audiciones y negociá según la reputación de tu murga. Los ensayos comienzan en julio en esta campaña. Dirigí a 13 coreutas, 3 percusionistas y 1 director/a escénico/a. Solo el coro usa cuerdas; bombo, redoblante, platillos y dirección tienen técnica y energía propias. Ensayar mejora cada función. La admisión decide el ingreso de quienes no clasificaron por la Liguilla anterior. Las finalistas confirman su inscripción directa, sin prueba, puntaje ni desgaste.</p></div></div>
      <div class="guide-step"><b>03</b><div><h3>Diciembre y enero: desarrollar el espectáculo</h3><p>Usá la caja que queda después de los contratos para preparar textos, arreglos, vestuario y puesta. Los técnicos influyen en esas áreas y el maquillaje también suma al concurso. Las funciones previas al desfile son eventos puntuales.</p></div></div>
      <div class="guide-step"><b>04</b><div><h3>Ahora sí: tablados y concurso</h3><p>El circuito abre a fines de enero. Las actuaciones generan dinero y desgaste. Todos los conjuntos admitidos hacen las dos primeras ruedas; la suma define el ingreso a la Liguilla. El ganador surge de sumar las tres ruedas, sin contar la admisión.</p></div></div>
      <div class="guide-note"><h3>La murga también se cuida</h3><p>Conversá con candidatos para construir confianza antes de una oferta. Disponés de tres conversaciones por jornada y cada persona necesita tiempo entre charlas. En El barrio podés organizar hasta tres festivales de financiación antes del carnaval o dedicar una jornada a la convivencia. Las decisiones del año tienen consecuencias visibles y siempre una alternativa sin gasto.</p><h3>Una historia que continúa</h3><p>Desde El barrio podés ponerle nombre y barrio a la murga. Su historia conserva hasta 50 temporadas cerradas, sus cuentas y la trayectoria del elenco. Las notas del carnaval actual siguen reservadas hasta los fallos; al pasar de año, el cierre queda archivado antes de financiar la siguiente campaña.</p><h3>Las reglas de este juego</h3><p>Los puntajes de concurso se reservan hasta los fallos. Los valores económicos son estimaciones del juego en UYU, con referencias históricas consultables. La habilidad individual permanece oculta; los informes de audición son aproximados. 13 coreutas, 3 percusionistas y 1 director es nuestra plantilla, no una distribución universal obligatoria.</p><p>Los cinco técnicos están fuera de las plazas escénicas. En la práctica una persona puede desempeñar varios oficios; aquí se contratan por separado para que puedas decidir cómo invertir.</p><p>La declaración de repertorio documenta autores y obras; prepararla no equivale a una autorización universal.</p></div>
      <p class="fineprint">La partida se guarda en este dispositivo. ${modelReady?'Elenco con cuerpo común, vestuario intercambiable y animaciones. Personalizá a cada integrante en el taller.':'El elenco 3D está cargando; si falla, muestra figuras provisionales.'}</p><button class="outline-button" data-open="reset">${icon('refresh')} Próxima temporada</button>`;
    }
    if (page === 'taller') body = `<button class="outline-button team-summary" data-open="vestuario">${icon('shirt')} Diseño y confección del vestuario ${icon('arrow')}</button>` + body;
    if (page !== 'economia') body += '<button class="text-button sources-link" data-open="economia">Calendario, costos y fuentes consultadas ↗</button>';
    document.querySelector('#panel-content')!.innerHTML=(panelNotice?`<p class="panel-feedback" role="status">${escape(panelNotice)}</p>`:'')+body;
  }
  document.addEventListener('click', event => {
    const target=(event.target as Element).closest<HTMLButtonElement>('button');
    if(!target||target.disabled) return;
    if(target.dataset.open) openPanel(target.dataset.open);
    else if(target.hasAttribute('data-wardrobe')) showWardrobe();
    else if(target.dataset.camera) { if(target.dataset.camera === 'reset') scene?.resetCamera(); else scene?.zoomCamera(target.dataset.camera === 'in' ? 1 / 1.2 : 1.2); }
    else if(target.hasAttribute('data-expand-scene')) expandScene(!sceneExpanded);
    else if(target.hasAttribute('data-visit-theatre')) { theatrePreview = !theatrePreview; render(); }
    else if(target.dataset.chooseRole) { openPanel('produccion'); creativeRole=target.dataset.chooseRole as CreativeRole; panelNotice=''; renderPanel(); }
    else if(target.dataset.creativeRole) { creativeRole=target.dataset.creativeRole as CreativeRole; panelNotice=''; renderPanel(); document.querySelector('.creative-brief')?.scrollIntoView({block:'nearest'}); }
    else if(target.dataset.hireCreative) commit(hireCreative(state,target.dataset.hireCreative));
    else if(target.hasAttribute('data-start-production')) { commit(startSeason(state)); if(state.productionStarted) { dialog.close(); render(); } }
    else if(target.hasAttribute('data-reveal-fallos')) commit(revealEliminatedFallos(state));
    else if(target.hasAttribute('data-close')) dialog.close();
    else if(target.dataset.action) {
      const action=target.dataset.action as Action, before=state.results.length, beforeDay=state.day;
      const nextState=performAction(state,action);
      theatrePreview=action==='compete'&&!(state.day===EVENTS[0].day&&state.admissionExempt)&&nextState.results.length>before;
      commit(nextState);
      if(theatrePreview || action==='fundraiser'&&state.day>beforeDay) scene?.celebrate();
      if(state.pendingDecision) openPanel('decision');
      else if(state.results.length>before) openPanel(state.status==='playing'?'agenda':'resultado');
    }
    else if(target.dataset.upgrade) commit(buyUpgrade(state,target.dataset.upgrade as Upgrade));
    else if(target.dataset.recruit) { commit(recruit(state,target.dataset.recruit,replacement,market.offer)); saveCosmetics(); }
    else if(target.dataset.scout) commit(scoutMember(state,target.dataset.scout));
    else if(target.dataset.contact) commit(contactCandidate(state,target.dataset.contact));
    else if(target.dataset.resolveDecision) { const hadDecision=state.pendingDecision; commit(resolveDecision(state,target.dataset.resolveDecision)); if(hadDecision && !state.pendingDecision) openPanel('comunidad'); }
    else if(target.dataset.marketPage !== undefined) { market.page=Number(target.dataset.marketPage); renderPanel(); document.querySelector('.market-count')?.scrollIntoView({block:'start'}); }
    else if(target.dataset.previewProposal) showWardrobe(target.dataset.previewProposal);
    else if(target.dataset.costumeProposal) {
      const id=target.dataset.costumeProposal; commit(chooseCostumeProposal(state,id));
      const proposal=getCostumeProposals(state).find(p=>p.id===state.costumeProposalId);
      if(proposal && proposal.id===id) { cosmetics=dressEnsemble(cosmetics,state.members,{...cosmetics.shared,outfitId:proposal.outfitId,paletteId:proposal.paletteId}); saveCosmetics(); }
    }
    else if(target.hasAttribute('data-refresh')) commit(refreshCandidates(state));
    else if(target.hasAttribute('data-license')) commit(buyLicense(state));
    else if(target.hasAttribute('data-reset')) { const next=nextSeason(state); if(next.season===state.season) { toast(next.lastMessage); return; } state=next; replacement=state.members[0].id; market.page=0; creativeRole='lyrics'; theatrePreview=false; save(); dialog.close(); render(); toast(state.lastMessage); }
  });
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== 'identity-form') return;
    event.preventDefault();
    const data = new FormData(form);
    const draft = { name: String(data.get('name') ?? ''), barrio: String(data.get('barrio') ?? '') };
    const validation = validateIdentity(draft);
    if (!validation.valid) {
      const error = document.querySelector<HTMLElement>('#identity-error');
      if (error) { error.textContent = validation.reason; error.hidden = false; }
      return;
    }
    commit(setIdentity(state, draft));
    openPanel('trayectoria');
  });
  document.addEventListener('input',event=>{
    const target=event.target as HTMLInputElement;
    if(target.id!=='market-query') return;
    const cursor=target.selectionStart;
    market.query=target.value; market.page=0; renderPanel();
    const input=document.querySelector<HTMLInputElement>('#market-query');
    input?.focus({preventScroll:true});
    if(cursor!==null) input?.setSelectionRange(cursor,cursor);
  });
  document.addEventListener('change',event=>{
    const target=event.target as HTMLSelectElement;
    if(target.id==='replacement') { replacement=target.value; market.page=0; panelNotice=''; renderPanel(); document.querySelector<HTMLSelectElement>('#replacement')?.focus(); }
    else if(target.id.startsWith('market-')) {
      if(target.id==='market-fame') market.fame=target.value;
      if(target.id==='market-sort') market.sort=target.value;
      if(target.id==='market-offer') market.offer=target.value as MarketFilters['offer'];
      if(target.id==='market-query') market.query=target.value;
      market.page=0; renderPanel(); document.getElementById(target.id)?.focus();
    }
    else if(target.dataset.member) commit(assignCord(state,target.dataset.member,target.value as typeof CORDS[number]));
  });
  document.addEventListener('keydown', event => {
    if (!sceneExpanded || document.querySelector('dialog[open]')) return;
    if (event.key === 'Escape') { event.preventDefault(); expandScene(false); }
    if (event.key === 'Tab') {
      const focusable = [...document.querySelectorAll<HTMLElement>('.world button, .world canvas[tabindex]')].filter(element => !element.hidden && element.getClientRects().length > 0);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>document.querySelectorAll<HTMLButtonElement>('.bottom-nav button').forEach(b=>b.classList.toggle('selected',b.dataset.open==='sede')));
  document.querySelector('.brand')!.addEventListener('click',e=>{e.preventDefault();dialog.close();});
  render();
  try { scene=new MurgaScene(document.querySelector('#scene')!,ready=>{modelReady=ready;}); scene.setCosmetics(stageCosmetics()); scene.update(state, theatrePreview); } catch { document.querySelector<HTMLElement>('#scene-notice')!.hidden=false; }
  if(initialNotice) toast(initialNotice);
  if(import.meta.hot) import.meta.hot.dispose(()=>{ scene?.dispose(); document.body.classList.remove('scene-expanded'); });
}
void boot();
