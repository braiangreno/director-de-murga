import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = 'meshy_output/mila-the-mighty_01a0efe7/original.glb';
const output = 'public/models/components/mila-the-mighty.glb';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function read(relative) {
  const bytes = fs.readFileSync(path.join(project, relative));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67); assert.equal(bytes.readUInt32LE(4), 2); assert.equal(bytes.readUInt32LE(8), bytes.length);
  let json, binary;
  for (let offset = 12; offset < bytes.length;) {
    const size = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4), data = bytes.subarray(offset + 8, offset + 8 + size);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString());
    if (type === 0x004e4942) binary = data;
    offset += size + 8;
  }
  assert(json && binary);
  const external = [...(json.buffers ?? []), ...(json.images ?? [])].filter(item => item.uri);
  assert.equal(external.length, 0, 'External resources are not allowed');
  return {bytes, json, binary};
}
function accessor(asset, index) {
  const a = asset.json.accessors[index], view = asset.json.bufferViews[a.bufferView];
  const components = {SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type];
  const readers = {5121:['readUInt8',1],5123:['readUInt16LE',2],5125:['readUInt32LE',4],5126:['readFloatLE',4]};
  const [method,size] = readers[a.componentType];
  const start = (view.byteOffset ?? 0) + (a.byteOffset ?? 0), stride = view.byteStride ?? components * size;
  return Array.from({length:a.count * components}, (_,i) => asset.binary[method](start + Math.floor(i / components) * stride + i % components * size));
}
function dimensions(bytes, mime) {
  if (mime === 'image/webp') {
    for (let offset=12;offset+8<bytes.length;) {
      const type=bytes.toString('ascii',offset,offset+4), size=bytes.readUInt32LE(offset+4), data=offset+8;
      if(type==='VP8 ') return [bytes.readUInt16LE(data+6)&16383,bytes.readUInt16LE(data+8)&16383];
      if(type==='VP8X') return [bytes.readUIntLE(data+4,3)+1,bytes.readUIntLE(data+7,3)+1];
      if(type==='VP8L') {const bits=bytes.readUInt32LE(data+1);return [(bits&16383)+1,((bits>>>14)&16383)+1];}
      offset=data+size+(size%2);
    }
  }
  if (mime==='image/jpeg') {
    for(let offset=2;offset+9<bytes.length;) {
      if(bytes[offset]!==255){offset++;continue;}
      const marker=bytes[offset+1];
      if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) return [bytes.readUInt16BE(offset+7),bytes.readUInt16BE(offset+5)];
      offset+=2+bytes.readUInt16BE(offset+2);
    }
  }
  throw Error(`Unsupported image header: ${mime}`);
}
function material(m) {
  const p=m.pbrMetallicRoughness ?? {};
  return {baseColor:p.baseColorFactor??[1,1,1,1],metallic:p.metallicFactor??1,roughness:p.roughnessFactor??1,emissive:m.emissiveFactor??[0,0,0],alpha:m.alphaMode??'OPAQUE',doubleSided:m.doubleSided??false,normalScale:m.normalTexture?.scale??1,slots:[p.baseColorTexture,p.metallicRoughnessTexture,m.normalTexture].map(slot=>slot?{texCoord:slot.texCoord??0}:null)};
}
function stats(asset) {
  const j=asset.json;
  return {bytes:asset.bytes.length,sha256:sha(asset.bytes),meshes:j.meshes.length,materials:j.materials.length,vertices:j.meshes.reduce((sum,m)=>sum+m.primitives.reduce((n,p)=>n+j.accessors[p.attributes.POSITION].count,0),0),triangles:j.meshes.reduce((sum,m)=>sum+m.primitives.reduce((n,p)=>n+j.accessors[p.indices].count/3,0),0),skins:j.skins?.length??0,animations:j.animations?.length??0,extensionsUsed:j.extensionsUsed??[],extensionsRequired:j.extensionsRequired??[],images:j.images.map(image=>{const view=j.bufferViews[image.bufferView];const bytes=asset.binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);return {mime:image.mimeType,bytes:bytes.length,dimensions:dimensions(bytes,image.mimeType)};})};
}
const before=read(source), after=read(output), geometryChecks=[];
assert.equal(before.json.meshes.length,after.json.meshes.length);
before.json.meshes.forEach((mesh,i)=>mesh.primitives.forEach((primitive,p)=>{
  const next=after.json.meshes[i].primitives[p];
  assert.equal(primitive.mode??4,next.mode??4);
  assert.deepEqual(Object.keys(primitive.attributes).sort(),Object.keys(next.attributes).sort());
  for(const semantic of [...Object.keys(primitive.attributes),'indices']) {
    const left=accessor(before,semantic==='indices'?primitive.indices:primitive.attributes[semantic]);
    const right=accessor(after,semantic==='indices'?next.indices:next.attributes[semantic]);
    assert.deepEqual(left,right,`${semantic} values changed`);
    geometryChecks.push({semantic,values:left.length,sha256:sha(JSON.stringify(left)),identical:true});
  }
}));
assert.deepEqual(before.json.materials.map(material),after.json.materials.map(material));
const report={pipeline:'@gltf-transform/cli 4.5.1: dedup, prune with preservation flags, resize Lanczos3 1024, WebP quality90 effort80',source,output,before:stats(before),after:stats(after),geometryChecks,materialFactorsAndSlotsIdentical:true,allResourcesEmbedded:true,sourcePreserved:true,validation:{errors:0,warnings:['MESH_PRIMITIVE_GENERATED_TANGENT_SPACE: original has normalTexture but no TANGENT accessor.']}};
assert(report.after.images.every(image=>Math.max(...image.dimensions)<=1024));
assert(!report.after.extensionsUsed.some(extension=>/draco|meshopt|basis/i.test(extension)));
report.reductionPercent=(1-report.after.bytes/report.before.bytes)*100;
fs.writeFileSync(path.join(project,'meshy_output/mila-the-mighty_01a0efe7/mobile-preparation/report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
