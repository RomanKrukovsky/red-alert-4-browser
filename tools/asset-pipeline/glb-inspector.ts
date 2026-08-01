import crypto from 'node:crypto';
import fs from 'node:fs';

interface Accessor { count?: number; max?: number[]; min?: number[] }
interface Primitive { attributes?: { POSITION?: number }; indices?: number; mode?: number }
interface GlbJson {
  asset?: { version?: string };
  accessors?: Accessor[];
  animations?: Array<{ name?: string }>;
  images?: Array<{ uri?: string }>;
  materials?: unknown[];
  meshes?: Array<{ primitives?: Primitive[] }>;
  nodes?: Array<{ name?: string }>;
}

export interface GlbInspection {
  animations: string[];
  bytes: number;
  materials: number;
  nodeNames: string[];
  sha256: string;
  triangles: number;
  version: string;
  externalUris: string[];
}

export function inspectGlb(file: string): GlbInspection {
  const buffer = fs.readFileSync(file);
  if (buffer.toString('utf8', 0, 4) !== 'glTF') throw new Error(`${file}: invalid GLB header`);
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').replace(/\0+$/, '')) as GlbJson;
  let triangles = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      if (primitive.mode !== undefined && primitive.mode !== 4) continue;
      const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
      const count = accessorIndex === undefined ? 0 : json.accessors?.[accessorIndex]?.count ?? 0;
      triangles += Math.floor(count / 3);
    }
  }
  return {
    animations: (json.animations ?? []).map((item) => item.name ?? 'unnamed'),
    bytes: buffer.byteLength,
    externalUris: (json.images ?? []).map((image) => image.uri).filter((uri): uri is string => Boolean(uri)),
    materials: json.materials?.length ?? 0,
    nodeNames: (json.nodes ?? []).map((node) => node.name).filter((name): name is string => Boolean(name)),
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    triangles,
    version: json.asset?.version ?? 'unknown',
  };
}
