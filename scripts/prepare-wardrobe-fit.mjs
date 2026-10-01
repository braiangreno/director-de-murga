import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceRoot='meshy_output/20260929_224556_murga-modular-esmeralda_01a0effd';
const transforms={
  traje:{scale:[1.09,1.13,1.06],translation:[.002,.64,.09],requiresOcclusion:['MilaUnderOutfit']},
  sombrero:{scale:[.72,.78,.82],translation:[-.018,1.7796,-.025],requiresOcclusion:['MilaUnderHat']},
};
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function read(relative){const bytes=fs.readFileSync(path.join(project,relative));let json,binary;assert.equal(bytes.readUInt32LE(0),0x46546c67);for(let o=12;o<bytes.length;){const size=bytes.readUInt32LE(o),type=bytes.readUInt32LE(o+4),chunk=bytes.subarray(o+8,o+8+size);if(type===0x4e4f534a)json=JSON.parse(chunk.toString());if(type===0x004e4942)binary=chunk;o+=8+size;}assert(json&&binary);return{bytes,json,binary};}
function write(relative,asset){const text=Buffer.from(JSON.stringify(asset.json)),json=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(json);const binary=Buffer.alloc(Math.ceil(asset.binary.length/4)*4);asset.binary.copy(binary);const header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8);jh.writeUInt32LE(json.length,0);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(binary.length,0);bh.writeUInt32LE(0x004e4942,4);fs.writeFileSync(path.join(project,relative),Buffer.concat([header,jh,json,bh,binary]));}
function values(asset,index){const a=asset.json.accessors[index],view=asset.json.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],reader={5121:['readUInt8',1],5123:['readUInt16LE',2],5125:['readUInt32LE',4],5126:['readFloatLE',4]}[a.componentType],offset=(view.byteOffset??0)+(a.byteOffset??0);return Array.from({length:a.count*n},(_,i)=>asset.binary[reader[0]](offset+Math.floor(i/n)*(view.byteStride??n*reader[1])+(i%n)*reader[1]));}
function dimensions(asset,image){const v=asset.json.bufferViews[image.bufferView],b=asset.binary.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength);for(let o=12;o+8<b.length;){const type=b.toString('ascii',o,o+4),n=b.readUInt32LE(o+4),d=o+8;if(type==='VP8 ')return[b.readUInt16LE(d+6)&16383,b.readUInt16LE(d+8)&16383];if(type==='VP8X')return[b.readUIntLE(d+4,3)+1,b.readUIntLE(d+7,3)+1];if(type==='VP8L'){const bits=b.readUInt32LE(d+1);return[(bits&16383)+1,((bits>>>14)&16383)+1];}o=d+n+(n%2);}throw Error('Expected embedded WebP texture');}
function repairInvalidNormals(asset){
  let repaired=0;
  for(const mesh of asset.json.meshes)for(const p of mesh.primitives){
    const positions=values(asset,p.attributes.POSITION),normals=values(asset,p.attributes.NORMAL),ids=values(asset,p.indices),sums=new Float64Array(positions.length);
    for(let t=0;t<ids.length;t+=3){const a=ids[t]*3,b=ids[t+1]*3,c=ids[t+2]*3,ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],uz=positions[b+2]-positions[a+2],vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],vz=positions[c+2]-positions[a+2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const i of[a,b,c]){sums[i]+=nx;sums[i+1]+=ny;sums[i+2]+=nz;}}
    const accessor=asset.json.accessors[p.attributes.NORMAL],view=asset.json.bufferViews[accessor.bufferView],offset=(view.byteOffset??0)+(accessor.byteOffset??0),stride=view.byteStride??12;
    for(let i=0;i<normals.length;i+=3){const length=Math.hypot(normals[i],normals[i+1],normals[i+2]);if(length>.999&&length<1.001)continue;let next=length>1e-8?[normals[i]/length,normals[i+1]/length,normals[i+2]/length]:Array.from(sums.slice(i,i+3)),n=Math.hypot(...next);
      if(n<1e-12){let nearest=Infinity,index=-1;for(let j=0;j<normals.length;j+=3){if(Math.hypot(normals[j],normals[j+1],normals[j+2])<.99)continue;const distance=(positions[i]-positions[j])**2+(positions[i+1]-positions[j+1])**2+(positions[i+2]-positions[j+2])**2;if(distance<nearest){nearest=distance;index=j;}}assert(index>=0);next=normals.slice(index,index+3);n=Math.hypot(...next);}
      for(let k=0;k<3;k++)asset.binary.writeFloatLE(next[k]/n,offset+i/3*stride+k*4);repaired++;
    }
  }
  return repaired;
}
const report={coordinateFrame:'Mila normalized to 1.7m; Y up, front +Z, origin at feet. Load each GLB at identity.',pipeline:'glTF Transform 4.5.1 dedup, prune preservation flags, Lanczos3 resize 1024, WebP quality90; fit stored in a node, geometry unchanged',parts:{}};
for(const [part,fit]of Object.entries(transforms)){
  const original=read(`${sourceRoot}/${part}/model.glb`),asset=read(`${sourceRoot}/${part}/mobile-preparation/webp.glb`);
  const j=asset.json;
  assert.equal(j.meshes.length,original.json.meshes.length);
  const checks=[];
  original.json.meshes.forEach((mesh,mi)=>mesh.primitives.forEach((primitive,pi)=>{
    const next=j.meshes[mi].primitives[pi];
    for(const semantic of [...Object.keys(primitive.attributes),'indices']){
      const left=values(original,semantic==='indices'?primitive.indices:primitive.attributes[semantic]);
      const right=values(asset,semantic==='indices'?next.indices:next.attributes[semantic]);
      assert.deepEqual(left,right,`${part} ${semantic} changed`);checks.push({semantic,values:left.length,sha256:hash(JSON.stringify(left)),identical:true});
    }
  }));
  assert.equal(j.materials.length,original.json.materials.length);
  assert.equal([...j.buffers,...j.images].filter(r=>r.uri).length,0);
  assert(!(j.extensionsRequired??[]).some(x=>/draco|meshopt|basis/i.test(x)));
  const images=j.images.map(image=>({mimeType:image.mimeType,dimensions:dimensions(asset,image)}));
  assert(images.every(image=>Math.max(...image.dimensions)<=1024));
  const repairedNormals=repairInvalidNormals(asset);
  if(repairedNormals){const normalCheck=checks.find(c=>c.semantic==='NORMAL');normalCheck.identical=false;normalCheck.invalidSourceNormalsRepaired=repairedNormals;}
  for(const scene of j.scenes){const root=j.nodes.length;j.nodes.push({name:`${part}-ajustado-a-Mila`,children:scene.nodes,scale:fit.scale,translation:fit.translation,extras:{coordinateFrame:'mila-1.7m-feet-origin',requiresOcclusion:fit.requiresOcclusion}});scene.nodes=[root];}
  const output=`public/models/wardrobe/${part}-esmeralda-01.glb`;write(output,asset);const final=read(output);
  const primitive=j.meshes[0].primitives[0],position=j.accessors[primitive.attributes.POSITION];
  const bounds={min:position.min.map((v,i)=>v*fit.scale[i]+fit.translation[i]),max:position.max.map((v,i)=>v*fit.scale[i]+fit.translation[i])};
  report.parts[part]={original:`${sourceRoot}/${part}/model.glb`,originalBytes:original.bytes.length,originalSha256:hash(original.bytes),output,outputBytes:final.bytes.length,outputSha256:hash(final.bytes),reductionPercent:100*(1-final.bytes.length/original.bytes.length),vertices:position.count,triangles:j.accessors[primitive.indices].count/3,materials:j.materials.length,images,extensionsRequired:j.extensionsRequired,fit,bounds,repairedNormals,geometryChecks:checks};
}
fs.writeFileSync(path.join(project,sourceRoot,'wardrobe-fit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
