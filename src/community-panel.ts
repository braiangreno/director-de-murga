import {
  getActionAvailability,
  getActionPreview,
  getCommunitySummary,
  getDecisionHistory,
  getPendingDecision,
  type State,
} from './simulation';
import './community.css';

const escape = (value: string): string => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));
const number = (value: number): string => Math.round(value).toLocaleString('es-UY');
const money = (value: number): string => `$ ${number(Math.abs(value))}`;
const signed = (value: number): string => `${value > 0 ? '+' : value < 0 ? '−' : ''}${number(Math.abs(value))}`;
const tone = (value: number): string => value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
const icon = (name: 'house' | 'people' | 'check' | 'notice'): string => {
  const paths = {
    house: '<path d="m3 10 9-7 9 7M5 9v11h14V9M9 20v-7h6v7M3 5h18M6 5l3 3 3-3 3 3 3-3"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3m2-15a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 4v2"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    notice: '<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3h.01"/>',
  };
  return `<svg class="community-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

function activity(state: State, action: 'fundraiser' | 'community'): string {
  const available = getActionAvailability(state, action);
  const preview = getActionPreview(state, action);
  const summary = getCommunitySummary(state);
  const festival = action === 'fundraiser';
  const title = festival ? 'Festival del barrio' : 'Un rato para el grupo';
  const description = festival
    ? 'Organizá una actividad de apoyo para reunir fondos y acercar gente a la murga.'
    : 'Hacé lugar para conversar, compartir y cuidar los vínculos entre integrantes.';
  const reasonId = `community-${action}-reason`;
  const effects = available.enabled ? `<ul class="community-effects" aria-label="Cambios de esta jornada">
      <li class="${tone(preview.money)}"><span>Saldo</span><strong>${preview.money < 0 ? '− ' : preview.money > 0 ? '+ ' : ''}${money(preview.money)}</strong></li>
      <li class="${tone(preview.energy)}"><span>Energía</span><strong>${signed(preview.energy)}</strong></li>
    </ul><p class="community-action-preview">${escape(preview.label)}</p>` : '';
  return `<article class="community-activity" data-action-kind="${action}">
    <div class="community-activity-heading"><span>${icon(festival ? 'house' : 'people')}</span><h4>${title}</h4></div>
    <p>${description}</p>
    <p class="community-activity-note">${festival ? `${summary.fundraisersUsed} de ${summary.fundraisersLimit} festivales realizados esta temporada` : 'La convivencia también se trabaja'}</p>
    ${effects}
    ${!available.enabled ? `<p class="community-reason" id="${reasonId}">${escape(available.reason)}</p>` : ''}
    <button type="button" class="primary-button" data-action="${action}" ${available.enabled ? '' : `disabled aria-describedby="${reasonId}"`}>${festival ? 'Organizar festival' : 'Compartir una jornada'}</button>
  </article>`;
}

/** An on-demand management page; the caller owns dialog and game-state updates. */
export function communityPanel(state: State): string {
  const summary = getCommunitySummary(state);
  const morale = Math.round(Math.max(0, Math.min(100, summary.morale)));
  const moraleTone = morale < 40 ? 'low' : morale < 65 ? 'steady' : 'high';
  const moraleDescription = morale < 40
    ? 'El grupo necesita atención. Una jornada compartida puede ayudar.'
    : morale < 65 ? 'Hay ganas de seguir. Cuidá los acuerdos y los tiempos del grupo.'
      : 'El grupo está animado. Los vínculos también sostienen el espectáculo.';
  const pending = getPendingDecision(state);
  const history = getDecisionHistory(state).slice().sort((a, b) => b.day - a.day);
  return `<div class="community-page">
    <header class="community-cover"><span class="community-kicker">LA SEDE TAMBIÉN SE CUIDA</span><h3>Detrás del coro,<br>un barrio.</h3><p>Organizá la ayuda, escuchá al elenco y hacé lugar para las decisiones que sostienen a ${escape(state.identity.name)}.</p></header>
    <button type="button" class="outline-button team-summary" data-open="trayectoria">Historia de ${escape(state.identity.name)} · ${escape(state.identity.barrio)}</button>
    <section class="community-morale" data-tone="${moraleTone}" aria-label="Ánimo del elenco">
      <div class="community-morale-heading"><h4>Ánimo del elenco</h4><strong>${morale}<small>/100</small></strong></div>
      <div class="community-morale-meter" role="meter" aria-label="Ánimo colectivo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${morale}"><span style="width:${morale}%"></span></div>
      <p>${moraleDescription}</p>
    </section>
    <dl class="community-numbers">
      <div><dt>Seguidores</dt><dd>${number(state.fans)}</dd></div>
      <div><dt>Reputación</dt><dd>${number(state.reputation)}<small>/100</small></dd></div>
      <div><dt>Charlas disponibles</dt><dd>${number(summary.contactsRemaining)}<small> hoy</small></dd></div>
    </dl>
    ${pending ? `<aside class="community-pending"><div><span class="community-kicker">HAY QUE RESOLVERLO</span><strong>${escape(pending.title)}</strong></div><button type="button" class="primary-button" data-open="decision">Ver opciones</button></aside>` : ''}
    <section aria-label="Actividades barriales"><div class="community-section-head"><h4>Hacer murga, juntos.</h4><span>1 actividad = 1 jornada</span></div>
      <div class="community-activities">${activity(state, 'fundraiser')}${activity(state, 'community')}</div>
    </section>
    <div class="community-contact-note"><p>La confianza se construye conversando. Acercate a los artistas del mercado antes de hacerles una propuesta.</p><button type="button" class="outline-button" data-open="fichajes">Ir al mercado</button></div>
    <section class="community-history" aria-label="Historial de decisiones"><div class="community-section-head"><h4>Lo que fuimos eligiendo</h4><span>${history.length} ${history.length === 1 ? 'decisión atendida' : 'decisiones atendidas'}</span></div>
      ${history.length ? `<ol class="community-history-list">${history.map(entry => `<li>${icon('check')}<div><small>JORNADA ${entry.day + 1}</small><strong>${escape(entry.title)}</strong><p>${escape(entry.choice)}</p></div></li>`).join('')}</ol>` : '<p class="community-empty">Las decisiones de esta temporada quedarán anotadas acá, con el camino que elegiste.</p>'}
    </section>
    <p class="community-footnote">Los festivales de apoyo son actividades de financiación. El circuito de tablados comienza a fines de enero.</p>
  </div>`;
}

/** Renders only the current decision; resolving it remains a simulation action. */
export function decisionPanel(state: State): string {
  const pending = getPendingDecision(state);
  if (!pending) return `<div class="murga-decision murga-decision-empty">${icon('check')}<h3>Estamos al día.</h3><p>No hay una decisión pendiente. Podés volver a cuidar la vida de la murga.</p><button type="button" class="outline-button" data-open="comunidad">Volver a la murga</button></div>`;
  return `<div class="murga-decision" data-decision-id="${escape(pending.id)}">
    <header class="murga-decision-intro"><span class="murga-decision-stamp">${icon('notice')} EL ELENCO TE ESPERA</span><h3>${escape(pending.title)}</h3><p>${escape(pending.description)}</p></header>
    <p class="murga-decision-instruction">Elegí un camino para continuar. Revisá el costo y los cambios de cada opción.</p>
    <div class="murga-decision-options">${pending.options.map((option, index) => {
      const reasonId = `decision-option-${index}-reason`;
      return `<article class="murga-decision-option">
        <span class="murga-decision-option-index">OPCIÓN ${String(index + 1).padStart(2, '0')}</span>
        <h4>${escape(option.label)}</h4><p>${escape(option.description)}</p>
        <ul class="community-effects" aria-label="Efectos de ${escape(option.label)}">
          <li class="${tone(-option.cost)}"><span>${option.cost < 0 ? 'Ingreso' : 'Costo'}</span><strong>${option.cost === 0 ? 'Sin costo' : money(option.cost)}</strong></li>
          <li class="${tone(option.morale)}"><span>Ánimo</span><strong>${signed(option.morale)}</strong></li>
          <li class="${tone(option.energy)}"><span>Energía</span><strong>${signed(option.energy)}</strong></li>
        </ul>
        ${!option.enabled ? `<p class="community-reason" id="${reasonId}">${escape(option.reason)}</p>` : ''}
        <button type="button" class="primary-button" data-resolve-decision="${escape(option.id)}" aria-label="Elegir: ${escape(option.label)}" ${option.enabled ? '' : `disabled aria-describedby="${reasonId}"`}>Elegir esta opción</button>
      </article>`;
    }).join('')}</div>
    <p class="community-footnote">Los cambios se aplican a cada integrante. El ánimo y la energía se mantienen entre 0 y 100.</p>
  </div>`;
}
