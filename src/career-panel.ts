import {
  getCareerSummary,
  getRosterProgress,
  getSeasonHistory,
  getSeasonReport,
  MEMBER_ROLE_LABELS,
  OUTCOME_LABELS,
  SHOW_SECTIONS,
  type Accounts,
  type PublicSeasonReport,
  type State,
} from './simulation';
import './career.css';

const escape = (value: string): string => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));
const number = (value: number, decimals = 0): string => value.toLocaleString('es-UY', {
  minimumFractionDigits: decimals, maximumFractionDigits: decimals,
});
const money = (value: number): string => `${value < 0 ? '− ' : ''}$ ${number(Math.abs(value))}`;
const signed = (value: number): string => `${value > 0 ? '+' : value < 0 ? '−' : ''}${number(Math.abs(value), 1)}`;
const icon = (name: 'book' | 'star' | 'arrow' | 'pencil'): string => {
  const paths = {
    book: '<path d="M12 5v16M3 3c4 0 7 1 9 3 2-2 5-3 9-3v16c-4 0-7 0-9 2-2-2-5-2-9-2V3Z"/>',
    star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z"/>',
    arrow: '<path d="m9 5 7 7-7 7"/>',
    pencil: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-4L4 15l-1 6Zm0-5 5 4"/>',
  };
  return `<svg class="career-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

function totals(accounts: Accounts): { income: number; expenses: number; net: number } {
  const income = accounts.performanceIncome + accounts.communityIncome + accounts.prizes;
  const expenses = accounts.technical + accounts.costume + accounts.recruitment + accounts.auditions
    + accounts.upgrades + accounts.rehearsals + accounts.performanceCosts + accounts.communityCosts;
  return { income, expenses, net: income - expenses };
}

function financialReport(report: PublicSeasonReport, closingCash?: number): string {
  const balance = totals(report.accounts);
  return `<div class="career-finances">
    <dl class="career-money-grid">
      <div><dt>Ingresos del año</dt><dd>${money(balance.income)}</dd></div>
      <div><dt>Gastos del año</dt><dd>${money(balance.expenses)}</dd></div>
      <div class="career-net ${balance.net < 0 ? 'career-negative' : 'career-positive'}"><dt>Saldo del año</dt><dd>${money(balance.net)}</dd></div>
    </dl>
    <p class="career-finance-note">Ingresos menos gastos. La financiación y el remanente inicial no cuentan como ingresos del año.</p>
    <dl class="career-cash-line"><div><dt>Caja inicial</dt><dd>${money(report.accounts.opening)}</dd></div><div><dt>${closingCash !== undefined ? 'Caja al cierre' : report.outcome === 'in-progress' ? 'Caja actual' : 'Caja al terminar'}</dt><dd>${money(closingCash ?? report.cash)}</dd></div></dl>
  </div>`;
}

function performanceReport(report: PublicSeasonReport): string {
  const publicTotal = report.scoresPublic && report.contestTotal !== null && report.roundsCompleted > 0;
  const scores = report.results.length ? `<ol class="career-rounds">${report.results.map((result, index) => {
    const exempt = index === 0 && report.admissionExempt;
    const score = index === 0 || report.scoresPublic ? result.score : null;
    const detail = index === 0 ? exempt ? 'Clasificada por la Liguilla anterior' : `${result.passed ? 'Admitida' : 'No admitida'} · índice del juego`
      : result.passed ? 'Actuación cumplida' : 'Participación cerrada';
    return `<li><span>${escape(exempt ? 'Inscripción directa' : result.name)}<small>${detail}</small></span>
      <strong>${exempt ? '<span class="career-reserved">Sin puntaje</span>' : score === null ? '<span class="career-reserved">Nota reservada</span>' : `${number(score, 1)}${index === 0 ? '' : '<small> pts</small>'}`}</strong></li>`;
  }).join('')}</ol>` : '<p class="career-quiet">Todavía no hay actuaciones registradas.</p>';
  return `<div class="career-performance">
    ${report.admissionExempt ? '<p class="career-direct-entry">Inscripción directa por la Liguilla anterior; sin nota de admisión.</p>' : ''}
    ${scores}
    ${publicTotal ? `<div class="career-total"><div><span>Total del concurso</span><strong>${number(report.contestTotal!, 1)}<small> / ${report.roundsCompleted * 100}</small></strong></div>${report.rank !== null ? `<div><span>Puesto</span><strong>${number(report.rank)}<small> .º</small></strong></div>` : ''}</div><p class="career-finance-note">Suma de ${report.roundsCompleted} ${report.roundsCompleted === 1 ? 'rueda' : 'ruedas'}; la admisión no se incluye.${report.contestAverage !== null ? ` Promedio: ${number(report.contestAverage, 1)}.` : ''}</p>` : report.roundsCompleted > 0 ? '<p class="career-sealed">Las notas del concurso siguen reservadas hasta los fallos.</p>' : report.outcome === 'not-admitted' ? '<p class="career-quiet">Sin participación en el concurso.</p>' : ''}
  </div>`;
}

function delta(value: number | null): string {
  return value === null ? '<span class="career-delta career-unknown">Sin comparación</span>'
    : `<span class="career-delta ${value < 0 ? 'career-negative' : value > 0 ? 'career-positive' : 'career-unchanged'}">${signed(value)}</span>`;
}

function historicalRoster(report: PublicSeasonReport): string {
  return `<details class="career-roster career-archived-roster"><summary><span><strong>Elenco de ese año</strong><small>La formación al cierre de la temporada ${report.season}</small></span><span class="career-count">${report.roster.length}</span>${icon('arrow')}</summary><div class="career-roster-content"><ul class="career-roster-list">${report.roster.map(member => `<li><div class="career-member-name"><strong>${escape(member.name)}</strong><small>${escape(MEMBER_ROLE_LABELS[member.role])}</small></div><div class="career-member-stat"><span>Experiencia</span><strong>${number(member.experience, 1)}<small> XP</small></strong></div><div class="career-member-stat"><span>Fama</span><strong>${number(member.fame)}<small>/100</small></strong></div></li>`).join('')}</ul></div></details>`;
}

function showRecord(report: PublicSeasonReport, archived = false): string {
  if (!report.show) return '<p class="career-history-note">Este cierre es anterior al registro de espectáculos.</p>';
  const show = report.show;
  return `<details class="career-show"><summary><span><small>${archived ? 'EL ESPECTÁCULO DE ESE AÑO' : 'EL ESPECTÁCULO ACTUAL'}</small><strong>${escape(show.title)}</strong></span>${icon('arrow')}</summary><div class="career-show-content"><p>${escape(show.themeName)} · ${number(show.readiness)}% de preparación${archived ? ' al cierre' : ''}</p><ul>${show.sections.map(section => `<li><strong>${escape(SHOW_SECTIONS.find(item => item.id === section.id)?.name ?? section.id)}</strong><span>Textos ${number(section.text)}% · Arreglos ${number(section.arrangements)}% · Ensayo ${number(section.rehearsal)}%</span></li>`).join('')}</ul><p class="career-finance-note">Registro del trabajo creativo; no representa una nota del jurado.</p>${!archived ? '<button type="button" class="outline-button" data-open="espectaculo">Abrir nuestro espectáculo</button>' : ''}</div></details>`;
}

/** A career notebook built only from public simulation reports. */
export function careerPanel(state: State): string {
  const current = getSeasonReport(state);
  const career = getCareerSummary(state);
  const history = getSeasonHistory(state).slice().reverse();
  const roster = getRosterProgress(state);
  return `<div class="career-page">
    <header class="career-cover"><span class="career-cover-mark">${icon('book')}</span><div><span class="career-kicker">LA LIBRETA DEL BARRIO</span><h3>${escape(current.identity.name)}</h3><p>${escape(current.identity.barrio)}</p></div><button type="button" class="career-identity-button" data-open="identidad">${icon('pencil')} Cambiar identidad</button></header>
    <p class="career-since">Registro desde la temporada ${career.sinceSeason}</p>
    <dl class="career-counters"><div><dt>Temporadas archivadas</dt><dd>${number(career.completedSeasons)}</dd></div><div><dt>Liguillas archivadas</dt><dd>${number(career.finals)}</dd></div><div class="career-championships"><dt>Títulos archivados</dt><dd>${number(career.championships)} ${icon('star')}</dd></div></dl>
    <p class="career-history-note">La campaña actual se incorpora al pasar al año siguiente.</p>
    ${career.sinceSeason > 1 ? `<p class="career-history-note">Las temporadas anteriores a la ${career.sinceSeason} no tienen registro en esta libreta. Los contadores corresponden a los años registrados.</p>` : ''}
    <section class="career-current" aria-label="Resumen de la temporada actual"><div class="career-section-heading"><div><span class="career-kicker">${current.outcome === 'in-progress' ? 'LO QUE ESTAMOS CONSTRUYENDO' : 'EL AÑO QUE ACABAMOS DE VIVIR'}</span><h4>Temporada ${current.season}</h4></div><span class="career-outcome" data-outcome="${current.outcome}">${escape(OUTCOME_LABELS[current.outcome])}</span></div>
      <dl class="career-support"><div><dt>Reputación</dt><dd>${number(current.reputation)}<small>/100</small></dd></div><div><dt>Seguidores</dt><dd>${number(current.fans)}</dd></div></dl>
      ${financialReport(current)}
      ${showRecord(current)}
      <details class="career-results"><summary><span>Actuaciones y concurso</span>${icon('arrow')}</summary>${performanceReport(current)}</details>
    </section>
    <section class="career-archive" aria-label="Temporadas archivadas"><div class="career-section-heading"><div><span class="career-kicker">CADA CARNAVAL DEJA ALGO</span><h4>Temporada a temporada</h4></div><span class="career-count">${history.length} ${history.length === 1 ? 'ficha' : 'fichas'}</span></div>
      ${history.length ? `<div class="career-years">${history.map(report => `<details class="career-year"><summary><span class="career-year-number">${String(report.season).padStart(2, '0')}</span><span class="career-year-title"><strong>Temporada ${report.season}</strong><small>${escape(report.identity.name)} · ${escape(report.identity.barrio)}</small></span><span class="career-outcome" data-outcome="${report.outcome}">${escape(OUTCOME_LABELS[report.outcome])}</span>${icon('arrow')}</summary><div class="career-year-content"><dl class="career-support"><div><dt>Reputación al cierre</dt><dd>${number(report.reputation)}<small>/100</small></dd></div><div><dt>Seguidores al cierre</dt><dd>${number(report.fans)}</dd></div></dl>${financialReport(report, report.closingCash)}${showRecord(report,true)}${performanceReport(report)}${historicalRoster(report)}</div></details>`).join('')}</div>` : '<div class="career-empty"><span class="career-empty-icon">✦</span><h4>La primera página está en marcha.</h4><p>Al pasar a la próxima temporada, el cierre de esta campaña quedará guardado acá.</p></div>'}
      <p class="career-history-note">Se conservan hasta ${career.historyLimit} fichas de temporada.${career.omittedSeasons > 0 ? ` ${number(career.omittedSeasons)} ${career.omittedSeasons === 1 ? 'cierre anterior ya no tiene' : 'cierres anteriores ya no tienen'} ficha detallada; sus logros permanecen en los contadores.` : ''}</p>
    </section>
    <details class="career-roster"><summary><span><strong>El elenco que crece</strong><small>Experiencia y fama frente al último cierre</small></span><span class="career-count">${roster.length}</span>${icon('arrow')}</summary><div class="career-roster-content"><p class="career-history-note">Comparamos con el último cierre de la murga, cuando esa persona formaba parte del elenco. Si no estaba en esa formación, queda sin comparación.</p><ul class="career-roster-list">${roster.map(member => `<li><div class="career-member-name"><strong>${escape(member.name)}</strong><small>${escape(MEMBER_ROLE_LABELS[member.role])}</small></div><div class="career-member-stat"><span>Experiencia</span><strong>${number(member.experience, 1)}<small> XP</small></strong>${delta(member.experienceDelta)}</div><div class="career-member-stat"><span>Fama</span><strong>${number(member.fame)}<small>/100</small></strong>${delta(member.fameDelta)}</div></li>`).join('')}</ul></div></details>
  </div>`;
}

/** The caller handles validation, saving, errors, and navigation. */
export function identityPanel(state: State): string {
  const { identity } = getSeasonReport(state);
  return `<div class="identity-page"><header class="identity-intro"><span class="identity-mark">${icon('pencil')}</span><div><span class="career-kicker">UN NOMBRE PARA SALIR A CANTAR</span><h3>Así nos conoce el barrio.</h3><p>Elegí el nombre de tu murga y el lugar que representa.</p></div></header>
    <form id="identity-form" class="identity-form">
      <label for="identity-name">Nombre de la murga</label><input id="identity-name" name="name" type="text" value="${escape(identity.name)}" minlength="2" maxlength="40" required autocomplete="off" autocapitalize="words" aria-describedby="identity-name-help identity-error"><p id="identity-name-help" class="identity-field-help">Entre 2 y 40 caracteres.</p>
      <label for="identity-barrio">Barrio o localidad</label><input id="identity-barrio" name="barrio" type="text" value="${escape(identity.barrio)}" minlength="2" maxlength="40" required autocomplete="off" autocapitalize="words" aria-describedby="identity-barrio-help identity-error"><p id="identity-barrio-help" class="identity-field-help">El rincón desde donde nace esta historia. Entre 2 y 40 caracteres.</p>
      <p id="identity-error" class="identity-error" role="alert"></p>
      <div class="identity-actions"><button type="button" class="outline-button" data-open="trayectoria">Volver a la historia</button><button type="submit" class="primary-button">Guardar identidad</button></div>
    </form>
    <p class="identity-note">Los cierres de temporadas anteriores conservan el nombre y el barrio con que se escribieron.</p>
  </div>`;
}
