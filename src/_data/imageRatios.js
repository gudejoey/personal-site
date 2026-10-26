// Width ÷ height of every image in src/img, keyed by the path content uses ("img/photo.jpg").
// The gallery needs real shapes to lay images out in justified rows without cropping.
import { readdir } from "node:fs/promises";
import sharp from "sharp";

export default async function () {
  const ratios = {};
  const files = (await readdir("src/img")).filter(f => /\.(jpe?g|png|webp|gif|avif|tiff?)$/i.test(f));
  await Promise.all(files.map(async f => {
    try {
      const { width, height, orientation } = await sharp(`src/img/${f}`).metadata();
      // phone photos are often stored sideways with an EXIF rotation flag (5-8 = rotated 90°)
      const [w, h] = orientation >= 5 ? [height, width] : [width, height];
      ratios[`img/${f}`] = +(w / h).toFixed(4);
    } catch { /* unreadable file: the gallery falls back to a square slot */ }
  }));
  return ratios;
}
