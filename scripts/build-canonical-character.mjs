import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

// Offline source of the canonical character. No network, generated services or old fits.
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(project,'public/models/character-system');
const source=path.join(project,'assets/character-system');
fs.mkdirSync(output,{recursive:true}); fs.mkdirSync(source,{recursive:true});
globalThis.FileReader=class { readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});} readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result=`data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;this.onloadend?.();});} };
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const root=new THREE.Scene(); root.name='CharacterRoot';
root.userData={systemId:'murga-human-v1',bodyTemplateVersion:1,rigVersion:'murga-rig-v1',heightMetres:1.7,front:'+Z',up:'+Y',source:'scripts/build-canonical-character.mjs'};
const mats={};
for(const [name,color,roughness,metalness] of [['Skin','#b98060',.8,0],['Hair','#352136',.78,0],['Cloth','#078a7c',.7,0],['Ruffles','#dc367e',.7,0],['Trim','#efbf4a',.43,.25],['EyeWhite','#fff6e8',.4,0],['Ink','#24152d',.65,0],['Coral','#ff7759',.6,0],['Makeup','#ffffff',.8,0],['Boot','#242035',.65,0],['Rehearsal','#63647b',.9,0],['Trouser','#29253f',.9,0]]){
  mats[name]=new THREE.MeshStandardMaterial({name,color,roughness,metalness});
}
for(const[name,color,roughness,metalness]of[['Cloth','#087c78',.35,0],['Ruffles','#e82b82',.39,0],['Trim','#efbf4a',.30,.55],['SatinRed','#d71945',.36,0],['SatinBurgundy','#541a39',.38,0]])mats[name]=new THREE.MeshStandardMaterial({name,color,roughness,metalness});
const bones=[],byName={},rest={};
function bone(name,parent,position){const b=new THREE.Bone();b.name=name; const wp=V(...position); b.position.copy(parent?wp.clone().sub(rest[parent]):wp); if(parent)byName[parent].add(b);else root.add(b); bones.push(b);byName[name]=b;rest[name]=wp;return b;}
bone('Root',null,[0,0,0]);bone('Pelvis','Root',[0,.83,0]);bone('Spine','Pelvis',[0,.99,0]);bone('Chest','Spine',[0,1.18,0]);bone('Neck','Chest',[0,1.295,0]);bone('Head','Neck',[0,1.455,0]);
for(const [s,sign] of [['L',1],['R',-1]]){bone(`UpperArm_${s}`,'Chest',[sign*.205,1.20,0]);bone(`Forearm_${s}`,`UpperArm_${s}`,[sign*.343,.99,.012]);bone(`Hand_${s}`,`Forearm_${s}`,[sign*.455,.795,.035]);bone(`Thigh_${s}`,'Pelvis',[sign*.106,.79,0]);bone(`Shin_${s}`,`Thigh_${s}`,[sign*.106,.46,.015]);bone(`Foot_${s}`,`Shin_${s}`,[sign*.106,.092,.027]);}
bone('Skirt_L','Pelvis',[.11,.73,0]);bone('Skirt_R','Pelvis',[-.11,.73,0]);
root.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(bones);skeleton.calculateInverses();
const idx=name=>bones.indexOf(byName[name]);
function socket(name,parent,world){const o=new THREE.Object3D();o.name=name;o.position.copy(V(...world).sub(rest[parent]));byName[parent].add(o);return o;}
const hatSocket=socket('head_hat','Head',[0,1.635,0]);socket('hand_l','Hand_L',[.469,.757,.048]);socket('hand_r','Hand_R',[-.469,.757,.048]);socket('back_instrument','Chest',[0,1.08,-.17]);
function weights(...pairs){const arr=new Array(4).fill(0),w=new Array(4).fill(0);pairs.forEach(([b,v],i)=>{arr[i]=v>0?idx(b):0;w[i]=v;});const sum=w.reduce((a,b)=>a+b,0);return[arr,w.map(x=>x/sum)];}
const rigid=name=>()=>weights([name,1]);
const faceMorphNames=['Face_Oval','Face_Angular','Face_Heart'];
function headMorph(q,name){const p=q.clone(),upper=1-THREE.MathUtils.smoothstep(q.y,1.56,1.625),lower=THREE.MathUtils.smoothstep(q.y,1.255,1.285),strength=upper*lower,jaw=1-THREE.MathUtils.smoothstep(q.y,1.34,1.50);let sx=1,sy=0,sz=0;if(name==='Face_Oval'){sx=.89-jaw*.012;sy=-jaw*.006;sz=-.003;}if(name==='Face_Angular'){sx=.97+jaw*.12;sy=-jaw*.002;sz=jaw*.004;}if(name==='Face_Heart'){sx=1.035-jaw*.23;sy=jaw*.001;sz=-jaw*.002;}p.x*=1+(sx-1)*strength;p.y+=sy*strength;p.z+=sz*strength*Math.max(0,q.z/.15);return p;}
function faceSurface(x,y,name='Face_Round',offset=0){const z=.151*Math.sqrt(Math.max(.001,1-(x/.161)**2-((y-1.475)/.225)**2));return headMorph(V(x,y,z),name).add(V(0,0,offset));}
function torsoWeights(y){if(y<=.86)return weights(['Pelvis',1]);if(y<1.02){const t=(y-.86)/.16;return weights(['Pelvis',1-t],['Spine',t]);}if(y<1.18){const t=(y-1.02)/.16;return weights(['Spine',1-t],['Chest',t]);}return weights(['Chest',1]);}
class Builder{
  constructor(name){this.name=name;this.parts=[];}
  add(g,mat,weight=rigid('Root'),matrix=null){if(matrix)g.applyMatrix4(matrix);const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,ids=g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i);const a={p:[],n:[],uv:[],si:[],sw:[],ids,mat};for(let i=0;i<p.count;i++){const q=V().fromBufferAttribute(p,i);a.p.push(...q);a.n.push(n?.getX(i)??0,n?.getY(i)??1,n?.getZ(i)??0);a.uv.push(uv?.getX(i)??0,uv?.getY(i)??0);const [si,sw]=weight(q,i);a.si.push(...si);a.sw.push(...sw);}this.parts.push(a);return this;}
  build(skinned=true,parent=root){
    const p=[],n=[],uv=[],si=[],sw=[],ids=[],morphable=[],materialNames=[...new Set(this.parts.map(a=>a.mat))],g=new THREE.BufferGeometry();
    for(const mat of materialNames){const start=ids.length;for(const part of this.parts.filter(a=>a.mat===mat)){const offset=p.length/3;p.push(...part.p);n.push(...part.n);uv.push(...part.uv);si.push(...part.si);sw.push(...part.sw);ids.push(...part.ids.map(i=>i+offset));for(let i=0;i<part.p.length/3;i++)morphable.push(part.tag==='head'||this.name==='Makeup_Classic');}g.addGroup(start,ids.length-start,materialNames.indexOf(mat));}
    g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ids);
    if(morphable.some(Boolean)){
      g.morphTargetsRelative=true;g.morphAttributes.position=[];g.morphAttributes.normal=[];
      for(const name of faceMorphNames){const absolute=[],delta=[];for(let i=0;i<p.length;i+=3){const q=V(p[i],p[i+1],p[i+2]),a=morphable[i/3]?headMorph(q,name):q.clone();absolute.push(...a);delta.push(...a.sub(q));}
        const temp=new THREE.BufferGeometry();temp.setAttribute('position',new THREE.Float32BufferAttribute(absolute,3));temp.setIndex(ids);temp.computeVertexNormals();const sums=new Map();for(let i=0;i<absolute.length;i+=3){if(!morphable[i/3])continue;const key=absolute.slice(i,i+3).map(x=>x.toFixed(6)).join(),nn=V().fromBufferAttribute(temp.attributes.normal,i/3);if(sums.has(key))sums.get(key).add(nn);else sums.set(key,nn);}const nd=[];for(let i=0;i<n.length;i+=3){if(!morphable[i/3]){nd.push(0,0,0);continue;}const key=absolute.slice(i,i+3).map(x=>x.toFixed(6)).join(),nn=sums.get(key).clone().normalize();nd.push(nn.x-n[i],nn.y-n[i+1],nn.z-n[i+2]);}const pa=new THREE.Float32BufferAttribute(delta,3),na=new THREE.Float32BufferAttribute(nd,3);pa.name=name;na.name=name;g.morphAttributes.position.push(pa);g.morphAttributes.normal.push(na);temp.dispose();}
    }
    if(skinned){g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));}
    const materials=materialNames.map(x=>mats[x]),mesh=skinned?new THREE.SkinnedMesh(g,materials):new THREE.Mesh(g,materials);mesh.name=this.name;parent.add(mesh);if(skinned)mesh.bind(skeleton,new THREE.Matrix4());mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={slot:this.name.split('_')[0],canonical:true};return mesh;
  }
}
function matrix(c,scale,rotation=[0,0,0]){return new THREE.Matrix4().compose(V(...c),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),V(...scale));}
function ellipsoid(b,mat,c,r,w=rigid('Head'),segments=16,rings=10,rot=[0,0,0]){const small=Math.max(...r)<.026||(r[1]<.012&&r[2]<.021);b.add(new THREE.SphereGeometry(1,small?6:Math.max(8,Math.round(segments*.65)),small?4:Math.max(6,Math.round(rings*.65))),mat,w,matrix(c,r,rot));}
function tube(b,mat,rings,w,segments=20,closed=true){const positions=[],uv=[],index=[];for(let j=0;j<rings.length;j++){const r=rings[j],prev=V(...rings[Math.max(0,j-1)].c),next=V(...rings[Math.min(rings.length-1,j+1)].c),tangent=next.sub(prev).normalize(),u=V(tangent.y,-tangent.x,0).normalize();for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,rr=1+(r.wave??0)*Math.cos(a*(r.lobes??10)+(r.phase??0)),p=V(...r.c).addScaledVector(u,Math.cos(a)*r.rx*rr).addScaledVector(V(0,0,1),Math.sin(a)*r.rz*rr);positions.push(...p);uv.push(i/segments,j/(rings.length-1));if(j<rings.length-1&&i<segments){const a=j*(segments+1)+i,c=a+segments+1;index.push(a,c,a+1,a+1,c,c+1);}}}if(closed){for(const [j,invert]of[[0,true],[rings.length-1,false]]){const start=positions.length/3;positions.push(...rings[j].c);uv.push(.5,.5);for(let i=0;i<segments;i++){const a=j*(segments+1)+i;index.push(...(invert?[start,a,a+1]:[start,a+1,a]));}}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();b.add(g,mat,w);return{rings,segments,start:b.parts.length-1};}
// Curved pleated sheets with dark reverses and sewn free edges, not bead-like decorations.
function clothFan(builder,material,center,direction,normal,width,length,depth,phase,weight,{taper=false,cord=true}={}){
  const d=V(...direction).normalize(),u=d.clone().cross(V(...normal)).normalize(),n=u.clone().cross(d).normalize(),basis=new THREE.Matrix4().makeBasis(u,d,n).setPosition(V(...center));
  const columns=8,rows=5,positions=[],uv=[],indices=[],edge=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
    const v=j/rows,t=i/columns*2-1,spread=taper?.98*(1-v)+.025:.23+.77*v;
    const x=t*width*.5*spread,y=length*(v-.08*v*v*v)+depth*.12*Math.sin(t*Math.PI)*v;
    const z=depth*(Math.sin(t*Math.PI*2+phase)*(.20+.80*v)+.6*Math.sin(v*Math.PI)+.60*v*v);
    const q=V(x,y,z).applyMatrix4(basis);positions.push(...q);uv.push(i/columns,v);if(j===rows)edge.push(q.clone().addScaledVector(n,.001));
    if(i<columns&&j<rows){const a=j*(columns+1)+i,b=a+columns+1;indices.push(a,a+1,b,a+1,b+1,b);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();builder.add(g,material,weight);
  const back=g.clone(),reversed=Array.from(back.index.array);for(let i=0;i<reversed.length;i+=3)[reversed[i+1],reversed[i+2]]=[reversed[i+2],reversed[i+1]];back.setIndex(reversed);back.computeVertexNormals();builder.add(back,'SatinBurgundy',weight);
  if(cord)builder.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge),12,.0021,4,false),'Trim',weight);
}
function gatheredSleeve(sign){const extra=[.032,.051,.044,.032,.039,.045,.050];return armRings(sign).map((r,i)=>({...r,rx:r.rx+extra[i],rz:r.rz+extra[i]*.95,wave:.085,lobes:6}));}
function torsoRing(y,rx,rz){return{c:[0,y,0],rx,rz};}
function armRings(sign,extra=0){return[[.205,1.20,0,.081,.077],[.242,1.147,.003,.073,.068],[.295,1.065,.008,.06,.058],[.343,.99,.012,.054,.05],[.385,.915,.021,.046,.044],[.424,.85,.028,.039,.038],[.455,.795,.035,.035,.033]].map(([x,y,z,rx,rz],i)=>({c:[sign*x,y,z],rx:rx+extra*(i>4?1.9:1),rz:rz+extra*(i>4?1.9:1)}));}
function armWeights(s,q){const elbow=rest[`Forearm_${s}`],hand=rest[`Hand_${s}`];if(q.y>1.045)return weights([`UpperArm_${s}`,1]);if(q.y>.94){const t=(1.045-q.y)/.105;return weights([`UpperArm_${s}`,1-t],[`Forearm_${s}`,t]);}if(q.y>.81)return weights([`Forearm_${s}`,1]);const t=THREE.MathUtils.clamp((.81-q.y)/.06,0,1);return weights([`Forearm_${s}`,1-t],[`Hand_${s}`,t]);}
// Weight based on tube ring centre, not its radial vertex: clothing and body share skinning exactly.
function ringWeight(rings,segments,fn){return(q,i)=>fn(V(...rings[Math.min(rings.length-1,Math.floor(i/(segments+1)))].c));}
const bodyB=new Builder('Body');
const bodyTorso=[torsoRing(.72,.16,.112),torsoRing(.78,.197,.128),torsoRing(.86,.173,.121),torsoRing(.94,.151,.112),torsoRing(1.025,.174,.12),torsoRing(1.11,.201,.131),torsoRing(1.185,.205,.133),torsoRing(1.235,.13,.095)];
tube(bodyB,'Rehearsal',bodyTorso,ringWeight(bodyTorso,24,q=>torsoWeights(q.y)),24);
ellipsoid(bodyB,'Skin',[0,1.276,0],[.067,.096,.061],q=>q.y>1.305?weights(['Neck',.6],['Head',.4]):weights(['Chest',.35],['Neck',.65]),16,10);
bodyB.add(new THREE.SphereGeometry(1,36,24),'Skin',rigid('Head'),matrix([0,1.475,0],[.161,.225,.151]));bodyB.parts.at(-1).tag='head';
for(const[s,sign]of[['L',1],['R',-1]]){
  const ar=armRings(sign);tube(bodyB,'Skin',ar,ringWeight(ar,16,q=>armWeights(s,q)),16);
  ellipsoid(bodyB,'Skin',[sign*.205,1.20,0],[.084,.079,.079],rigid(`UpperArm_${s}`),16,10);
  ellipsoid(bodyB,'Skin',[sign*.469,.757,.048],[.048,.067,.03],rigid(`Hand_${s}`),12,8,[0,0,sign*.37]);
  ellipsoid(bodyB,'Skin',[sign*.434,.769,.072],[.025,.037,.027],rigid(`Hand_${s}`),10,6,[0,0,-sign*.35]);
  const lr=[[.775,.098,.105],[.67,.087,.09],[.62,.08,.081],[.55,.07,.068],[.46,.067,.064],[.36,.061,.059],[.23,.043,.044],[.11,.038,.039]].map(([y,rx,rz])=>({c:[sign*.106,y,y<.46?.02:0],rx,rz}));
  const legW=q=>{if(q.y>.515)return weights([`Thigh_${s}`,1]);if(q.y>.405){const t=(.515-q.y)/.11;return weights([`Thigh_${s}`,1-t],[`Shin_${s}`,t]);}return weights([`Shin_${s}`,1]);};
  const shorts=lr.slice(0,3),leg=lr.slice(2);tube(bodyB,'Rehearsal',shorts,ringWeight(shorts,16,legW),16,false);tube(bodyB,'Skin',leg,ringWeight(leg,16,legW),16,false);ellipsoid(bodyB,'Skin',[sign*.106,.055,.068],[.062,.055,.105],rigid(`Foot_${s}`),16,10);
}
const body=bodyB.build();
function faceLine(b,mat,points,radius=.0018){b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),8,radius,4,false),mat,rigid('Head'));}
function face(name){const b=new Builder(name),style={Face_Round:{eyeX:.058,eyeY:1.503,eyeH:.016,tilt:-.035,brow:.08,nose:.026,tip:.020,lip:.032},Face_Oval:{eyeX:.055,eyeY:1.506,eyeH:.012,tilt:.08,brow:.15,nose:.034,tip:.014,lip:.026},Face_Angular:{eyeX:.057,eyeY:1.496,eyeH:.011,tilt:-.06,brow:.02,nose:.045,tip:.016,lip:.034},Face_Heart:{eyeX:.060,eyeY:1.510,eyeH:.017,tilt:.12,brow:.20,nose:.023,tip:.014,lip:.029}}[name];
  for(const sign of[-1,1]){
    const eye=faceSurface(sign*style.eyeX,style.eyeY,name,.004);
    ellipsoid(b,'EyeWhite',eye.toArray(),[.035,style.eyeH,.011],rigid('Head'),20,12,[0,0,sign*style.tilt]);
    ellipsoid(b,'Hair',eye.clone().add(V(0,0,.011)).toArray(),[.0105,style.eyeH*.87,.0032],rigid('Head'),14,10);
    ellipsoid(b,'Ink',eye.clone().add(V(0,0,.013)).toArray(),[.0055,style.eyeH*.58,.0018],rigid('Head'),10,8);
    ellipsoid(b,'EyeWhite',eye.clone().add(V(-.003,.004,.015)).toArray(),[.0022,.0026,.0014],rigid('Head'),8,6);
    const lid=[[-.032,0],[-.018,style.eyeH*.86],[0,style.eyeH],[.018,style.eyeH*.86],[.032,0]].map(([dx,dy])=>faceSurface(sign*style.eyeX+dx,style.eyeY+dy+sign*dx*style.tilt,name,.012));faceLine(b,'Hair',lid,.0018);
    const eyebrow=[[-.031,0],[-.014,.007],[.01,.008],[.033,-.003]].map(([dx,dy])=>faceSurface(sign*(style.eyeX+dx),style.eyeY+.043+dy+dx*style.brow,name,.008));faceLine(b,'Hair',eyebrow,name==='Face_Angular'?.0045:.0032);
    const ear=headMorph(V(sign*.159,1.475,-.014),name);ellipsoid(b,'Skin',ear.toArray(),[.018,.033,.019],rigid('Head'),12,8);
  }
  const noseRings=[[1.421,.010,.005],[1.429,style.tip*.96,.012],[1.439,style.tip,.024],[1.454,.012,.020],[1.466+style.nose*.25,.009,.013],[1.468+style.nose,.005,.004]].map(([y,rx,rz])=>({c:faceSurface(0,y,name,.005).toArray(),rx,rz}));tube(b,'Skin',noseRings,rigid('Head'),12,true);
  const smile=t=>1.381+Math.abs(t)*.006;
  faceLine(b,'Coral',[-1,-.5,0,.5,1].map(t=>faceSurface(t*style.lip,smile(t)-.002*(1-t*t),name,.006)),.0037);
  faceLine(b,'Coral',[-1,-.5,0,.5,1].map(t=>faceSurface(t*style.lip,smile(t)+.003*(1-t*t),name,.005)),.0027);
  faceLine(b,'Ink',[-1,-.5,0,.5,1].map(t=>faceSurface(t*style.lip,smile(t),name,.009)),.0008);
  return b.build();
}
for(const name of['Face_Round','Face_Oval','Face_Angular','Face_Heart'])face(name);
function hair(name,curly,hat){const b=new Builder(name),w=rigid('Head');
  // Side and nape locks remain complete under a hat; the full crown is an authored variant.
  for(const sign of[-1,1]){ellipsoid(b,'Hair',[sign*.146,1.475,-.049],[.030,.101,.079],w,16,10,[0,0,sign*.10]);ellipsoid(b,'Hair',[sign*.123,1.397,-.105],[.035,.052,.044],w,12,8);}
  ellipsoid(b,'Hair',[0,1.478,-.132],[.141,.122,.035],w,18,10);
  if(!hat){
    ellipsoid(b,'Hair',[0,1.614,-.022],[.174,.116,.153],w,24,14);
    if(curly){for(let i=0;i<11;i++){const a=i/10*Math.PI;ellipsoid(b,'Hair',[Math.cos(a)*.137,1.628+Math.sin(a)*.052,.090],[.034,.031,.036],w,10,8);}for(const sign of[-1,1])for(let j=0;j<4;j++)ellipsoid(b,'Hair',[sign*.152,1.46+j*.052,-.039],[.030,.032,.054],w,10,8);}
    else{for(let i=0;i<4;i++)ellipsoid(b,'Hair',[-.071+i*.038,1.626+i*.006,.095],[.073,.022,.040],w,16,10,[0,0,-.35]);}
  }else if(curly){for(const sign of[-1,1])for(let j=0;j<3;j++)ellipsoid(b,'Hair',[sign*.149,1.475+j*.045,.042],[.026,.027,.03],w,10,8);}
  return b.build();
}
hair('Hair_Curls',true,false);hair('Hair_Curls_Hat',true,true);hair('Hair_Sweep',false,false);hair('Hair_Sweep_Hat',false,true);
function bodyLegProfile(sign){return[[.775,.098,.105],[.67,.087,.09],[.62,.08,.081],[.55,.07,.068],[.46,.067,.064],[.36,.061,.059],[.23,.043,.044],[.11,.038,.039]].map(([y,rx,rz])=>({c:[sign*.106,y,y<.46?.02:0],rx,rz}));}
function trouserProfile(sign){return bodyLegProfile(sign).map(r=>({...r,rx:r.rx+.009,rz:r.rz+.018}));}
function trouserWeights(side,q){if(q.y>.515)return weights([`Thigh_${side}`,1]);if(q.y>.405){const t=(.515-q.y)/.11;return weights([`Thigh_${side}`,1-t],[`Shin_${side}`,t]);}return weights([`Shin_${side}`,1]);}
// Open coat sectors use the existing cloth joints; never join across the front or between legs.
function coatWeights(q){const amount=THREE.MathUtils.clamp((.84-q.y)/.23,0,1),left=THREE.MathUtils.smoothstep(q.x,-.045,.045);return weights(['Pelvis',1-amount],['Skirt_L',amount*left],['Skirt_R',amount*(1-left)]);}
function openClothSector(b,mat,rings,start,end,weight,{columns=24,pleat=.018}={}){
 const pos=[],uv=[],index=[],edges=[[],[],[]];
 for(let j=0;j<rings.length;j++)for(let i=0;i<=columns;i++){
  const a=start+(end-start)*i/columns,r=rings[j],fold=1+pleat*Math.sin(a*7+j*.4),q=V(Math.cos(a)*r.rx*fold,r.y+Math.sin(a*5)*.006*(j/(rings.length-1)),Math.sin(a)*r.rz*fold);
  pos.push(...q);uv.push(i/columns,j/(rings.length-1));if(i===0)edges[0].push(q.clone());if(i===columns)edges[1].push(q.clone());if(j===rings.length-1)edges[2].push(q.clone());
  if(j<rings.length-1&&i<columns){const k=j*(columns+1)+i;index.push(k,k+1,k+columns+1,k+1,k+columns+2,k+columns+1);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();b.add(g,mat,weight);
 const back=g.clone(),rev=[...index];for(let i=0;i<rev.length;i+=3)[rev[i+1],rev[i+2]]=[rev[i+2],rev[i+1]];back.setIndex(rev);back.computeVertexNormals();b.add(back,'SatinBurgundy',weight);
 for(const points of edges)b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(8,points.length),.003,4,false),'Trim',weight);
}
function jacketDiamond(b,x,y,width,height,mat){
 const p=[],uv=[],ids=[];function surface(X,Y){const rx=Y<1.02?.203:.233,rz=Y<1.02?.161:.177;return V(X,Y,rz*Math.sqrt(Math.max(.18,1-(X/rx)**2))+.011);}
 const pts=[[0,0],[-width/2,0],[0,height/2],[width/2,0],[0,-height/2]];for(const[X,Y]of pts){const q=surface(x+X,y+Y);if(X===0&&Y===0)q.z+=.015;p.push(...q);uv.push(X/width+.5,Y/height+.5);}ids.push(0,2,1,0,3,2,0,4,3,0,1,4);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();b.add(g,mat,q=>torsoWeights(q.y));
 const edge=[1,2,3,4,1].map(i=>V(...p.slice(i*3,i*3+3)));b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge,false,'catmullrom',.01),16,.0023,4,false),'Trim',q=>torsoWeights(q.y));
}
function addCutDetails(b,style){
 if(style.asymmetric){
  for(let i=0;i<3;i++)clothFan(b,i%2?'SatinRed':'Ruffles',[.205+i*.026,1.235-i*.065,.072],[.65,-.55,.26],[0,0,1],.245,.22,.043,.5+i*.8,rigid('UpperArm_L'));
  clothFan(b,'Cloth',[-.165,.900,.166],[-.28,-.95,.08],[0,0,1],.24,.30,.039,1.2,rigid('Pelvis'),{taper:true});
 }
 if(style.patchwork){
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)jacketDiamond(b,(col-1)*.112,.96+row*.077,.10,.135,['SatinRed','Ruffles','Trim','Cloth','SatinBurgundy'][(row*2+col)%5]);
  for(const sign of[-1,1])for(let i=0;i<3;i++)clothFan(b,i%2?'Ruffles':'SatinRed',[sign*(.05+i*.076),.813,.153],[sign*.16,-.95,.1],[0,0,1],.085,.11+(i%2)*.02,.019,i,rigid('Pelvis'),{taper:true});
 }
 if(style.bolero){
  for(const sign of[-1,1]){
   clothFan(b,'SatinRed',[sign*.135,1.184,.153],[-sign*.35,-.95,.13],[0,0,1],.115,.202,.031,sign*.8,rigid('Chest'));
   clothFan(b,'Ruffles',[sign*.145,.85,.166],[sign*.52,-.85,.08],[0,0,1],.17,.15,.039,sign,rigid('Pelvis'),{taper:true});
  }
  for(const y of[.827,.886,.947])tube(b,'Trim',[torsoRing(y,.227-(y-.827)*.22,.17-(y-.827)*.14),torsoRing(y+.004,.227-(y-.827)*.22,.17-(y-.827)*.14)],q=>torsoWeights(q.y),24,false);
 }
 if(style.longCoat){
  openClothSector(b,'Cloth',[{y:.85,rx:.232,rz:.176},{y:.72,rx:.252,rz:.204},{y:.57,rx:.267,rz:.265},{y:.40,rx:.287,rz:.312},{y:.26,rx:.31,rz:.36}],2.16,Math.PI*2+.98,coatWeights,{columns:36});
  for(const sign of[-1,1])clothFan(b,'SatinRed',[sign*.187,.91,.174],[sign*.19,-.94,.1],[0,0,1],.128,.268,.028,sign,coatWeights,{taper:true});
 }
 if(style.tails){
  const rings=[{y:.86,rx:.235,rz:.18},{y:.74,rx:.254,rz:.23},{y:.54,rx:.25,rz:.30},{y:.31,rx:.24,rz:.34}];
  openClothSector(b,'Cloth',rings,Math.PI+.03,Math.PI*1.5-.09,coatWeights,{columns:12});openClothSector(b,'Cloth',rings,Math.PI*1.5+.09,Math.PI*2-.03,coatWeights,{columns:12});
  for(const sign of[-1,1])clothFan(b,'Ruffles',[sign*.11,.9,-.16],[sign*.63,-.26,-.2],[0,0,-1],.18,.14,.045,sign,rigid('Pelvis'));
 }
 if(style.cape){
  openClothSector(b,'SatinRed',[{y:1.225,rx:.22,rz:.15},{y:1.11,rx:.345,rz:.25},{y:.95,rx:.39,rz:.31},{y:.78,rx:.395,rz:.33},{y:.69,rx:.34,rz:.30}],Math.PI-.06,Math.PI*2+.06,q=>torsoWeights(Math.max(q.y,.94)),{columns:28,pleat:.065});
  for(let i=0;i<5;i++){const a=Math.PI+.23+i*.65;clothFan(b,i%2?'Cloth':'Ruffles',[Math.cos(a)*.27,1.12,Math.sin(a)*.23],[Math.cos(a)*.3,-.8,Math.sin(a)*.3],[Math.cos(a),0,Math.sin(a)],.19,.20,.039,i*.5,rigid('Chest'));}
 }
 if(style.gala){
  for(let i=0;i<4;i++)clothFan(b,i%2?'Ruffles':'Cloth',[.012*Math.sin(i),1.222-i*.064,.168+i*.006],[-.1,-.96,.14],[0,0,1],.16+i*.016,.14,.038,.4+i*.8,q=>torsoWeights(Math.max(q.y,1.04)));
  for(const sign of[-1,1])clothFan(b,sign>0?'SatinRed':'Ruffles',[sign*.213,.85,.18],[sign*.075,-.98,.18],[0,0,1],.18,.445,.034,sign,coatWeights,{taper:true});
 }
}
function buildOutfit(name,style={}){
const outfitB=new Builder(name),hemY=style.bolero?.965:.80;
// A short tailored casaca ends above the crotch. No closed skirt surface exists below it.
const jacketRings=[...(style.bolero?[torsoRing(.965,.196,.149)]:[torsoRing(.80,.228,.157),torsoRing(.86,.21,.148),torsoRing(.94,.185,.141)]),torsoRing(1.025,.202,.151),torsoRing(1.11,.231,.162),torsoRing(1.185,.237,.164),torsoRing(1.245,.158,.118),torsoRing(1.285,.08,.071)];
tube(outfitB,'Cloth',jacketRings.map((r,i)=>({...r,wave:.035,lobes:7,phase:i*.22})),q=>torsoWeights(q.y),32,false);
const jacketHem=style.bolero?[torsoRing(.965,.197,.151),torsoRing(.974,.197,.151)]:[torsoRing(.800,.229,.159),torsoRing(.809,.229,.159)];tube(outfitB,'Trim',jacketHem,rigid('Pelvis'),32,false);
// The upper seat joins at the anatomical crotch, while the two leg tubes stay separate below Y=.67.
const trouserSeat=[torsoRing(.705,.181,.134),torsoRing(.735,.19,.145),torsoRing(.80,.216,.147),torsoRing(.88,.209,.147)];
tube(outfitB,'Trouser',trouserSeat,rigid('Pelvis'),24,false);
// Neck ruff, waist sash and gold panel edges follow the same chest/waist articulation.
const collarAngles=style.collarCount?Array.from({length:style.collarCount},(_,i)=>.12+i*Math.PI*2/style.collarCount):[.05,.68,1.23,1.90,2.57,3.14,3.79,4.39,5.02,5.66];
for(let i=0;i<collarAngles.length;i++){
  const a=collarAngles[i],ca=Math.cos(a),sa=Math.sin(a),mat=['Cloth','SatinRed','Cloth','Ruffles','Cloth','SatinBurgundy','Cloth','SatinRed','Cloth','Ruffles'][i];
  clothFan(outfitB,mat,[ca*.102,1.238+(style.asymmetric?Math.sin(a)*.028:0),sa*.082],[ca*.82,style.asymmetric?.18+Math.cos(a)*.32:.31,sa*.85],[0,1,0],(.17+(i%3)*.014)*(style.collarScale??1),(.166+(i%2)*.018)*(style.collarScale??1),.036+(i%3)*.004,i*.73,rigid('Chest'));
}
for(let i=0;i<(style.frontRows??5);i++){const a=.34+i*.61,ca=Math.cos(a),sa=Math.sin(a);clothFan(outfitB,i%2?'SatinRed':'Cloth',[ca*.134,1.205,sa*.121],[ca*.64,-.30,sa*.7],[0,1,0],.195,.142,.035,.5+i*.61,rigid('Chest'));}

const sash=style.bolero?[torsoRing(.802,.233,.168),torsoRing(.846,.223,.163),torsoRing(.892,.215,.155),torsoRing(.970,.202,.154)]:[torsoRing(.865,.213,.151),torsoRing(.913,.202,.149)];tube(outfitB,'Ruffles',sash,ringWeight(sash,24,q=>torsoWeights(q.y)),24,false);
for(const[s,sign]of[['L',1],['R',-1]]){
  const ar=gatheredSleeve(sign).map((r,i)=>{const base=armRings(sign)[i],scale=style.sleeveScale??1;return{...r,rx:base.rx+(r.rx-base.rx)*scale,rz:base.rz+(r.rz-base.rz)*scale};});tube(outfitB,'Cloth',ar,ringWeight(ar,24,q=>armWeights(s,q)),24,false);
  ellipsoid(outfitB,'Cloth',[sign*.205,1.20,0],[.106,.094,.102],rigid(`UpperArm_${s}`),12,8);
  const cuff=ar.slice(-2).map(r=>({...r,rx:r.rx+.013,rz:r.rz+.013,wave:.10,lobes:8}));tube(outfitB,'Ruffles',cuff,ringWeight(cuff,20,q=>armWeights(s,q)),20,false);
  const end=ar.at(-1),before=ar.at(-2),dir=V(...end.c).sub(V(...before.c)).normalize();const trim=[{...end,c:V(...end.c).addScaledVector(dir,-.005).toArray(),rx:end.rx+.021,rz:end.rz+.021,wave:.10,lobes:8},{...end,c:V(...end.c).addScaledVector(dir,.006).toArray(),rx:end.rx+.021,rz:end.rz+.021,wave:.10,lobes:8}];tube(outfitB,'Trim',trim,rigid(`Forearm_${s}`),20,false);
  clothFan(outfitB,'Cloth',[sign*.440,.837,.072],[sign*.23,-.92,.12],[0,0,1],.18,.105,.031,sign*.7,rigid(`Forearm_${s}`));
  clothFan(outfitB,'SatinRed',[sign*.440,.825,-.011],[sign*.20,-.92,-.12],[0,0,-1],.16,.095,.026,.4-sign*.5,rigid(`Forearm_${s}`));
  const leg=trouserProfile(sign);tube(outfitB,'Trouser',leg,ringWeight(leg,20,q=>trouserWeights(s,q)),20,false);
  // A narrow vertical gold galon makes each trouser leg readable from the stage front.
  const stripePositions=[],stripeUV=[],stripeIndices=[];
  for(let j=0;j<leg.length;j++){const r=leg[j];for(const a of[.54,.61]){stripePositions.push(sign*(.106+r.rx*Math.cos(a)),r.c[1],r.c[2]+r.rz*Math.sin(a)+.001);stripeUV.push(a,j/(leg.length-1));}if(j<leg.length-1){const n=j*2;stripeIndices.push(n,n+2,n+1,n+1,n+2,n+3);}}
  if(sign<0)for(let i=0;i<stripeIndices.length;i+=3)[stripeIndices[i+1],stripeIndices[i+2]]=[stripeIndices[i+2],stripeIndices[i+1]];
  const stripe=new THREE.BufferGeometry();stripe.setAttribute('position',new THREE.Float32BufferAttribute(stripePositions,3));stripe.setAttribute('uv',new THREE.Float32BufferAttribute(stripeUV,2));stripe.setIndex(stripeIndices);stripe.computeVertexNormals();outfitB.add(stripe,'Trim',(q,i)=>trouserWeights(s,V(...leg[Math.floor(i/2)].c)));
  // Shoes have actual volume and stay at floor level in the rest pose.
  ellipsoid(outfitB,'Boot',[sign*.106,.057,.07],[.071,.057,.115],rigid(`Foot_${s}`),16,10);
  ellipsoid(outfitB,'Trim',[sign*.106,.093,.147],[.025,.011,.012],rigid(`Foot_${s}`),10,6);
}
// Broad shoulder and chest folds reproduce the fabric masses in the supplied photo.
for(const sign of[-1,1]){
  const shoulder=rigid(sign>0?'UpperArm_L':'UpperArm_R');
  clothFan(outfitB,'Cloth',[sign*.220,1.233,.075],[sign*.75,-.25,.13],[0,0,1],.22,.172,.041,sign*.5,shoulder);
  clothFan(outfitB,'SatinRed',[sign*.252,1.208,-.017],[sign*.68,-.34,-.10],[0,0,-1],.185,.152,.037,sign*.9,shoulder);
  if(!style.patchwork&&!style.bolero)clothFan(outfitB,'Cloth',[sign*.139,1.178,.149],[sign*.15,-.9,.18],[0,0,1],.182,.145,.037,.3+sign,rigid('Chest'));
  if(!style.longCoat&&!style.gala&&!style.bolero)clothFan(outfitB,'SatinRed',[sign*.12,.884,.167],[sign*.21,-.98,.12],[0,0,1],.157,.205,.025,.3+sign,rigid('Pelvis'),{taper:true});
}
if(!style.patchwork&&!style.bolero&&!style.gala)clothFan(outfitB,'Cloth',[.015,1.13,.165],[-.09,-.91,.14],[0,0,1],.195,.15,.036,.4,rigid('Chest'));
addCutDetails(outfitB,style);
const mesh=outfitB.build();mesh.userData.cut=style.cut??'volados-short';mesh.userData.jacketHemMetres=hemY;return mesh;
}
const outfitStyles={
 Outfit_Emerald:{cut:'volados-short'},
 Outfit_Festival:{cut:'asymmetric-festival',asymmetric:true,collarCount:8,collarScale:1.15,frontRows:2,sleeveScale:1.08},
 Outfit_Patchwork:{cut:'harlequin-panels',patchwork:true,collarCount:6,collarScale:.85,frontRows:0,sleeveScale:.90},
 Outfit_Bolero:{cut:'cropped-bolero',bolero:true,collarCount:6,collarScale:.82,frontRows:0,sleeveScale:1.18},
 Outfit_LongCoat:{cut:'open-long-coat',longCoat:true,collarCount:8,frontRows:2,sleeveScale:.90},
 Outfit_Tails:{cut:'split-rear-tails',tails:true,collarCount:6,frontRows:2,sleeveScale:.90},
 Outfit_Cape:{cut:'short-back-cape',cape:true,collarCount:6,frontRows:0,sleeveScale:.90},
 Outfit_Gala:{cut:'jabot-and-long-scarves',gala:true,collarCount:6,frontRows:0,sleeveScale:.95},
};
const outfits=Object.fromEntries(Object.entries(outfitStyles).map(([name,style])=>[name,buildOutfit(name,style)]));
const outfit=outfits.Outfit_Emerald;

const hatB=new Builder('Hat_Floral');
// High gathered fabric crown with an open dark interior; no feathers or rigid top-hat brim.
const crown=[];for(let i=0;i<9;i++){const y=[0,.065,.13,.21,.30,.39,.48,.55,.58][i],rx=[.19,.198,.184,.174,.186,.194,.203,.211,.205][i];crown.push({c:[.022*Math.sin(i*.66),y,-.018*Math.sin(i*.51)],rx,rz:rx*.87,wave:.035+i*.011,lobes:7,phase:i*.24});}
tube(hatB,'Cloth',crown,rigid('Head'),42,false);
const inner=hatB.parts.at(-1),innerIds=[...inner.ids];for(let i=0;i<innerIds.length;i+=3)[innerIds[i+1],innerIds[i+2]]=[innerIds[i+2],innerIds[i+1]];hatB.parts.push({...inner,n:inner.n.map(x=>-x),ids:innerIds,mat:'SatinBurgundy'});
const band=[{...torsoRing(.021,.196,.177),wave:.07,lobes:7},{...torsoRing(.062,.204,.182),wave:.1,lobes:7,phase:.3}];tube(hatB,'SatinBurgundy',band,rigid('Head'),35,false);
const hem=[{...torsoRing(.023,.199,.18),wave:.07,lobes:7},{...torsoRing(.031,.199,.18),wave:.07,lobes:7}];tube(hatB,'Trim',hem,rigid('Head'),35,false);
for(let i=0;i<7;i++){const a=.18+i*Math.PI*2/7,ca=Math.cos(a),sa=Math.sin(a),mat=['Cloth','SatinRed','Cloth','Ruffles','Cloth','SatinRed','Cloth'][i];clothFan(hatB,mat,[ca*.156,.50+(i%3)*.023,sa*.142],[ca*.42,.83,sa*.42],[ca,0,sa],.19+(i%2)*.018,.174+(i%3)*.015,.036+(i%2)*.012,.7+i*.76,rigid('Head'));}
clothFan(hatB,'SatinBurgundy',[-.052,.10,.163],[.06,.98,-.05],[0,0,1],.117,.408,.020,.3,rigid('Head'));
for(const sign of[-1,1]){const pts=crown.slice(1).map((r,i)=>V(sign*.057+r.c[0],r.c[1],r.c[2]+r.rz+.013+Math.sin(i*.7)*.008));hatB.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),20,.0026,4,false),'Trim',rigid('Head'));}
const hat=hatB.build(false,hatSocket);
// UV-consistent curved RGBA face overlay. Texture is embedded after exporter serialization.
const makeupB=new Builder('Makeup_Classic');
const makeupPos=[],makeupUV=[],makeupIndex=[],mw=18,mh=20;
for(let j=0;j<=mh;j++)for(let i=0;i<=mw;i++){const x=(i/mw-.5)*.292,y=1.325+j/mh*.3,p=faceSurface(x,y,'Face_Round',.002);makeupPos.push(...p);makeupUV.push(i/mw,j/mh);if(i<mw&&j<mh){const a=j*(mw+1)+i,c=a+mw+1;makeupIndex.push(a,a+1,c,a+1,c+1,c);}}
const mg=new THREE.BufferGeometry();mg.setAttribute('position',new THREE.Float32BufferAttribute(makeupPos,3));mg.setAttribute('uv',new THREE.Float32BufferAttribute(makeupUV,2));mg.setIndex(makeupIndex);mg.computeVertexNormals();makeupB.add(mg,'Makeup',rigid('Head'));makeupB.build();
const clips=[];
const eulerQ=(x=0,y=0,z=0)=>new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z)).toArray();
function makeClip(name,duration,pose){const times=[0,.25,.5,.75,1].map(t=>t*duration),tracks=[];for(const b of bones){const qs=[];for(const t of[0,.25,.5,.75,1])qs.push(...eulerQ(...(pose(t)[b.name]??[0,0,0])));tracks.push(new THREE.QuaternionKeyframeTrack(`${b.name}.quaternion`,times,qs));}const clip=new THREE.AnimationClip(name,duration,tracks);clips.push(clip);return clip;}
makeClip('idle',3.2,t=>({Spine:[0,Math.sin(t*Math.PI*2)*.018,0],Chest:[Math.sin(t*Math.PI*2)*.018,0,0],Head:[0,Math.sin(t*Math.PI*2)*.04,.015*Math.sin(t*Math.PI*2)],UpperArm_L:[-.04,0,-.40],UpperArm_R:[-.04,0,.40]}));
makeClip('singing',2.4,t=>({Chest:[-.028+Math.sin(t*Math.PI*2)*.02,0,0],Head:[-.03,.05*Math.sin(t*Math.PI*2),0],UpperArm_L:[-.08,0,-.40+.025*Math.sin(t*Math.PI*2)],UpperArm_R:[-.08,0,.40-.025*Math.sin(t*Math.PI*2)]}));
makeClip('walking',1.5,t=>{const s=Math.sin(t*Math.PI*2);return{Thigh_L:[s*.24,0,0],Thigh_R:[-s*.24,0,0],Shin_L:[Math.max(0,-s)*.2,0,0],Shin_R:[Math.max(0,s)*.2,0,0],UpperArm_L:[-s*.18,0,-.36],UpperArm_R:[s*.18,0,.36],Skirt_L:[s*.19,0,0],Skirt_R:[-s*.19,0,0],Spine:[0,s*.035,0]};});
makeClip('conducting',2,t=>{const s=Math.sin(t*Math.PI*2);return{UpperArm_L:[-.5-s*.23,-.12,-.18],UpperArm_R:[-.5+s*.23,.12,.18],Forearm_L:[-.5+s*.15,0,-.18],Forearm_R:[-.5-s*.15,0,.18],Hand_L:[-.12,0,-.12],Hand_R:[-.12,0,.12],Head:[-.025,s*.06,0],Chest:[0,s*.04,0]};});
makeClip('percussion',.9,t=>{const s=Math.sin(t*Math.PI*2);return{UpperArm_L:[-.26,0,-.36],UpperArm_R:[-.26,0,.36],Forearm_L:[-.40-s*.2,0,0],Forearm_R:[-.40+s*.2,0,0],Hand_L:[s*.14,0,0],Hand_R:[-s*.14,0,0]};});
makeClip('arms-up',2,t=>{const s=Math.sin(t*Math.PI);return{UpperArm_L:[-.15*s,0,1.95*s],UpperArm_R:[-.15*s,0,-1.95*s],Forearm_L:[-.13*s,0,0],Forearm_R:[-.13*s,0,0]};});
makeClip('elbows-bent',2,t=>{const s=Math.sin(t*Math.PI);return{UpperArm_L:[-.13*s,0,0],UpperArm_R:[-.13*s,0,0],Forearm_L:[-1.20*s,0,0],Forearm_R:[-1.20*s,0,0]};});
root.updateMatrixWorld(true);

function crc32(b){let c=0xffffffff;for(const x of b){c^=x;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function pngChunk(type,data){const t=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}
function makeupPNG(){
  const size=256,raw=Buffer.alloc(size*(1+size*4));
  for(let row=0;row<size;row++)for(let x=0;x<size;x++){
    const u=x/(size-1),v=row/(size-1),X=(u-.5)*.292,Y=1.325+v*.3;
    let rgba=[255,247,233,0];
    const ellipse=(cx,cy,rx,ry)=>((X-cx)/rx)**2+((Y-cy)/ry)**2<1;
    const eye=ellipse(-.058,1.505,.043,.025)||ellipse(.058,1.505,.043,.025);
    if((ellipse(-.08,1.515,.060,.09)||ellipse(.08,1.515,.060,.09)||ellipse(0,1.585,.055,.025))&&!eye)rgba=[255,248,235,158];
    for(const sign of[-1,1]){
      const dx=X-sign*.096,dy=Y-1.451,a=Math.atan2(dy,dx*sign),r=Math.hypot(dx,dy);
      if(a>-.8&&a<3.9&&Math.abs(r-(.008+(a+.8)*.0023))<.0015)rgba=[49,25,53,226];
      if(ellipse(sign*.109,1.43,.012,.0045))rgba=[218,40,112,220];
      if(ellipse(sign*.113,1.572,.003,.004))rgba=[255,211,85,230];
      if(Math.abs(Y-(1.587+Math.abs(X-sign*.11)*.5))<.0015&&Math.abs(X-sign*.11)<.018)rgba=[49,25,53,220];
    }
    const o=row*(1+size*4)+1+x*4;rgba.forEach((c,i)=>raw[o+i]=c);
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',header),pngChunk('IDAT',zlib.deflateSync(raw)),pngChunk('IEND',Buffer.alloc(0))]);
}
function parseGLB(buf){const jl=buf.readUInt32LE(12),json=JSON.parse(buf.subarray(20,20+jl));const o=20+jl,bl=buf.readUInt32LE(o);return{json,bin:buf.subarray(o+8,o+8+bl)};}
function packGLB(json,bin){const text=Buffer.from(JSON.stringify(json)),jb=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(jb);const bb=Buffer.alloc(Math.ceil(bin.length/4)*4);bin.copy(bb);const h=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(28+jb.length+bb.length,8);jh.writeUInt32LE(jb.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bb.length);bh.writeUInt32LE(0x004e4942,4);return Buffer.concat([h,jh,jb,bh,bb]);}
const exported=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,animations:clips,onlyVisible:false,trs:true}));
const {json,bin}=parseGLB(exported),png=makeupPNG(),padding=Buffer.alloc((4-bin.length%4)%4),imageOffset=bin.length+padding.length;
json.bufferViews.push({buffer:0,byteOffset:imageOffset,byteLength:png.length});json.images=[{name:'Makeup_Classic_RGBA',mimeType:'image/png',bufferView:json.bufferViews.length-1}];json.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];json.textures=[{sampler:0,source:0}];const makeupMat=json.materials.find(m=>m.name==='Makeup');makeupMat.pbrMetallicRoughness.baseColorTexture={index:0};makeupMat.alphaMode='BLEND';makeupMat.doubleSided=false;const finalBin=Buffer.concat([bin,padding,png]);json.buffers[0].byteLength=finalBin.length;
const final=packGLB(json,finalBin);
function writeIfChanged(file,data){if(!fs.existsSync(file)||!fs.readFileSync(file).equals(Buffer.from(data)))fs.writeFileSync(file,data);}
writeIfChanged(path.join(output,'canonical.glb'),final);writeIfChanged(path.join(source,'makeup-classic.png'),png);

// Actual skinning audit: apply joint animations, sample mesh positions and paired sleeve envelopes.
const audit={source:'scripts/build-canonical-character.mjs',systemId:'murga-human-v1',rigId:'murga-rig-v1',bytes:final.length,bones:bones.map(b=>b.name),slots:[],clips:clips.map(c=>c.name),bounds:{},deformation:[],limitations:['Procedural stylized art; Emerald and the shared hat preserve the approved design.','No runtime cloth simulation. Long coat, rear tails and lateral scarves use the shared Skirt_L/R cloth joints; trousers use the leg bones.','Numerical envelope checks do not prove the absence of every decorative fold intersection; front, profile and back visual reviews supplement them.']};
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
let triangles=0,vertices=0;
root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry;triangles+=g.index.count/3;vertices+=g.attributes.position.count;if(o.isSkinnedMesh){assert.equal(o.skeleton,skeleton);for(let i=0;i<g.attributes.skinWeight.count;i++){let sum=0;for(let k=0;k<4;k++){const w=g.attributes.skinWeight.array[i*4+k],bi=g.attributes.skinIndex.array[i*4+k];assert(Number.isFinite(w)&&w>=0&&bi<bones.length);sum+=w;}assert(Math.abs(sum-1)<1e-5);}}audit.slots.push({name:o.name,skinned:o.isSkinnedMesh===true,triangles:g.index.count/3,vertices:g.attributes.position.count,materials:(Array.isArray(o.material)?o.material:[o.material]).map(m=>m.name)});});
body.geometry.boundingBox=new THREE.Box3().setFromBufferAttribute(body.geometry.attributes.position);audit.bounds.body=body.geometry.boundingBox;assert(Math.abs(body.geometry.boundingBox.min.y)<1e-6);assert(Math.abs(body.geometry.boundingBox.max.y-1.7)<1e-6);audit.triangles=triangles;audit.vertices=vertices;audit.topologyHash=hash(Buffer.from(body.geometry.index.array.buffer));audit.bindPoseHash=hash(Buffer.from(new Float32Array(skeleton.boneInverses.flatMap(m=>m.elements)).buffer));
function skinPoint(p,weight){const result=V(),tmp=V(),bm=new THREE.Matrix4();const[si,sw]=weight;for(let i=0;i<4;i++)if(sw[i]){bm.multiplyMatrices(bones[si[i]].matrixWorld,skeleton.boneInverses[si[i]]);tmp.copy(p).applyMatrix4(bm);result.addScaledVector(tmp,sw[i]);}return result;}
const mixer=new THREE.AnimationMixer(root);
for(const clip of clips){const action=mixer.clipAction(clip).play();let minSleeveGap=Infinity,maxDisplacement=0,finite=true;const bounds=new THREE.Box3();for(let sample=0;sample<=12;sample++){mixer.setTime(clip.duration*sample/12);root.updateMatrixWorld(true);skeleton.update();for(const[s,sign]of[['L',1],['R',-1]]){const inner=armRings(sign),outer=armRings(sign,.022);for(let j=0;j<inner.length;j++){const prev=V(...inner[Math.max(0,j-1)].c),next=V(...inner[Math.min(inner.length-1,j+1)].c),tangent=next.sub(prev).normalize(),u=V(tangent.y,-tangent.x,0).normalize(),c=V(...inner[j].c),w=armWeights(s,c);for(let k=0;k<16;k++){const a=k/16*Math.PI*2,rad=(r)=>u.clone().multiplyScalar(Math.cos(a)*r.rx).addScaledVector(V(0,0,1),Math.sin(a)*r.rz),bp=skinPoint(c.clone().add(rad(inner[j])),w),gp=skinPoint(c.clone().add(rad(outer[j])),w);minSleeveGap=Math.min(minSleeveGap,bp.distanceTo(gp));}}}for(let i=0;i<body.geometry.attributes.position.count;i+=7){const p=V().fromBufferAttribute(body.geometry.attributes.position,i),q=body.applyBoneTransform(i,p.clone());finite&&=q.toArray().every(Number.isFinite);maxDisplacement=Math.max(maxDisplacement,p.distanceTo(q));bounds.expandByPoint(q);}}audit.deformation.push({clip:clip.name,samples:13,finite,minSleeveGapMetres:+minSleeveGap.toFixed(5),maxBodyDisplacementMetres:+maxDisplacement.toFixed(4),bounds});assert(finite);assert(minSleeveGap>.01);action.stop();mixer.stopAllAction();skeleton.pose();root.updateMatrixWorld(true);}
// A second independent audit checks the actual trouser/leg envelopes under every clip.
audit.outfit={type:'short-casaca-and-separate-trousers',jacketHemY:.80,crotchY:.705,separateLegsBelowY:.67,trouserMaterial:'Trouser',usesSkirtBones:false,minimumRestGapAtY062:.034,trouserDeformation:[]};
for(const clip of clips){
  const action=mixer.clipAction(clip).play();let minSignedClearance=Infinity,maxLeftDisplacement=0,maxRightDisplacement=0;
  for(let sample=0;sample<=12;sample++){
    mixer.setTime(clip.duration*sample/12);root.updateMatrixWorld(true);skeleton.update();
    for(const[side,sign]of[['L',1],['R',-1]]){
      const inner=bodyLegProfile(sign),outer=trouserProfile(sign);
      for(let j=0;j<inner.length;j++)for(let k=0;k<20;k++){
        const angle=k/20*Math.PI*2,c=V(...inner[j].c),w=trouserWeights(side,c),cp=skinPoint(c,w);
        const bp=skinPoint(c.clone().add(V(Math.cos(angle)*inner[j].rx,0,Math.sin(angle)*inner[j].rz)),w);
        const gpRest=c.clone().add(V(Math.cos(angle)*outer[j].rx,0,Math.sin(angle)*outer[j].rz)),gp=skinPoint(gpRest,w);
        minSignedClearance=Math.min(minSignedClearance,gp.clone().sub(bp).dot(bp.clone().sub(cp).normalize()));
        const displacement=gp.distanceTo(gpRest);if(sign>0)maxLeftDisplacement=Math.max(maxLeftDisplacement,displacement);else maxRightDisplacement=Math.max(maxRightDisplacement,displacement);
      }
    }
  }
  assert(minSignedClearance>.007,'Trouser shell intersects its matching body-leg envelope');
  audit.outfit.trouserDeformation.push({clip:clip.name,samples:13,minSignedClearanceMetres:+minSignedClearance.toFixed(5),maxLeftDisplacementMetres:+maxLeftDisplacement.toFixed(4),maxRightDisplacementMetres:+maxRightDisplacement.toFixed(4)});
  action.stop();mixer.stopAllAction();skeleton.pose();root.updateMatrixWorld(true);
}
assert(triangles<110000,'Packed eight-outfit package exceeded 110k triangles');
audit.variantDeformation={};
for(const [name,mesh]of Object.entries(outfits)){
 const results=[];
 for(const clip of clips){
  const action=mixer.clipAction(clip).play();let finite=true,minSleeveClearance=Infinity,maxDisplacement=0;const bounds=new THREE.Box3();
  for(let sample=0;sample<=12;sample++){
   mixer.setTime(clip.duration*sample/12);root.updateMatrixWorld(true);skeleton.update();
   for(let i=0;i<mesh.geometry.attributes.position.count;i+=5){const p=V().fromBufferAttribute(mesh.geometry.attributes.position,i),q=mesh.applyBoneTransform(i,p.clone());finite&&=q.toArray().every(Number.isFinite);maxDisplacement=Math.max(maxDisplacement,p.distanceTo(q));bounds.expandByPoint(q);}
   for(const[side,sign]of[['L',1],['R',-1]]){
    const inner=armRings(sign),outer=gatheredSleeve(sign),scale=outfitStyles[name].sleeveScale??1;
    for(let j=0;j<inner.length;j++){
     const prev=V(...inner[Math.max(0,j-1)].c),next=V(...inner[Math.min(inner.length-1,j+1)].c),t=next.sub(prev).normalize(),u=V(t.y,-t.x,0).normalize(),c=V(...inner[j].c),w=armWeights(side,c),cp=skinPoint(c,w);
     for(let k=0;k<24;k++){
      const a=k/24*Math.PI*2,r=outer[j],fold=1+r.wave*Math.cos(a*r.lobes),rx=inner[j].rx+(r.rx-inner[j].rx)*scale,rz=inner[j].rz+(r.rz-inner[j].rz)*scale;
      const bp=skinPoint(c.clone().addScaledVector(u,Math.cos(a)*inner[j].rx).addScaledVector(V(0,0,1),Math.sin(a)*inner[j].rz),w);
      const gp=skinPoint(c.clone().addScaledVector(u,Math.cos(a)*rx*fold).addScaledVector(V(0,0,1),Math.sin(a)*rz*fold),w);
      minSleeveClearance=Math.min(minSleeveClearance,gp.clone().sub(bp).dot(bp.clone().sub(cp).normalize()));
     }
    }
   }
  }
  assert(finite,`${name}: non-finite deformation in ${clip.name}`);assert(minSleeveClearance>.01,`${name}: sleeve clearance below 1cm`);
  results.push({clip:clip.name,samples:13,finite,minSignedSleeveClearanceMetres:+minSleeveClearance.toFixed(5),maxSampledVertexDisplacementMetres:+maxDisplacement.toFixed(4),sampledBounds:bounds});
  action.stop();mixer.stopAllAction();skeleton.pose();root.updateMatrixWorld(true);
 }
 audit.variantDeformation[name]=results;
}
const meshTriangles=o=>o.geometry.index.count/3;
const maximumFaceTriangles=Math.max(...['Face_Round','Face_Oval','Face_Angular','Face_Heart'].map(n=>meshTriangles(root.getObjectByName(n))));
const commonDressedTriangles=meshTriangles(body)+maximumFaceTriangles+Math.max(meshTriangles(root.getObjectByName('Hair_Curls_Hat')),meshTriangles(root.getObjectByName('Hair_Sweep_Hat')))+meshTriangles(hat)+meshTriangles(root.getObjectByName('Makeup_Classic'));
audit.budget={targetVisibleTrianglesPerActor:20000,packedTrianglesAllVariants:triangles,bytes:final.length,commonDressedTriangles,visibleByOutfit:Object.fromEntries(Object.entries(outfits).map(([name,o])=>[name,{outfitTriangles:meshTriangles(o),visibleWithMaximumFaceHairHatMakeup:commonDressedTriangles+meshTriangles(o),underTarget:commonDressedTriangles+meshTriangles(o)<=20000}])),note:'One outfit, face and hair variant render at a time. All download variants are counted separately from visible per-actor geometry.'};
audit.outfits=Object.fromEntries(Object.entries(outfits).map(([name,o])=>{o.geometry.computeBoundingBox();return[name,{...outfitStyles[name],jacketHemMetres:o.userData.jacketHemMetres,restBounds:o.geometry.boundingBox,triangles:meshTriangles(o),trouserProfile:'shared-separated-legs',bodyMaskRequired:false}]}));
fs.writeFileSync(path.join(source,'canonical-audit.json'),JSON.stringify(audit,null,2));
fs.writeFileSync(path.join(source,'canonical-manifest.json'),JSON.stringify({systemId:'murga-human-v1',bodyTemplateVersion:1,rigVersion:'murga-rig-v1',url:'/models/character-system/canonical.glb',referenceHeightMetres:1.7,heightDefinition:'feet to bare scalp',topologyHash:audit.topologyHash,bindPoseHash:audit.bindPoseHash,slots:audit.slots,clips:audit.clips,sockets:['head_hat','hand_l','hand_r','back_instrument'],sourceScript:'scripts/build-canonical-character.mjs'},null,2));
console.log(JSON.stringify({output:path.join(output,'canonical.glb'),bytes:final.length,triangles,vertices,bones:bones.length,clips:audit.clips,minSleeveGap:Math.min(...audit.deformation.map(x=>x.minSleeveGapMetres)),bounds:audit.bounds.body},null,2));
