import fs from 'node:fs';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const rootDir = process.cwd();
const artifactsDir = path.join(rootDir, 'artifacts/ui-comparison');
const screenshotsDir = path.join(rootDir, 'SCREENSHOTS');

const blend = (reference: PNG, implementation: PNG): PNG => {
  const overlay = new PNG({ width: reference.width, height: reference.height });
  for (let index = 0; index < reference.data.length; index += 4) {
    overlay.data[index] = Math.round(reference.data[index] * .5 + implementation.data[index] * .5);
    overlay.data[index + 1] = Math.round(reference.data[index + 1] * .5 + implementation.data[index + 1] * .5);
    overlay.data[index + 2] = Math.round(reference.data[index + 2] * .5 + implementation.data[index + 2] * .5);
    overlay.data[index + 3] = 255;
  }
  return overlay;
};

const hudScreens = new Set([13, 14, 15, 16, 20, 21, 22, 23, 24]);

const isUiRegion = (screenNumber: number, x: number, y: number, width: number, height: number): boolean => {
  if (hudScreens.has(screenNumber)) return x < width * .31 || x > width * .69 || y < height * .13 || y > height * .69;
  if (screenNumber === 1) return (x > width * .25 && x < width * .75 && y < height * .55) || y > height * .82;
  if (screenNumber === 2) return x < width * .32 || y < height * .16 || y > height * .77;
  return true;
};

const luminance = (image: PNG, x: number, y: number): number => {
  const index = (y * image.width + x) * 4;
  return image.data[index] * .2126 + image.data[index + 1] * .7152 + image.data[index + 2] * .0722;
};

const edgeDifference = (screenNumber: number, reference: PNG, implementation: PNG): { comparedEdgePixels: number; differentEdgePixels: number; ratio: number } => {
  let comparedEdgePixels = 0;
  let differentEdgePixels = 0;
  for (let y = 1; y < reference.height - 1; y += 1) {
    for (let x = 1; x < reference.width - 1; x += 1) {
      if (!isUiRegion(screenNumber, x, y, reference.width, reference.height)) continue;
      const referenceGradient = Math.abs(luminance(reference, x + 1, y) - luminance(reference, x - 1, y)) + Math.abs(luminance(reference, x, y + 1) - luminance(reference, x, y - 1));
      const implementationGradient = Math.abs(luminance(implementation, x + 1, y) - luminance(implementation, x - 1, y)) + Math.abs(luminance(implementation, x, y + 1) - luminance(implementation, x, y - 1));
      const referenceEdge = referenceGradient > 42;
      const implementationEdge = implementationGradient > 42;
      if (!referenceEdge && !implementationEdge) continue;
      comparedEdgePixels += 1;
      if (referenceEdge !== implementationEdge) differentEdgePixels += 1;
    }
  }
  return { comparedEdgePixels, differentEdgePixels, ratio: comparedEdgePixels === 0 ? 0 : differentEdgePixels / comparedEdgePixels };
};

for (let screenNumber = 1; screenNumber <= 24; screenNumber += 1) {
  const id = `screen-${String(screenNumber).padStart(2, '0')}`;
  const screenDir = path.join(artifactsDir, id);
  const implementationPath = path.join(screenDir, 'implementation.png');
  if (!fs.existsSync(implementationPath)) continue;

  const referencePath = path.join(screenshotsDir, `${screenNumber}.png`);
  const localReferencePath = path.join(screenDir, 'reference.png');
  fs.mkdirSync(screenDir, { recursive: true });
  fs.copyFileSync(referencePath, localReferencePath);
  const reference = PNG.sync.read(fs.readFileSync(referencePath));
  const implementation = PNG.sync.read(fs.readFileSync(implementationPath));
  if (reference.width !== implementation.width || reference.height !== implementation.height) {
    fs.writeFileSync(path.join(screenDir, 'report.json'), JSON.stringify({ screenId: id, error: 'dimension-mismatch', reference: [reference.width, reference.height], implementation: [implementation.width, implementation.height] }, null, 2));
    continue;
  }

  const difference = new PNG({ width: reference.width, height: reference.height });
  const differentPixels = pixelmatch(reference.data, implementation.data, difference.data, reference.width, reference.height, { threshold: .12, includeAA: false });
  fs.writeFileSync(path.join(screenDir, 'difference.png'), PNG.sync.write(difference));
  fs.writeFileSync(path.join(screenDir, 'overlay.png'), PNG.sync.write(blend(reference, implementation)));
  const differenceRatio = differentPixels / (reference.width * reference.height);
  const geometry = edgeDifference(screenNumber, reference, implementation);
  fs.writeFileSync(path.join(screenDir, 'report.json'), JSON.stringify({ screenId: id, width: reference.width, height: reference.height, differentPixels, differenceRatio, visualDifferencePercentage: Number((differenceRatio * 100).toFixed(3)), uiGeometry: { method: 'edge-presence-in-ui-regions', comparedEdgePixels: geometry.comparedEdgePixels, differentEdgePixels: geometry.differentEdgePixels, differenceRatio: geometry.ratio, differencePercentage: Number((geometry.ratio * 100).toFixed(3)) } }, null, 2));
  console.log(`${id}: full ${(differenceRatio * 100).toFixed(2)}% · UI geometry ${(geometry.ratio * 100).toFixed(2)}%`);
}
