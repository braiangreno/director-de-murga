/**
 * Fictional management model, with representative April–March periods.
 * All prices, abilities, negotiations and admission thresholds are game balance,
 * not official tariffs. Contest scores remain separate from the admission.
 */
export type Cord = 'Bajos' | 'Segundos' | 'Primos' | 'Sobreprimos' | 'Tercias';
export type Action = 'rehearse' | 'popular' | 'commercial' | 'rest' | 'compete' | 'fundraiser' | 'community';
export type Upgrade = 'voices' | 'lyrics' | 'costumes' | 'staging';
export type MemberRole = 'chorister' | 'bombo' | 'redoblante' | 'platillos' | 'director';
export type CreativeRole = 'lyrics' | 'arrangements' | 'costumes' | 'makeup' | 'staging';
export type RecruitmentOffer = 'standard' | 'generous' | 'premium';
export type ShowSectionId = 'saludo' | 'cuple' | 'retirada';
export type ShowWork = 'text' | 'arrangements';
export type RehearsalFocus = 'general' | ShowSectionId;
export interface ShowSectionProgress { text: number; arrangements: number; rehearsal: number; }
export interface ShowState {
  title: string; themeId: string; focus: RehearsalFocus; locked: boolean;
  sections: Record<ShowSectionId, ShowSectionProgress>;
}
/** Public production progress is not a jury mark or a report of hidden ability. */
export interface ShowSnapshot {
  title: string; themeId: string; themeName: string; readiness: number;
  sections: (ShowSectionProgress & {id: ShowSectionId})[];
}
export const SHOW_THEMES = [
  {id:'barrio',name:'La esquina y su gente',description:'Un barrio imaginario busca cómo escucharse. Desarrollo equilibrado de textos y arreglos.'},
  {id:'memoria',name:'Las voces que vuelven',description:'Recuerdos ficticios pasan de una generación a otra. Afinidad con el desarrollo coral.'},
  {id:'satira',name:'El ministerio del disparate',description:'Una oficina imaginaria intenta reglamentar la alegría. Afinidad con la escritura satírica.'},
] as const;
export const SHOW_SECTIONS: {id:ShowSectionId;name:string;description:string}[] = [
  {id:'saludo',name:'Saludo',description:'La presentación de la murga y del mundo del espectáculo.'},
  {id:'cuple',name:'Cuplé',description:'El desarrollo de una situación, sus personajes y sus remates.'},
  {id:'retirada',name:'Retirada',description:'La despedida y la idea que el grupo deja resonando.'},
];
const SHOW_WORK_COSTS: Record<ShowWork, number> = {text:4000,arrangements:5000};
export interface CreativeCandidate {
  id: string; name: string; nickname: string; role: CreativeRole;
  level: 'Barrial' | 'Profesional' | 'Referente'; fee: number; quality: number;
}
export interface Member {
  id: string; name: string; nickname: string;
  rarity: 'Común' | 'Raro' | 'Épico' | 'Legendario';
  role: MemberRole; skill: number; cord: Cord | null; assignedCord: Cord | null;
  voice: number; charisma: number; energy: number; cost: number;
  fame: number; experience: number; seasons: number; age: number; loyalty: number;
  minReputation: number; scouting: 0 | 1 | 2; participation: number;
  morale: number; rapport: number; lastContactDay: number;
}
export interface CostumeProposal {
  id: string; name: string; description: string; outfitId: string; paletteId: string; cost: number;
}
export interface Accounts {
  opening: number; technical: number; costume: number; recruitment: number; auditions: number;
  upgrades: number; rehearsals: number; performanceIncome: number; performanceCosts: number; prizes: number;
  communityIncome: number; communityCosts: number;
}

export interface MurgaIdentity { name: string; barrio: string; }
export type SeasonOutcome = 'not-admitted' | 'second-round' | 'finalist' | 'champion';
export interface PublicRosterMember {
  id: string; name: string; role: MemberRole; experience: number; fame: number;
}
export interface PublicSeasonReport {
  season: number; identity: MurgaIdentity; outcome: SeasonOutcome | 'in-progress';
  cash: number; reputation: number; fans: number; accounts: Accounts; roster: PublicRosterMember[];
  admissionExempt: boolean; results: {name:string;score:number|null;passed:boolean}[];
  contestTotal: number | null; contestAverage: number | null; rank: number | null;
  roundsCompleted: number; scoresPublic: boolean;
  show: ShowSnapshot | null;
}
export interface SeasonArchive extends PublicSeasonReport {
  outcome: SeasonOutcome; scoresPublic: true; closingCash: number;
}
export interface CareerCounters {
  sinceSeason: number; completedSeasons: number; championships: number; finals: number;
}
export const HISTORY_LIMIT = 50;
export const DEFAULT_IDENTITY: Readonly<MurgaIdentity> = Object.freeze({name:'La Vereda',barrio:'Montevideo'});
export const OUTCOME_LABELS: Record<SeasonOutcome | 'in-progress', string> = {
  'in-progress':'En curso', 'not-admitted':'No admitida', 'second-round':'Segunda rueda',
  finalist:'Finalista', champion:'Campeona',
};

export interface State {
  version: 8; identity: MurgaIdentity; history: SeasonArchive[]; career: CareerCounters; show: ShowState;
  pendingRenewals: string[];
  season: number; day: number; money: number; fans: number; reputation: number;
  productionStarted: boolean; admissionExempt: boolean; creativeTeam: Record<CreativeRole, string | null>;
  creativeFees: Record<CreativeRole, number>; costumeProposalId: string | null;
  accounts: Accounts; fallosRevealed: boolean;
  contactsToday: number; fundraisersUsed: number; pendingDecision: string | null; resolvedDecisions: string[];
  decisionHistory: { id: string; optionId: string | null; day: number }[];
  members: Member[]; candidates: Member[]; upgrades: Record<Upgrade, number>;
  licensed: boolean; penalty: number; results: { name: string; score: number; passed: boolean }[];
  rivals: { id: string; name: string; scores: number[] }[];
  log: string[]; seed: number; status: 'playing' | 'won' | 'lost'; lastMessage: string;
}
export const CORDS: Cord[] = ['Bajos', 'Segundos', 'Primos', 'Sobreprimos', 'Tercias'];
export const MEMBER_ROLES: MemberRole[] = ['chorister', 'bombo', 'redoblante', 'platillos', 'director'];
export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = { chorister: 'Coreuta', bombo: 'Bombo', redoblante: 'Redoblante', platillos: 'Platillos', director: 'Director/a escénico/a' };
export const CREATIVE_ROLES: CreativeRole[] = ['lyrics', 'arrangements', 'costumes', 'makeup', 'staging'];
export const CREATIVE_ROLE_LABELS: Record<CreativeRole, string> = { lyrics: 'Letrista', arrangements: 'Arreglador/a coral', costumes: 'Vestuarista', makeup: 'Maquillador/a', staging: 'Puestista' };
const CREATIVE_NAMES = [
  ['Vera Luján', 'Tomás Barreto', 'Alma Toledo'], ['León Farías', 'Irene Valdés', 'Damián Ledesma'],
  ['Clara Benítez', 'Rafael Lemos', 'Emma Vidal'], ['Nora Peña', 'Julián Rivas', 'Lila Fontana'],
  ['Simón Peralta', 'Eva Quiroga', 'Amaro Ferrer'],
];
const TECHNICAL_FEES = [[25000,55000,90000],[30000,65000,95000],[30000,55000,85000],[20000,40000,65000],[25000,50000,80000]];
export const CREATIVE_CANDIDATES: CreativeCandidate[] = CREATIVE_ROLES.flatMap((role, roleIndex) =>
  (['Barrial', 'Profesional', 'Referente'] as const).map((level, index) => ({
    id: `creative-${role}-${index}`, name: CREATIVE_NAMES[roleIndex][index], nickname: ['Del barrio', 'Con oficio', 'Trayectoria'][index],
    role, level, fee: TECHNICAL_FEES[roleIndex][index], quality: [45,65,85][index],
  })));
// Compatibility export: these are fame bands, never probabilities or hidden talent.
export const RECRUITMENT_ODDS = { 'Común': 55, 'Raro': 28, 'Épico': 13, 'Legendario': 4 } as const;
export const REFRESH_COST = 0;
export const AUDITION_COST = 5000;
export const LICENSE_COST = 0;
export const TOTAL_DAYS = 32;
export const RECRUITMENT_END_DAY = 12;
export const REHEARSALS_START_DAY = 6;
export const TABLADOS_START_DAY = 24;
export const INITIAL_BUDGET = 1200000;
export const SEASON_FINANCING = 850000;
export const MAX_UPGRADE = 5;
export const CONTACTS_PER_DAY = 3;
export const CONTACT_COOLDOWN = 2;
export const FUNDRAISER_LIMIT = 3;
export const ECONOMY_COSTS = {
  audition: AUDITION_COST, rehearsal: 6000, transport: 3500, cachePerMember: 900,
  community: 2500, fundraiserCost: 12000, fundraiserBaseGross: 65000,
  popularGross: 18000, commercialGross: 25000, showsPerAction: 2,
  openingFinancing: INITIAL_BUDGET, annualFinancing: SEASON_FINANCING,
} as const;
export const EVENTS = [
  { day: 18, name: 'Prueba de admisión', threshold: 49, prize: 0, fans: 80 },
  { day: 25, name: 'Primera rueda', threshold: 0, prize: 0, fans: 170 },
  { day: 28, name: 'Segunda rueda', threshold: 0, prize: 0, fans: 300 },
  { day: 31, name: 'Liguilla', threshold: 0, prize: 120000, fans: 800 },
] as const;
const UPGRADE_KEYS: Upgrade[] = ['voices', 'lyrics', 'costumes', 'staging'];
const UPGRADE_LABELS: Record<Upgrade,string> = { voices:'Voces y arreglos',lyrics:'Textos',costumes:'Vestuario',staging:'Puesta en escena' };
const IDEAL_CORDS = [2,3,4,2,2];
const ACTION_ENERGY: Record<'chorister'|'percussion'|'director',Record<Action,number>> = {
  chorister:{rehearse:-8,popular:-10,commercial:-22,rest:26,compete:-9,fundraiser:-6,community:8},
  percussion:{rehearse:-6,popular:-12,commercial:-18,rest:23,compete:-8,fundraiser:-6,community:8},
  director:{rehearse:-5,popular:-8,commercial:-14,rest:22,compete:-7,fundraiser:-6,community:8},
};
const energyChange = (member:Member,action:Action) => ACTION_ENERGY[member.role === 'chorister' || member.role === 'director' ? member.role : 'percussion'][action];
const FIRST_NAMES = ['Ana', 'Bruno', 'Camila', 'Diego', 'Elena', 'Facundo', 'Gabriela', 'Hugo', 'Inés', 'Joaquín', 'Lucía', 'Mateo', 'Natalia', 'Pablo', 'Rocío', 'Santiago', 'Valentina', 'Marcos', 'Julia', 'Nicolás'];
const LAST_NAMES = ['Pereira', 'Silva', 'Rodríguez', 'Sosa', 'Cabrera', 'Acosta', 'González', 'Duarte', 'Ferreira', 'Castro', 'López', 'Suárez'];
const SECOND_LAST_NAMES = ['Araujo', 'Pintos', 'Olivera', 'Méndez', 'Bentancur', 'Correa', 'Machado', 'Acuña', 'Paz', 'Moreira', 'Lima', 'Burgos'];
const NICKNAMES = ['La Chispa', 'El Flaco', 'La Tana', 'El Zurdo', 'La Brisa', 'El Mono', 'La Negra', 'El Vasco', 'La Piba', 'El Canario', 'La China', 'El Loco', 'La Colo', 'El Gallego', 'La Rusa', 'El Pato', 'La Luz', 'El Mago', 'La Ronda', 'El Rulo'];
const RIVAL_NAMES = ['Los Faroles de Papel', 'La Vereda Imaginaria', 'El Eco del Andén', 'Las Voces del Umbral', 'La Esquina de Cartón', 'La Ronda Infinita', 'El Patio de las Nubes', 'El Coro del Silencio', 'Los Vecinos del Aire', 'La Ventana Encendida', 'El Mapa de la Risa', 'La Noche Prestada', 'Los Sueños del Cordón', 'La Azotea Invisible', 'El Reloj del Barrio', 'La Sombra del Tambor', 'Los Cantores del Viento', 'La Última Baldosa'];
const round = (value: number) => Math.round(value * 10) / 10;
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const sumScores = (values: number[]) => round(values.reduce((sum, value) => sum + value, 0));

function emptyShow():ShowState {
  return {title:'Una voz en la esquina',themeId:'barrio',focus:'general',locked:false,
    sections:{saludo:{text:0,arrangements:0,rehearsal:0},cuple:{text:0,arrangements:0,rehearsal:0},retirada:{text:0,arrangements:0,rehearsal:0}}};
}
function cloneShow(show:ShowState):ShowState {
  return {...show,sections:{saludo:{...show.sections.saludo},cuple:{...show.sections.cuple},retirada:{...show.sections.retirada}}};
}
function cloneShowSnapshot(show:ShowSnapshot|null):ShowSnapshot|null {
  return show?{...show,sections:show.sections.map(section=>({...section}))}:null;
}
function showReadiness(sections:ShowSectionProgress[]):number {
  return round(average(sections.map(section=>(section.text+section.arrangements+section.rehearsal)/3)));
}
function showSnapshot(show:ShowState):ShowSnapshot {
  const sections=SHOW_SECTIONS.map(({id})=>({id,...show.sections[id]}));
  return {title:show.title,themeId:show.themeId,themeName:SHOW_THEMES.find(theme=>theme.id===show.themeId)!.name,
    readiness:showReadiness(sections),sections};
}
function rehearsalLimit(section:ShowSectionProgress):number { return round(20+.8*Math.min(section.text,section.arrangements)); }


function copy(state:State):State {
  return {...state,identity:{...state.identity},history:state.history.map(cloneArchive),career:{...state.career},show:cloneShow(state.show),creativeTeam:{...state.creativeTeam},creativeFees:{...state.creativeFees},accounts:{...state.accounts},
    members:state.members.map(m=>({...m})),candidates:state.candidates.map(m=>({...m})),upgrades:{...state.upgrades},
    results:state.results.map(r=>({...r})),rivals:state.rivals.map(r=>({...r,scores:[...r.scores]})),log:[...state.log],
    resolvedDecisions:[...state.resolvedDecisions],decisionHistory:state.decisionHistory.map(d=>({...d})),pendingRenewals:[...state.pendingRenewals]};
}
function notice(state:State,message:string):State { return {...state,lastMessage:message}; }
function log(state:State,message:string):void { state.lastMessage=message; state.log=[message,...state.log].slice(0,30); }
function random(state:State):number { state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0; return state.seed/4294967296; }
function emptyTeam():Record<CreativeRole,null> {return {lyrics:null,arrangements:null,costumes:null,makeup:null,staging:null};}
function emptyFees():Record<CreativeRole,number> {return {lyrics:0,arrangements:0,costumes:0,makeup:0,staging:0};}
function emptyAccounts(opening:number):Accounts {return {opening,technical:0,costume:0,recruitment:0,auditions:0,upgrades:0,rehearsals:0,performanceIncome:0,performanceCosts:0,prizes:0,communityIncome:0,communityCosts:0};}
function accountBalance(a:Accounts):number {return a.opening+a.performanceIncome+a.prizes+a.communityIncome-a.communityCosts-a.technical-a.costume-a.recruitment-a.auditions-a.upgrades-a.rehearsals-a.performanceCosts;}
function fameRarity(fame:number):Member['rarity'] {return fame<55?'Común':fame<83?'Raro':fame<96?'Épico':'Legendario';}
function makeCandidate(state:State,index:number):Member {
  const role:MemberRole=index<80?'chorister':MEMBER_ROLES[1+((index-80)%4)];
  // Independent draws: an unknown can be gifted, and fame does not guarantee ability.
  const ability=40+Math.floor(random(state)*54), fame=Math.floor(random(state)*100);
  const age=18+Math.floor(random(state)*36), experience=Math.floor(random(state)*Math.min(65,(age-16)*3));
  const charisma=30+Math.floor(random(state)*65), loyalty=25+Math.floor(random(state)*65);
  const cord=role==='chorister'?CORDS[Math.floor(random(state)*5)]:null;
  return {id:`m-market-${index}`,name:`${FIRST_NAMES[index%FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(index/FIRST_NAMES.length)%LAST_NAMES.length]} ${SECOND_LAST_NAMES[index%SECOND_LAST_NAMES.length]}`,
    nickname:NICKNAMES[index%NICKNAMES.length],
    rarity:fameRarity(fame),role,skill:role==='chorister'?0:ability,voice:role==='chorister'?ability:0,
    cord,assignedCord:cord,charisma,energy:100,cost:Math.round((18000+fame*850+experience*200)/500)*500,
    fame,experience,seasons:Math.floor(experience/6),age,loyalty,minReputation:Math.max(0,Math.round(fame*.65-8)),
    scouting:0,participation:0,morale:70,rapport:0,lastContactDay:-1};
}
export function createGame(seed=2026):State {
  const state:State={version:8,identity:{...DEFAULT_IDENTITY},history:[],career:{sinceSeason:1,completedSeasons:0,championships:0,finals:0},show:emptyShow(),pendingRenewals:[],season:1,day:0,money:INITIAL_BUDGET,fans:40,reputation:20,productionStarted:false,admissionExempt:false,
    creativeTeam:emptyTeam(),creativeFees:emptyFees(),costumeProposalId:null,accounts:emptyAccounts(INITIAL_BUDGET),fallosRevealed:false,
    contactsToday:0,fundraisersUsed:0,pendingDecision:null,resolvedDecisions:[],decisionHistory:[],
    members:[],candidates:[],upgrades:{voices:0,lyrics:0,costumes:0,staging:0},licensed:false,penalty:0,results:[],
    rivals:RIVAL_NAMES.map((name,i)=>({id:`r-${i}`,name,scores:[]})),log:[],seed:Number.isFinite(seed)?seed>>>0:2026,status:'playing',lastMessage:''};
  let i=0;
  for(const [cordIndex,cord] of CORDS.entries()) for(let j=0;j<IDEAL_CORDS[cordIndex];j++,i++) {
    state.members.push({id:`m-starter-${i}`,name:`${FIRST_NAMES[i]} ${LAST_NAMES[i%LAST_NAMES.length]}`,nickname:NICKNAMES[i],
      rarity:'Común',role:'chorister',skill:0,cord,assignedCord:cord,voice:47+(i*7)%12,charisma:40+(i*3)%18,energy:86,cost:18000,
      fame:15+i%12,experience:8+i%7,seasons:1,age:21+i,loyalty:65,minReputation:0,scouting:1,participation:0,morale:70,rapport:25,lastContactDay:-1});
  }
  for(const role of ['bombo','redoblante','platillos','director'] as const) {
    state.members.push({id:`m-starter-${i}`,name:`${FIRST_NAMES[i]} ${LAST_NAMES[i%LAST_NAMES.length]}`,nickname:NICKNAMES[i],
      rarity:'Común',role,skill:role==='director'?55:52+i%3,cord:null,assignedCord:null,voice:0,charisma:40+(i*3)%18,energy:86,cost:18000,
      fame:15+i%12,experience:8+i%7,seasons:1,age:21+i,loyalty:65,minReputation:0,scouting:1,participation:0,morale:70,rapport:25,lastContactDay:-1}); i++;
  }
  state.candidates=Array.from({length:120},(_,index)=>makeCandidate(state,index));
  log(state,'Abril: financiación inicial de $1.200.000 UYU. Armá el elenco, conversá con los componentes y contratá los cinco oficios técnicos antes de iniciar los ensayos. Precios estimados del juego.');
  return state;
}

/** Personal identity is presentation data and never changes the economic or artistic model. */
export function validateIdentity(input: unknown): {valid:boolean;reason:string;identity:MurgaIdentity|null} {
  if(!input || typeof input!=='object' || Array.isArray(input))
    return {valid:false,reason:'Ingresá el nombre de la murga y su barrio.',identity:null};
  const data=input as Record<string,unknown>;
  const clean=(value:unknown):string|null=>{
    if(typeof value!=='string' || /[<>\p{Cc}\p{Cf}]/u.test(value)) return null;
    const normalized=value.normalize('NFC').replace(/\s+/gu,' ').trim();
    const length=[...normalized].length;
    return length>=2 && length<=40?normalized:null;
  };
  const name=clean(data.name),barrio=clean(data.barrio);
  if(name===null || barrio===null)
    return {valid:false,reason:'Nombre y barrio deben tener entre 2 y 40 caracteres, sin etiquetas ni caracteres de control.',identity:null};
  return {valid:true,reason:'',identity:{name,barrio}};
}
export function setIdentity(state:State,identity:MurgaIdentity):State {
  const validation=validateIdentity(identity);
  if(!validation.valid) return notice(state,validation.reason);
  if(validation.identity!.name===state.identity.name && validation.identity!.barrio===state.identity.barrio)
    return notice(state,'El nombre y el barrio ya están guardados.');
  const next=copy(state);next.identity=validation.identity!;
  log(next,`La murga se presenta como ${next.identity.name}, de ${next.identity.barrio}. Los años archivados conservan su identidad original.`);
  return next;
}
function cloneArchive(archive:SeasonArchive):SeasonArchive {
  return {...archive,identity:{...archive.identity},accounts:{...archive.accounts},show:cloneShowSnapshot(archive.show),
    roster:archive.roster.map(member=>({...member})),results:archive.results.map(result=>({...result}))};
}
function seasonOutcome(state:State):SeasonOutcome|'in-progress' {
  if(state.status==='playing') return 'in-progress';
  if(state.status==='won') return 'champion';
  return state.day===EVENTS[0].day?'not-admitted':state.day===EVENTS[2].day?'second-round':'finalist';
}
function publicSeasonReport(state:State,closing=false):PublicSeasonReport {
  const summary=getContestSummary(state);
  const scoresPublic=closing || state.fallosRevealed || (state.day===EVENTS[3].day&&state.status!=='playing') || (state.day===EVENTS[0].day&&state.status==='lost');
  return {season:state.season,identity:{...state.identity},outcome:seasonOutcome(state),
    cash:state.money,reputation:state.reputation,fans:state.fans,accounts:{...state.accounts},
    roster:state.members.map(({id,name,role,experience,fame})=>({id,name,role,experience,fame})),
    admissionExempt:state.admissionExempt,
    results:state.results.map((result,index)=>({name:result.name,
      score:index===0?(state.admissionExempt?null:result.score):scoresPublic?result.score:null,passed:result.passed})),
    contestTotal:scoresPublic?summary.contestTotal:null,contestAverage:scoresPublic?summary.contestAverage:null,
    rank:scoresPublic?summary.rank:null,roundsCompleted:summary.roundsCompleted,scoresPublic,show:showSnapshot(state.show)};
}
/** Safe for rendering throughout the current season: sealed jury marks and ranks are null. */
export function getSeasonReport(state:State):PublicSeasonReport { return publicSeasonReport(state); }
/** Archived years are published when a successful nextSeason closes the carnival. */
export function getSeasonHistory(state:State):SeasonArchive[] { return state.history.map(cloneArchive); }
export function getCareerSummary(state:State):CareerCounters & {retainedSeasons:number;historyLimit:number;omittedSeasons:number} {
  return {...state.career,retainedSeasons:state.history.length,historyLimit:HISTORY_LIMIT,
    omittedSeasons:Math.max(0,state.career.completedSeasons-state.history.length)};
}
export function getRosterProgress(state:State): (PublicRosterMember & {
  previousExperience:number|null;previousFame:number|null;experienceDelta:number|null;fameDelta:number|null;
})[] {
  const previous=state.history.at(-1);
  return state.members.map(({id,name,role,experience,fame})=>{
    const before=previous?.roster.find(member=>member.id===id);
    return {id,name,role,experience,fame,previousExperience:before?.experience??null,previousFame:before?.fame??null,
      experienceDelta:before?round(experience-before.experience):null,fameDelta:before?round(fame-before.fame):null};
  });
}
function archiveFinishedSeason(target:State,finished:State):void {
  const report=publicSeasonReport(finished,true);
  const archive:SeasonArchive={...report,outcome:seasonOutcome(finished) as SeasonOutcome,scoresPublic:true,closingCash:finished.money};
  target.history=[...target.history,archive].slice(-HISTORY_LIMIT);
  target.career.completedSeasons++;
  if(archive.outcome==='champion') target.career.championships++;
  if(archive.outcome==='champion'||archive.outcome==='finalist') target.career.finals++;
}

export function getProductionSummary(state: State): {
  hired: number; required: number; ready: boolean; totalFees: number; remainingBudget: number;
  team: { role: CreativeRole; label: string; candidate: CreativeCandidate | null }[];
  effects: { voices: number; lyrics: number; costumes: number; makeup: number; staging: number; coordination: number };
} {
  const team = CREATIVE_ROLES.map(role => ({ role, label: CREATIVE_ROLE_LABELS[role],
    candidate: CREATIVE_CANDIDATES.find(candidate => candidate.id === state.creativeTeam[role] && candidate.role === role) ?? null }));
  const hired = team.filter(item => item.candidate).length;
  const bonus = (role: CreativeRole) => Math.max(0, (team.find(item => item.role === role)?.candidate?.quality ?? 45) - 45);
  return { hired, required: CREATIVE_ROLES.length, ready: hired === CREATIVE_ROLES.length,
    totalFees: team.reduce((sum, item) => sum + state.creativeFees[item.role], 0), remainingBudget: state.money, team,
    effects: { voices: round(bonus('arrangements') * .2), lyrics: round(bonus('lyrics') * .2),
      costumes: round(bonus('costumes') * .2), makeup: round(bonus('makeup') * .2), staging: round(bonus('staging') * .2),
      coordination: round(bonus('arrangements') * .125) } };
}


export function hireCreative(state:State,candidateId:string):State {
  if(state.productionStarted || state.status!=='playing') return notice(state,'El equipo técnico está confirmado para esta temporada.');
  const candidate=CREATIVE_CANDIDATES.find(item=>item.id===candidateId);
  if(!candidate) return notice(state,'Ese perfil técnico no está disponible.');
  if(state.creativeTeam[candidate.role]===candidate.id) return notice(state,'Este perfil ya integra tu equipo técnico.');
  const refund=state.creativeFees[candidate.role];
  const costumeRefund=candidate.role==='costumes'?state.accounts.costume:0;
  const adjustment=candidate.fee-refund-costumeRefund;
  if(state.money<adjustment) return notice(state,'No alcanza el presupuesto para esos honorarios.');
  const reserveReason=contractSpendingReason(state,{...state,money:state.money-adjustment});
  if(reserveReason) return notice(state,reserveReason);
  const next=copy(state);
  next.money-=adjustment; next.accounts.technical+=candidate.fee-refund;
  next.creativeTeam[candidate.role]=candidate.id; next.creativeFees[candidate.role]=candidate.fee;
  if(candidate.role==='costumes') {next.costumeProposalId=null;next.accounts.costume=0;}
  log(next,`${candidate.name} se suma como ${CREATIVE_ROLE_LABELS[candidate.role].toLocaleLowerCase('es-UY')}. Honorarios: $${candidate.fee} UYU.${refund||costumeRefund?' Se reintegró exactamente la selección anterior.':''}`);
  return next;
}
const OUTFIT_IDS=['outfit-murga','outfit-festival','outfit-patchwork','outfit-bolero','outfit-long-coat','outfit-tails','outfit-cape','outfit-gala'];
const PALETTE_IDS=['emerald','carmine','indigo','sunrise','ocean','orchid','lime','scarlet','pearl','midnight','turquoise','sunflower'];
const COSTUME_NAMES=[['La vereda florece','Cartas de febrero'],['Fiesta de retazos','La noche se viste'],['Jardines del tablado','Brillos de despedida']];
export function getCostumeProposals(state:State):CostumeProposal[] {
  const designer=CREATIVE_CANDIDATES.find(c=>c.id===state.creativeTeam.costumes && c.role==='costumes');
  if(!designer) return [];
  const rank=Number(designer.id.at(-1));
  return [0,1].map(option=>({
    id:`${designer.id}-s${state.season}-p${option}`,name:COSTUME_NAMES[rank][option],
    description:`Propuesta de ${designer.name}: ${option===0?'casaca y volados para el barrio':'corte largo abierto y pantalón independiente'}. Confección para 17 integrantes; estimación del juego.`,
    outfitId:OUTFIT_IDS[(rank+state.season-1)%4+(option===0?0:4)],
    paletteId:PALETTE_IDS[(rank*4+option*2+state.season-1)%12],
    cost:[500000,600000,700000][rank]+option*150000,
  }));
}
export function chooseCostumeProposal(state:State,id:string):State {
  if(state.status!=='playing' || state.day>=TABLADOS_START_DAY) return notice(state,'El vestuario se define antes de abrir el circuito de tablados.');
  const proposal=getCostumeProposals(state).find(item=>item.id===id);
  if(!proposal) return notice(state,'Contratá un vestuarista y elegí una de sus dos propuestas.');
  if(state.costumeProposalId===id) return notice(state,'Esta propuesta ya está elegida y pagada.');
  const adjustment=proposal.cost-state.accounts.costume;
  if(state.money<adjustment) return notice(state,`Faltan $${adjustment-state.money} UYU para esta confección.`);
  const reserveReason=contractSpendingReason(state,{...state,money:state.money-adjustment});
  if(reserveReason) return notice(state,reserveReason);
  const next=copy(state); next.money-=adjustment;next.accounts.costume=proposal.cost;next.costumeProposalId=id;
  log(next,`Vestuario elegido: ${proposal.name}, de ${proposal.description.split(':')[0].replace('Propuesta de ','')}. Confección: $${proposal.cost} UYU; los honorarios del oficio se presupuestan aparte.`);
  return next;
}
export function startSeason(state:State):State {
  if(state.productionStarted || state.status!=='playing') return notice(state,'La producción de esta temporada ya comenzó.');
  if(state.pendingRenewals.length) return notice(state,`Falta acordar ${state.pendingRenewals.length} contrato(s) del elenco. Negociá o reemplazá a quienes no continúen antes de iniciar la producción.`);
  const summary=getProductionSummary(state);
  if(!summary.ready) return notice(state,`Falta contratar ${summary.required-summary.hired} puesto(s) técnicos.`);
  const next=copy(state);next.productionStarted=true;
  log(next,'Producción iniciada en abril. El mercado sigue abierto hasta septiembre; prepará el repertorio para la admisión de noviembre.');
  return next;
}

export function validateShowPlan(input:unknown):{valid:boolean;reason:string;plan:{title:string;themeId:string}|null} {
  if(!input||typeof input!=='object'||Array.isArray(input))
    return {valid:false,reason:'Ingresá un título y elegí un tema para el espectáculo.',plan:null};
  const {title,themeId}=input as Record<string,unknown>;
  if(typeof title!=='string'||/[<>\p{Cc}\p{Cf}]/u.test(title))
    return {valid:false,reason:'El título debe tener entre 2 y 60 caracteres, sin etiquetas ni caracteres de control.',plan:null};
  const normalized=title.normalize('NFC').replace(/\s+/gu,' ').trim();
  if([...normalized].length<2||[...normalized].length>60)
    return {valid:false,reason:'El título debe tener entre 2 y 60 caracteres.',plan:null};
  if(typeof themeId!=='string'||!SHOW_THEMES.some(theme=>theme.id===themeId))
    return {valid:false,reason:'Elegí uno de los temas disponibles.',plan:null};
  return {valid:true,reason:'',plan:{title:normalized,themeId}};
}
export function getShowSummary(state:State):{
  title:string;themeId:string;themeName:string;themeDescription:string;locked:boolean;focus:RehearsalFocus;
  readiness:number;sections:(ShowSectionProgress&{id:ShowSectionId;name:string;description:string})[];canEdit:boolean;editReason:string;
} {
  const theme=SHOW_THEMES.find(theme=>theme.id===state.show.themeId)!;
  const editReason=state.status!=='playing'?'El espectáculo de esta temporada ya terminó.':state.show.locked?
    'El primer trabajo o ensayo confirmó el título y el tema para esta temporada.':'';
  return {...showSnapshot(state.show),themeDescription:theme.description,locked:state.show.locked,focus:state.show.focus,
    sections:SHOW_SECTIONS.map(section=>({...section,...state.show.sections[section.id]})),canEdit:!editReason,editReason};
}
export function configureShow(state:State,plan:{title:string;themeId:string}):State {
  const summary=getShowSummary(state);
  if(!summary.canEdit) return notice(state,summary.editReason);
  const validated=validateShowPlan(plan);
  if(!validated.valid) return notice(state,validated.reason);
  if(state.show.title===validated.plan!.title&&state.show.themeId===validated.plan!.themeId)
    return notice(state,'El plan del espectáculo ya está guardado.');
  const next=copy(state);Object.assign(next.show,validated.plan!);
  log(next,`Espectáculo planificado: «${next.show.title}». Podés editarlo hasta el primer trabajo técnico o ensayo.`);
  return next;
}
export function setRehearsalFocus(state:State,focus:RehearsalFocus):State {
  if(state.status!=='playing') return notice(state,'La temporada terminó; el próximo espectáculo tendrá su propio plan de ensayos.');
  if(focus!=='general'&&!SHOW_SECTIONS.some(section=>section.id===focus)) return notice(state,'Ese foco de ensayo no existe.');
  const next=copy(state);next.show.focus=focus;
  log(next,`Próximo ensayo: ${focus==='general'?'repaso general':SHOW_SECTIONS.find(section=>section.id===focus)!.name}. Cambiar el foco no consume una jornada.`);
  return next;
}
function showWorkGain(state:State,work:ShowWork):number {
  const role=work==='text'?'lyrics':'arrangements';
  const quality=CREATIVE_CANDIDATES.find(candidate=>candidate.id===state.creativeTeam[role])?.quality??45;
  const affinity=state.show.themeId==='barrio'?2:
    state.show.themeId==='memoria'&&work==='arrangements'||state.show.themeId==='satira'&&work==='text'?4:0;
  return 50+(quality-45)/4+affinity;
}
export function getShowWorkAvailability(state:State,sectionId:ShowSectionId,work:ShowWork):{enabled:boolean;reason:string;cost:number;gain:number} {
  if(!SHOW_SECTIONS.some(section=>section.id===sectionId)||!Object.hasOwn(SHOW_WORK_COSTS,work))
    return {enabled:false,reason:'Ese trabajo o sección no existe.',cost:0,gain:0};
  const cost=SHOW_WORK_COSTS[work],gain=round(Math.min(100-state.show.sections[sectionId][work],showWorkGain(state,work)));
  const denied=(reason:string)=>({enabled:false,reason,cost,gain});
  if(state.status!=='playing') return denied('La temporada terminó. Prepará otro espectáculo al comenzar el próximo año.');
  if(state.pendingRenewals.length) return denied('Resolvé los contratos pendientes del elenco antes de avanzar la producción.');
  if(!state.productionStarted) return denied('Contratá los cinco puestos técnicos e iniciá la producción antes de desarrollar el espectáculo.');
  if(getPendingDecision(state)) return denied('Resolvé la decisión del grupo antes de avanzar esta jornada.');
  if(EVENTS.some(event=>event.day===state.day)) return denied(`Hoy toca ${getCalendar(state).eventName}. Presentate para continuar.`);
  if(gain<=0) return denied('Este trabajo ya está terminado en esta sección.');
  if(state.money<cost) return denied(`Este trabajo necesita $${cost} UYU de producción.`);
  return {enabled:true,reason:'',cost,gain};
}
export function developShow(state:State,sectionId:ShowSectionId,work:ShowWork):State {
  const availability=getShowWorkAvailability(state,sectionId,work);
  if(!availability.enabled) return notice(state,availability.reason);
  const next=copy(state);
  next.money-=availability.cost;next.accounts.rehearsals+=availability.cost;
  next.show.locked=true;next.show.sections[sectionId][work]=round(next.show.sections[sectionId][work]+availability.gain);
  advanceDay(next);
  log(next,`${SHOW_SECTIONS.find(section=>section.id===sectionId)!.name}: ${work==='text'?'texto':'arreglos'} +${availability.gain} de preparación. Trabajo técnico: $${availability.cost} UYU y una jornada; sin práctica ni desgaste del elenco.`);
  return next;
}
function rehearseShow(show:ShowState):void {
  show.locked=true;
  for(const {id} of SHOW_SECTIONS) {
    if(show.focus!=='general'&&show.focus!==id) continue;
    const section=show.sections[id];
    section.rehearsal=round(Math.min(rehearsalLimit(section),section.rehearsal+(show.focus==='general'?12:36)));
  }
}

export function getStats(state: State): { energy: number; harmony: number; quality: number; projectedScore: number; percussion: number; direction: number; chorusSize: number } {
  const energy = average(state.members.map(m => m.energy));
  const chorus = state.members.filter(member => member.role === 'chorister');
  const battery = state.members.filter(member => member.role !== 'chorister' && member.role !== 'director');
  const director = state.members.find(member => member.role === 'director')!;
  const effects = getProductionSummary(state).effects;
  const percussion = average(battery.map(member => (member.skill + member.experience * .025) * (.5 + .5 * member.energy / 100)));
  const direction = clamp((director.skill + director.experience * .025) * (.5 + .5 * director.energy / 100) + effects.coordination);
  const aligned = chorus.filter(m => m.cord === m.assignedCord).length / chorus.length;
  const imbalance = CORDS.reduce((sum, cord, i) => sum + Math.abs(chorus.filter(m => m.assignedCord === cord).length - IDEAL_CORDS[i]), 0);
  const balanced = clamp(1 - imbalance / 16, 0, 1);
  const harmony = clamp(aligned * 70 + balanced * 30);
  const sections=Object.values(state.show.sections);
  // Additive bonuses only: up to +4 in each category, zero for unrecorded legacy work.
  const showVoices=average(sections.map(section=>section.arrangements+section.rehearsal))*.02;
  const showTexts=average(sections.map(section=>section.text))*.04;
  const voices = clamp(average(chorus.map(m => m.voice + m.experience * .025)) * .65 + harmony * .35 + state.upgrades.voices * 7 + effects.voices
    + (percussion - 55) * .12 + (direction - 55) * .08 + showVoices);
  const lyrics = clamp(43 + state.upgrades.lyrics * 10 + effects.lyrics + showTexts);
  const costumes = clamp((state.costumeProposalId ? 52 : 30) + state.upgrades.costumes * 10 + effects.costumes);
  const makeup = clamp(48 + effects.makeup);
  const staging = clamp(45 + state.upgrades.staging * 10 + average(chorus.map(m => m.charisma)) * .08 + effects.staging + (direction - 55) * .08);
  // Admission presents the artistic work without competition costumes/makeup.
  // This is an abstract artistic evaluation, not a recreation of the admission jury's ballot.
  const quality = state.day <= EVENTS[0].day
    ? (voices * 4 + lyrics * 4 + staging * 2) / 10
    : (voices * 4 + lyrics * 4 + costumes * 2 + staging * 2 + makeup) / 13;
  const chorusEnergy = average(chorus.map(member => member.energy));
  const moraleFactor = .93 + average(state.members.map(member => member.morale)) / 1000;
  const projectedScore = clamp(quality * (.35 + .65 * chorusEnergy / 100) * moraleFactor);
  return { energy: round(energy), harmony: round(harmony), quality: round(quality), projectedScore: round(projectedScore),
    percussion: round(percussion), direction: round(direction), chorusSize: chorus.length };
}


export function getCalendar(state:State):{
  month:string;label:string;eventName:string|null;daysUntil:number;
  phase:'admission'|'preseason'|'carnival';phaseLabel:string;tabladosOpen:boolean;
} {
  const month=state.day<2?'Abril':state.day<4?'Mayo':state.day<6?'Junio':state.day<8?'Julio':
    state.day<10?'Agosto':state.day<12?'Septiembre':state.day<16?'Octubre':state.day<20?'Noviembre':
    state.day<22?'Diciembre':state.day<26?'Enero':state.day<31?'Febrero':'Febrero / marzo';
  const nextEvent=EVENTS.find(e=>e.day>=state.day),current=EVENTS.find(e=>e.day===state.day);
  const phase=state.day>=TABLADOS_START_DAY?'carnival':state.day>=16&&state.day<=18?'admission':'preseason';
  const eventName=current?.day===EVENTS[0].day&&state.admissionExempt?'Confirmar inscripción directa':current?.name??null;
  return {month,label:eventName??(state.day<12?'Armado del elenco y primeros ensayos':state.day<16?'Desarrollo del repertorio':
    state.day<19?(state.admissionExempt?'Preparación del espectáculo':'Preparación de la prueba'):state.day<24?'Ensayos del espectáculo':state.day<25?'Apertura del circuito de tablados':
    state.day<28?'Entre la primera y la segunda rueda':'Camino a la Liguilla'),
    eventName,daysUntil:nextEvent?nextEvent.day-state.day:0,phase,
    phaseLabel:phase==='carnival'?'Carnaval de verano':phase==='admission'?(state.admissionExempt?'Inscripción al concurso':'Admisión de noviembre'):'Armado y pretemporada',
    tabladosOpen:state.day>=TABLADOS_START_DAY};
}
export function getContestSummary(state: State): {
  admissionScore: number | null; contestTotal: number; contestAverage: number;
  roundsCompleted: number; liguillaQualified: boolean | null; rank: number | null; finalists: number;
} {
  const rounds = state.results.slice(1);
  const total = sumScores(rounds.map(result => result.score));
  const standings = contestStandings(state);
  const player = standings.find(row => row.isPlayer)!;
  const competitors = rounds.length === 3 ? standings.filter(row => row.qualified) : standings;
  return {
    admissionScore: state.admissionExempt ? null : state.results[0]?.score ?? null,
    contestTotal: total, contestAverage: rounds.length ? round(total / rounds.length) : 0,
    roundsCompleted: rounds.length,
    liguillaQualified: rounds.length >= 2 ? player.qualified : null,
    rank: rounds.length ? 1 + competitors.filter(row => row.total > total).length : null,
    finalists: rounds.length >= 2 ? standings.filter(row => row.qualified).length : 0,
  };
}

type Standing = { id: string; name: string; total: number; qualified: boolean; isPlayer: boolean };

function contestStandings(state: State): Standing[] {
  const rounds = state.results.slice(1).map(result => result.score);
  const field = [{ id: 'player', name: state.identity.name, scores: rounds, isPlayer: true },
    ...state.rivals.map(rival => ({ ...rival, isPlayer: false }))];
  // All tied at tenth place qualify, so a tied field can contain more than ten finalists.
  const cutoff = rounds.length >= 2
    ? field.map(row => sumScores(row.scores.slice(0, 2))).sort((a, b) => b - a)[9] : Infinity;
  return field.map(row => ({ id: row.id, name: row.name, total: sumScores(row.scores),
    qualified: sumScores(row.scores.slice(0, 2)) >= cutoff, isPlayer: row.isPlayer }));
}

/** Jurors' contest ballots remain sealed until the final fallos. */
export function getStandings(state: State): Standing[] {
  if (!state.fallosRevealed && (state.day !== EVENTS[3].day || state.status === 'playing')) return [];
  return contestStandings(state).sort((a, b) => Number(b.qualified) - Number(a.qualified) || b.total - a.total || a.name.localeCompare(b.name));
}

/** An eliminated group can wait for the public ballots without playing an invented third round. */
export function revealEliminatedFallos(state: State): State {
  if (state.status !== 'lost' || state.day !== EVENTS[2].day) return notice(state, 'Este epílogo corresponde a las murgas que no clasificaron a la Liguilla.');
  if (state.fallosRevealed) return notice(state, 'Las notas de tus dos actuaciones ya son públicas.');
  const next = copy(state);
  next.fallosRevealed = true;
  const summary = getContestSummary(next);
  log(next, `Noche de fallos: primera rueda ${next.results[1].score}, segunda rueda ${next.results[2].score}. Total de tus dos actuaciones: ${summary.contestTotal}. No disputaste la Liguilla.`);
  return next;
}



export interface DecisionOption {
  id: string; label: string; description: string; cost: number; morale: number; energy: number;
  enabled: boolean; reason: string;
}
export interface SeasonDecision {
  id: string; title: string; description: string; options: DecisionOption[];
}
type DecisionDefinition = {
  id: string; day: number; title: string; description: string;
  options: Omit<DecisionOption, 'enabled' | 'reason'>[];
};
/** Authored fictional situations: choices never model legal penalties or official judging rules. */
const DECISIONS: DecisionDefinition[] = [
  {id:'work-hours',day:7,title:'El ensayo y el trabajo',
    description:'Dos integrantes salen tarde del trabajo. El horario del grupo necesita un acuerdo.',
    options:[
      {id:'work-hours-shift',label:'Reorganizar el horario',description:'El grupo acompaña el cambio; coordinar lleva esfuerzo.',cost:0,morale:5,energy:-4},
      {id:'work-hours-transport',label:'Cubrir los traslados',description:'Un apoyo de transporte facilita llegar y descansar.',cost:12000,morale:7,energy:6},
    ]},
  {id:'couplet-debate',day:13,title:'Un cuplé divide al grupo',
    description:'Hay distintas miradas sobre un remate del texto. Hace falta resolver cómo seguir trabajando.',
    options:[
      {id:'couplet-debate-talk',label:'Conversarlo entre todos',description:'Una conversación larga refuerza la confianza y demanda energía.',cost:0,morale:6,energy:-6},
      {id:'couplet-debate-workshop',label:'Pagar una instancia de trabajo',description:'Una sesión facilitada con el equipo de textos ordena el intercambio.',cost:14000,morale:3,energy:4},
    ]},
  {id:'rainy-rehearsal',day:20,title:'Lluvia en el local',
    description:'Una lluvia fuerte complica el uso del espacio habitual. El grupo necesita una alternativa para reunirse.',
    options:[
      {id:'rainy-rehearsal-adapt',label:'Adaptar la reunión',description:'Trabajar a distancia evita gastos, aunque se extraña el encuentro.',cost:0,morale:-3,energy:-4},
      {id:'rainy-rehearsal-room',label:'Alquilar un local alternativo',description:'Un lugar seco y cercano mejora el ánimo y evita traslados difíciles.',cost:15000,morale:3,energy:4},
    ]},
  {id:'final-fitting',day:23,title:'La última prueba de escena',
    description:'Antes del circuito de tablados conviene revisar entradas, movimientos y comodidad del elenco.',
    options:[
      {id:'final-fitting-team',label:'Resolverlo con el equipo',description:'Un repaso colectivo cuida la caja y requiere un esfuerzo adicional.',cost:0,morale:3,energy:-5},
      {id:'final-fitting-support',label:'Sumar apoyo para los ajustes',description:'Apoyo logístico extra deja al elenco más descansado para el estreno.',cost:18000,morale:5,energy:5},
    ]},
  {id:'carnival-fatigue',day:27,title:'Cuidarnos en carnaval',
    description:'El ritmo de febrero exige conversar sobre descanso y bienestar antes de la segunda rueda.',
    options:[
      {id:'carnival-fatigue-break',label:'Reservar un descanso común',description:'Bajar la intensidad ayuda al cuerpo, aunque parte del grupo quería seguir.',cost:0,morale:-2,energy:10},
      {id:'carnival-fatigue-care',label:'Organizar comida y recuperación',description:'Una jornada de cuidado compartido mejora el ánimo y la recuperación.',cost:8000,morale:6,energy:8},
    ]},
  {id:'last-agreement',day:30,title:'El último acuerdo',
    description:'Antes de la Liguilla, el grupo quiere cerrar el año sintiéndose escuchado.',
    options:[
      {id:'last-agreement-circle',label:'Hacer una ronda de palabra',description:'Una conversación extensa refuerza la confianza del elenco.',cost:0,morale:7,energy:-4},
      {id:'last-agreement-space',label:'Preparar un encuentro cómodo',description:'Espacio y logística para cerrar el trabajo con calma.',cost:10000,morale:4,energy:6},
    ]},
];
export const DECISION_DAYS: readonly number[] = DECISIONS.map(decision => decision.day);

function dueDecision(state: State): DecisionDefinition | undefined {
  if (state.status !== 'playing' || !state.productionStarted) return undefined;
  return DECISIONS.find(decision => decision.day === state.day && !state.resolvedDecisions.includes(decision.id));
}
function advanceDay(state: State): void {
  state.day++;
  state.contactsToday = 0;
  state.pendingDecision = dueDecision(state)?.id ?? null;
}
export function getPendingDecision(state: State): SeasonDecision | null {
  const decision = dueDecision(state);
  if (!decision) return null;
  return {id:decision.id,title:decision.title,description:decision.description,
    options:decision.options.map(option=>({...option,enabled:state.money>=option.cost,
      reason:state.money>=option.cost?'':`Faltan ${option.cost-state.money} UYU para esta alternativa.`}))};
}
export function resolveDecision(state: State, optionId: string): State {
  const decision = getPendingDecision(state);
  if (!decision) return notice(state, 'No hay una decisión pendiente en esta jornada.');
  const option = decision.options.find(item=>item.id===optionId);
  if (!option) return notice(state, 'Esa alternativa no corresponde a la decisión actual.');
  if (!option.enabled) return notice(state, option.reason);
  const next = copy(state);
  next.money -= option.cost; next.accounts.communityCosts += option.cost;
  next.members.forEach(member=>{
    member.morale=round(clamp(member.morale+option.morale));
    member.energy=round(clamp(member.energy+option.energy));
  });
  next.resolvedDecisions.push(decision.id);
  next.decisionHistory.push({id:decision.id,optionId:option.id,day:state.day});
  next.pendingDecision=null;
  log(next,`${decision.title}: ${option.label}. Costo ${option.cost} UYU; ánimo ${option.morale>=0?'+':''}${option.morale}, energía ${option.energy>=0?'+':''}${option.energy}. La jornada sigue disponible.`);
  return next;
}
export function getDecisionHistory(state: State): {id:string;title:string;choice:string;day:number}[] {
  return state.decisionHistory.map(record=>{
    const decision=DECISIONS.find(item=>item.id===record.id)!;
    return {id:record.id,title:decision.title,
      choice:record.optionId===null?'Anterior a esta actualización':decision.options.find(option=>option.id===record.optionId)!.label,
      day:record.day};
  });
}
export function getCommunitySummary(state: State): {
  morale:number;contactsRemaining:number;fundraisersUsed:number;fundraisersLimit:number;
} {
  return {morale:round(average(state.members.map(member=>member.morale))),
    contactsRemaining:getRecruitmentAvailability(state).enabled?Math.max(0,CONTACTS_PER_DAY-state.contactsToday):0,
    fundraisersUsed:state.fundraisersUsed,fundraisersLimit:FUNDRAISER_LIMIT};
}
export function getContactAvailability(state: State, id: string): {enabled:boolean;reason:string} {
  const market=getRecruitmentAvailability(state);
  if (!market.enabled) return market;
  const candidate=state.candidates.find(member=>member.id===id)??state.members.find(member=>member.id===id&&state.pendingRenewals.includes(id));
  if (!candidate) return {enabled:false,reason:'Podés contactar personas del mercado o integrantes con un contrato pendiente.'};
  if (state.contactsToday>=CONTACTS_PER_DAY) return {enabled:false,reason:'Ya usaste las tres conversaciones de esta jornada. Se renuevan al avanzar el calendario.'};
  if (candidate.lastContactDay>=0 && state.day-candidate.lastContactDay<CONTACT_COOLDOWN)
    return {enabled:false,reason:'Dale tiempo a la conversación: podés volver a contactar a esta persona después de dos jornadas.'};
  if (candidate.rapport>=100) return {enabled:false,reason:'El vínculo ya está afianzado. Podés presentar una oferta.'};
  return {enabled:true,reason:'Conversación gratuita sobre el proyecto; mejora el vínculo, sin revelar la habilidad.'};
}
export function contactMember(state: State, id: string): State {
  const availability=getContactAvailability(state,id);
  if (!availability.enabled) return notice(state,availability.reason);
  const next=copy(state), candidate=[...next.candidates,...next.members].find(member=>member.id===id)!;
  candidate.rapport=clamp(candidate.rapport+15); candidate.lastContactDay=state.day;
  next.contactsToday++;
  log(next,`Conversaste con ${candidate.name} sobre la propuesta artística y la forma de trabajar. El vínculo creció; todavía puede exigir reputación u honorarios acordes.`);
  return next;
}
/** Compatibility name: the same contact rules apply to the market and pending renewals. */
export function contactCandidate(state:State,id:string):State { return contactMember(state,id); }

export function getEconomySummary(state:State) {
  const shows=ECONOMY_COSTS.showsPerAction, transport=ECONOMY_COSTS.transport*shows;
  const memberFees=state.members.length*ECONOMY_COSTS.cachePerMember*shows;
  const show=(grossPerShow:number)=>({shows,gross:grossPerShow*shows,transport,memberFees,net:grossPerShow*shows-transport-memberFees});
  const fundraiserGross=ECONOMY_COSTS.fundraiserBaseGross+Math.min(20000,state.fans*80);
  return {...ECONOMY_COSTS,popular:show(ECONOMY_COSTS.popularGross),commercial:show(ECONOMY_COSTS.commercialGross),
    fundraiser:{gross:fundraiserGross,cost:ECONOMY_COSTS.fundraiserCost,net:fundraiserGross-ECONOMY_COSTS.fundraiserCost}};
}
export function getActionAvailability(state:State,action:Action):{enabled:boolean;reason:string} {
  if(state.status!=='playing') return {enabled:false,reason:'La temporada terminó. Continuá a la siguiente para conservar las carreras del elenco.'};
  if(state.pendingRenewals.length) return {enabled:false,reason:'Resolvé los contratos pendientes del elenco antes de avanzar el calendario.'};
  if(!state.productionStarted) return {enabled:false,reason:'Contratá los cinco puestos técnicos e iniciá la producción antes de ensayar.'};
  if(!['rehearse','popular','commercial','rest','compete','fundraiser','community'].includes(action)) return {enabled:false,reason:'Acción desconocida.'};
  if(getPendingDecision(state)) return {enabled:false,reason:'Resolvé la decisión del grupo antes de avanzar esta jornada.'};
  const event=EVENTS.find(e=>e.day===state.day);
  if(event && action!=='compete') return {enabled:false,reason:`Hoy toca ${getCalendar(state).eventName}. Presentate para continuar.`};
  if(action==='compete' && !event) return {enabled:false,reason:'Hoy no hay una presentación oficial.'};
  if(action==='fundraiser') {
    if(state.day>=TABLADOS_START_DAY) return {enabled:false,reason:'Los festivales solidarios se organizan antes del circuito de carnaval.'};
    if(state.day>=16 && state.day<=EVENTS[0].day) return {enabled:false,reason:'Estas jornadas de noviembre se reservan a la preparación y admisión o inscripción al concurso.'};
    if(state.fundraisersUsed>=FUNDRAISER_LIMIT) return {enabled:false,reason:'El barrio ya acompañó tres festivales esta temporada. Cuidá ese apoyo.'};
    if(state.money<ECONOMY_COSTS.fundraiserCost) return {enabled:false,reason:`El festival requiere ${ECONOMY_COSTS.fundraiserCost} UYU de organización antes de recaudar.`};
  }
  if(action==='community' && state.money<ECONOMY_COSTS.community) return {enabled:false,reason:`El encuentro necesita ${ECONOMY_COSTS.community} UYU para comida y materiales.`};
  if(action==='rehearse' && state.day<REHEARSALS_START_DAY) return {enabled:false,reason:'Los ensayos de esta planificación comienzan en julio. Abril, mayo y junio se dedican al armado y las contrataciones.'};
  if((action==='popular'||action==='commercial') && state.day<TABLADOS_START_DAY) return {enabled:false,reason:'El circuito de tablados abre desde fines de enero. Ahora toca armar y ensayar.'};
  if(action==='rehearse' && state.money<ECONOMY_COSTS.rehearsal) return {enabled:false,reason:`El ensayo requiere $${ECONOMY_COSTS.rehearsal} UYU para local, apoyo y logística.`};
  if((action==='popular'||action==='commercial') && state.money+getEconomySummary(state)[action].net<0)
    return {enabled:false,reason:'No hay caja para cubrir la diferencia entre el caché del circuito y sus gastos.'};
  return {enabled:true,reason:''};
}
export function getUpgradeCost(state:State,upgrade:Upgrade):number {
  const bases:Record<Upgrade,number>={voices:16000,lyrics:15000,costumes:40000,staging:11000};
  const increments:Record<Upgrade,number>={voices:9000,lyrics:9500,costumes:20000,staging:5000};
  return bases[upgrade]+state.upgrades[upgrade]*increments[upgrade];
}
export function getActionPreview(state:State,action:Action):{money:number;energy:number;label:string} {
  const availability=getActionAvailability(state,action);
  if(!availability.enabled) return {money:0,energy:0,label:availability.reason};
  const energy=round(average(state.members.map(m=>clamp(m.energy+energyChange(m,action))-m.energy)));
  if(action==='fundraiser') {
    const festival=getEconomySummary(state).fundraiser;
    return {money:festival.net,energy,label:`Festival barrial: recaudación ${festival.gross}; organización ${festival.cost} UYU. Ánimo +4, seguidores +35. Usa uno de los tres festivales del año.`};
  }
  if(action==='community') return {money:-ECONOMY_COSTS.community,energy,label:'Encuentro del elenco: hasta +10 de ánimo, +8 de energía, +3 de lealtad y +5 de vínculo. Comida y materiales incluidos.'};
  if(action==='rehearse') return {money:-ECONOMY_COSTS.rehearsal,energy,label:`Ensayo ${state.show.focus==='general'?'general: hasta +12 de interpretación por sección':`${SHOW_SECTIONS.find(section=>section.id===state.show.focus)!.name}: hasta +36 de interpretación`}. El avance depende del texto y los arreglos; práctica, experiencia y logística incluidos.`};
  if(action==='rest') return {money:0,energy,label:state.day<REHEARSALS_START_DAY?'Avanzar el armado y la planificación':'Descansar y cuidar la voz'};
  if(action==='popular'||action==='commercial') {
    const e=getEconomySummary(state)[action];
    return {money:e.net,energy,label:`Dos actuaciones: ingreso $${e.gross}; cachés $${e.memberFees}; ómnibus $${e.transport} UYU. ${action==='popular'?'+25 seguidores':'+12 seguidores'}.`};
  }
  const event=EVENTS.find(e=>e.day===state.day)!;
  if(event.day===EVENTS[0].day&&state.admissionExempt) return {money:0,energy:0,label:'Inscripción directa por haber disputado la Liguilla anterior. No hay prueba, puntaje ni desgaste.'};
  return {money:0,energy,label:event.day===EVENTS[0].day?`Admisión: objetivo del juego ${event.threshold}; no suma al concurso`:
    event.day===EVENTS[1].day?'Primera rueda: suma al concurso y no elimina':
    event.day===EVENTS[2].day?'Clasifican las diez mejores sumas, incluidos empates':
    `Fallos: suma de las tres ruedas. Premio ficticio condicionado al primer puesto: $${event.prize} UYU.`};
}
export function performAction(state: State, action: Action): State {
  const availability = getActionAvailability(state, action);
  if (!availability.enabled) return notice(state, availability.reason);
  const event = EVENTS.find(e => e.day === state.day);
  const preview = getActionPreview(state, action);
  const next = copy(state);
  if (event) {
    if(event.day===EVENTS[0].day&&state.admissionExempt) {
      next.results.push({name:event.name,score:0,passed:true});
      advanceDay(next);
      log(next,'Inscripción directa confirmada por la Liguilla anterior. No rendiste admisión y no se asignó un puntaje; este registro administrativo no integra el concurso.');
      return next;
    }
    const score = getStats(state).projectedScore;
    // Append a provisional result to calculate the cumulative ranking with this round.
    next.results.push({ name: event.name, score, passed: true });
    if (event.day !== EVENTS[0].day) {
      const roundIndex = next.results.length - 2;
      const finalists = event.day === EVENTS[3].day ? new Set(contestStandings(state).filter(row => row.qualified).map(row => row.id)) : null;
      next.rivals.forEach((rival, index) => {
        if (finalists && !finalists.has(rival.id)) return;
        // Fictional field with consistent strengths, modest seasonal growth and seeded variation.
        rival.scores.push(round(clamp(51 + index * .8 + roundIndex * 3 + (random(next) - .5) * 4, 40, 100)));
      });
    }
    const summary = getContestSummary(next);
    const passed = event.day === EVENTS[0].day ? score >= event.threshold : event.day === EVENTS[1].day ? true : event.day === EVENTS[2].day ? summary.liguillaQualified === true : summary.rank === 1;
    next.results[next.results.length - 1].passed = passed;
    if (passed) {
      next.money += event.prize;
      next.accounts.prizes += event.prize;
      next.fans += event.fans;
    }
    next.members.forEach(m => { m.energy = round(clamp(m.energy + energyChange(m, 'compete'))); m.experience = round(clamp(m.experience + 1)); m.participation++; m.morale=round(clamp(m.morale+(passed?4:-6))); if (m.participation >= 6) m.scouting = 2; });
    next.reputation = clamp(next.reputation + (passed ? (event.day === EVENTS[3].day ? 12 : 3) : -2));
    if (!passed) {
      next.status = 'lost';
      const resultMessage = event.day === EVENTS[0].day ? `Admisión: ${score} puntos. No alcanzaste el objetivo ${event.threshold} del prototipo.`
        : event.day === EVENTS[2].day ? 'No clasificaste a la Liguilla. Se clasifican las diez primeras por la suma de ambas ruedas, incluidos los empates en el último puesto. Los puntajes permanecen reservados hasta los Fallos.'
        : `Fallos: puesto ${summary.rank}, con ${summary.contestTotal} puntos acumulados en las tres ruedas. La campeona obtuvo la mayor suma del concurso.`;
      log(next, resultMessage);
      return next;
    }
    if (event.day === EVENTS[3].day) {
      next.status = 'won';
      log(next, `¡Campeones! ${summary.contestTotal} puntos acumulados en las tres ruedas. Primer puesto por la suma del concurso. Premio del juego: $${event.prize}.`);
      return next;
    }
    log(next, event.day === EVENTS[0].day ? `¡Admisión superada! Evaluación del juego: ${score}. Este resultado no suma al Concurso Oficial.`
      : event.day === EVENTS[1].day ? 'Primera rueda presentada. Todos los conjuntos continúan a la segunda rueda; los puntajes permanecen reservados hasta los Fallos.'
      : `¡Clasificaste a la Liguilla! Pasan ${summary.finalists} murgas por la suma de las dos ruedas. Los puntajes permanecen reservados hasta los Fallos.`);
  } else {
    next.money += preview.money;
    if (action === 'rehearse') {
      next.accounts.rehearsals += ECONOMY_COSTS.rehearsal;
      rehearseShow(next.show);
    }
    if(action==='fundraiser') {
      next.fundraisersUsed++;
      next.accounts.communityIncome+=getEconomySummary(state).fundraiser.gross;
      next.accounts.communityCosts+=ECONOMY_COSTS.fundraiserCost;
      next.fans+=35;
    }
    if(action==='community') next.accounts.communityCosts+=ECONOMY_COSTS.community;
    if (action === 'popular' || action === 'commercial') {
      const economy=getEconomySummary(state);
      next.accounts.performanceIncome += action === 'popular' ? economy.popular.gross : economy.commercial.gross;
      next.accounts.performanceCosts += economy.popular.transport + economy.popular.memberFees;
    }
    next.members.forEach(member => {
      member.energy = round(clamp(member.energy + energyChange(member, action)));
      if (action === 'rehearse') {
        if (member.role === 'chorister') member.voice = round(clamp(member.voice + .8));
        else member.skill = round(clamp(member.skill + (member.role === 'director' ? .5 : .7)));
      }
      const moraleDelta=action==='rehearse'?-1:action==='commercial'?-4:action==='popular'?2:action==='fundraiser'?4:action==='community'?10:2;
      member.morale=round(clamp(member.morale+moraleDelta));
      if(action==='community') {member.loyalty=clamp(member.loyalty+3);member.rapport=clamp(member.rapport+5);}
      if (action === 'rehearse' || action === 'popular' || action === 'commercial') { member.experience=round(clamp(member.experience+(action==='rehearse'?.4:.6))); member.participation++; if(member.participation>=6) member.scouting=2; }
    });
    if (action === 'popular') next.fans += 25;
    if (action === 'commercial') next.fans += 12;
    const messages: Record<Exclude<Action, 'compete'>, string> = {
      fundraiser:`Festival solidario del barrio: recaudación ${getEconomySummary(state).fundraiser.gross}, gastos ${ECONOMY_COSTS.fundraiserCost} UYU. El apoyo suma caja, ánimo y seguidores; no fue un tablado del circuito.`,
      community:'El elenco compartió un encuentro: mejoraron el ánimo, la lealtad y los vínculos. Comida y materiales pagados; sin práctica artística adicional.',
      rehearse: 'Ensayo completado: el coro, la batería y la dirección ganan práctica. La experiencia se conserva entre temporadas.',
      popular: `Circuito popular de dos actuaciones. Saldo ${preview.money} UYU después de cachés y transporte; +25 seguidores.`,
      commercial: `Circuito comercial de dos actuaciones: saldo ${preview.money} UYU después de cachés y transporte. La voz sintió el esfuerzo.`,
      rest: state.day<REHEARSALS_START_DAY ? 'Avanzó la planificación del año. El elenco sigue disponible para el armado; los ensayos comienzan en julio.' : 'Descanso completo: el coro recuperó hasta 26 de energía, la batería 23 y la dirección 22.',
    };
    log(next, messages[action as Exclude<Action, 'compete'>]);
  }
  advanceDay(next);
  return next;
}


export function getRecruitmentAvailability(state:State):{enabled:boolean;reason:string} {
  if(state.status!=='playing') return {enabled:false,reason:'La temporada terminó; continuá al próximo armado para negociar.'};
  if(state.day>=RECRUITMENT_END_DAY) return {enabled:false,reason:'El elenco se cierra al terminar septiembre. Volverá a abrirse en abril de la siguiente temporada.'};
  return {enabled:true,reason:'Mercado abierto durante el armado de abril a septiembre.'};
}
export function getRecruitmentReplacement(state:State,id:string,replaceId?:string):Member|null {
  const candidate=state.candidates.find(m=>m.id===id);
  if(!candidate) return null;
  if(replaceId) return state.members.find(m=>m.id===replaceId&&m.role===candidate.role)??null;
  // Never leak hidden skill through an automatically recommended replacement.
  return state.members.find(m=>m.role===candidate.role)??null;
}
const OFFER_MULTIPLIERS:Record<RecruitmentOffer,number>={standard:1,generous:1.2,premium:1.45};
const OFFERS:RecruitmentOffer[]=['standard','generous','premium'];
const offerCommitment=(offer:RecruitmentOffer)=>offer==='standard'?0:offer==='generous'?8:16;
function renewalFee(referenceCost:number,offer:RecruitmentOffer='standard'):number {
  return Math.ceil(referenceCost*.15*OFFER_MULTIPLIERS[offer]/100)*100;
}
function recruitmentFee(member:Member,offer:RecruitmentOffer):number {return Math.ceil(member.cost*OFFER_MULTIPLIERS[offer]/100)*100;}
function willingToJoin(state:State,member:Member,offer:RecruitmentOffer):boolean {
  return state.reputation+offerCommitment(offer)+Math.min(10,member.rapport*.12)>=member.minReputation+(member.loyalty>=75?3:0);
}
function willingToRenew(state:State,member:Member,offer:RecruitmentOffer):boolean {
  const relationship=Math.min(10,member.rapport*.12),continuity=Math.max(0,member.loyalty-50)*.2;
  const required=member.minReputation+Math.max(0,60-member.loyalty)*.2+Math.max(0,70-member.morale)*.15;
  return state.reputation+offerCommitment(offer)+relationship+continuity>=required;
}
export interface ContractPlanStep {memberId:string;kind:'renewal'|'replacement';candidateId:string|null;offer:RecruitmentOffer;fee:number;}
/** A conservative feasible route, based only on public contracts and relationships, not artistic ability. */
export function getContractReserve(state:State):{possible:boolean;cost:number;reason:string;plan:ContractPlanStep[]} {
  if(!state.pendingRenewals.length) return {possible:true,cost:0,reason:'El elenco ya tiene sus contratos confirmados.',plan:[]};
  const market=state.candidates.map(member=>{
    const offer=OFFERS.find(offer=>willingToJoin(state,member,offer));
    return offer?{member,offer,fee:recruitmentFee(member,offer)}:null;
  }).filter((option):option is NonNullable<typeof option>=>option!==null).sort((a,b)=>a.fee-b.fee||a.member.id.localeCompare(b.member.id));
  const pending=state.members.filter(member=>state.pendingRenewals.includes(member.id)).map(member=>{
    const offer=OFFERS.find(offer=>willingToRenew(state,member,offer));
    return {member,offer,fee:offer?renewalFee(member.cost,offer):Infinity};
  }).sort((a,b)=>b.fee-a.fee||a.member.id.localeCompare(b.member.id));
  const used=new Set<string>(),plan:ContractPlanStep[]=[];
  // Resolve mandatory replacements first; expensive renewals then get first choice of cheaper alternatives.
  for(const current of pending) {
    const alternative=market.find(option=>option.member.role===current.member.role&&!used.has(option.member.id));
    if(current.offer&&(!alternative||current.fee<=alternative.fee))
      plan.push({memberId:current.member.id,kind:'renewal',candidateId:null,offer:current.offer,fee:current.fee});
    else if(alternative) {
      used.add(alternative.member.id);
      plan.push({memberId:current.member.id,kind:'replacement',candidateId:alternative.member.id,offer:alternative.offer,fee:alternative.fee});
    } else return {possible:false,cost:0,reason:'No hay todavía una oferta aceptable o un reemplazo disponible para cada contrato pendiente. Conversá o revisá las alternativas antes de gastar.',plan:[]};
  }
  const cost=plan.reduce((sum,step)=>sum+step.fee,0);
  return {possible:true,cost,reason:`Reservá $${cost} UYU para una ruta de acuerdos y reemplazos aceptables. No se cobra hasta confirmar cada contrato.`,plan};
}
function contractSpendingReason(before:State,after:State):string {
  if(!before.pendingRenewals.length||after.money>=before.money) return '';
  const reserve=getContractReserve(after);
  if(!reserve.possible) return reserve.reason;
  return after.money<reserve.cost?`Este gasto dejaría $${after.money} UYU, pero necesitás reservar $${reserve.cost} UYU para resolver los contratos restantes. Elegí una alternativa más económica o recuperá gastos reversibles.`:'';
}
function afterRecruitment(state:State,incoming:Member,replaced:Member,fee:number):State {
  return {...state,money:state.money-fee,pendingRenewals:state.pendingRenewals.filter(id=>id!==replaced.id),
    members:state.members.map(member=>member.id===replaced.id?incoming:member),
    candidates:state.candidates.map(member=>member.id===incoming.id?replaced:member)};
}
export function getRenewalQuote(state:State,id:string,offer:RecruitmentOffer='standard'):{fee:number;accepted:boolean;interest:string;reason:string} {
  const member=state.members.find(member=>member.id===id);
  if(!member||!Object.hasOwn(OFFER_MULTIPLIERS,offer))
    return {fee:0,accepted:false,interest:'No disponible',reason:'Componente u oferta desconocidos.'};
  if(!state.pendingRenewals.includes(id))
    return {fee:0,accepted:false,interest:'Contrato confirmado',reason:'Este integrante ya tiene un acuerdo para la temporada.'};
  const fee=renewalFee(member.cost,offer);
  if(state.status!=='playing'||state.day!==0||state.productionStarted)
    return {fee,accepted:false,interest:'Fuera del armado',reason:'Las renovaciones se resuelven al comenzar abril, antes de iniciar la producción.'};
  if(!willingToRenew(state,member,offer))
    return {fee,accepted:false,interest:'Pide mejores condiciones',reason:'La reputación del proyecto, su trayectoria, el vínculo, la lealtad y el ánimo influyen en su continuidad. Podés conversar, mejorar la oferta o buscar un reemplazo.'};
  if(state.money<fee)
    return {fee,accepted:false,interest:'Interés, pero falta presupuesto',reason:'Quiere continuar, pero la oferta supera la caja disponible.'};
  const reserveReason=contractSpendingReason(state,{...state,money:state.money-fee,pendingRenewals:state.pendingRenewals.filter(pending=>pending!==id)});
  if(reserveReason) return {fee,accepted:false,interest:'Hay que reservar presupuesto',reason:reserveReason};
  return {fee,accepted:true,interest:'Aceptaría renovar',reason:'Acuerdo por esta temporada. El honorario de renovación y los cachés por actuación se pagan por separado.'};
}
export function getRenewalSummary(state:State):{pending:number;signed:number;total:number;estimatedCost:number} {
  const pending=state.pendingRenewals.length;
  return {pending,signed:state.members.length-pending,total:state.members.length,
    estimatedCost:state.members.filter(member=>state.pendingRenewals.includes(member.id)).reduce((sum,member)=>sum+renewalFee(member.cost),0)};
}
export function renewMember(state:State,id:string,offer:RecruitmentOffer='standard'):State {
  const quote=getRenewalQuote(state,id,offer);
  if(!quote.accepted) return notice(state,quote.reason);
  const next=copy(state);
  next.money-=quote.fee;next.accounts.recruitment+=quote.fee;
  next.pendingRenewals=next.pendingRenewals.filter(pending=>pending!==id);
  log(next,`${next.members.find(member=>member.id===id)!.name} renovó por $${quote.fee} UYU con oferta ${offer==='standard'?'estándar':offer==='generous'?'generosa':'preferencial'}. Quedan ${next.pendingRenewals.length} contratos pendientes.`);
  return next;
}
export function renewAllWilling(state:State):State {
  if(!state.pendingRenewals.length) return notice(state,'Los contratos del elenco ya están confirmados.');
  const next=copy(state);
  let signed=0,totalPaid=0;
  // Stable roster order and a fresh quote each time prevent overspending in a partial batch.
  for(const member of next.members) {
    if(!next.pendingRenewals.includes(member.id)) continue;
    const quote=getRenewalQuote(next,member.id);
    if(!quote.accepted) continue;
    next.money-=quote.fee;next.accounts.recruitment+=quote.fee;
    next.pendingRenewals=next.pendingRenewals.filter(id=>id!==member.id);signed++;totalPaid+=quote.fee;
  }
  if(!signed) return notice(state,'No se cerraron acuerdos: revisá las condiciones solicitadas y la caja disponible.');
  log(next,`${signed} contrato(s) renovados con oferta estándar por $${totalPaid} UYU. Quedan ${next.pendingRenewals.length} pendientes; no se cobró por quienes rechazaron o no pudieron pagarse.`);
  return next;
}
export function getRecruitmentQuote(state:State,id:string,offer:RecruitmentOffer='standard',replaceId?:string):{
  fee:number;interest:string;reason:string;accepted:boolean;
} {
  const candidate=state.candidates.find(m=>m.id===id);
  if(!candidate || !Object.hasOwn(OFFER_MULTIPLIERS,offer)) return {fee:0,interest:'No disponible',reason:'Perfil u oferta desconocidos.',accepted:false};
  const fee=recruitmentFee(candidate,offer);
  const market=getRecruitmentAvailability(state);
  if(!market.enabled) return {fee,interest:'Mercado cerrado',reason:market.reason,accepted:false};
  if(!willingToJoin(state,candidate,offer)) return {fee,interest:'Rechazaría la oferta',reason:'Busca una murga con más reputación, mayor confianza en el proyecto o un compromiso económico mayor. Su fama no garantiza su talento.',accepted:false};
  if(state.money<fee) return {fee,interest:'Interés, pero falta presupuesto',reason:'La oferta supera la caja disponible.',accepted:false};
  const replaced=getRecruitmentReplacement(state,id,replaceId);
  if(!replaced) return {fee,interest:'Reemplazo inválido',reason:'La contratación debe reemplazar a un componente de la misma función.',accepted:false};
  const reserveReason=contractSpendingReason(state,afterRecruitment(state,candidate,replaced,fee));
  if(reserveReason) return {fee,interest:'Hay que reservar presupuesto',reason:reserveReason,accepted:false};
  return {fee,interest:'Aceptaría la oferta',reason:'Acuerdo de incorporación por esta temporada; cachés por actuación aparte.',accepted:true};
}
export function getMemberReport(_state:State,member:Member):{label:string;detail:string} {
  if(member.scouting===0) return {label:'Sin audición',detail:'Solo conocés su trayectoria pública. La fama y el precio no revelan su capacidad artística.'};
  const ability=member.role==='chorister'?member.voice:member.skill;
  const label=ability<48?'Necesita trabajo':ability<62?'Base prometedora':ability<77?'Buen oficio':'Gran potencial';
  return {label,detail:member.scouting===1?'Impresión cualitativa de la audición; el trabajo en grupo y el cansancio todavía pueden cambiar el resultado.':
    'Informe del trabajo compartido: evaluado en ensayos y actuaciones. La experiencia permanece de una temporada a otra.'};
}
export function scoutMember(state:State,id:string):State {
  const available=getRecruitmentAvailability(state);
  if(!available.enabled) return notice(state,available.reason);
  const member=[...state.members,...state.candidates].find(m=>m.id===id);
  if(!member) return notice(state,'Ese componente no está disponible para una audición.');
  if(member.scouting>0) return notice(state,'Ya tenés un informe de este componente; otra audición no revela un número exacto.');
  if(state.money<AUDITION_COST) return notice(state,`La audición cuesta $${AUDITION_COST} UYU.`);
  const reserveReason=contractSpendingReason(state,{...state,money:state.money-AUDITION_COST});
  if(reserveReason) return notice(state,reserveReason);
  const next=copy(state);next.money-=AUDITION_COST;next.accounts.auditions+=AUDITION_COST;
  const target=[...next.members,...next.candidates].find(m=>m.id===id)!;target.scouting=1;
  log(next,`Audición de ${target.name}: ${getMemberReport(next,target).label}. Costo $${AUDITION_COST} UYU; no avanza el calendario.`);
  return next;
}
export function recruit(state:State,id:string,replaceId?:string,offer:RecruitmentOffer='standard'):State {
  const quote=getRecruitmentQuote(state,id,offer,replaceId);
  if(!quote.accepted) return notice(state,quote.reason);
  const incoming=state.candidates.find(m=>m.id===id)!;
  const replaced=getRecruitmentReplacement(state,id,replaceId);
  if(!replaced) return notice(state,'La contratación debe reemplazar a un componente de la misma función.');
  const next=copy(state);next.money-=quote.fee;next.accounts.recruitment+=quote.fee;
  next.members=next.members.map(m=>m.id===replaced.id?{...incoming,assignedCord:replaced.assignedCord,energy:100,participation:0}:m);
  // Released components remain in the persistent market with their actual career.
  next.candidates=next.candidates.map(m=>m.id===id?{...replaced,assignedCord:replaced.cord,participation:0,energy:100}:m);
  next.pendingRenewals=next.pendingRenewals.filter(id=>id!==replaced.id);
  log(next,`${incoming.name} aceptó la oferta ${offer==='standard'?'estándar':offer==='generous'?'generosa':'preferencial'} por $${quote.fee} UYU en lugar de ${replaced.name}. Su carrera continúa; no hay reembolso de contratos artísticos.`);
  return next;
}
export function assignCord(state: State, id: string, cord: Cord): State {
  if (state.status !== 'playing') return notice(state, 'La temporada ya terminó.');
  if (!state.productionStarted) return notice(state, 'Primero confirmá el equipo técnico e iniciá la producción.');
  if (!CORDS.includes(cord) || !state.members.some(m => m.id === id && m.role === 'chorister')) return notice(state, 'Las cuerdas se asignan únicamente a integrantes del coro.');
  const next = copy(state);
  const member = next.members.find(m => m.id === id)!;
  member.assignedCord = cord;
  log(next, `${member.nickname} canta en ${cord}. La armonía combina afinidad y balance de las cinco cuerdas.`);
  return next;
}

export function buyUpgrade(state: State, upgrade: Upgrade): State {
  if (state.status !== 'playing') return notice(state, 'La temporada ya terminó.');
  if (!state.productionStarted) return notice(state, 'Primero confirmá el equipo técnico e iniciá la producción.');
  if (!UPGRADE_KEYS.includes(upgrade)) return notice(state, 'Mejora desconocida.');
  if (state.upgrades[upgrade] >= MAX_UPGRADE) return notice(state, 'Esta mejora ya está al máximo.');
  const cost = getUpgradeCost(state, upgrade);
  if (state.money < cost) return notice(state, 'No alcanza el dinero para esa mejora.');
  const next = copy(state);
  next.money -= cost;
  next.upgrades[upgrade]++;
  next.accounts.upgrades += cost;
  log(next, `${UPGRADE_LABELS[upgrade]} sube a nivel ${next.upgrades[upgrade]}. Inversión: $${cost}.`);
  return next;
}

export function buyLicense(state: State): State {
  if (state.status !== 'playing') return notice(state, 'La temporada ya terminó.');
  if (!state.productionStarted) return notice(state, 'Primero confirmá el equipo técnico e iniciá la producción.');
  if (state.licensed) return notice(state, 'Ya preparaste la declaración del repertorio.');
  const next = copy(state);
  next.licensed = true;
  log(next, 'Declaración de repertorio preparada como tarea de gestión del juego. No equivale a una licencia ni a una habilitación real.');
  return next;
}


export function refreshCandidates(state:State):State {
  const availability=getRecruitmentAvailability(state);
  if(!availability.enabled) return notice(state,availability.reason);
  return notice(state,'El directorio ya incluye 120 componentes ficticios. Las personas y sus carreras son persistentes; actualizar no cambia su talento ni sortea nombres nuevos.');
}
export function getSeasonRenewalCost(state:State):number {
  if(state.status==='playing') return getRenewalSummary(state).estimatedCost;
  return state.members.reduce((sum,member)=>sum+renewalFee(nextReferenceCost(state,member)),0);
}
function nextReferenceCost(state:State,member:Member):number {
  const experience=round(clamp(member.experience+Math.min(4,member.participation*.15)));
  const fame=clamp(member.fame+(state.status==='won'?8:state.results.length>=3?3:1));
  return Math.round((18000+fame*850+experience*200)/500)*500;
}
export function nextSeason(state:State):State {
  if(state.status==='playing') return notice(state,'Primero terminá la participación de esta temporada.');
  if(state.season>=10000) return notice(state,'La campaña alcanzó el límite de temporadas de esta versión. Su archivo permanece disponible.');
  const next=copy(state);
  next.admissionExempt=getContestSummary(state).liguillaQualified===true;
  next.season++;next.day=0;next.status='playing';next.productionStarted=false;next.fallosRevealed=false;
  next.contactsToday=0;next.fundraisersUsed=0;next.pendingDecision=null;next.resolvedDecisions=[];next.decisionHistory=[];
  next.creativeTeam=emptyTeam();next.creativeFees=emptyFees();next.costumeProposalId=null;
  next.show=emptyShow();
  next.upgrades={voices:0,lyrics:0,costumes:0,staging:0};next.licensed=false;next.results=[];
  next.rivals.forEach(r=>{r.scores=[];});
  archiveFinishedSeason(next,state);
  next.money+=SEASON_FINANCING;next.accounts=emptyAccounts(next.money);
  next.pendingRenewals=next.members.map(member=>member.id);
  for(const member of next.members) {
    member.experience=round(clamp(member.experience+Math.min(4,member.participation*.15)));
    member.seasons++;member.age++;member.loyalty=clamp(member.loyalty+(member.participation?4:0));
    member.fame=clamp(member.fame+(state.status==='won'?8:state.results.length>=3?3:1));member.rarity=fameRarity(member.fame);
    member.cost=Math.round((18000+member.fame*850+member.experience*200)/500)*500;
    member.minReputation=Math.max(0,Math.round(member.fame*.65-8));
    member.energy=100;member.participation=0;member.lastContactDay=-1;member.morale=round((member.morale+70)/2);
  }
  for(const member of next.candidates) {
    member.seasons++;member.age++;member.experience=round(clamp(member.experience+1));
    member.fame=clamp(member.fame+Math.floor(random(next)*5)-2);member.rarity=fameRarity(member.fame);
    member.cost=Math.round((18000+member.fame*850+member.experience*200)/500)*500;
    member.minReputation=Math.max(0,Math.round(member.fame*.65-8));member.energy=100;member.participation=0;member.lastContactDay=-1;member.morale=round((member.morale+70)/2);
  }
  log(next,`Nueva temporada: abril. Conservás las trayectorias, la reputación y $${state.money} UYU de remanente. Financiación ficticia: $${SEASON_FINANCING} UYU. Hay ${next.pendingRenewals.length} contratos pendientes; todavía no se cobró ninguna renovación. Acordá las condiciones o buscá reemplazos antes de iniciar la producción.`);
  return next;
}

/** Upgrade legacy local saves once; ids, stats, verdicts and jury ballots are retained. */
function migrateV3(raw:Record<string,unknown>):unknown {
  const finiteInt=(value:unknown,min:number,max:number):value is number=>typeof value==='number'&&Number.isInteger(value)&&value>=min&&value<=max;
  if(!finiteInt(raw.day,0,19) || !finiteInt(raw.money,0,100000) || !finiteInt(raw.seed,0,4294967295) ||
    !Array.isArray(raw.members) || raw.members.length!==17 || !Array.isArray(raw.candidates) || raw.candidates.length!==5 ||
    typeof raw.productionStarted!=='boolean' || (!raw.productionStarted && raw.day!==0) || !raw.creativeTeam || typeof raw.creativeTeam!=='object' ||
    !Array.isArray(raw.log)) return null;
  const team=raw.creativeTeam as Record<CreativeRole,string|null>;
  if(Object.keys(team).length!==5 || !CREATIVE_ROLES.every(role=>team[role]===null || CREATIVE_CANDIDATES.some(c=>c.id===team[role]&&c.role===role))) return null;
  const initial=createGame(raw.seed);
  const augment=(value:unknown,index:number):Member|null=>{
    if(!value || typeof value!=='object' || Array.isArray(value)) return null;
    const m=value as Record<string,unknown>;
    if(!finiteInt(m.cost,50,5000)) return null;
    const fame=[20,50,75,92][['Común','Raro','Épico','Legendario'].indexOf(m.rarity as string)];
    if(fame===undefined) return null;
    return {...m,cost:m.cost*100,fame,experience:10+index%10,seasons:1,age:23+index%25,loyalty:60,
      minReputation:Math.max(0,Math.round(fame*.65-8)),scouting:1,participation:0} as Member;
  };
  const members=raw.members.map(augment), previousCandidates=raw.candidates.map(augment);
  if(members.some(m=>!m)||previousCandidates.some(m=>!m)) return null;
  const originalIds=[...members,...previousCandidates].map(m=>m!.id);
  if(new Set(originalIds).size!==originalIds.length) return null;
  const candidates=[...previousCandidates,...initial.candidates.filter(m=>!originalIds.includes(m.id))].slice(0,120);
  const creativeFees=emptyFees();
  CREATIVE_ROLES.forEach((role,index)=>{
    if(team[role]) creativeFees[role]=([180,220,170,140,190][index]+[0,160,340][Number(team[role]!.at(-1))])*100;
  });
  const transitionFinancing=INITIAL_BUDGET-3200*100;
  const money=raw.money*100+transitionFinancing;
  const fees=Object.values(creativeFees).reduce((sum,fee)=>sum+fee,0);
  const accounts=emptyAccounts(money+fees);accounts.technical=fees;
  const dayMap=[15,16,17,18,19,20,22,23,24,25,26,26,27,27,28,29,29,30,30,31];
  return {...raw,version:4,day:raw.productionStarted?dayMap[raw.day]:0,money,reputation:20,admissionExempt:false,
    members,candidates,creativeFees,costumeProposalId:null,accounts,
    fallosRevealed:Object.hasOwn(raw,'fallosRevealed')?raw.fallosRevealed:false,
    lastMessage:'Partida conservada: economía convertida a UYU y calendario ampliado. Se agregan $880.000 UYU de financiación única de transición.',
    log:['Migración v3→v4: dinero y contratos anteriores ×100; financiación única de transición $880.000 UYU. Se conservaron elenco, habilidades, resultados y progreso.',...raw.log].slice(0,30)};
}

/** Add community systems without altering money, careers, results, or the existing ledger. */
function migrateV4(raw: Record<string, unknown>): unknown {
  if (!Number.isInteger(raw.day) || (raw.day as number)<0 || (raw.day as number)>=TOTAL_DAYS ||
    !Array.isArray(raw.members) || !Array.isArray(raw.candidates) || !raw.accounts || typeof raw.accounts!=='object' || Array.isArray(raw.accounts)) return null;
  const augment=(value:unknown,active:boolean):unknown=>{
    if(!value || typeof value!=='object' || Array.isArray(value)) return null;
    return {...value,morale:70,rapport:active?25:0,lastContactDay:-1};
  };
  const previous=DECISIONS.filter(decision=>decision.day<(raw.day as number));
  const current=raw.status==='playing'&&raw.productionStarted===true ? DECISIONS.find(decision=>decision.day===raw.day) : undefined;
  return {...raw,version:5,members:raw.members.map(member=>augment(member,true)),candidates:raw.candidates.map(member=>augment(member,false)),
    accounts:{...raw.accounts,communityIncome:0,communityCosts:0},contactsToday:0,fundraisersUsed:0,
    pendingDecision:current?.id??null,resolvedDecisions:previous.map(decision=>decision.id),
    decisionHistory:previous.map(decision=>({id:decision.id,optionId:null,day:decision.day}))};
}


/** Identity and the archive begin now; legacy seasons are not reconstructed or credited. */
function migrateV5(raw:Record<string,unknown>):unknown {
  return {...raw,version:6,identity:{...DEFAULT_IDENTITY},history:[],
    career:{sinceSeason:raw.season,completedSeasons:0,championships:0,finals:0}};
}

/** Earlier preparations are unknown: do not invent work or modify sealed results. */
function migrateV6(raw:Record<string,unknown>):unknown {
  if(!Array.isArray(raw.history)) return null;
  return {...raw,version:7,show:emptyShow(),history:raw.history.map(entry=>
    entry&&typeof entry==='object'&&!Array.isArray(entry)?{...entry,show:null}:entry)};
}
/** Existing v7 contracts were paid under the previous model; never charge them a second time. */
function migrateV7(raw:Record<string,unknown>):unknown {
  return {...raw,version:8,pendingRenewals:[]};
}

/** Reject corrupted/out-of-schema saves; local saves are not an anti-cheat security boundary. */
export function parseSave(raw: string | null): State | null {
  if (!raw || raw.length > 600000) return null;
  try {
    let value: unknown = JSON.parse(raw);
    const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
    const number = (v: unknown, min: number, max: number, integer = false): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v));
    const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
    const score = (v: unknown, min = 0) => number(v, min, 100) && Math.abs(round(v) - v) < 1e-9;
    const exactKeys=(input:Record<string,unknown>,keys:string[])=>Object.keys(input).length===keys.length&&keys.every(key=>Object.hasOwn(input,key));
    const showPlan=(input:Record<string,unknown>):boolean=>{
      const validation=validateShowPlan(input);
      return validation.valid&&validation.plan!.title===input.title&&validation.plan!.themeId===input.themeId;
    };
    const sectionProgress=(input:unknown,withId=false):input is ShowSectionProgress=>
      object(input)&&exactKeys(input,withId?['id','text','arrangements','rehearsal']:['text','arrangements','rehearsal'])&&
      score(input.text)&&score(input.arrangements)&&score(input.rehearsal)&&
      (input.rehearsal as number)<=rehearsalLimit(input as unknown as ShowSectionProgress);
    const publicShow=(input:unknown):boolean=>{
      if(input===null) return true;
      if(!object(input)||!exactKeys(input,['title','themeId','themeName','readiness','sections'])||!showPlan(input)||
        input.themeName!==SHOW_THEMES.find(theme=>theme.id===input.themeId)?.name||!Array.isArray(input.sections)||input.sections.length!==3||
        !input.sections.every((section,index)=>sectionProgress(section,true)&&(section as unknown as {id:unknown}).id===SHOW_SECTIONS[index].id)) return false;
      return input.readiness===showReadiness(input.sections as ShowSectionProgress[]);
    };
    if (object(value) && value.version === 3) value = migrateV3(value);
    if(object(value)&&value.version===4&&!Object.hasOwn(value,'admissionExempt')) value.admissionExempt=false;
    if(object(value)&&value.version===4) value=migrateV4(value);
    if(object(value)&&value.version===5) value=migrateV5(value);
    if(object(value)&&value.version===6) value=migrateV6(value);
    if(object(value)&&value.version===7) value=migrateV7(value);
    if (!object(value) || value.version !== 8 || !number(value.season, 1, 10000, true) || !number(value.day, 0, TOTAL_DAYS - 1, true) ||
      !number(value.money, 0, 1000000000, true) || !number(value.fans, 0, 1000000000, true) || !number(value.seed, 0, 4294967295, true) ||
      typeof value.licensed !== 'boolean' || typeof value.productionStarted !== 'boolean' || typeof value.fallosRevealed !== 'boolean' || value.penalty !== 0 || !['playing', 'won', 'lost'].includes(value.status as string) ||
      !text(value.lastMessage, 1000) || !Array.isArray(value.log) || value.log.length > 30 || !value.log.every(item => text(item, 1000))) return null;
    if (!object(value.creativeTeam) || Object.keys(value.creativeTeam).length !== CREATIVE_ROLES.length ||
      !CREATIVE_ROLES.every(role => (value.creativeTeam as Record<string, unknown>)[role] === null || CREATIVE_CANDIDATES.some(candidate =>
        candidate.role === role && candidate.id === (value.creativeTeam as Record<string, unknown>)[role]))) return null;
    const member = (m: unknown) => object(m) && text(m.id, 80) && /^m-[a-z0-9-]+$/.test(m.id) && text(m.name, 100) && text(m.nickname, 60) &&
      Object.hasOwn(RECRUITMENT_ODDS, m.rarity as string) && MEMBER_ROLES.includes(m.role as MemberRole) &&
      (m.role === 'chorister' ? CORDS.includes(m.cord as Cord) && CORDS.includes(m.assignedCord as Cord) && m.skill === 0
        : m.cord === null && m.assignedCord === null && m.voice === 0) &&
      number(m.voice, 0, 100) && number(m.skill, 0, 100) && number(m.charisma, 0, 100) && number(m.energy, 0, 100) && number(m.cost, 0, 5000000, true) && number(m.fame, 0, 100) && number(m.experience, 0, 100) && number(m.seasons, 0, 100000, true) && number(m.age, 16, 100000, true) && number(m.loyalty, 0, 100) && number(m.minReputation, 0, 100) && [0, 1, 2].includes(m.scouting as number) && number(m.participation, 0, TOTAL_DAYS, true) && number(m.morale,0,100) && number(m.rapport,0,100) && number(m.lastContactDay,-1,value.day as number,true);
    if (!Array.isArray(value.members) || value.members.length !== 17 || !value.members.every(member) ||
      !Array.isArray(value.candidates) || value.candidates.length !== 120 || !value.candidates.every(member)) return null;
    if (!MEMBER_ROLES.every(role => (value.members as Member[]).filter(member => member.role === role).length === (role === 'chorister' ? 13 : 1)) ||
      !MEMBER_ROLES.every(role => (value.candidates as Member[]).some(member => member.role === role))) return null;
    const ids = [...value.members, ...value.candidates].map(m => (m as Member).id);
    if (new Set(ids).size !== ids.length || !object(value.upgrades) || Object.keys(value.upgrades).length !== 4 ||
      !UPGRADE_KEYS.every(key => number((value.upgrades as Record<string, unknown>)[key], 0, MAX_UPGRADE, true))) return null;
    if (!Array.isArray(value.results) || value.results.length > 4 || !value.results.every((result, i) =>
      object(result) && result.name === EVENTS[i].name && score(result.score) && typeof result.passed === 'boolean')) return null;
    if (!Array.isArray(value.rivals) || value.rivals.length !== 18 || !value.rivals.every((rival, i) =>
      object(rival) && rival.id === `r-${i}` && rival.name === RIVAL_NAMES[i] && Array.isArray(rival.scores) &&
      rival.scores.length <= 3 && rival.scores.every(item => score(item, 40)))) return null;
    const state = value as unknown as State;
    if(!Array.isArray(state.pendingRenewals)||state.pendingRenewals.length>17||
      new Set(state.pendingRenewals).size!==state.pendingRenewals.length||
      !state.pendingRenewals.every(id=>typeof id==='string'&&state.members.some(member=>member.id===id))||
      (state.pendingRenewals.length>0&&(state.season<2||state.day!==0||state.productionStarted||state.status!=='playing'))) return null;
    if(!object(state.show)||!exactKeys(state.show as unknown as Record<string,unknown>,['title','themeId','focus','locked','sections'])||
      !showPlan(state.show as unknown as Record<string,unknown>)||typeof state.show.locked!=='boolean'||
      (state.show.focus!=='general'&&!SHOW_SECTIONS.some(section=>section.id===state.show.focus))||
      !object(state.show.sections)||!exactKeys(state.show.sections as unknown as Record<string,unknown>,SHOW_SECTIONS.map(section=>section.id))||
      !SHOW_SECTIONS.every(({id})=>sectionProgress(state.show.sections[id]))) return null;
    const showProgress=Object.values(state.show.sections);
    const hasShowProgress=showProgress.some(section=>section.text>0||section.arrangements>0||section.rehearsal>0);
    if(state.show.locked!==hasShowProgress || (state.show.locked&&(!state.productionStarted||state.day===0))) return null;
    if(typeof state.admissionExempt!=='boolean'||(state.admissionExempt&&state.season<2)) return null;
    if (state.fallosRevealed && (state.status !== 'lost' || state.day !== EVENTS[2].day)) return null;
    const production = getProductionSummary(state);
    if (state.productionStarted && !production.ready) return null;
    if (!number(state.reputation,0,100) || !object(state.creativeFees) || Object.keys(state.creativeFees).length !== 5 ||
      !CREATIVE_ROLES.every(role=>number(state.creativeFees[role],0,5000000,true) && (state.creativeTeam[role] !== null || state.creativeFees[role] === 0))) return null;
    const accountKeys: (keyof Accounts)[]=['opening','technical','costume','recruitment','auditions','upgrades','rehearsals','performanceIncome','performanceCosts','prizes','communityIncome','communityCosts'];
    if(!object(state.accounts) || Object.keys(state.accounts).length !== accountKeys.length ||
      !accountKeys.every(key=>number(state.accounts[key],0,10000000000,true)) ||
      accountBalance(state.accounts)!==state.money ||
      state.accounts.technical!==CREATIVE_ROLES.reduce((sum,role)=>sum+state.creativeFees[role],0)) return null;
    const minimumTextWork=showProgress.reduce((total,section)=>total+Math.ceil(section.text/showWorkGain(state,'text')),0);
    const minimumArrangementWork=showProgress.reduce((total,section)=>total+Math.ceil(section.arrangements/showWorkGain(state,'arrangements')),0);
    const minimumRehearsals=Math.ceil(showProgress.reduce((total,section)=>total+section.rehearsal,0)/36);
    if(minimumTextWork+minimumArrangementWork+minimumRehearsals>state.day ||
      state.accounts.rehearsals<minimumTextWork*SHOW_WORK_COSTS.text+minimumArrangementWork*SHOW_WORK_COSTS.arrangements+minimumRehearsals*ECONOMY_COSTS.rehearsal) return null;

    const identity=(input:unknown):input is MurgaIdentity=>{
      if(!object(input)||Object.keys(input).length!==2) return false;
      const validated=validateIdentity(input);
      return validated.valid&&validated.identity!.name===input.name&&validated.identity!.barrio===input.barrio;
    };
    if(!identity(state.identity)||!object(state.career)||Object.keys(state.career).length!==4||
      !number(state.career.sinceSeason,1,state.season,true)||
      !number(state.career.completedSeasons,0,9999,true)||
      state.career.completedSeasons!==state.season-state.career.sinceSeason||
      !number(state.career.finals,0,state.career.completedSeasons,true)||
      !number(state.career.championships,0,state.career.finals,true)||
      !Array.isArray(state.history)||state.history.length!==Math.min(HISTORY_LIMIT,state.career.completedSeasons)) return null;
    const archiveKeys=['season','identity','outcome','cash','reputation','fans','accounts','roster','admissionExempt',
      'results','contestTotal','contestAverage','rank','roundsCompleted','scoresPublic','closingCash','show'];
    const rosterKeys=['id','name','role','experience','fame'];
    const archiveMember=(member:unknown):member is PublicRosterMember=>object(member)&&
      Object.keys(member).length===rosterKeys.length&&rosterKeys.every(key=>Object.hasOwn(member,key))&&
      text(member.id,80)&&/^m-[a-z0-9-]+$/.test(member.id)&&text(member.name,100)&&
      MEMBER_ROLES.includes(member.role as MemberRole)&&number(member.experience,0,100)&&number(member.fame,0,100);
    const validArchive=(input:unknown,index:number):boolean=>{
      if(!object(input)||Object.keys(input).length!==archiveKeys.length||!archiveKeys.every(key=>Object.hasOwn(input,key))||
        input.season!==state.season-state.history.length+index||!identity(input.identity)||
        !publicShow(input.show)||
        !['not-admitted','second-round','finalist','champion'].includes(input.outcome as string)||
        input.scoresPublic!==true||!number(input.cash,0,1000000000,true)||input.closingCash!==input.cash||
        !number(input.reputation,0,100)||!number(input.fans,0,1000000000,true)||
        typeof input.admissionExempt!=='boolean'||(input.admissionExempt&&(input.season as number)<2)||
        !object(input.accounts)||Object.keys(input.accounts).length!==accountKeys.length||
        !accountKeys.every(key=>number((input.accounts as Record<string,unknown>)[key],0,10000000000,true))||
        accountBalance(input.accounts as unknown as Accounts)!==input.cash||
        !Array.isArray(input.roster)||input.roster.length!==17||!input.roster.every(archiveMember)) return false;
      const roster=input.roster as PublicRosterMember[];
      if(new Set(roster.map(member=>member.id)).size!==17||
        !MEMBER_ROLES.every(role=>roster.filter(member=>member.role===role).length===(role==='chorister'?13:1))) return false;
      const rounds=input.outcome==='not-admitted'?0:input.outcome==='second-round'?2:3;
      if(input.roundsCompleted!==rounds||!Array.isArray(input.results)||input.results.length!==rounds+1) return false;
      if(!input.results.every((result,index)=>{
        if(!object(result)||Object.keys(result).length!==3||result.name!==EVENTS[index].name||typeof result.passed!=='boolean') return false;
        if(index===0){
          if(input.admissionExempt) return result.score===null&&result.passed===true&&input.outcome!=='not-admitted';
          return score(result.score)&&result.passed===((result.score as number)>=EVENTS[0].threshold)&&
            result.passed===(input.outcome!=='not-admitted');
        }
        return score(result.score)&&result.passed===(index!==rounds||input.outcome==='champion');
      })) return false;
      const marks=input.results.slice(1).map(result=>(result as {score:number}).score);
      const total=sumScores(marks);
      if(input.contestTotal!==total||input.contestAverage!==(rounds?round(total/rounds):0)) return false;
      if(rounds===0) return input.rank===null;
      return input.outcome==='champion'?input.rank===1:
        number(input.rank,input.outcome==='second-round'?11:2,19,true);
    };
    if(!state.history.every(validArchive)) return null;
    const retainedChampionships=state.history.filter(entry=>entry.outcome==='champion').length;
    const retainedFinals=state.history.filter(entry=>entry.outcome==='champion'||entry.outcome==='finalist').length;
    const omitted=state.career.completedSeasons-state.history.length;
    if(state.career.championships<retainedChampionships||state.career.championships>retainedChampionships+omitted||
      state.career.finals<retainedFinals||state.career.finals>retainedFinals+omitted) return null;

    const proposal=getCostumeProposals(state).find(item=>item.id===state.costumeProposalId);
    if(state.costumeProposalId!==null && (!proposal || state.accounts.costume!==proposal.cost)) return null;
    if(state.costumeProposalId===null && state.accounts.costume!==0) return null;
    if (!state.productionStarted && (state.day!==0 || state.status!=='playing' || state.licensed ||
      state.results.length!==0 || UPGRADE_KEYS.some(key=>state.upgrades[key]!==0))) return null;

    if(!number(state.contactsToday,0,CONTACTS_PER_DAY,true) || !number(state.fundraisersUsed,0,Math.min(FUNDRAISER_LIMIT,state.day),true) ||
      state.contactsToday!==[...state.members,...state.candidates].filter(member=>member.lastContactDay===state.day).length) return null;
    if(state.accounts.communityIncome<state.fundraisersUsed*ECONOMY_COSTS.fundraiserBaseGross ||
      state.accounts.communityIncome>state.fundraisersUsed*(ECONOMY_COSTS.fundraiserBaseGross+20000) ||
      state.accounts.communityCosts<state.fundraisersUsed*ECONOMY_COSTS.fundraiserCost) return null;
    if(!Array.isArray(state.resolvedDecisions)||state.resolvedDecisions.length>DECISIONS.length||
      new Set(state.resolvedDecisions).size!==state.resolvedDecisions.length||
      !state.resolvedDecisions.every(id=>DECISIONS.some(decision=>decision.id===id&&decision.day<=state.day))) return null;
    if(DECISIONS.some(decision=>decision.day<state.day&&!state.resolvedDecisions.includes(decision.id))) return null;
    const expectedPending=dueDecision(state)?.id??null;
    if(state.pendingDecision!==expectedPending) return null;
    if(!Array.isArray(state.decisionHistory)||state.decisionHistory.length!==state.resolvedDecisions.length||
      !state.decisionHistory.every((record,index)=>{
        if(!object(record)||record.id!==state.resolvedDecisions[index]) return false;
        const definition=DECISIONS.find(decision=>decision.id===record.id);
        return definition!==undefined && record.day===definition.day &&
          (index===0||state.decisionHistory[index-1].day<record.day) &&
          (record.optionId===null || definition.options.some(option=>option.id===record.optionId));
      })) return null;
    const decisionsCost=state.decisionHistory.reduce((total,record)=>total+
      (DECISIONS.find(decision=>decision.id===record.id)?.options.find(option=>option.id===record.optionId)?.cost??0),0);
    if(state.accounts.communityCosts<state.fundraisersUsed*ECONOMY_COSTS.fundraiserCost+decisionsCost) return null;

    const contestRounds = Math.max(0, state.results.length - 1);
    if (contestRounds < 3 && state.rivals.some(rival => rival.scores.length !== contestRounds)) return null;
    if (contestRounds === 3) {
      if (state.rivals.some(rival => rival.scores.length < 2)) return null;
      const finalists = new Set(contestStandings(state).filter(row => row.qualified).map(row => row.id));
      if (state.rivals.some(rival => rival.scores.length !== (finalists.has(rival.id) ? 3 : 2))) return null;
    }
    const summary = getContestSummary(state);
    if (!state.results.every((result, index) => {
      const passed = index === 0 ? (state.admissionExempt ? result.score === 0 : result.score >= EVENTS[0].threshold) : index === 1 ? true : index === 2 ? summary.liguillaQualified === true : summary.rank === 1;
      return result.passed === passed;
    })) return null;
    const completedEvents = EVENTS.filter(event => event.day < state.day).length;
    if (state.status === 'playing' && (state.results.length !== completedEvents || state.results.some(result => !result.passed))) return null;
    if (state.status === 'won' && (state.day !== EVENTS[3].day || state.results.length !== 4 || state.results.some(result => !result.passed))) return null;
    if (state.status === 'lost' && (!EVENTS.some(event => event.day === state.day) || state.results.length !== completedEvents + 1 ||
      state.results.at(-1)?.passed !== false || state.results.slice(0, -1).some(result => !result.passed))) return null;
    return copy(state);
  } catch {
    return null;
  }
}
