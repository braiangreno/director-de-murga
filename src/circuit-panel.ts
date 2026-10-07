import { CIRCUIT_VENUES, getCalendar, getCircuitAvailability, getCircuitForecast, getCircuitPreview, getStats, type State } from './simulation';
import './circuit.css';

const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const money=(value:number)=>`${value<0?'− ':''}$ ${Math.abs(Math.round(value)).toLocaleString('es-UY')}`;
const time=(minutes:number)=>`${String(Math.floor(minutes/60)%24).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}${minutes>=1440?' (+1)':''}`;

export function circuitBrief(state:State):string {
  const available=getCircuitAvailability(state), count=state.circuit.plan.length;
  return `<button class="circuit-brief" data-panel="circuito"><span class="circuit-brief-icon" aria-hidden="true">♫</span><span><small>LA AGENDA DE TABLADOS</small><strong>${count?`${count} actuaciones en el plan`:available.enabled?'Elegir la salida de hoy':'Consultar circuito y salidas'}</strong></span><span aria-hidden="true">→</span></button>`;
}

function nightHistory(state:State):string {
  const history=state.circuit.history;
  if(!history.length) return '<p class="fineprint">Las salidas que realices con esta agenda aparecerán acá. Las actuaciones de versiones anteriores conservan sus importes en la libreta de caja.</p>';
  return `<section class="circuit-history"><h3>Las salidas de este carnaval</h3>${[...history].reverse().map((night,index)=>`<details ${index===0?'open':''}><summary>Jornada ${night.day+1} · ${night.stops.filter(stop=>stop.status==='performed').length}/${night.stops.length} actuaciones · saldo ${money(night.net)}</summary><ul>${night.stops.map(stop=>{const venue=CIRCUIT_VENUES.find(item=>item.id===stop.venueId)!;return `<li><div><strong>${escape(venue.name)}</strong><small>${time(venue.startMinute)} · ${escape(venue.zone)}</small></div><span class="circuit-status ${stop.status==='cancelled'?'is-cancelled':''}">${stop.status==='cancelled'?'Suspendido por lluvia':'Actuación cumplida'}</span></li>`;}).join('')}</ul><dl class="circuit-ledger"><div><dt>Ingresos cobrados</dt><dd>${money(night.gross)}</dd></div><div><dt>Cachés del elenco</dt><dd>${money(-night.memberFees)}</dd></div><div><dt>Transporte</dt><dd>${money(-night.transport)}</dd></div><div class="circuit-total"><dt>Saldo real</dt><dd>${money(night.net)}</dd></div></dl></details>`).join('')}</section>`;
}

export function circuitPanel(state:State):string {
  const availability=getCircuitAvailability(state), calendar=getCalendar(state), forecast=getCircuitForecast(state);
  const preview=getCircuitPreview(state), planned=new Set(state.circuit.plan), hasPlan=planned.size>0;
  const canRun=availability.enabled&&preview.valid&&hasPlan&&state.money>=preview.requiredCash;
  const blockReason=!availability.enabled?availability.reason:!preview.valid?preview.reason:state.money<preview.requiredCash?`Necesitás ${money(preview.requiredCash)} UYU de caja para cubrir esta ruta si hay suspensiones.`:'';
  return `<section class="circuit-panel">
    <div class="circuit-heading"><div><span class="eyebrow">${escape(calendar.month).toUpperCase()} · JORNADA ${state.day+1}</span><p>Elegí hasta tres escenarios. La ruta se ordena por horario y debe dejar tiempo para llegar al siguiente.</p></div><span class="circuit-weather ${forecast.condition}"><small>TIEMPO DEL JUEGO</small><strong>${escape(forecast.label)}</strong></span></div>
    ${availability.enabled?`<p class="circuit-weather-note">${escape(forecast.description)}</p>`:`<p class="calendar-note">${escape(availability.reason)}</p>`}
    ${state.pendingDecision?'<button type="button" class="outline-button" data-open="decision">Resolver la decisión del grupo</button>':''}
    ${availability.enabled&&calendar.daysUntil===1?'<p class="circuit-warning">Mañana hay presentación oficial. Revisá el desgaste antes de sumar actuaciones.</p>':''}
    <div class="circuit-choice-heading"><h3>Escenarios de la noche</h3><button type="button" class="outline-button" data-review-circuit>Ver plan · ${planned.size}/3</button></div>
    <div class="circuit-venues">${CIRCUIT_VENUES.map(venue=>{
      const selected=planned.has(venue.id), candidate=getCircuitPreview(state,[...state.circuit.plan,venue.id]);
      const allowed=availability.enabled&&(selected||planned.size<3&&candidate.valid);
      const reason=!availability.enabled?availability.reason:planned.size>=3?'Ya elegiste tres escenarios.':candidate.reason;
      return `<article class="circuit-venue ${selected?'selected':''}" aria-labelledby="circuit-venue-${venue.id}"><div class="circuit-venue-top"><span class="circuit-kind ${venue.kind}">${venue.kind==='popular'?'Popular':'Comercial'}</span><strong>${time(venue.startMinute)}</strong></div><h4 id="circuit-venue-${venue.id}">${escape(venue.name)}</h4><p>${escape(venue.zone)} · ${venue.duration} min · al aire libre</p><div class="circuit-venue-fee"><strong>${money(venue.fee)}</strong><small>ingreso bruto · UYU</small></div><button type="button" class="${selected?'outline-button':'primary-button'}" data-toggle-venue="${venue.id}" aria-pressed="${selected}" ${allowed?'':`disabled aria-describedby="venue-reason-${venue.id}"`}>${selected?'Quitar del plan':'Agregar al plan'}</button>${!allowed?`<p class="circuit-unavailable" id="venue-reason-${venue.id}">${escape(reason)}</p>`:''}</article>`;
    }).join('')}</div>
    <section class="circuit-route" aria-labelledby="circuit-route-title"><h3 id="circuit-route-title">Tu recorrido</h3>${hasPlan?`<ol>${preview.stops.map(stop=>`<li><span class="circuit-route-time">${time(stop.startMinute)}</span><div><strong>${escape(stop.name)}</strong><small>${stop.travelMinutes} min de traslado ${stop===preview.stops[0]?'desde el local':'desde la parada anterior'} · termina ${time(stop.startMinute+stop.duration)}</small></div></li>`).join('')}</ol>`:'<p class="circuit-empty">Todavía no elegiste escenarios. Armar el plan es gratis y no avanza el calendario.</p>'}
    ${hasPlan?`<dl class="circuit-ledger"><div><dt>Ingresos si actúan en todos</dt><dd>${money(preview.gross)}</dd></div><div><dt>Cachés del elenco</dt><dd>${money(-preview.memberFees)}</dd></div><div><dt>Transporte de la ruta</dt><dd>${money(-preview.transport)}</dd></div><div class="circuit-total"><dt>Saldo si cumplen todo</dt><dd>${money(preview.net)}</dd></div></dl><div class="circuit-impact"><span>Desgaste si cumplen todo <strong>${Math.abs(preview.energy).toLocaleString('es-UY')} energía</strong></span><span>Energía si cumplen todo <strong>${Math.max(0,Math.round(getStats(state).energy+preview.energy))}/100</strong></span></div><p class="circuit-budget">Caja necesaria ante suspensiones: <strong>${money(preview.requiredCash)} UYU</strong>. Disponible: ${money(state.money)}.</p><p class="fineprint">Si un tablado suspende, no cobra ni paga cachés o traslado de esa parada. Confirmar la salida usa una jornada, incluso si se suspenden todas.</p>`:''}
    ${blockReason?`<p class="circuit-warning" id="circuit-block">${escape(blockReason)}</p>`:''}
    <div class="circuit-route-actions"><button type="button" class="primary-button" data-run-circuit ${canRun?'':'disabled aria-describedby="circuit-block"'}>Salir al circuito · 1 jornada</button><button type="button" class="outline-button" data-clear-circuit ${hasPlan?'':'disabled'}>Vaciar el plan</button></div></section>
    ${nightHistory(state)}
    <details class="circuit-rules"><summary>Horarios, clima y costos de esta simulación</summary><p>Los escenarios y su programación son ficticios. La duración, los traslados, los cachés y el máximo de tres actuaciones son reglas de balance. La agenda comienza a fines de enero y reserva las jornadas oficiales para el concurso.</p><p>El pronóstico corresponde al mundo del juego. Las suspensiones se confirman antes de partir. El plan se guarda hasta ejecutarlo, vaciarlo o avanzar con otra actividad; no implica un gasto por reserva. El detalle de las salidas se reinicia cada año, y las cuentas totales permanecen en la historia de la murga.</p></details>
  </section>`;
}
