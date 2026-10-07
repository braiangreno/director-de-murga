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
  setIdentity,validateIdentity,getSeasonReport,getSeasonHistory,getRosterProgress,getCareerSummary,HISTORY_LIMIT,
  SHOW_THEMES,SHOW_SECTIONS,validateShowPlan,configureShow,setRehearsalFocus,developShow,getShowSummary,getShowWorkAvailability,
  type ShowSectionId,type ShowWork,type RehearsalFocus,
  getRenewalQuote,getRenewalSummary,renewMember,renewAllWilling,contactMember,getContractReserve,
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
  const {contactsToday,fundraisersUsed,pendingDecision,resolvedDecisions,decisionHistory,show,pendingRenewals,...old}=state;
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
  assert.equal(newYear.money,ended.money+SEASON_FINANCING);assert.equal(newYear.reputation,ended.reputation);
  assert.equal(newYear.accounts.recruitment,0);
  assert.equal(getSeasonRenewalCost(newYear),getSeasonRenewalCost(ended));
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
  let s=renewAllWilling(nextSeason(win()));assert.equal(s.admissionExempt,true);
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
    assert.ok(migrated);assert.equal(migrated.version,8);assert.equal(migrated.money,230000+880000);
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
    assert.ok(migrated);assert.equal(migrated.version,8);assert.deepEqual(toV4(migrated),v4);
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



function asV5(state:State):Record<string,unknown> {
  const {identity,history,career,show,pendingRenewals,...previous}=state;
  return {...previous,version:5};
}
function failAdmission(state:State,develop=false):State {
  let s=renewAllWilling(state);
  for(const id of [...s.pendingRenewals]) {
    if(getRenewalQuote(s,id,'premium').accepted) {s=renewMember(s,id,'premium');continue;}
    const role=s.members.find(member=>member.id===id)!.role;
    const replacement=s.candidates.filter(member=>member.role===role&&getRecruitmentQuote(s,member.id,'premium').accepted)
      .sort((a,b)=>a.cost-b.cost)[0];
    assert.ok(replacement,'a willing affordable market replacement remains available');
    s=recruit(s,replacement.id,id,'premium');
  }
  assert.equal(s.pendingRenewals.length,0);
  for(const role of CREATIVE_ROLES) s=hireCreative(s,CREATIVE_CANDIDATES.find(candidate=>candidate.role===role&&candidate.level==='Barrial')!.id);
  s=startSeason(s);
  if(develop) s=developShow(s,'saludo','text');
  while(s.day<EVENTS[0].day) s=performAction(resolveFreeDecision(s),'rest');
  s={...s,members:s.members.map(member=>({...member,energy:0}))};
  return performAction(s,'compete');
}

test('identity accepts accented names and normalized spaces without changing the game model',()=>{
  const s=createGame(),before=JSON.stringify(s);
  const renamed=setIdentity(s,{name:'  La   Última  Ronda  ',barrio:'  Peñarol  '});
  assert.deepEqual(renamed.identity,{name:'La Última Ronda',barrio:'Peñarol'});
  assert.equal(renamed.money,s.money);assert.equal(renamed.day,s.day);assert.equal(renamed.seed,s.seed);
  assert.deepEqual(renamed.accounts,s.accounts);assert.deepEqual(renamed.members,s.members);
  assert.deepEqual(getStats(renamed),getStats(s));assert.equal(JSON.stringify(s),before);save(renamed);
  for(const name of ['A','x'.repeat(41),'<script>','Una\u0000murga','Dos\nfilas','Oculto\u202e']){
    const result=setIdentity(s,{name,barrio:'Cordón'});assert.deepEqual(result.identity,s.identity);
    assert.equal(validateIdentity({name,barrio:'Cordón'}).valid,false);
  }
  for(const barrio of ['','X','<b>Centro</b>','x'.repeat(41)]) assert.equal(validateIdentity({name:'La Murga',barrio}).valid,false);
  assert.equal(validateIdentity({name:'Los del Sur',barrio:'Parque Rodó'}).valid,true);
  const finished=setIdentity(win(),{name:'La Ronda',barrio:'Unión'});
  assert.equal(getStandings(finished).find(row=>row.isPlayer)!.name,'La Ronda');
});

test('public season reports conceal every jury mark, total and rank until fallos, including eliminated groups',()=>{
  const first=performAction(fixture(EVENTS[1].day),'compete'),during=getSeasonReport(first);
  assert.equal(during.scoresPublic,false);assert.equal(during.results[0].score,70);
  assert.equal(during.results[1].score,null);assert.equal(during.contestTotal,null);
  assert.equal(during.contestAverage,null);assert.equal(during.rank,null);
  assert.deepEqual(Object.keys(during.roster[0]).sort(),['experience','fame','id','name','role']);
  const weak=fixture(EVENTS[2].day,[10]);weak.members.forEach(member=>member.energy=0);
  const eliminated=performAction(weak,'compete'),sealed=getSeasonReport(eliminated);
  assert.equal(sealed.outcome,'second-round');assert.equal(sealed.scoresPublic,false);
  assert.ok(sealed.results.slice(1).every(result=>result.score===null));assert.equal(sealed.rank,null);
  assert.deepEqual(getSeasonHistory(eliminated),[]);
  const revealed=getSeasonReport(revealEliminatedFallos(eliminated));
  assert.equal(revealed.scoresPublic,true);
  assert.deepEqual(revealed.results.slice(1).map(result=>result.score),eliminated.results.slice(1).map(result=>result.score));
  const ended=win(),final=getSeasonReport(ended);
  assert.equal(final.scoresPublic,true);assert.equal(final.rank,1);assert.equal(final.contestTotal,getContestSummary(ended).contestTotal);
  assert.equal(getSeasonReport({...fixture(EVENTS[3].day,[75,75]),status:'playing'}).rank,null);
});

test('successful annual closure archives the old identity, roster and cash before any renewal or growth',()=>{
  const ended=setIdentity(win(),{name:'La Primera Esquina',barrio:'La Teja'}),before=JSON.stringify(ended);
  const next=nextSeason(ended),archive=getSeasonHistory(next)[0];
  assert.equal(archive.season,ended.season);assert.equal(archive.outcome,'champion');
  assert.equal(archive.closingCash,ended.money);assert.equal(archive.cash,ended.money);
  assert.deepEqual(archive.accounts,ended.accounts);assert.equal(archive.reputation,ended.reputation);assert.equal(archive.fans,ended.fans);
  assert.deepEqual(archive.identity,ended.identity);
  assert.deepEqual(archive.roster.map(m=>[m.id,m.experience,m.fame]),ended.members.map(m=>[m.id,m.experience,m.fame]));
  assert.equal(archive.contestTotal,getContestSummary(ended).contestTotal);
  assert.equal(next.career.completedSeasons,1);assert.equal(next.career.championships,1);assert.equal(next.career.finals,1);
  assert.equal(JSON.stringify(ended),before);save(next);
  const renamed=setIdentity(next,{name:'Otra Identidad',barrio:'Buceo'});
  assert.equal(renamed.history[0].identity.name,'La Primera Esquina');
  assert.equal(next.history[0].identity.name,'La Primera Esquina');
  assert.deepEqual(nextSeason(next).history,next.history);
  assert.equal(nextSeason(next).money,next.money);assert.equal(nextSeason(next).members[0].experience,next.members[0].experience);
  assert.deepEqual(nextSeason(ended),next,'repeating from the same immutable input cannot accumulate rewards');
});

test('archiving an eliminated year publishes its results only after a successful annual transition',()=>{
  const weak=fixture(EVENTS[2].day,[10]);weak.members.forEach(member=>member.energy=0);
  const ended=performAction(weak,'compete');
  assert.equal(getSeasonReport(ended).contestTotal,null);
  const next=nextSeason(ended),archive=getSeasonHistory(next)[0];
  assert.equal(archive.outcome,'second-round');assert.equal(archive.scoresPublic,true);
  assert.equal(archive.roundsCompleted,2);assert.equal(archive.contestTotal,getContestSummary(ended).contestTotal);
  assert.equal(next.career.finals,0);assert.equal(next.career.championships,0);save(next);
  const broke=cash({...ended,members:ended.members.map(member=>({...member,cost:5000000}))},0);
  const funded=nextSeason(broke);
  assert.equal(funded.season,broke.season+1);assert.equal(funded.money,SEASON_FINANCING);
  assert.equal(funded.accounts.recruitment,0);assert.equal(funded.pendingRenewals.length,17);
  assert.equal(funded.history.length,1);assert.equal(funded.history[0].closingCash,0);
  assert.equal(funded.history[0].contestTotal,getContestSummary(broke).contestTotal);save(funded);
});

test('public getters and subsequent states cannot mutate archived identities, financial accounts or roster snapshots',()=>{
  const next=nextSeason(setIdentity(win(),{name:'La Memoria',barrio:'Aguada'}));
  const saved=JSON.stringify(next);
  const history=getSeasonHistory(next),report=getSeasonReport(next),progress=getRosterProgress(next),career=getCareerSummary(next);
  history[0].identity.name='Alterada';history[0].accounts.opening=0;history[0].roster[0].experience=0;history[0].results[1].score=0;
  report.identity.name='Tampoco';report.accounts.opening=0;report.roster[0].fame=0;
  progress[0].name='No cambia';career.championships=999;
  assert.equal(JSON.stringify(next),saved);
  const changed=setIdentity(next,{name:'Nueva Etapa',barrio:'Cerrito'});
  changed.history[0].roster[0].name='Copia ajena';
  assert.notEqual(next.history[0].roster[0].name,'Copia ajena');
});

test('roster comparisons use only public experience and fame for matching IDs from the latest closure',()=>{
  assert.ok(getRosterProgress(createGame()).every(row=>row.previousExperience===null&&row.experienceDelta===null&&row.fameDelta===null));
  let next=nextSeason(win());
  const previous=next.history[0].roster[0],current=next.members[0],row=getRosterProgress(next)[0];
  assert.equal(row.previousExperience,previous.experience);
  assert.equal(row.experienceDelta,Math.round((current.experience-previous.experience)*10)/10);
  assert.equal(row.fameDelta,current.fame-previous.fame);
  assert.ok(row.experienceDelta!>0);assert.ok(row.fameDelta!>0);
  const candidate=next.candidates.find(member=>member.role===current.role&&getRecruitmentQuote(next,member.id).accepted)!;
  next=recruit(next,candidate.id,current.id);
  const newRow=getRosterProgress(next).find(member=>member.id===candidate.id)!;
  assert.equal(newRow.previousExperience,null);assert.equal(newRow.previousFame,null);assert.equal(newRow.experienceDelta,null);save(next);
  assert.ok(!Object.hasOwn(newRow,'voice')&&!Object.hasOwn(newRow,'skill')&&!Object.hasOwn(newRow,'charisma'));
});

test('admission exemptions are null in both public reports and archives and never count toward contest points',()=>{
  let s=renewAllWilling(nextSeason(win()));
  for(const role of CREATIVE_ROLES) s=hireCreative(s,CREATIVE_CANDIDATES.find(candidate=>candidate.role===role&&candidate.level==='Barrial')!.id);
  s=startSeason(s);
  while(s.day<EVENTS[0].day) s=performAction(resolveFreeDecision(s),'rest');
  s=performAction(s,'compete');
  assert.equal(getSeasonReport(s).results[0].score,null);
  // Valid final fixture of the same directly admitted second campaign.
  s={...s,day:EVENTS[3].day,results:[s.results[0],{name:EVENTS[1].name,score:85,passed:true},{name:EVENTS[2].name,score:85,passed:true}],
    rivals:s.rivals.map(rival=>({...rival,scores:[50,50]}))};
  s.resolvedDecisions=[];s.decisionHistory=[];
  for(const day of DECISION_DAYS){
    const atDay={...s,day,pendingDecision:null};
    const resolved=resolveFreeDecision(atDay);
    s.resolvedDecisions=resolved.resolvedDecisions;s.decisionHistory=resolved.decisionHistory;
  }
  s.pendingDecision=null;s=performAction(s,'compete');assert.equal(s.status,'won');save(s);
  const archive=nextSeason(s).history.at(-1)!;
  assert.equal(archive.admissionExempt,true);assert.equal(archive.results[0].score,null);
  assert.equal(archive.contestTotal,Math.round(archive.results.slice(1).reduce((sum,result)=>sum+result.score!,0)*10)/10);
});

test('v5 migration preserves every old field and begins counters at the current year without inventing archives',()=>{
  const old={...started(),season:17};
  const v5=asV5(old),migrated=parseSave(JSON.stringify(v5))!;
  assert.ok(migrated);assert.equal(migrated.version,8);assert.deepEqual(asV5(migrated),v5);
  assert.deepEqual(migrated.identity,{name:'La Vereda',barrio:'Montevideo'});
  assert.deepEqual(migrated.history,[]);assert.deepEqual(migrated.career,{sinceSeason:17,completedSeasons:0,championships:0,finals:0});
  assert.ok(getRosterProgress(migrated).every(row=>row.experienceDelta===null));
  assert.deepEqual(getCareerSummary(migrated),{sinceSeason:17,completedSeasons:0,championships:0,finals:0,retainedSeasons:0,historyLimit:50,omittedSeasons:0});
  save(migrated);
  const finished=win();
  const ended=asV5({...finished,season:17,costumeProposalId:finished.costumeProposalId!.replace('-s1-','-s17-')});
  const continued=nextSeason(parseSave(JSON.stringify(ended))!);
  assert.equal(continued.history.length,1);assert.equal(continued.history[0].season,17);
  assert.equal(continued.career.completedSeasons,1);assert.equal(continued.career.sinceSeason,17);save(continued);
});

test('only the latest 50 detailed years are retained while recorded lifetime counts remain accurate',()=>{
  let state=createGame();
  for(let year=1;year<=52;year++){
    state=setIdentity(state,{name:`Los Años ${year}`,barrio:'Prado'});
    const ended=failAdmission(state,true);assert.equal(ended.status,'lost');assert.equal(ended.day,EVENTS[0].day);
    state=nextSeason(ended);
    assert.equal(state.career.completedSeasons,year);
  }
  assert.equal(HISTORY_LIMIT,50);assert.equal(state.history.length,50);
  assert.equal(state.history[0].season,3);assert.equal(state.history.at(-1)!.season,52);
  assert.equal(state.history[0].identity.name,'Los Años 3');
  assert.ok(state.history.every(entry=>entry.show?.sections[0].text===52));
  assert.deepEqual(getCareerSummary(state),{sinceSeason:1,completedSeasons:52,championships:0,finals:0,retainedSeasons:50,historyLimit:50,omittedSeasons:2});
  assert.ok(JSON.stringify(state).length<600000);save(state);
});

test('archive validation rejects hidden member fields, inconsistent financial totals, duplicate years and forged counters',()=>{
  const state=nextSeason(win()),entry=state.history[0];
  const corrupt:unknown[]=[
    {...state,identity:{name:'<script>',barrio:'Cordón'}},
    {...state,identity:{name:' La Vereda ',barrio:'Montevideo'}},
    {...state,career:{...state.career,completedSeasons:2}},
    {...state,career:{...state.career,championships:0}},
    {...state,history:[]},
    {...state,history:[entry,entry]},
    {...state,history:[{...entry,season:state.season}]},
    {...state,history:[{...entry,identity:{...entry.identity,barrio:'X'}}]},
    {...state,history:[{...entry,closingCash:entry.closingCash+1}]},
    {...state,history:[{...entry,accounts:{...entry.accounts,technical:entry.accounts.technical+1}}]},
    {...state,history:[{...entry,roster:entry.roster.map((member,index)=>index?member:{...member,skill:99})}]},
    {...state,history:[{...entry,roster:[entry.roster[1],...entry.roster.slice(1)]}]},
    {...state,history:[{...entry,results:entry.results.map((result,index)=>index===1?{...result,score:null}:result)}]},
    {...state,history:[{...entry,contestTotal:0}]},
    {...state,history:[{...entry,scoresPublic:false}]},
    {...state,history:[{...entry,rank:2}]},
    {...state,history:[{...entry,outcome:'in-progress'}]},
  ];
  for(const value of corrupt) assert.equal(parseSave(JSON.stringify(value)),null);
});

function asV6(state:State):Record<string,unknown> {
  const {show,pendingRenewals,...previous}=state;
  return {...previous,version:6,history:state.history.map(entry=>{const {show,...archive}=entry;return archive;})};
}
function prepareSections(state:State,passes=1):State {
  let next=state;
  for(let pass=0;pass<passes;pass++) for(const {id} of SHOW_SECTIONS) for(const work of ['text','arrangements'] as const)
    next=developShow(resolveFreeDecision(next),id,work);
  return next;
}

test('show planning accepts normalized titles and known themes, is free, and locks only on successful work or rehearsal',()=>{
  const original=createGame(),before=JSON.stringify(original);
  assert.equal(getShowSummary(original).readiness,0);assert.equal(getShowSummary(original).canEdit,true);
  assert.deepEqual(SHOW_SECTIONS.map(section=>section.id),['saludo','cuple','retirada']);
  const planned=configureShow(original,{title:'  Una   Última  Voz  ',themeId:'memoria'});
  assert.equal(planned.show.title,'Una Última Voz');assert.equal(planned.show.themeId,'memoria');assert.equal(planned.show.locked,false);
  assert.equal(planned.day,original.day);assert.equal(planned.money,original.money);assert.equal(planned.seed,original.seed);
  assert.deepEqual(planned.members,original.members);assert.deepEqual(planned.accounts,original.accounts);save(planned);
  assert.deepEqual(getStats(planned),getStats(original));assert.equal(JSON.stringify(original),before);
  for(const title of ['X','a'.repeat(61),'<b>Una voz</b>','Una\nvoz','Invisible\u202e','Una\u0000voz'])
    assert.equal(validateShowPlan({title,themeId:'barrio'}).valid,false);
  for(const input of [null,{},[],{title:'Una voz',themeId:'unknown'},{title:42,themeId:'barrio'}])
    assert.equal(validateShowPlan(input).valid,false);
  assert.equal(validateShowPlan({title:'á'.repeat(60),themeId:'satira'}).valid,true);
  assert.deepEqual(configureShow(planned,{title:'X',themeId:'barrio'}).show,planned.show);
  assert.deepEqual(developShow(planned,'saludo','text').show,planned.show,'rejected setup work cannot lock the plan');
  let s=started();while(s.day<REHEARSALS_START_DAY)s=performAction(s,'rest');
  assert.equal(s.show.locked,false);
  s=performAction(s,'rehearse');assert.equal(s.show.locked,true);assert.equal(getShowSummary(s).canEdit,false);
  assert.deepEqual(configureShow(s,{title:'Otro nombre',themeId:'satira'}).show,s.show);save(s);
});

test('technical development consumes one day and its exact ledger cost without artist energy, experience or seed changes',()=>{
  const s=contactCandidate(started(),started().candidates[0].id),before=JSON.stringify(s);
  const preview=getShowWorkAvailability(s,'saludo','text');assert.deepEqual(preview,{enabled:true,reason:'',cost:4000,gain:52});
  const next=developShow(s,'saludo','text');
  assert.equal(next.day,s.day+1);assert.equal(next.money,s.money-preview.cost);
  assert.equal(next.accounts.rehearsals,s.accounts.rehearsals+preview.cost);
  assert.deepEqual(next.members,s.members);assert.deepEqual(next.candidates,s.candidates);
  assert.equal(next.seed,s.seed);assert.equal(next.contactsToday,0);assert.equal(next.show.sections.saludo.text,preview.gain);
  assert.equal(next.show.locked,true);assert.equal(JSON.stringify(s),before);save(next);
  const arranged=developShow(next,'saludo','arrangements');
  assert.equal(arranged.day,2);assert.equal(arranged.accounts.rehearsals,9000);assert.equal(arranged.show.sections.saludo.arrangements,52);save(arranged);
  const finished=developShow(next,'saludo','text');assert.equal(finished.show.sections.saludo.text,100);
  assert.equal(getShowWorkAvailability(next,'saludo','text').gain,48);
  const saturated=developShow(finished,'saludo','text');
  assert.equal(saturated.money,finished.money);assert.equal(saturated.day,finished.day);assert.deepEqual(saturated.show,finished.show);
  assert.equal(getShowWorkAvailability(finished,'saludo','text').enabled,false);assert.equal(getShowWorkAvailability(finished,'saludo','text').gain,0);save(finished);
});

test('show work cannot bypass setup, cash, decisions, official presentations, invalid inputs or the end of a campaign',()=>{
  let decisionDay=started();while(decisionDay.day<7)decisionDay=performAction(decisionDay,'rest');
  const blockedStates=[createGame(),cash(started(),0),decisionDay,win(),...EVENTS.map(event=>({...started(),day:event.day}))];
  for(const state of blockedStates) for(const work of ['text','arrangements'] as const){
    assert.equal(getShowWorkAvailability(state,'cuple',work).enabled,false);
    const blocked=developShow(state,'cuple',work);
    assert.equal(blocked.day,state.day);assert.equal(blocked.money,state.money);assert.deepEqual(blocked.show,state.show);assert.deepEqual(blocked.members,state.members);
  }
  for(const [section,work] of [['wrong','text'],['saludo','wrong'],['__proto__','text'],['saludo','toString']]){
    const state=started(),blocked=developShow(state,section as ShowSectionId,work as ShowWork);
    assert.equal(blocked.day,0);assert.deepEqual(blocked.show,state.show);
  }
  let approaching=started();while(approaching.day<6) approaching=performAction(approaching,'rest');
  const arrived=developShow(approaching,'retirada','arrangements');
  assert.equal(arrived.day,7);assert.equal(arrived.pendingDecision,getPendingDecision(arrived)!.id);save(arrived);
  const resumed=developShow(resolveFreeDecision(arrived),'retirada','text');assert.equal(resumed.day,8);save(resumed);
  const beforeAdmission={...started(),day:17};
  const onAdmission=developShow(beforeAdmission,'saludo','text');
  assert.equal(onAdmission.day,18);assert.equal(developShow(onAdmission,'saludo','text').day,18);
});

test('the contracted specialist and chosen theme affect work speed without changing price or making one theme universally faster',()=>{
  const basic=started();
  const expert=startSeason(hireCreative(setup(),CREATIVE_CANDIDATES.find(candidate=>candidate.role==='lyrics'&&candidate.level==='Referente')!.id));
  assert.equal(getShowWorkAvailability(expert,'saludo','text').gain,62);
  assert.equal(getShowWorkAvailability(basic,'saludo','text').gain,52);
  assert.equal(getShowWorkAvailability(expert,'saludo','arrangements').gain,getShowWorkAvailability(basic,'saludo','arrangements').gain);
  for(const theme of SHOW_THEMES){
    const state=configureShow(basic,{title:'El nuevo espectáculo',themeId:theme.id});
    const text=getShowWorkAvailability(state,'cuple','text'),arrangements=getShowWorkAvailability(state,'cuple','arrangements');
    assert.equal(text.cost,4000);assert.equal(arrangements.cost,5000);assert.equal(text.gain+arrangements.gain,104);
    if(theme.id==='memoria')assert.ok(arrangements.gain>text.gain);
    if(theme.id==='satira')assert.ok(text.gain>arrangements.gain);
    if(theme.id==='barrio')assert.equal(text.gain,arrangements.gain);
  }
});

test('focused rehearsal concentrates the same potential practice, respects writing and arrangement readiness, and keeps ordinary practice effects',()=>{
  const prepared=prepareSections(started());assert.equal(prepared.day,6);save(prepared);
  const general=performAction(prepared,'rehearse');
  const focused=performAction(setRehearsalFocus(prepared,'cuple'),'rehearse');
  assert.deepEqual(Object.values(general.show.sections).map(section=>section.rehearsal),[12,12,12]);
  assert.deepEqual(Object.values(focused.show.sections).map(section=>section.rehearsal),[0,36,0]);
  assert.deepEqual(focused.members,general.members);assert.equal(focused.money,general.money);assert.equal(focused.day,general.day);
  assert.equal(focused.members[0].experience,Math.round((prepared.members[0].experience+.4)*10)/10);
  assert.equal(focused.members[0].energy,prepared.members[0].energy-8);save(general);save(focused);
  const capped=performAction(resolveFreeDecision(focused),'rehearse');
  assert.equal(capped.show.sections.cuple.rehearsal,61.6,'both text and arrangements52 allow20+.8*52');save(capped);
  const nextText=developShow(capped,'cuple','text');
  const stillCapped=performAction(nextText,'rehearse');assert.equal(stillCapped.show.sections.cuple.rehearsal,61.6,'text alone cannot lift the arrangements bottleneck');
  const completedTextAndMusic=developShow(stillCapped,'cuple','arrangements');
  const released=performAction(completedTextAndMusic,'rehearse');assert.equal(released.show.sections.cuple.rehearsal,97.6);save(released);
  let empty=started();while(empty.day<6)empty=performAction(empty,'rest');
  const safe=performAction(setRehearsalFocus(empty,'saludo'),'rehearse');assert.equal(safe.show.sections.saludo.rehearsal,20,'no new obligation prevents ordinary rehearsals');
  const invalid=setRehearsalFocus(prepared,'unknown' as RehearsalFocus);assert.deepEqual(invalid.show,prepared.show);
  const event=fixture(EVENTS[1].day),changed=setRehearsalFocus(event,'retirada');
  assert.equal(changed.day,event.day);assert.equal(changed.money,event.money);assert.equal(getActionAvailability(changed,'rest').enabled,false);
  const ended=win();assert.deepEqual(setRehearsalFocus(ended,'saludo').show,ended.show);
});

test('production progress has a bounded positive artistic effect while public summaries never expose jury scores or talent',()=>{
  const empty=started(),complete=structuredClone(empty);
  for(const section of Object.values(complete.show.sections))Object.assign(section,{text:100,arrangements:100,rehearsal:100});
  complete.show.locked=true;
  const before=getStats(empty),after=getStats(complete);
  assert.ok(after.quality>before.quality);assert.ok(after.quality-before.quality<=3.21);
  assert.equal(after.harmony,before.harmony);assert.equal(after.energy,before.energy);
  const summary=getShowSummary(complete);assert.equal(summary.readiness,100);
  assert.ok(!Object.hasOwn(summary,'projectedScore')&&!Object.hasOwn(summary,'quality'));
  const first=performAction(fixture(EVENTS[1].day),'compete'),publicReport=getSeasonReport(first);
  assert.equal(publicReport.rank,null);assert.equal(publicReport.contestTotal,null);assert.equal(publicReport.results[1].score,null);
  assert.ok(publicReport.show);assert.ok(!Object.hasOwn(publicReport.show,'score'));
  assert.deepEqual(Object.keys(publicReport.show.sections[0]).sort(),['arrangements','id','rehearsal','text']);
  summary.sections[0].text=0;publicReport.show.sections[0].text=100;
  assert.equal(complete.show.sections.saludo.text,100);assert.equal(first.show.sections.saludo.text,0);
});

test('v6 migration preserves a real archived year, the current career and sealed results without fabricating previous production',()=>{
  const second=nextSeason(setIdentity(win(),{name:'Los del Andén',barrio:'Peñarol'}));
  const old=asV6(setIdentity(second,{name:'Los del Andén Renovada',barrio:'Peñarol'}));
  const migrated=parseSave(JSON.stringify(old));assert.ok(migrated);
  assert.equal(migrated.version,8);assert.equal(migrated.season,2);assert.equal(migrated.history.length,1);
  assert.deepEqual(asV6(migrated),old);assert.equal(migrated.history[0].show,null);
  assert.equal(migrated.show.locked,false);assert.equal(getShowSummary(migrated).readiness,0);save(migrated);
  assert.equal(migrated.history[0].identity.name,'Los del Andén');assert.equal(migrated.identity.name,'Los del Andén Renovada');
  const beforeFallos=performAction(fixture(EVENTS[1].day),'compete'),oldActive=asV6(beforeFallos);
  const active=parseSave(JSON.stringify(oldActive))!;assert.ok(active);assert.deepEqual(asV6(active),oldActive);
  assert.equal(getSeasonReport(active).contestTotal,null);assert.equal(getSeasonReport(active).rank,null);
  assert.deepEqual(getStats(active),getStats({...beforeFallos,show:createGame().show}));
});

test('all three thematic plans can reach complete production within32 periods and win without bypassing choices or events',()=>{
  for(const theme of SHOW_THEMES){
    let s=configureShow(setup(),{title:`Una temporada de ${theme.id}`,themeId:theme.id});
    s=chooseCostumeProposal(s,getCostumeProposals(s)[0].id);s=startSeason(s);
    for(let i=0;i<4;i++){s=buyUpgrade(s,'voices');s=buyUpgrade(s,'lyrics');}
    s=prepareSections(s,2);assert.equal(s.day,12);save(s);
    const rehearsalDays=[12,13,14,15,16,20,21,22,23];
    while(s.status==='playing'){
      s=resolveFreeDecision(s);
      const action:Action=EVENTS.some(event=>event.day===s.day)?'compete':rehearsalDays.includes(s.day)?'rehearse':'rest';
      const previousDay=s.day;s=performAction(s,action);save(s);
      assert.ok(s.status!=='playing'||s.day===previousDay+1);
    }
    assert.equal(s.status,'won',`${theme.id}: ${s.lastMessage}`);assert.equal(getShowSummary(s).readiness,100);
    assert.equal(s.results.length,4);assert.equal(s.resolvedDecisions.length,6);
    const snapshot=getSeasonReport(s).show!,next=nextSeason(s),archived=getSeasonHistory(next)[0].show!;
    assert.deepEqual(archived,snapshot);assert.deepEqual(next.show,createGame().show);
    archived.sections[0].text=0;assert.equal(next.history[0].show!.sections[0].text,100);
    const renamed=configureShow(next,{title:'Un año distinto',themeId:'barrio'});
    renamed.history[0].show!.sections[0].arrangements=0;
    assert.equal(next.history[0].show!.sections[0].arrangements,100);assert.equal(s.show.sections.saludo.arrangements,100);save(next);
  }
});

test('v7 validation rejects invalid plans, impossible progress, unfunded work and leaked or inconsistent show archives',()=>{
  const state=prepareSections(started()),next=nextSeason(win()),entry=next.history[0];
  const corrupt:unknown[]=[
    {...state,show:null},{...state,show:{...state.show,title:' Unnormalized '}},{...state,show:{...state.show,themeId:'new'}},
    {...state,show:{...state.show,focus:'invalid'}},{...state,show:{...state.show,locked:false}},
    {...state,show:{...state.show,sections:{...state.show.sections,cuple:{text:101,arrangements:52,rehearsal:0}}}},
    {...state,show:{...state.show,sections:{...state.show.sections,cuple:{text:52,arrangements:52,rehearsal:100}}}},
    {...state,show:{...state.show,sections:{...state.show.sections,extra:{text:0,arrangements:0,rehearsal:0}}}},
    {...state,show:{...state.show,sections:{...state.show.sections,cuple:{text:52,arrangements:52,rehearsal:0,skill:90}}}},
    {...state,day:0},{...state,money:state.money+state.accounts.rehearsals,accounts:{...state.accounts,rehearsals:0}},
    {...next,history:[{...entry,show:{...entry.show,readiness:99}}]},
    {...next,history:[{...entry,show:{...entry.show,title:'<script>'}}]},
    {...next,history:[{...entry,show:{...entry.show,hiddenSkill:88}}]},
    {...next,history:[{...entry,show:{...entry.show,sections:entry.show!.sections.map((section,index)=>index?section:{...section,id:'retirada'})}}]},
  ];
  for(const value of corrupt)assert.equal(parseSave(JSON.stringify(value)),null);
});

function asV7(state:State):Record<string,unknown> {
  const {pendingRenewals,...previous}=state;
  return {...previous,version:7};
}

test('annual closure funds the new year without paying or renewing contracts and preserves the completed archive before growth',()=>{
  const ended=win(),original=JSON.stringify(ended),next=nextSeason(ended);
  assert.equal(next.version,8);assert.equal(next.accounts.recruitment,0);assert.equal(next.money,ended.money+SEASON_FINANCING);
  assert.deepEqual(next.pendingRenewals,ended.members.map(member=>member.id));
  assert.deepEqual(getRenewalSummary(next),{pending:17,signed:0,total:17,estimatedCost:getSeasonRenewalCost(ended)});
  assert.equal(next.history[0].cash,ended.money);assert.deepEqual(next.history[0].accounts,ended.accounts);
  ended.members.forEach((member,index)=>{
    assert.equal(next.history[0].roster[index].experience,member.experience);
    assert.equal(next.history[0].roster[index].fame,member.fame);
    assert.equal(next.members[index].age,member.age+1);assert.equal(next.members[index].seasons,member.seasons+1);
    assert.equal(next.members[index].minReputation,Math.max(0,Math.round(next.members[index].fame*.65-8)));
  });
  assert.equal(JSON.stringify(ended),original);save(next);
  const rejected=nextSeason(next);assert.equal(rejected.money,next.money);assert.deepEqual(rejected.members,next.members);
  assert.deepEqual(rejected.history,next.history);assert.deepEqual(rejected.pendingRenewals,next.pendingRenewals);
  const fork=setIdentity(next,{name:'Nueva Ronda',barrio:'Cerrito'});fork.pendingRenewals.pop();assert.equal(next.pendingRenewals.length,17);
});

test('renewal offers use public reputation, loyalty, rapport and morale, never hidden talent',()=>{
  const state=nextSeason(win());state.reputation=35;
  const member=state.members[0];Object.assign(member,{minReputation:40,fame:77,loyalty:50,rapport:0,morale:70,cost:41000});
  assert.equal(getRenewalQuote(state,member.id).accepted,false);
  assert.equal(getRenewalQuote(state,member.id,'generous').accepted,true);
  assert.equal(getRenewalQuote(state,member.id,'premium').accepted,true);
  assert.equal(getRenewalQuote(state,member.id).fee,6200);
  assert.equal(getRenewalQuote(state,member.id,'generous').fee,7400);
  assert.equal(getRenewalQuote(state,member.id,'premium').fee,9000);
  const changedTalent=structuredClone(state);Object.assign(changedTalent.members[0],{voice:99,charisma:99,experience:100});
  assert.deepEqual(getRenewalQuote(changedTalent,member.id),getRenewalQuote(state,member.id));
  const loyal=structuredClone(state);loyal.reputation=38;loyal.members[0].loyalty=70;
  assert.equal(getRenewalQuote(loyal,member.id).accepted,true);
  loyal.members[0].morale=30;assert.equal(getRenewalQuote(loyal,member.id).accepted,false);
  const open=structuredClone(state);open.reputation=41;
  assert.equal(getRenewalQuote(open,member.id).accepted,false);
  const contacted=contactMember(open,member.id);
  assert.equal(contacted.day,0);assert.equal(contacted.money,open.money);assert.equal(contacted.members[0].rapport,15);
  assert.equal(getRenewalQuote(contacted,member.id).accepted,true);assert.equal(getContactAvailability(contacted,member.id).enabled,false);save(contacted);
  const star=structuredClone(state);star.reputation=0;Object.assign(star.members[0],{minReputation:57,loyalty:20,rapport:100,morale:30});
  assert.equal(getRenewalQuote(star,member.id,'premium').accepted,false);
});

test('a recruited artist can refuse next year after the murga loses reputation even when offered more money',()=>{
  let s=createGame();
  const newcomer=s.candidates.find(member=>member.role==='chorister'&&member.minReputation>=28&&member.loyalty<=40&&getRecruitmentQuote(s,member.id,'premium').accepted)!;
  assert.ok(newcomer);s=recruit(s,newcomer.id,undefined,'premium');
  assert.ok(s.members.some(member=>member.id===newcomer.id));assert.deepEqual(s.pendingRenewals,[]);
  const ended=failAdmission(s),next=nextSeason(ended);
  assert.equal(ended.status,'lost');assert.ok(next.reputation<s.reputation);
  assert.ok(next.pendingRenewals.includes(newcomer.id));assert.equal(getRenewalQuote(next,newcomer.id,'premium').accepted,false);save(next);
});

test('individual signatures charge once, survive reload and never advance time or grant artist growth',()=>{
  const state=nextSeason(win()),before=JSON.stringify(state),id=state.members[0].id;
  const quote=getRenewalQuote(state,id,'generous');assert.equal(quote.accepted,true);
  const renewed=renewMember(state,id,'generous');
  assert.equal(renewed.money,state.money-quote.fee);assert.equal(renewed.accounts.recruitment,quote.fee);
  assert.equal(renewed.day,0);assert.equal(renewed.seed,state.seed);assert.deepEqual(renewed.members,state.members);
  assert.equal(renewed.pendingRenewals.length,16);assert.ok(!renewed.pendingRenewals.includes(id));assert.equal(JSON.stringify(state),before);
  assert.equal(getRenewalSummary(renewed).signed,1);assert.equal(getSeasonRenewalCost(renewed),getSeasonRenewalCost(state)-getRenewalQuote(state,id).fee);
  const loaded=parseSave(JSON.stringify(renewed))!;assert.ok(loaded);
  const repeated=renewMember(loaded,id,'premium');assert.equal(repeated.money,renewed.money);assert.deepEqual(repeated.accounts,renewed.accounts);
  for(const [badId,offer] of [[id,'invalid'],['unknown','standard'],[state.candidates[0].id,'standard'],[id,'__proto__']]){
    const rejected=renewMember(state,badId,offer as 'standard');assert.equal(rejected.money,state.money);assert.deepEqual(rejected.pendingRenewals,state.pendingRenewals);
  }
  const broke=cash(state,0),refused=renewMember(broke,id);assert.equal(refused.money,0);assert.deepEqual(refused.pendingRenewals,state.pendingRenewals);
  assert.equal(getRenewalQuote(createGame(),createGame().members[0].id).accepted,false);
});

test('pending contracts block every advancing action and production while contacts, auditions, technicians and replacements remain available',()=>{
  let state=nextSeason(win());
  for(const action of ['rehearse','rest','compete','popular','commercial','fundraiser','community','invalid'] as Action[]){
    const denied=performAction(state,action);assert.equal(denied.day,0);assert.equal(denied.money,state.money);assert.deepEqual(denied.members,state.members);
    assert.equal(getActionAvailability(state,action).enabled,false);
  }
  for(const work of ['text','arrangements'] as const){
    const denied=developShow(state,'saludo',work);assert.equal(denied.day,0);assert.equal(denied.money,state.money);assert.deepEqual(denied.show,state.show);
  }
  for(const role of CREATIVE_ROLES)state=hireCreative(state,CREATIVE_CANDIDATES.find(candidate=>candidate.role===role&&candidate.level==='Barrial')!.id);
  assert.equal(getProductionSummary(state).ready,true);assert.equal(startSeason(state).productionStarted,false);
  const unknown=state.candidates.find(member=>member.scouting===0)!;
  const scouted=scoutMember(state,unknown.id);assert.equal(scouted.candidates.find(member=>member.id===unknown.id)!.scouting,1);assert.equal(scouted.day,0);save(scouted);
  for(const id of state.pendingRenewals.slice(0,3))state=contactMember(state,id);
  assert.equal(state.contactsToday,3);assert.equal(getContactAvailability(state,state.pendingRenewals[3]).enabled,false);
  assert.equal(getContactAvailability(state,state.candidates[0].id).enabled,false);save(state);
  const signed=renewAllWilling(state);assert.equal(signed.pendingRenewals.length,0);
  const active=startSeason(signed);assert.equal(active.productionStarted,true);assert.equal(performAction(active,'rest').day,1);save(active);
});

test('replacing a pending member signs the incoming contract once, keeps17 roles and removes only the outgoing pending ID',()=>{
  const state=nextSeason(win()),target=state.members.find(member=>member.role==='bombo')!;
  const incoming=state.candidates.find(member=>member.role===target.role&&getRecruitmentQuote(state,member.id).accepted)!;
  const fee=getRecruitmentQuote(state,incoming.id).fee,next=recruit(state,incoming.id,target.id);
  assert.equal(next.members.length,17);assert.equal(next.members.filter(member=>member.role==='bombo').length,1);
  assert.ok(next.members.some(member=>member.id===incoming.id));assert.ok(next.candidates.some(member=>member.id===target.id));
  assert.equal(next.pendingRenewals.length,16);assert.ok(!next.pendingRenewals.includes(target.id));assert.ok(!next.pendingRenewals.includes(incoming.id));
  assert.equal(next.money,state.money-fee);assert.equal(next.accounts.recruitment,fee);
  assert.equal(renewMember(next,incoming.id).money,next.money);save(next);
  const wrong=recruit(state,incoming.id,state.members.find(member=>member.role!=='bombo')!.id);
  assert.equal(wrong.money,state.money);assert.deepEqual(wrong.pendingRenewals,state.pendingRenewals);
});

test('bulk renewal recomputes available funds after each signature, skips refusals and costly deals, and is deterministic',()=>{
  const state=nextSeason(win());state.reputation=70;
  state.members.forEach(member=>Object.assign(member,{cost:20000,minReputation:0,loyalty:70,rapport:0,morale:70}));
  state.members[1].cost=1000000;
  Object.assign(state.members[2],{minReputation:100,loyalty:0,morale:0});
  const limited=cash(state,getContractReserve(state).cost+5000),bulk=renewAllWilling(limited);
  assert.equal(bulk.money,limited.money-45000);assert.equal(bulk.accounts.recruitment,45000);assert.equal(bulk.pendingRenewals.length,2);
  assert.ok(!bulk.pendingRenewals.includes(state.members[0].id));assert.ok(!bulk.pendingRenewals.includes(state.members[3].id));
  assert.ok(bulk.pendingRenewals.includes(state.members[1].id));assert.ok(bulk.pendingRenewals.includes(state.members[2].id));
  assert.equal(bulk.day,0);assert.deepEqual(bulk.members,limited.members);assert.deepEqual(renewAllWilling(limited),bulk);save(bulk);
  const repeated=renewAllWilling(bulk);assert.equal(repeated.money,bulk.money);assert.deepEqual(repeated.accounts,bulk.accounts);assert.deepEqual(repeated.pendingRenewals,bulk.pendingRenewals);
});

test('v7 migration keeps already paid contracts, progress, archives and cash intact in setup, active and completed campaigns',()=>{
  const renewed=renewAllWilling(nextSeason(win()));
  for(const current of [createGame(),renewed,performAction(fixture(EVENTS[1].day),'compete'),win()]){
    const old=asV7(current),loaded=parseSave(JSON.stringify(old));assert.ok(loaded);
    assert.equal(loaded.version,8);assert.deepEqual(loaded.pendingRenewals,[]);assert.deepEqual(asV7(loaded),old);
    assert.equal(getRenewalSummary(loaded).signed,17);assert.equal(getRenewalSummary(loaded).pending,0);
    assert.equal(renewAllWilling(loaded).money,loaded.money);assert.equal(renewMember(loaded,loaded.members[0].id).money,loaded.money);save(loaded);
  }
});

test('v8 pending IDs are unique current members only and cannot survive beyond initial preproduction',()=>{
  const state=nextSeason(win()),id=state.members[0].id;
  const corrupt:unknown[]=[
    {...state,pendingRenewals:undefined},{...state,pendingRenewals:null},{...state,pendingRenewals:{}},
    {...state,pendingRenewals:[id,id]},{...state,pendingRenewals:[17]},{...state,pendingRenewals:['unknown']},
    {...state,pendingRenewals:[state.candidates[0].id]},{...state,productionStarted:true},{...state,day:1},
    {...createGame(),pendingRenewals:[id]},{...win(),pendingRenewals:[id]},
  ];
  for(const value of corrupt)assert.equal(parseSave(JSON.stringify(value)),null);
  const partial=renewMember(state,id);save(partial);assert.equal(parseSave(JSON.stringify(partial))!.pendingRenewals.length,16);
  const signed=renewAllWilling(partial);save(signed);assert.equal(signed.pendingRenewals.length,0);
});

test('contract reserve ignores cash and artistic talent and its distinct market replacements form an executable route',()=>{
  const state=nextSeason(win());state.reputation=0;
  state.members.forEach(member=>Object.assign(member,{minReputation:100,loyalty:0,rapport:0,morale:0}));
  state.candidates.forEach(member=>Object.assign(member,{minReputation:0,loyalty:50,rapport:0}));
  const reserve=getContractReserve(state);assert.equal(reserve.possible,true);assert.equal(reserve.plan.length,17);
  assert.ok(reserve.plan.every(step=>step.kind==='replacement'));
  assert.equal(new Set(reserve.plan.map(step=>step.candidateId)).size,17,'no candidate may fill two positions');
  assert.equal(reserve.cost,reserve.plan.reduce((sum,step)=>sum+step.fee,0));
  assert.deepEqual(getContractReserve(cash(state,0)),reserve,'feasibility measures disposition, not cash');
  const talented=structuredClone(state);[...talented.members,...talented.candidates].forEach(member=>{member.voice=100;member.skill=100;member.charisma=100;});
  assert.deepEqual(getContractReserve(talented),reserve);
  let funded=cash(state,reserve.cost),guard=0;
  while(funded.pendingRenewals.length&&guard++<17){
    const plan=getContractReserve(funded);assert.equal(plan.possible,true);assert.ok(funded.money>=plan.cost);
    const step=plan.plan[0],next=step.kind==='renewal'?renewMember(funded,step.memberId,step.offer):recruit(funded,step.candidateId!,step.memberId,step.offer);
    assert.equal(next.pendingRenewals.length,funded.pendingRenewals.length-1,next.lastMessage);
    funded=next;save(funded);
  }
  assert.equal(funded.pendingRenewals.length,0);assert.equal(funded.members.length,17);assert.equal(funded.money,0);
});

test('reserved funds block optional spending and excessive offers while allowing the exact affordable contract plan',()=>{
  const state=nextSeason(win()),reserve=getContractReserve(state);
  assert.equal(reserve.possible,true);assert.ok(reserve.plan.every(step=>step.kind==='renewal'&&step.offer==='standard'));
  const exact=cash(state,reserve.cost),id=exact.members[0].id;
  const richer=cash(exact,1000000);
  const candidate=exact.candidates.find(member=>member.role==='chorister'&&member.cost>getRenewalQuote(exact,id).fee&&member.cost<exact.money&&getRecruitmentQuote(richer,member.id).accepted)!;
  assert.ok(candidate);
  const quote=getRecruitmentQuote(exact,candidate.id,'standard',id);assert.equal(quote.accepted,false);assert.match(quote.reason,/reservar/);
  assert.equal(recruit(exact,candidate.id,id).money,exact.money);
  const audition=scoutMember(exact,exact.candidates.find(member=>member.scouting===0)!.id);
  assert.equal(audition.money,exact.money);assert.match(audition.lastMessage,/reservar/);
  const technical=hireCreative(exact,CREATIVE_CANDIDATES[0].id);assert.equal(technical.money,exact.money);assert.match(technical.lastMessage,/reservar/);
  const premium=getRenewalQuote(exact,id,'premium');assert.equal(premium.accepted,false);assert.match(premium.reason,/reservar/);
  assert.equal(renewMember(exact,id,'premium').money,exact.money);
  const bulk=renewAllWilling(exact);assert.equal(bulk.pendingRenewals.length,0);assert.equal(bulk.money,0);save(bulk);
  const poor=cash(state,0),declined=renewAllWilling(poor);assert.equal(declined.money,0);assert.deepEqual(declined.pendingRenewals,poor.pendingRenewals);
});

test('explicit recruitment replacement controls the reserve and can resolve a pending slot without blocking an affordable alternative',()=>{
  const state=nextSeason(win()),pending=state.members[0],signed=state.members[1];
  state.pendingRenewals=[pending.id];
  const incoming=state.candidates.find(member=>member.role===pending.role&&getRecruitmentQuote(state,member.id,'standard',pending.id).accepted)!;
  const exact=cash(state,getRecruitmentQuote(state,incoming.id,'standard',pending.id).fee);
  assert.equal(getRecruitmentQuote(exact,incoming.id,'standard',pending.id).accepted,true);
  const rejected=getRecruitmentQuote(exact,incoming.id,'standard',signed.id);
  assert.equal(rejected.accepted,false);assert.match(rejected.reason,/reservar/);
  assert.equal(recruit(exact,incoming.id,signed.id).money,exact.money);
  const completed=recruit(exact,incoming.id,pending.id);assert.deepEqual(completed.pendingRenewals,[]);assert.equal(completed.money,0);save(completed);
});

test('technical and costume refunds remain available under the reserve while new net expenses cannot consume it',()=>{
  let state=nextSeason(win());
  const pricey=CREATIVE_CANDIDATES.find(candidate=>candidate.role==='lyrics'&&candidate.level==='Referente')!;
  const cheap=CREATIVE_CANDIDATES.find(candidate=>candidate.role==='lyrics'&&candidate.level==='Barrial')!;
  state=hireCreative(state,pricey.id);
  const poor=cash(state,0),refunded=hireCreative(poor,cheap.id);
  assert.equal(refunded.money,pricey.fee-cheap.fee);assert.equal(refunded.creativeTeam.lyrics,cheap.id);save(refunded);
  state=hireCreative(state,CREATIVE_CANDIDATES.find(candidate=>candidate.role==='costumes'&&candidate.level==='Barrial')!.id);
  state=chooseCostumeProposal(state,getCostumeProposals(state)[1].id);
  assert.ok(state.costumeProposalId?.endsWith('-p1'));
  const costumePoor=cash(state,0),cheaper=chooseCostumeProposal(costumePoor,getCostumeProposals(costumePoor)[0].id);
  assert.equal(cheaper.money,150000);save(cheaper);
  const insufficient=cash(cheaper,getContractReserve(cheaper).cost+100000);
  const blocked=chooseCostumeProposal(insufficient,getCostumeProposals(insufficient)[1].id);
  assert.equal(blocked.money,insufficient.money);assert.equal(blocked.costumeProposalId,insufficient.costumeProposalId);assert.match(blocked.lastMessage,/reservar/);
});
