import { getContactAvailability, getContractReserve, getRenewalQuote, getRenewalSummary, MEMBER_ROLE_LABELS, CONTACTS_PER_DAY, type Member, type RecruitmentOffer, type State } from './simulation';
import { fameLabel } from './management-panels';
import './contracts.css';

const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const money=(value:number)=>`$ ${Math.round(value).toLocaleString('es-UY')}`;
const offers: {id:RecruitmentOffer;label:string}[]=[
  {id:'standard',label:'Estándar'}, {id:'generous',label:'Generosa · +20%'}, {id:'premium',label:'Preferencial · +45%'},
];

export function contractBrief(state:State):string {
  const summary=getRenewalSummary(state);
  return `<button class="contract-brief ${summary.pending?'has-pending':''}" data-panel="contratos"><span><small>EL ELENCO DE ESTE AÑO</small><strong>${summary.pending?`${summary.pending} acuerdos por resolver`:`${summary.signed} integrantes confirmados`}</strong></span><span aria-hidden="true">→</span></button>`;
}

function pendingCard(state:State,member:Member,selected:RecruitmentOffer):string {
  const quote=getRenewalQuote(state,member.id,selected), contact=getContactAvailability(state,member.id);
  const reasonId=`renewal-reason-${member.id}`;
  return `<article class="contract-card" aria-labelledby="renewal-name-${member.id}">
    <div class="contract-card-heading"><span class="contract-initial" aria-hidden="true">${escape(member.name.split(' ').slice(0,2).map(part=>part[0]).join(''))}</span><div><small>${MEMBER_ROLE_LABELS[member.role]}${member.cord?` · ${member.cord}`:''}</small><h3 id="renewal-name-${member.id}">${escape(member.name)}</h3><p>“${escape(member.nickname)}” · ${fameLabel(member.fame)}</p></div><span class="contract-badge">Pendiente</span></div>
    <div class="contract-facts"><span><strong>${member.seasons}</strong> carnavales</span><span><strong>${Math.round(member.morale)}/100</strong> ánimo</span><span><strong>${Math.round(member.rapport)}/100</strong> confianza</span></div>
    <p class="contract-continuity">${member.loyalty>=70?'Tiene un vínculo fuerte con el grupo.':member.loyalty>=45?'Se siente parte del grupo.':'Su vínculo con el grupo necesita atención.'} La fama y los honorarios no revelan el talento.</p>
    <label class="contract-offer">Oferta para ${escape(member.name)}<select data-renewal-offer="${member.id}">${offers.map(offer=>`<option value="${offer.id}" ${offer.id===selected?'selected':''}>${offer.label} · ${money(getRenewalQuote(state,member.id,offer.id).fee)}</option>`).join('')}</select></label>
    <div class="contract-quote ${quote.accepted?'is-willing':''}"><strong>${escape(quote.interest)}</strong><p id="${reasonId}">${escape(quote.reason)}</p></div>
    <button class="primary-button contract-sign" data-renew="${member.id}" aria-describedby="${reasonId}" ${quote.accepted?'':'disabled'}>Renovar · ${money(quote.fee)} UYU</button>
    <div class="contract-alternatives"><button class="outline-button" data-contact="${member.id}" ${contact.enabled?'':`disabled aria-describedby="contact-reason-${member.id}"`}>Conversar</button><button class="outline-button" data-replace-member="${member.id}">Buscar reemplazo</button></div>
    ${!contact.enabled?`<p class="contract-contact-reason" id="contact-reason-${member.id}">${escape(contact.reason)}</p>`:''}
  </article>`;
}

export function contractPanel(state:State,selections:Record<string,RecruitmentOffer>):string {
  const summary=getRenewalSummary(state), pending=state.members.filter(member=>state.pendingRenewals.includes(member.id));
  const signed=state.members.filter(member=>!state.pendingRenewals.includes(member.id));
  const reserve=getContractReserve(state);
  const available=pending.some(member=>getRenewalQuote(state,member.id).accepted);
  return `<section class="contract-panel">
    <p class="intro-copy">Decidí quién vuelve a ${escape(state.identity.name)}. La reputación, la confianza y el ánimo influyen en cada acuerdo.</p>
    <div class="contract-summary"><div><small>CONFIRMADOS</small><strong>${summary.signed}<em> / ${summary.total}</em></strong></div><div><small>PENDIENTES</small><strong>${summary.pending}</strong></div><div><small>CAJA · UYU</small><strong>${money(state.money)}</strong></div></div>
    ${pending.length?`<div class="contract-year-note"><strong>Primero, confirmar el elenco</strong><p>Confirmá las ${summary.total} plazas para avanzar. Te quedan ${Math.max(0,CONTACTS_PER_DAY-state.contactsToday)} conversaciones gratuitas; negociar no consume jornadas.</p><p>${reserve.possible?`Reserva: ${money(reserve.cost)} UYU para poder completar el elenco. Se ajusta con cada acuerdo, sin descontarse por adelantado.`:escape(reserve.reason)}</p></div>
    <div class="contract-bulk"><div><strong>Referencia estándar pendiente: ${money(summary.estimatedCost)} UYU</strong><p>Usa siempre ofertas estándar, aunque hayas elegido otras en las tarjetas. Omite rechazos y pagos que comprometan las plazas restantes.</p></div><button class="primary-button" data-renew-all ${available?'':'disabled'}>Firmar acuerdos estándar</button></div>
    <div class="contract-grid">${pending.map(member=>pendingCard(state,member,selections[member.id]??'standard')).join('')}</div>`:
    `<div class="contract-year-note complete"><strong>El elenco está confirmado</strong><p>${state.status==='playing'?'Los acuerdos de esta temporada ya están resueltos. El próximo año se negocian nuevamente.':'Estos acuerdos corresponden a la temporada terminada. Al pasar al próximo año se vuelve a negociar.'}</p><button class="outline-button" data-panel="${state.status==='playing'?'produccion':'reset'}">${state.status==='playing'?'Ir al equipo creativo':'Preparar la próxima temporada'}</button></div>`}
    ${signed.length?`<details class="contract-signed" ${!pending.length?'open':''}><summary>Integrantes confirmados · ${signed.length}</summary><ul>${signed.map(member=>`<li><span><strong>${escape(member.name)}</strong><small>${MEMBER_ROLE_LABELS[member.role]} · ${fameLabel(member.fame)}</small></span><span class="contract-badge signed">Confirmado</span></li>`).join('')}</ul></details>`:''}
    <p class="fineprint">La renovación parte del 15% del honorario de referencia actualizado y se redondea a centenas. El aumento de oferta se aplica antes del redondeo. Los cachés por actuación se pagan aparte. Importes y condiciones ficticios de balance; no son tarifas ni contratos oficiales.</p>
  </section>`;
}
