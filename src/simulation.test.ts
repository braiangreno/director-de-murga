import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,hireCreative,startSeason,getProductionSummary,CREATIVE_ROLES,CREATIVE_CANDIDATES,MEMBER_ROLES,
  performAction,recruit,assignCord,buyUpgrade,buyLicense,getStats,getCalendar,getContestSummary,getStandings,
  getActionAvailability,getActionPreview,getUpgradeCost,parseSave,refreshCandidates,EVENTS,INITIAL_BUDGET,
  LICENSE_COST,TABLADOS_START_DAY,TOTAL_DAYS,RECRUITMENT_END_DAY,AUDITION_COST,SEASON_FINANCING,
  getRecruitmentAvailability,getRecruitmentQuote,getRecruitmentReplacement,scoutMember,getMemberReport,
  getCostumeProposals,chooseCostumeProposal,nextSeason,getEconomySummary,revealEliminatedFallos,REHEARSALS_START_DAY,getSeasonRenewalCost,
  contactCandidate,getContactAvailability,getPendingDecision,resolveDecision,getDecisionHistory,getCommunitySummary,
  CONTACTS_PER_DAY,FUNDRAISER_LIMIT,DECISION_DAYS,
  type State,type Action,type Member,
} from './simulation';

function setup(seed=2026):State {
  let state=createGame(seed);
  for(const role of CREATIVE_ROLES) state=hireCreative(state,CREATIVE_CANDIDATES.find(c=>c.role===role&&c.level==='Barrial')!.id);
  return state;
}
function started(seed=2026):State {return startSeason(setup(seed));}
function save(state:State):void {assert.deepEqual(parseSave(JSON.stringify(state)),state,state.lastMessage);}
function toV4(state:State):Record<string,unknown> {
  const {contactsToday,fundraisersUsed,pendingDecision,resolvedDecisions,decisionHistory,...old}=state;
  const {communityIncome,communityCosts,...accounts}=state.accounts;
  const oldMember=(member:Member)=>{const {morale,rapport,lastContactDay,...rest}=member;return rest;};
  return {...old,version:4,accounts,members:state.members.map(oldMember),candidates:state.candidates.map(oldMember)};
}
function resolveFreeDecision(state:State):State {
  const decision=getPendingDecision(state);
  return decision?resolveDecision(state,decision.options.find(option=>option.cost===0)!.id):state;
}
function fixture(day:number,scores:number[]=[]):State {
  const s=started();s.day=day;s.members.forEach(m=>m.energy=100);
  s.results=[{name:EVENTS[0].name,score:70,passed:true},...scores.map((score,i)=>({name:EVENTS[i+1].name,score,passed:true}))];
  s.rivals.forEach(r=>r.scores=scores.map(()=>50));return parseSave(JSON.stringify(toV4(s)))!;
}
function cash(state:State,money:number):State {
  const s=structuredClone(state);s.accounts.opening+=money-s.money;s.money=money;return s;
}
function win(seed=2026):State {
  let s=setup(seed);s=chooseCostumeProposal(s,getCostumeProposals(s)[0].id);s=startSeason(s);
  for(let i=0;i<4;i++){s=buyUpgrade(s,'voices');s=buyUpgrade(s,'lyrics');}
  s=buyLicense(s);
  for(let guard=0;guard<TOTAL_DAYS&&s.status==='playing';guard++){
    s=resolveFreeDecision(s);
    const event=EVENTS.find(e=>e.day===s.day);
    const nextDayEvent=EVENTS.some(e=>e.day===s.day+1);
    const action:Action=event?'compete':s.day<REHEARSALS_START_DAY||nextDayEvent||getStats(s).energy<84?'rest':'rehearse';
    assert.equal(getActionAvailability(s,action).enabled,true,s.lastMessage);
    s=performAction(s,action);save(s);
  }
  return s;
}
function legacyV3(day=0,active=false):Record<string,unknown> {
  const s=setup();
  const old=(m:Member)=> {
    const {fame,experience,seasons,age,loyalty,minReputation,scouting,participation,...rest}=m;
    return {...rest,cost:100};
  };
  const {reputation,creativeFees,costumeProposalId,accounts,...rest}=s;
  return {...rest,version:3,day,money:2300,productionStarted:active,members:s.members.map(old),
    candidates:MEMBER_ROLES.map(role=>old(s.candidates.find(m=>m.role===role)!))};
}

test('April setup has a deterministic persistent market of 120 people and the 13+3+1 composition',()=>{
  const s=createGame(18);assert.deepEqual(s,createGame(18));assert.notDeepEqual(s.candidates,createGame(19).candidates);
  assert.equal(s.candidates.length,120);assert.equal(new Set([...s.members,...s.candidates].map(m=>m.id)).size,137);
  assert.equal(new Set([...s.members,...s.candidates].map(m=>m.name)).size,137);
  assert.ok(s.candidates.every(m=>! /\d/.test(m.nickname)));
  assert.equal(s.members.length,17);assert.equal(s.money,1200000);assert.equal(getCalendar(s).month,'Abril');
  for(const role of MEMBER_ROLES) {
    assert.equal(s.members.filter(m=>m.role===role).length,role==='chorister'?13:1);
    assert.ok(s.candidates.filter(m=>m.role===role).length>=10);
  }
  assert.equal(getStats(s).harmony,100);save(s);
});

test('public fame and cost do not identify hidden talent and reports never print exact ability',()=>{
  const s=createGame();
  assert.ok(s.candidates.some(m=>m.fame<25&&(m.voice||m.skill)>80));
  assert.ok(s.candidates.some(m=>m.fame>75&&(m.voice||m.skill)<55));
  const target=s.candidates.find(m=>m.scouting===0)!;
  assert.equal(getMemberReport(s,target).label,'Sin audición');
  const assessed=scoutMember(s,target.id),report=getMemberReport(assessed,assessed.candidates.find(m=>m.id===target.id)!);
  assert.doesNotMatch(report.label+report.detail,/\d/);
  assert.equal(assessed.money,s.money-AUDITION_COST);assert.equal(assessed.day,s.day);
  assert.equal(scoutMember(assessed,target.id).money,assessed.money);
  assert.equal(scoutMember(cash(s,0),target.id).candidates.find(m=>m.id===target.id)!.scouting,0);save(assessed);
});

test('negotiation can refuse famous candidates on reputation, expensive offers help but cannot buy everyone',()=>{
  const s=createGame(),star=s.candidates.find(m=>m.minReputation>50)!;
  for(const offer of ['standard','generous','premium'] as const){
    assert.equal(getRecruitmentQuote(s,star.id,offer).accepted,false);
    const failed=recruit(s,star.id,undefined,offer);
    assert.equal(failed.money,s.money);assert.deepEqual(failed.members,s.members);assert.equal(failed.seed,s.seed);
  }
  const reachable=s.candidates.find(m=>m.minReputation>23&&m.minReputation<33&&m.loyalty<75)!;
  assert.equal(getRecruitmentQuote(s,reachable.id,'standard').accepted,false);
  assert.equal(getRecruitmentQuote(s,reachable.id,'premium').accepted,true);
  assert.ok(getRecruitmentQuote(s,reachable.id,'premium').fee>getRecruitmentQuote(s,reachable.id,'standard').fee);
  assert.equal(getRecruitmentQuote({...s,reputation:80},star.id).accepted,true);
});

test('recruitment works before technical setup, preserves occupied roles and released careers, and closes in October',()=>{
  let s=createGame();
  for(const role of MEMBER_ROLES){
    const target=s.candidates.find(m=>m.role===role&&getRecruitmentQuote(s,m.id).accepted)!;
    const removed=getRecruitmentReplacement(s,target.id)!;
    const wrong=s.members.find(m=>m.role!==role)!;
    assert.equal(recruit(s,target.id,wrong.id).money,s.money);
    const before=s,fee=getRecruitmentQuote(s,target.id).fee;
    s=recruit(s,target.id,removed.id);
    assert.equal(s.money,before.money-fee);assert.equal(s.day,0);assert.equal(s.members.length,17);assert.equal(s.candidates.length,120);
    assert.equal(s.members.find(m=>m.id===target.id)!.assignedCord,removed.assignedCord);
    assert.equal(s.candidates.find(m=>m.id===removed.id)!.experience,removed.experience);
    assert.equal(recruit(s,target.id).money,s.money);save(s);
  }
  const closed={...s,day:RECRUITMENT_END_DAY};
  assert.equal(getRecruitmentAvailability(closed).enabled,false);
  assert.equal(getCommunitySummary(closed).contactsRemaining,0);
  assert.equal(recruit(closed,closed.candidates[0].id).money,closed.money);
  assert.equal(scoutMember(closed,closed.candidates[0].id).money,closed.money);
  assert.deepEqual(refreshCandidates(s).candidates,s.candidates);
});

test('five technical contracts remain necessary, rehearsal is blocked during setup and replacement refunds exactly',()=>{
  let s=createGame();
  assert.equal(startSeason(s).productionStarted,false);
  assert.equal(performAction(s,'rest').day,0);
  const cheap=CREATIVE_CANDIDATES.find(c=>c.role==='lyrics'&&c.level==='Barrial')!;
  const costly=CREATIVE_CANDIDATES.find(c=>c.role==='lyrics'&&c.level==='Referente')!;
  s=hireCreative(s,cheap.id);s=hireCreative(s,costly.id);s=hireCreative(s,cheap.id);
  assert.equal(s.money,INITIAL_BUDGET-cheap.fee);save(s);
  assert.equal(hireCreative(cash(s,0),costly.id).creativeTeam.lyrics,cheap.id);
  const active=startSeason(setup());assert.equal(active.productionStarted,true);
  assert.equal(hireCreative(active,costly.id).money,active.money);save(active);
});

test('each hired costume designer supplies exactly two own proposals with reversible accounted costs',()=>{
  let s=createGame();assert.deepEqual(getCostumeProposals(s),[]);
  const designers=CREATIVE_CANDIDATES.filter(c=>c.role==='costumes');
  const seen=new Set<string>();
  for(const designer of designers){
    s=hireCreative(s,designer.id);
    const proposals=getCostumeProposals(s);assert.equal(proposals.length,2);
    assert.ok(proposals.every(p=>p.id.startsWith(designer.id)&&p.description.includes(designer.name)));
    proposals.forEach(p=>{assert.ok(!seen.has(p.id));seen.add(p.id);});
    const before=s.money;
    s=chooseCostumeProposal(s,proposals[0].id);save(s);
    assert.equal(s.money,before-proposals[0].cost);
    assert.equal(chooseCostumeProposal(s,proposals[0].id).money,s.money);
    s=chooseCostumeProposal(s,proposals[1].id);
    assert.equal(s.money,before-proposals[1].cost);save(s);
  }
  const old=s.costumeProposalId;
  const blocked=chooseCostumeProposal({...s,day:TABLADOS_START_DAY},getCostumeProposals(s)[0].id);
  assert.equal(blocked.costumeProposalId,old);
  assert.equal(chooseCostumeProposal(cash(s,0),'unrelated').costumeProposalId,old);
});

test('the calendar runs April to March, keeps November admission, and forbids off-season tablados',()=>{
  assert.equal(TOTAL_DAYS,32);assert.equal(getCalendar({...started(),day:EVENTS[0].day}).month,'Noviembre');
  for(let day=0;day<REHEARSALS_START_DAY;day++) assert.equal(getActionAvailability({...started(),day},'rehearse').enabled,false);
  assert.equal(getActionAvailability({...started(),day:REHEARSALS_START_DAY},'rehearse').enabled,true);
  assert.equal(getCalendar({...started(),day:TABLADOS_START_DAY}).month,'Enero');
  for(let day=0;day<TABLADOS_START_DAY;day++){
    const s={...started(),day};
    for(const action of ['popular','commercial'] as const){
      assert.equal(getActionAvailability(s,action).enabled,false);
      const next=performAction(s,action);assert.equal(next.money,s.money);assert.equal(next.day,s.day);assert.deepEqual(next.members,s.members);
    }
  }
  for(const event of EVENTS){
    const s={...started(),day:event.day};
    for(const action of ['rest','rehearse','popular','commercial'] as const) assert.equal(performAction(s,action).day,event.day);
  }
});

test('economy previews match two actual show payments, transport and individual cachés; exhausted voices recover without overflow',()=>{
  const s={...started(),day:TABLADOS_START_DAY},e=getEconomySummary(s);
  assert.equal(e.commercial.gross,50000);assert.equal(e.commercial.transport,7000);assert.equal(e.commercial.memberFees,30600);
  for(const action of ['commercial','popular'] as const){
    const next=performAction(s,action);
    assert.equal(next.money-s.money,getActionPreview(s,action).money);
    assert.equal(next.accounts.performanceIncome,e[action].gross);
    assert.equal(next.accounts.performanceCosts,e[action].transport+e[action].memberFees);
  }
  assert.equal(getActionAvailability(cash(s,0),'popular').enabled,false);
  const mixed={...started(),members:started().members.map((m,i)=>({...m,energy:i===0?98:10}))};
  const rested=performAction(mixed,'rest');
  assert.equal(rested.members[0].energy,100);assert.equal(rested.members[1].energy,36);
  assert.equal(getActionPreview(mixed,'rest').energy,Math.round(rested.members.reduce((v,m,i)=>v+m.energy-mixed.members[i].energy,0)/17*10)/10);
});

test('a funded basic-team strategy wins full seasons without replacing the roster, and every save is valid',()=>{
  for(const seed of [0,18,2026,999999]){
    const s=win(seed);assert.equal(s.status,'won',s.lastMessage);assert.equal(s.day,31);
    assert.equal(s.results.length,4);assert.equal(getContestSummary(s).rank,1);
    assert.equal(getStandings(s)[0].isPlayer,true);assert.ok(s.money>=0);
  }
});

test('experience grows from practice and exactly one annual settlement preserves identities, cash and reputation',()=>{
  const original={...started(),day:REHEARSALS_START_DAY},practiced=performAction(original,'rehearse');
  assert.ok(practiced.members[0].experience>original.members[0].experience);
  assert.ok(practiced.members[0].voice>original.members[0].voice);
  assert.equal(original.members[0].participation,0);
  const ended=win(),newYear=nextSeason(ended);
  assert.equal(newYear.season,ended.season+1);assert.equal(newYear.day,0);assert.equal(newYear.productionStarted,false);
  assert.equal(newYear.money,ended.money+SEASON_FINANCING-getSeasonRenewalCost(ended));assert.equal(newYear.reputation,ended.reputation);
  assert.equal(newYear.accounts.recruitment,getSeasonRenewalCost(ended));
  assert.deepEqual(newYear.members.map(m=>m.id),ended.members.map(m=>m.id));
  assert.deepEqual(newYear.candidates.map(m=>m.id),ended.candidates.map(m=>m.id));
  ended.members.forEach((m,i)=>{
    assert.ok(newYear.members[i].experience>=m.experience);assert.equal(newYear.members[i].voice,m.voice);
    assert.equal(newYear.members[i].seasons,m.seasons+1);assert.equal(newYear.members[i].age,m.age+1);
  });
  assert.equal(nextSeason(newYear).money,newYear.money);assert.equal(nextSeason(newYear).members[0].experience,newYear.members[0].experience);
  assert.equal(getRecruitmentAvailability(newYear).enabled,true);save(newYear);
});

test('first round does not eliminate; scores stay sealed until final or explicit eliminated epilogue',()=>{
  const first=fixture(EVENTS[1].day);first.members.forEach(m=>m.energy=0);
  const played=performAction(first,'compete');assert.equal(played.results[1].passed,true);assert.equal(played.status,'playing');
  assert.deepEqual(getStandings(played),[]);assert.doesNotMatch(played.lastMessage,/\d/);save(played);
  const second=fixture(EVENTS[2].day,[10]);second.members.forEach(m=>m.energy=0);
  const lost=performAction(second,'compete');assert.equal(lost.status,'lost');assert.equal(lost.day,28);save(lost);
  assert.deepEqual(getStandings(lost),[]);
  const revealed=revealEliminatedFallos(lost);assert.equal(revealed.fallosRevealed,true);
  assert.equal(getContestSummary(revealed).roundsCompleted,2);assert.equal(getStandings(revealed).length,19);save(revealed);
});

test('previous Liguilla participants confirm direct entry next year without a fake admission score or effort',()=>{
  let s=nextSeason(win());assert.equal(s.admissionExempt,true);
  for(const role of CREATIVE_ROLES) s=hireCreative(s,CREATIVE_CANDIDATES.find(c=>c.role===role&&c.level==='Barrial')!.id);
  s=startSeason(s);
  while(s.day<EVENTS[0].day) s=performAction(resolveFreeDecision(s),'rest');
  const preview=getActionPreview(s,'compete');assert.equal(preview.energy,0);assert.equal(preview.money,0);
  assert.match(getCalendar(s).eventName!,/inscripción/i);
  const confirmed=performAction(s,'compete');assert.equal(confirmed.results[0].score,0);assert.equal(confirmed.results[0].passed,true);
  assert.equal(getContestSummary(confirmed).admissionScore,null);assert.equal(getContestSummary(confirmed).contestTotal,0);
  assert.deepEqual(confirmed.members,s.members);assert.equal(confirmed.money,s.money);save(confirmed);
  const fail=fixture(EVENTS[2].day,[10]);fail.members.forEach(m=>m.energy=0);
  assert.equal(nextSeason(performAction(fail,'compete')).admissionExempt,false);
  assert.equal(parseSave(JSON.stringify({...confirmed,results:[{...confirmed.results[0],score:50}]})),null);
  assert.equal(parseSave(JSON.stringify({...createGame(),admissionExempt:true})),null);
});

test('qualification includes tied tenth places and championship uses all three rounds, excluding admission',()=>{
  const tied=fixture(EVENTS[3].day,[65,65]);
  tied.rivals.forEach((r,i)=>r.scores=i<8?[75,75]:i<11?[65,65]:[50,50]);
  assert.equal(getContestSummary(tied).finalists,12);assert.equal(getContestSummary(tied).contestTotal,130);save(tied);
  const ahead=fixture(EVENTS[3].day,[85,85]),winner=performAction(ahead,'compete');
  assert.equal(winner.status,'won');assert.equal(winner.money,ahead.money+EVENTS[3].prize);save(winner);
  const behind=fixture(EVENTS[3].day,[60,60]);behind.rivals[0].scores=[90,90];behind.upgrades={voices:5,lyrics:5,costumes:5,staging:5};
  const loser=performAction(behind,'compete');assert.equal(loser.status,'lost');assert.ok(loser.results[3].score>80);save(loser);
});

test('role practice, voice arrangement and energy influence artistic evaluation; costumes do not score admission',()=>{
  const s=started(),bad=assignCord(s,s.members[0].id,'Primos');
  assert.ok(getStats(bad).harmony<getStats(s).harmony);
  assert.deepEqual(assignCord(s,s.members[13].id,'Bajos').members,s.members);
  for(const role of ['bombo','redoblante','platillos','director']){
    const weak={...s,members:s.members.map(m=>m.role===role?{...m,skill:0}:m)};
    assert.ok(getStats(weak).quality<getStats(s).quality);
  }
  assert.equal(getStats(buyUpgrade(s,'costumes')).quality,getStats(s).quality);
  assert.ok(getStats(buyUpgrade(s,'lyrics')).quality>getStats(s).quality);
  const licensed=buyLicense(s);assert.equal(LICENSE_COST,0);assert.equal(licensed.money,s.money);assert.equal(licensed.penalty,0);
});

test('v3 migration preserves identities, ability, saved performances and jury ballots, with one explicit financing adjustment',()=>{
  for(const active of [false,true]){
    const v3=legacyV3(0,active),migrated=parseSave(JSON.stringify(v3))!;
    assert.ok(migrated);assert.equal(migrated.version,5);assert.equal(migrated.money,230000+880000);
    assert.equal(migrated.day,active?15:0);assert.equal(migrated.candidates.length,120);
    assert.deepEqual(migrated.members.map(m=>[m.id,m.voice,m.skill,m.assignedCord]),(v3.members as Member[]).map(m=>[m.id,m.voice,m.skill,m.assignedCord]));
    assert.match(migrated.log[0],/880.000/);save(migrated);
    assert.equal(parseSave(JSON.stringify(migrated))!.money,migrated.money);
  }
  const v3=legacyV3(14,true);
  v3.results=[{name:EVENTS[0].name,score:70,passed:true},{name:EVENTS[1].name,score:80,passed:true}];
  v3.rivals=(v3.rivals as State['rivals']).map(r=>({...r,scores:[50]}));
  const migrated=parseSave(JSON.stringify(v3))!;
  assert.equal(migrated.day,28);assert.deepEqual(migrated.results,v3.results);assert.deepEqual(migrated.rivals,v3.rivals);save(migrated);
});

test('migration refunds the actual old technical fee, never the new larger price',()=>{
  const migrated=parseSave(JSON.stringify(legacyV3()))!;
  const oldPaid=migrated.creativeFees.lyrics;assert.equal(oldPaid,18000);
  const replacement=CREATIVE_CANDIDATES.find(c=>c.role==='lyrics'&&c.level==='Profesional')!;
  const changed=hireCreative(migrated,replacement.id);
  assert.equal(changed.money,migrated.money+oldPaid-replacement.fee);save(changed);
});

test('deep save validation rejects corrupted money, roster, market, career, results and financial accounts',()=>{
  const s=started();
  for(const raw of [null,'','{','null','[]','"hello"']) assert.equal(parseSave(raw),null);
  const invalid:unknown[]=[
    {...s,version:2},{...s,money:s.money+1},{...s,money:Infinity},{...s,day:TOTAL_DAYS},{...s,day:19},
    {...s,reputation:NaN},{...s,reputation:101},{...s,accounts:{...s.accounts,recruitment:-1}},
    {...s,members:s.members.slice(1)},{...s,candidates:s.candidates.slice(1)},
    {...s,candidates:[s.members[0],...s.candidates.slice(1)]},
    {...s,members:s.members.map((m,i)=>i?m:{...m,voice:NaN})},
    {...s,members:s.members.map((m,i)=>i?m:{...m,experience:101})},
    {...s,members:s.members.map((m,i)=>i?m:{...m,scouting:5})},
    {...s,members:s.members.map((m,i)=>i?m:{...m,age:1})},
    {...s,members:s.members.map((m,i)=>i?m:{...m,participation:40})},
    {...s,creativeTeam:{...s.creativeTeam,lyrics:null}},
    {...s,costumeProposalId:'arbitrary'},{...s,fallosRevealed:true},
    {...s,results:[{name:EVENTS[0].name,score:20,passed:true}]},
    {...s,rivals:s.rivals.map((r,i)=>i?r:{...r,scores:[50]})},
  ];
  invalid.forEach(input=>assert.equal(parseSave(JSON.stringify(input)),null));
  const ended=win();
  assert.equal(parseSave(JSON.stringify({...ended,status:'lost'})),null);
  assert.equal(parseSave(JSON.stringify({...ended,results:ended.results.map((r,i)=>i===1?{...r,passed:false}:r)})),null);
});

test('public operations leave input unchanged and rejected purchases cannot change the ledger',()=>{
  const s=started(),before=JSON.stringify(s);
  buyUpgrade(s,'voices');performAction(s,'rehearse');buyLicense(s);nextSeason(s);refreshCandidates(s);
  assert.equal(JSON.stringify(s),before);
  const broke=cash(s,0),upgraded=buyUpgrade(broke,'voices');
  assert.deepEqual(upgraded.accounts,broke.accounts);assert.deepEqual(upgraded.upgrades,broke.upgrades);
  assert.equal(getUpgradeCost(s,'voices'),16000);
});

test('contacts have a daily shared limit, per-person cooldown and persist across recruitment and reload',()=>{
  let s=started();
  const ids=s.candidates.slice(0,4).map(member=>member.id), initial=JSON.stringify(s);
  for(const id of ids.slice(0,3)) s=contactCandidate(s,id);
  assert.equal(s.contactsToday,CONTACTS_PER_DAY);assert.equal(getCommunitySummary(s).contactsRemaining,0);
  assert.equal(s.money,started().money);assert.equal(s.seed,started().seed);assert.equal(s.day,0);save(s);
  assert.equal(getContactAvailability(s,ids[3]).enabled,false);
  assert.equal(contactCandidate(s,ids[3]).contactsToday,3);
  const next=performAction(s,'rest');assert.equal(next.contactsToday,0);
  assert.equal(getContactAvailability(next,ids[0]).enabled,false);
  const later=performAction(next,'rest');assert.equal(getContactAvailability(later,ids[0]).enabled,true);
  const contacted=contactCandidate(later,ids[0]);
  assert.equal(contacted.candidates.find(m=>m.id===ids[0])!.rapport,30);save(contacted);
  const willing=contacted.candidates.find(m=>getRecruitmentQuote(contacted,m.id).accepted)!;
  const talked=getContactAvailability(contacted,willing.id).enabled?contactCandidate(contacted,willing.id):contacted;
  const hired=recruit(talked,willing.id);save(hired);
  assert.equal(hired.contactsToday,talked.contactsToday);
  assert.notEqual(JSON.stringify(s),initial);
  const original=started();contactCandidate(original,ids[0]);assert.equal(JSON.stringify(original),initial);
});

test('building rapport can change a refusal while the capped relationship bonus cannot secure every star',()=>{
  let s=started();
  const target=s.candidates.find(m=>m.minReputation>=22&&m.minReputation<=23&&m.loyalty<75)!;
  assert.ok(target);assert.equal(getRecruitmentQuote(s,target.id).accepted,false);
  s=contactCandidate(s,target.id);
  s=performAction(performAction(s,'rest'),'rest');
  s=contactCandidate(s,target.id);
  assert.equal(getRecruitmentQuote(s,target.id).accepted,true);
  assert.equal(s.candidates.find(m=>m.id===target.id)!.voice,target.voice);
  assert.equal(s.candidates.find(m=>m.id===target.id)!.scouting,0);save(s);
  const star=s.candidates.find(m=>m.minReputation>50)!;
  const bonded={...s,reputation:0,candidates:s.candidates.map(m=>m.id===star.id?{...m,rapport:100}:m)};
  assert.equal(getRecruitmentQuote(bonded,star.id,'premium').accepted,false);
});

test('fundraisers account for income and upfront costs separately, consume a day and stop at three',()=>{
  let s=started();
  for(let count=0;count<FUNDRAISER_LIMIT;count++){
    const before=s,festival=getEconomySummary(s).fundraiser,preview=getActionPreview(s,'fundraiser');
    assert.equal(getActionAvailability(s,'fundraiser').enabled,true);
    s=performAction(s,'fundraiser');
    assert.equal(s.money,before.money+festival.gross-festival.cost);
    assert.equal(s.accounts.communityIncome,before.accounts.communityIncome+festival.gross);
    assert.equal(s.accounts.communityCosts,before.accounts.communityCosts+festival.cost);
    assert.equal(preview.money,s.money-before.money);assert.equal(s.day,before.day+1);
    assert.equal(s.fundraisersUsed,count+1);assert.equal(s.fans,before.fans+35);
    assert.deepEqual(s.members.map(m=>[m.voice,m.skill,m.experience]),before.members.map(m=>[m.voice,m.skill,m.experience]));save(s);
  }
  assert.equal(getActionAvailability(s,'fundraiser').enabled,false);
  assert.equal(performAction(s,'fundraiser').money,s.money);
  assert.equal(getActionAvailability(cash(started(),0),'fundraiser').enabled,false);
  for(const day of [16,17,18,24,25,28,31]) assert.equal(getActionAvailability({...started(),day},'fundraiser').enabled,false);
  assert.equal(getActionAvailability(createGame(),'fundraiser').enabled,false);
});

test('community meetings improve wellbeing and existing ties, cost money, and clamp every effect',()=>{
  const s=started(),preview=getActionPreview(s,'community');
  const meeting=performAction(s,'community');
  assert.equal(meeting.day,1);assert.equal(meeting.money-s.money,preview.money);
  assert.equal(meeting.accounts.communityCosts,getEconomySummary(s).community);
  for(const [i,member] of meeting.members.entries()){
    assert.equal(member.morale,s.members[i].morale+10);assert.equal(member.rapport,s.members[i].rapport+5);
    assert.equal(member.loyalty,s.members[i].loyalty+3);assert.equal(member.experience,s.members[i].experience);
  }
  save(meeting);
  const full={...s,members:s.members.map(m=>({...m,energy:100,morale:100,rapport:100,loyalty:100}))};
  const capped=performAction(full,'community');
  assert.equal(getActionPreview(full,'community').energy,0);assert.match(getActionPreview(full,'community').label,/hasta/);
  assert.ok(capped.members.every(m=>m.morale===100&&m.energy===100&&m.rapport===100&&m.loyalty===100));
  const sad={...s,members:s.members.map(m=>({...m,morale:0}))};
  const happy={...s,members:s.members.map(m=>({...m,morale:100}))};
  assert.ok(getStats(happy).projectedScore>getStats(sad).projectedScore);
  assert.ok(getStats(happy).projectedScore-getStats(sad).projectedScore<10,'morale is a gentle effect');
  assert.equal(getActionAvailability(cash(s,0),'community').enabled,false);
});

test('decisions block all advancing actions, retain a free alternative, and apply one recorded choice exactly once',()=>{
  let s=started();
  while(s.day<DECISION_DAYS[0]) s=performAction(s,'rest');
  assert.equal(s.pendingDecision,getPendingDecision(s)!.id);save(s);
  for(const action of ['rehearse','rest','popular','commercial','compete','community','fundraiser'] as Action[]){
    const blocked=performAction(s,action);
    assert.equal(blocked.day,s.day);assert.equal(blocked.money,s.money);assert.deepEqual(blocked.members,s.members);
  }
  const decision=getPendingDecision(s)!,paid=decision.options.find(option=>option.cost>0)!;
  const poor=cash(s,0),poorOptions=getPendingDecision(poor)!.options;
  assert.ok(poorOptions.some(option=>option.cost===0&&option.enabled));
  assert.equal(resolveDecision(poor,paid.id).money,poor.money);
  assert.equal(resolveDecision(s,'wrong-option').pendingDecision,s.pendingDecision);
  const resolved=resolveDecision(s,paid.id);
  assert.equal(resolved.day,s.day);assert.equal(resolved.money,s.money-paid.cost);
  assert.equal(resolved.accounts.communityCosts,s.accounts.communityCosts+paid.cost);
  assert.equal(resolved.pendingDecision,null);assert.equal(getPendingDecision(resolved),null);
  assert.deepEqual(getDecisionHistory(resolved),[{id:decision.id,title:decision.title,choice:paid.label,day:s.day}]);save(resolved);
  const twice=resolveDecision(resolved,paid.id);assert.equal(twice.money,resolved.money);assert.deepEqual(twice.members,resolved.members);
  assert.equal(performAction(resolved,'rest').day,s.day+1);
});

test('a full season resolves all six choices without skipping competition and resets only seasonal community counters',()=>{
  const ended=win();
  assert.deepEqual(ended.decisionHistory.map(record=>record.day),[...DECISION_DAYS]);
  assert.equal(getCommunitySummary(ended).contactsRemaining,0);
  assert.equal(ended.resolvedDecisions.length,6);assert.equal(getDecisionHistory(ended).length,6);
  assert.ok(getDecisionHistory(ended).every(record=>record.choice!=='Anterior a esta actualización'));
  const newYear=nextSeason(ended);assert.equal(newYear.pendingDecision,null);assert.deepEqual(newYear.decisionHistory,[]);
  assert.deepEqual(newYear.resolvedDecisions,[]);assert.equal(newYear.contactsToday,0);assert.equal(newYear.fundraisersUsed,0);
  assert.equal(getCommunitySummary(newYear).contactsRemaining,CONTACTS_PER_DAY);
  assert.deepEqual(newYear.members.map(member=>member.rapport),ended.members.map(member=>member.rapport));save(newYear);
});

test('v4 migration retains all old fields, activates only the current decision and never fabricates past choices',()=>{
  for(const day of [0,7,8,13]){
    const v4=toV4({...started(),day});
    const migrated=parseSave(JSON.stringify(v4))!;
    assert.ok(migrated);assert.equal(migrated.version,5);assert.deepEqual(toV4(migrated),v4);
    assert.equal(migrated.accounts.communityIncome,0);assert.equal(migrated.accounts.communityCosts,0);
    assert.equal(migrated.contactsToday,0);assert.equal(migrated.fundraisersUsed,0);
    assert.ok(migrated.members.every(member=>member.morale===70&&member.lastContactDay===-1));
    assert.ok(getDecisionHistory(migrated).every(record=>record.choice==='Anterior a esta actualización'&&record.day<day));
    assert.equal(Boolean(getPendingDecision(migrated)),DECISION_DAYS.includes(day));save(migrated);
  }
  const ended=win(),v4=toV4({...ended,accounts:{...ended.accounts,communityIncome:0,communityCosts:0}});
  // The old ledger has no community costs. Restore the cash corresponding to it.
  (v4 as Record<string,unknown>).money=ended.money+ended.accounts.communityCosts-ended.accounts.communityIncome;
  const migrated=parseSave(JSON.stringify(v4))!;assert.ok(migrated);assert.equal(migrated.status,ended.status);
  assert.deepEqual(migrated.results,ended.results);assert.deepEqual(migrated.rivals,ended.rivals);
  assert.equal(migrated.pendingDecision,null);
});

test('v5 validation rejects forged contact counters, missing decisions, repeated history and unfunded choices',()=>{
  let s=started();while(s.day<7) s=performAction(s,'rest');
  const decision=getPendingDecision(s)!,paid=decision.options.find(option=>option.cost>0)!;
  const resolved=resolveDecision(s,paid.id);
  const corrupt:unknown[]=[
    {...s,pendingDecision:null},{...s,pendingDecision:'invented'},{...s,resolvedDecisions:['invented']},
    {...s,contactsToday:4},{...s,contactsToday:1},{...s,fundraisersUsed:4},
    {...s,candidates:s.candidates.map((member,i)=>i?member:{...member,lastContactDay:8})},
    {...s,candidates:s.candidates.map((member,i)=>i?member:{...member,rapport:101})},
    {...s,members:s.members.map((member,i)=>i?member:{...member,morale:-1})},
    {...resolved,decisionHistory:[]},
    {...resolved,resolvedDecisions:[...resolved.resolvedDecisions,...resolved.resolvedDecisions]},
    {...resolved,decisionHistory:[{id:decision.id,optionId:'wrong',day:s.day}]},
    {...resolved,decisionHistory:[{id:decision.id,optionId:paid.id,day:s.day-1}]},
    {...resolved,money:resolved.money+paid.cost,accounts:{...resolved.accounts,communityCosts:0}},
    {...resolved,day:14,pendingDecision:null},
    {...started(),fundraisersUsed:1},
  ];
  for(const value of corrupt) assert.equal(parseSave(JSON.stringify(value)),null);
});
