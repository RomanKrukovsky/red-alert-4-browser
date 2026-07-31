import fs from 'fs';
import path from 'path';

export interface GLBNode {
  name: string;
  translation?: [number, number, number];
  rotation?: [number, number, number, number];
  scale?: [number, number, number];
  children?: number[];
  mesh?: number;
}

export interface GLBMesh {
  name: string;
  primitives: {
    attributes: {
      POSITION: number;
      NORMAL?: number;
      TEXCOORD_0?: number;
    };
    indices?: number;
    material?: number;
  }[];
}

export interface GLBMaterial {
  name: string;
  pbrMetallicRoughness: {
    baseColorFactor?: [number, number, number, number];
    metallicFactor?: number;
    roughnessFactor?: number;
  };
}

export class SimpleGLBWriter {
  private nodes: GLBNode[] = [];
  private meshes: GLBMesh[] = [];
  private materials: GLBMaterial[] = [];
  private accessors: any[] = [];
  private bufferViews: any[] = [];
  private binBuffers: Buffer[] = [];
  private totalBinByteLength: number = 0;

  public addMaterial(name: string, color: [number, number, number, number], metallic: number = 0.5, roughness: number = 0.5): number {
    const idx = this.materials.length;
    this.materials.push({
      name,
      pbrMetallicRoughness: {
        baseColorFactor: color,
        metallicFactor: metallic,
        roughnessFactor: roughness
      }
    });
    return idx;
  }

  public addBoxMesh(name: string, sizeX: number, sizeY: number, sizeZ: number, materialIdx?: number): number {
    const hx = sizeX / 2;
    const hy = sizeY / 2;
    const hz = sizeZ / 2;

    const positions = new Float32Array([
      // Front
      -hx, -hy,  hz,   hx, -hy,  hz,   hx,  hy,  hz,  -hx,  hy,  hz,
      // Back
      -hx, -hy, -hz,  -hx,  hy, -hz,   hx,  hy, -hz,   hx, -hy, -hz,
      // Top
      -hx,  hy, -hz,  -hx,  hy,  hz,   hx,  hy,  hz,   hx,  hy, -hz,
      // Bottom
      -hx, -hy, -hz,   hx, -hy, -hz,   hx, -hy,  hz,  -hx, -hy,  hz,
      // Right
       hx, -hy, -hz,   hx,  hy, -hz,   hx,  hy,  hz,   hx, -hy,  hz,
      // Left
      -hx, -hy, -hz,  -hx, -hy,  hz,  -hx,  hy,  hz,  -hx,  hy, -hz
    ]);

    const normals = new Float32Array([
       0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
       0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1,
       0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,
       0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,
       1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,
      -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0
    ]);

    const indices = new Uint16Array([
      0, 1, 2,  0, 2, 3,
      4, 5, 6,  4, 6, 7,
      8, 9, 10, 8, 10, 11,
      12, 13, 14, 12, 14, 15,
      16, 17, 18, 16, 18, 19,
      20, 21, 22, 20, 22, 23
    ]);

    // Push buffers
    const posByteOffset = this.totalBinByteLength;
    const posBuffer = Buffer.from(positions.buffer);
    this.binBuffers.push(posBuffer);
    this.totalBinByteLength += posBuffer.byteLength;

    const normByteOffset = this.totalBinByteLength;
    const normBuffer = Buffer.from(normals.buffer);
    this.binBuffers.push(normBuffer);
    this.totalBinByteLength += normBuffer.byteLength;

    const indByteOffset = this.totalBinByteLength;
    const indBuffer = Buffer.from(indices.buffer);
    this.binBuffers.push(indBuffer);
    this.totalBinByteLength += indBuffer.byteLength;

    // Align to 4 bytes
    const pad = (4 - (this.totalBinByteLength % 4)) % 4;
    if (pad > 0) {
      const padBuf = Buffer.alloc(pad);
      this.binBuffers.push(padBuf);
      this.totalBinByteLength += pad;
    }

    // BufferViews
    const posBv = this.bufferViews.length;
    this.bufferViews.push({ buffer: 0, byteOffset: posByteOffset, byteLength: posBuffer.byteLength, target: 34962 });
    
    const normBv = this.bufferViews.length;
    this.bufferViews.push({ buffer: 0, byteOffset: normByteOffset, byteLength: normBuffer.byteLength, target: 34962 });

    const indBv = this.bufferViews.length;
    this.bufferViews.push({ buffer: 0, byteOffset: indByteOffset, byteLength: indBuffer.byteLength, target: 34963 });

    // Accessors
    const posAcc = this.accessors.length;
    this.accessors.push({
      bufferView: posBv,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: 24,
      type: 'VEC3',
      max: [hx, hy, hz],
      min: [-hx, -hy, -hz]
    });

    const normAcc = this.accessors.length;
    this.accessors.push({
      bufferView: normBv,
      byteOffset: 0,
      componentType: 5126,
      count: 24,
      type: 'VEC3'
    });

    const indAcc = this.accessors.length;
    this.accessors.push({
      bufferView: indBv,
      byteOffset: 0,
      componentType: 5123, // UNSIGNED_SHORT
      count: 36,
      type: 'SCALAR'
    });

    const meshIdx = this.meshes.length;
    this.meshes.push({
      name,
      primitives: [{
        attributes: {
          POSITION: posAcc,
          NORMAL: normAcc
        },
        indices: indAcc,
        material: materialIdx
      }]
    });

    return meshIdx;
  }

  public addNode(node: GLBNode): number {
    const idx = this.nodes.length;
    this.nodes.push(node);
    return idx;
  }

  public writeToGLB(outputPath: string): void {
    const gltfJson = {
      asset: { version: '2.0', generator: 'RA4 Asset Pipeline GLB Builder 1.0' },
      scenes: [{ nodes: this.nodes.map((_, i) => i) }],
      scene: 0,
      nodes: this.nodes,
      meshes: this.meshes,
      materials: this.materials,
      accessors: this.accessors,
      bufferViews: this.bufferViews,
      buffers: [{ byteLength: this.totalBinByteLength }]
    };

    const jsonString = JSON.stringify(gltfJson);
    let jsonBuffer = Buffer.from(jsonString, 'utf8');

    // Align JSON buffer to 4 bytes
    const jsonPad = (4 - (jsonBuffer.byteLength % 4)) % 4;
    if (jsonPad > 0) {
      jsonBuffer = Buffer.concat([jsonBuffer, Buffer.alloc(jsonPad, 0x20)]);
    }

    const binBuffer = Buffer.concat(this.binBuffers);
    const totalLength = 12 + 8 + jsonBuffer.byteLength + 8 + binBuffer.byteLength;

    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46544C67, 0); // 'glTF'
    header.writeUInt32LE(2, 4);          // version
    header.writeUInt32LE(totalLength, 8);

    const jsonChunkHeader = Buffer.alloc(8);
    jsonChunkHeader.writeUInt32LE(jsonBuffer.byteLength, 0);
    jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4); // 'JSON'

    const binChunkHeader = Buffer.alloc(8);
    binChunkHeader.writeUInt32LE(binBuffer.byteLength, 0);
    binChunkHeader.writeUInt32LE(0x004E4942, 4); // 'BIN'

    const finalGlb = Buffer.concat([header, jsonChunkHeader, jsonBuffer, binChunkHeader, binBuffer]);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, finalGlb);
    console.log(`Generated GLB Model: ${outputPath} (${finalGlb.byteLength} bytes)`);
  }
}
