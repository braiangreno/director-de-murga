import {
  SHOW_THEMES,
  getActionAvailability,
  getActionPreview,
  getShowSummary,
  getShowWorkAvailability,
  type State,
} from './simulation';
import './show.css';

type ShowSummary = ReturnType<typeof getShowSummary>;
type ShowSection = ShowSummary['sections'][number];
const escape = (value: string): string => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));
const number = (value: number): string => value.toLocaleString('es-UY', { maximumFractionDigits: 1 });
const money = (value: number): string => `$ ${Math.round(Math.abs(value)).toLocaleString('es-UY')}`;
const signed = (value: number): string => `${value > 0 ? '+' : value < 0 ? '−' : ''}${number(Math.abs(value))}`;
const percent = (value: number): number => Math.max(0, Math.min(100, value));
const icon = (name: 'book' | 'music' | 'arrow' | 'lock'): string => {
  const paths = {
    book: '<path d="M12 5v16M3 3c4 0 7 1 9 3 2-2 5-3 9-3v16c-4 0-7 0-9 2-2-2-5-2-9-2V3Z"/>',
    music: '<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  };
  return `<svg class="show-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

function progress(label: string, value: number, section: string, kind: string): string {
  const bounded = percent(value);
  return `<div class="show-progress" data-progress-kind="${kind}"><div><span>${label}</span><strong>${number(bounded)}<small>/100</small></strong></div><div class="show-progress-track" role="progressbar" aria-label="${escape(`${label} de ${section}`)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${bounded}"><span style="width:${bounded}%"></span></div></div>`;
}

function workButton(state: State, section: ShowSection, work: 'text' | 'arrangements'): string {
  const availability = getShowWorkAvailability(state, section.id, work);
  const label = work === 'text' ? 'Desarrollar texto' : 'Trabajar arreglos';
  const reasonId = `show-${section.id}-${work}-reason`;
  return `<div class="show-work">
    <div class="show-work-cost"><strong>${money(availability.cost)}</strong><span>1 jornada</span></div>
    ${availability.gain > 0 ? `<p class="show-work-gain">${work === 'text' ? 'Texto' : 'Arreglos'} +${number(availability.gain)} de avance</p>` : '<p class="show-work-gain">Sin avance disponible</p>'}
    <button type="button" class="${work === 'text' ? 'primary-button' : 'outline-button'}" data-show-work="${work}" data-show-section="${escape(section.id)}" aria-label="${escape(`${label} de ${section.name}`)}" ${availability.enabled ? '' : `disabled aria-describedby="${reasonId}"`}>${icon(work === 'text' ? 'book' : 'music')}${label}</button>
    ${!availability.enabled ? `<p class="show-work-reason" id="${reasonId}">${escape(availability.reason)}</p>` : ''}
  </div>`;
}

function plan(summary: ShowSummary): string {
  if (!summary.canEdit) return `<div class="show-plan-fixed">${icon('lock')}<div><strong>${summary.locked ? 'El plan del espectáculo está definido' : 'La planificación está cerrada'}</strong><p>${escape(summary.editReason)}</p></div></div>`;
  return `<form id="show-plan-form" class="show-plan-form">
    <div class="show-section-heading"><span class="show-kicker">PRIMERO, UNA IDEA PROPIA</span><h4>La propuesta de este año</h4></div>
    <label class="show-title-label" for="show-title">Título del espectáculo</label><input id="show-title" name="title" type="text" value="${escape(summary.title)}" minlength="2" maxlength="60" required autocomplete="off" aria-describedby="show-title-help show-plan-error"><p class="show-field-help" id="show-title-help">Entre 2 y 60 caracteres.</p>
    <fieldset class="show-theme-fieldset"><legend>¿De qué queremos hablar?</legend><div class="show-theme-options">${SHOW_THEMES.map(theme => `<label class="show-theme-card"><input type="radio" name="themeId" value="${escape(theme.id)}" ${theme.id === summary.themeId ? 'checked' : ''} required><span><strong>${escape(theme.name)}</strong><small>${escape(theme.description)}</small></span></label>`).join('')}</div></fieldset>
    <p id="show-plan-error" class="show-plan-error" role="alert"></p>
    <p class="show-draft-warning" data-show-draft-warning hidden role="status">Guardá el título y la temática antes de continuar.</p>
    <div class="show-plan-save"><p>Guardar el plan no consume una jornada.</p><button type="submit" class="primary-button">Guardar propuesta</button></div>
  </form>`;
}

function suggestion(sections: ShowSection[]): string {
  if (!sections.length) return '';
  const advances = sections.map(section => ({ section, value: (section.text + section.arrangements + section.rehearsal) / 3 }));
  const least = Math.min(...advances.map(item => item.value));
  if (least >= 100) return 'Las tres partes completaron su preparación. Cuidá la energía del elenco para las actuaciones.';
  const lagging = advances.filter(item => Math.abs(item.value - least) < .01).map(item => item.section.name);
  if (lagging.length === sections.length) return 'Las tres partes tienen el mismo avance. Podés empezar por la que quieras desarrollar primero.';
  return `${lagging.join(' y ')} ${lagging.length === 1 ? 'tiene menos trabajo acumulado. Podés dedicarle desarrollo o elegir esa parte como enfoque de ensayo.' : 'tienen menos trabajo acumulado. Podés dedicarles más desarrollo o enfocarte en una de esas partes al ensayar.'}`;
}

/** The existing dialog owns navigation, input events and simulation mutations. */
export function showPanel(state: State): string {
  const summary = getShowSummary(state);
  const rehearsal = getActionAvailability(state, 'rehearse');
  const preview = getActionPreview(state, 'rehearse');
  const readiness = percent(summary.readiness);
  return `<div class="show-page">
    <header class="show-cover"><span class="show-cover-icon">${icon('book')}</span><div><span class="show-kicker">EL ESPECTÁCULO DE LA MURGA</span><h3>${escape(summary.title)}</h3><span class="show-theme-stamp">${escape(summary.themeName)}</span><p>${escape(summary.themeDescription)}</p></div></header>
    <section class="show-overview" aria-label="Avance del trabajo"><div><span>Avance del trabajo</span><strong>${number(readiness)}<small>/100</small></strong></div><div class="show-progress-track" role="progressbar" aria-label="Preparación del espectáculo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${readiness}"><span style="width:${readiness}%"></span></div><p>Texto, arreglos y ensayo preparados para esta temporada. El avance describe el trabajo realizado.</p></section>
    ${plan(summary)}
    ${!summary.locked && state.status === 'playing' ? `<aside class="show-plan-warning">${icon('lock')}<p><strong>Antes del primer trabajo</strong>Guardá el título y el tema que querés usar. El primer desarrollo o ensayo los deja fijos para toda la temporada.</p></aside>` : ''}
    <section class="show-parts" aria-label="Partes del espectáculo"><div class="show-section-heading"><span class="show-kicker">TRES MOMENTOS, UNA HISTORIA</span><h4>Del saludo a la retirada</h4></div>
      <div class="show-parts-list">${summary.sections.map((section, index) => `<article class="show-part" data-show-part="${escape(section.id)}"><header><span class="show-part-number">${String(index + 1).padStart(2, '0')}</span><div><h5>${escape(section.name)}</h5><p>${escape(section.description)}</p></div>${summary.focus === section.id ? '<span class="show-focus-tag">Enfoque elegido</span>' : ''}</header><div class="show-part-progress">${progress('Texto', section.text, section.name, 'text')}${progress('Arreglos', section.arrangements, section.name, 'arrangements')}${progress('Ensayo', section.rehearsal, section.name, 'rehearsal')}</div><div class="show-part-work">${workButton(state, section, 'text')}${workButton(state, section, 'arrangements')}</div></article>`).join('')}</div>
    </section>
    <aside class="show-suggestion"><span aria-hidden="true">✦</span><p>${escape(suggestion(summary.sections))}</p></aside>
    <section class="show-rehearsal" aria-label="Enfoque de ensayo"><div class="show-rehearsal-heading"><span>${icon('music')}</span><div><span class="show-kicker">LLEVAR EL TRABAJO A LA VOZ</span><h4>El próximo ensayo</h4></div></div>
      <p class="show-rehearsal-preview">El ensayo desarrolla la interpretación. Preparar el texto y los arreglos permite avanzar más en cada parte.</p>
      <label for="rehearsal-focus">¿Dónde ponemos el foco?</label><select id="rehearsal-focus" name="focus" ${state.status !== 'playing' ? 'disabled' : ''} aria-describedby="show-focus-help"><option value="general" ${summary.focus === 'general' ? 'selected' : ''}>Todo el espectáculo</option>${summary.sections.map(section => `<option value="${escape(section.id)}" ${summary.focus === section.id ? 'selected' : ''}>${escape(section.name)}</option>`).join('')}</select><p class="show-field-help" id="show-focus-help">Cambiar el enfoque es gratis y no avanza el calendario.</p>
      ${rehearsal.enabled ? `<ul class="show-rehearsal-effects"><li><span>Costo</span><strong>${money(preview.money)}</strong></li><li><span>Energía del elenco</span><strong>${signed(preview.energy)}</strong></li><li><span>Tiempo</span><strong>1 jornada</strong></li></ul><p class="show-rehearsal-preview">${escape(preview.label)}</p>` : `<p class="show-work-reason" id="show-rehearsal-reason">${escape(rehearsal.reason)}</p>`}
      <button type="button" class="primary-button" data-action="rehearse" ${rehearsal.enabled ? '' : 'disabled aria-describedby="show-rehearsal-reason"'}>${icon('music')} Ensayar el enfoque elegido</button>
    </section>
    <p class="show-footnote">El letrista y el arreglador trabajan con el elenco en cada parte. Estas tareas representan la preparación del espectáculo; no escriben letras reales. Los costos son valores de esta simulación.</p>
  </div>`;
}

/** A compact entry point, suitable for a drawer or the existing desk. */
export function showBrief(state: State): string {
  const summary = getShowSummary(state);
  return `<button type="button" class="show-brief" data-open="espectaculo"><span class="show-brief-icon">${icon('book')}</span><span class="show-brief-copy"><small>EL ESPECTÁCULO</small><strong>${escape(summary.title)}</strong><span>Avance del trabajo · ${number(percent(summary.readiness))}/100</span></span>${icon('arrow')}</button>`;
}
