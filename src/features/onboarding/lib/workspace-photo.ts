const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const OUTPUT_SIZE = 256;
const OUTPUT_QUALITY = 0.82;

export class WorkspacePhotoError extends Error {}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new WorkspacePhotoError('Could not read that image.'));
      }
    };
    reader.onerror = () => reject(new WorkspacePhotoError('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new WorkspacePhotoError('That file is not a supported image.'));
    image.src = src;
  });
}

/**
 * Resize a chosen workspace photo into a small square data URL.
 *
 * The app has no object store, so the database holds the image itself. Keeping
 * it at 256px and WebP (with a JPEG fallback) keeps the stored value bounded
 * while still looking sharp in the workspace switcher and onboarding header.
 */
export async function readWorkspacePhoto(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new WorkspacePhotoError('Choose an image file.');
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new WorkspacePhotoError('Choose an image smaller than 5 MB.');
  }

  const source = await readFile(file);
  const image = await loadImage(source);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new WorkspacePhotoError('Your browser could not process that image.');
  }

  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const scale = Math.max(OUTPUT_SIZE / image.width, OUTPUT_SIZE / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, (OUTPUT_SIZE - width) / 2, (OUTPUT_SIZE - height) / 2, width, height);

  const webp = canvas.toDataURL('image/webp', OUTPUT_QUALITY);

  if (webp.startsWith('data:image/webp')) {
    return webp;
  }

  return canvas.toDataURL('image/jpeg', OUTPUT_QUALITY);
}
