import type { Backup } from './backup';
import { getCalendar, TOTAL_DAYS, type State } from './simulation';
import './backup-panel.css';

export interface BackupPanelModel {
  pending: Backup | null;
  pendingSource: 'file' | 'previous' | null;
  hasPrevious: boolean;
  busy: boolean;
  message: string;
  error: boolean;
  fileName?: string;
  blocked?: boolean;
}

const escape = (value: string): string => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));
const number = (value: number): string => Math.round(value).toLocaleString('es-UY');
const money = (value: number): string => `$ ${number(value)} UYU`;
const icon = (name: 'book' | 'export' | 'import' | 'history' | 'arrow'): string => {
  const paths = {
    book: '<path d="M12 5v16M3 3c4 0 7 1 9 3 2-2 5-3 9-3v16c-4 0-7 0-9 2-2-2-5-2-9-2V3Z"/>',
    export: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    import: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    history: '<path d="M3 10a9 9 0 1 1 1 7M3 3v7h7m2-4v6l4 2"/>',
    arrow: '<path d="m14 5-7 7 7 7"/>',
  };
  return `<svg class="backup-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

function savedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : new Intl.DateTimeFormat('es-UY', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(date);
}

/** Only identity and public campaign information belong in a backup preview. */
function campaignSummary(state: State): string {
  const calendar = getCalendar(state);
  const day = Math.min(TOTAL_DAYS, Math.max(1, state.day + 1));
  return `<div class="backup-identity"><h4>${escape(state.identity.name)}</h4><p>${escape(state.identity.barrio)}</p></div>
    <dl class="backup-facts">
      <div><dt>Temporada</dt><dd>${number(state.season)}</dd></div>
      <div><dt>Jornada</dt><dd>${number(day)}<small> / ${TOTAL_DAYS}</small></dd></div>
      <div class="backup-cash"><dt>Caja</dt><dd>${money(state.money)}</dd></div>
      <div><dt>Elenco</dt><dd>${number(state.members.length)}<small> integrantes</small></dd></div>
    </dl><p class="backup-period">${escape(calendar.month)} · ${state.status === 'playing' ? 'Campaña en curso' : 'Participación terminada'}</p>`;
}

export function backupPanel(current: State, model: BackupPanelModel): string {
  const disabled = model.busy || model.blocked ? 'disabled' : '';
  const preview = model.pending;
  const status = model.message || (model.busy ? 'Procesando el respaldo…' : model.blocked
    ? 'La recuperación está pendiente. Guardá un respaldo de la partida que ves y reintentá la recuperación.' : '');
  return `<section class="backup-page" aria-label="Partidas y respaldos" aria-busy="${model.busy}">
    <header class="backup-intro"><span class="backup-mark">${icon('book')}</span><div><span class="backup-kicker">DE CARNAVAL EN CARNAVAL</span><h3>Llevá contigo la historia.</h3><p>Guardá una copia de tu murga o continuá una partida que ya tenés respaldada.</p></div></header>
    <div id="backup-status" class="backup-status ${model.error || model.blocked ? 'backup-status-error' : ''}" role="status" aria-live="${model.error || model.blocked ? 'assertive' : 'polite'}" aria-atomic="true" ${status ? '' : 'hidden'}>${escape(status)}</div>
    ${model.blocked ? `<div class="backup-recovery"><p>La partida sigue abierta. Podés exportarla mientras resolvemos la recuperación.</p><button type="button" class="primary-button" data-backup-retry ${model.busy ? 'disabled' : ''}>${icon('history')} Reintentar recuperación</button></div>` : ''}

    <section class="backup-current" aria-labelledby="backup-current-heading"><div class="backup-section-title"><span class="backup-kicker" id="backup-current-heading">LA PARTIDA EN ESTE DISPOSITIVO</span><span class="backup-current-tag">Actual</span></div>
      ${campaignSummary(current)}
      <button type="button" class="primary-button backup-export" data-backup-export ${model.busy ? 'disabled' : ''}>${icon('export')} Exportar partida</button>
      <p class="backup-export-note">Incluye campaña y apariencias del elenco. Los ajustes gráficos quedan en este dispositivo.</p>
    </section>

    <section class="backup-import" aria-labelledby="backup-import-heading"><div class="backup-section-title"><span class="backup-step">01</span><div><h4 id="backup-import-heading">Elegí un respaldo</h4><p>Primero vas a ver qué partida contiene.</p></div></div>
      <label class="backup-file-label" for="backup-file">Archivo de partida</label><input id="backup-file" class="backup-file" type="file" accept=".json,application/json" data-backup-file aria-describedby="backup-file-help" ${disabled}>
      <p id="backup-file-help" class="backup-note">Respaldo de Director de Murga en formato JSON, hasta 5 MiB. Elegirlo no reemplaza tu partida.</p>
      ${model.fileName && model.pendingSource === 'file' ? `<p class="backup-file-name"><span>Archivo elegido</span><strong>${escape(model.fileName)}</strong></p>` : ''}
      ${model.hasPrevious ? `<div class="backup-previous"><p>También hay una copia de la partida anterior a tu última restauración.</p><button type="button" class="outline-button" data-backup-previous ${disabled}>${icon('history')} Ver copia previa</button></div>` : '<p class="backup-empty-previous">Al restaurar, conservaremos una copia previa en este dispositivo.</p>'}
    </section>

    ${preview ? `<section class="backup-preview" aria-labelledby="backup-preview-heading"><div class="backup-section-title"><span class="backup-step">02</span><div><h4 id="backup-preview-heading" tabindex="-1">Revisá antes de restaurar</h4><p>${model.pendingSource === 'previous' ? 'Copia previa de este dispositivo' : 'Partida del archivo elegido'}</p></div></div>
      ${campaignSummary(preview.campaign)}
      <p class="backup-date">Copia creada el <time datetime="${escape(preview.exportedAt)}">${escape(savedAt(preview.exportedAt))}</time><small>Hora de este dispositivo</small></p>
      <div class="backup-replace-note" id="backup-replace-note"><strong>Esta partida reemplazará la que está abierta.</strong><p>Se restaurarán su campaña y las apariencias del elenco. Antes guardaremos una copia de tu partida actual; podrás consultarla en «Ver copia previa». Tus ajustes gráficos se mantienen.</p></div>
      <div class="backup-confirm-actions"><button type="button" class="primary-button" data-backup-restore aria-describedby="backup-replace-note" ${disabled}>${icon('import')} Restaurar esta partida</button><button type="button" class="outline-button" data-backup-cancel ${disabled}>Cancelar selección</button></div>
    </section>` : ''}
    <button type="button" class="outline-button backup-back" data-open="ajustes" ${disabled}>${icon('arrow')} Volver a Ajustes</button>
  </section>`;
}
