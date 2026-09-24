export const IMAGE_MAX_BYTES = 409_600;
export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';

const MIME_EXTENSIONS: Readonly<Record<string, readonly string[]>> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
};

export class ImageSanitizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageSanitizationError';
  }
}

export async function imageSanitizer(file: File): Promise<File> {
  if (file.size === 0) fail('فایل تصویر خالی است.');
  if (file.size >= IMAGE_MAX_BYTES) fail('حجم تصویر باید کمتر از ۴۰۰ کیلوبایت باشد.');

  const allowedExtensions = MIME_EXTENSIONS[file.type];
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions || !extension || !allowedExtensions.includes(extension)) {
    fail('فقط تصاویر JPG، JPEG، PNG و WebP مجاز هستند.');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasExpectedContainer(bytes, file.type)) {
    fail('محتوای فایل با فرمت تصویر انتخاب‌شده مطابقت ندارد.');
  }
  return file;
}

function hasExpectedContainer(bytes: Uint8Array, mediaType: string): boolean {
  if (mediaType === 'image/png') {
    return (
      startsWith(bytes, [137, 80, 78, 71, 13, 10, 26, 10]) &&
      endsWith(bytes, [0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130])
    );
  }
  if (mediaType === 'image/jpeg') {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes.at(-2) === 0xff &&
      bytes.at(-1) === 0xd9
    );
  }
  if (mediaType === 'image/webp') {
    return (
      bytes.length >= 12 &&
      ascii(bytes, 0, 4) === 'RIFF' &&
      ascii(bytes, 8, 12) === 'WEBP' &&
      new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) + 8 ===
        bytes.length
    );
  }
  return false;
}

function startsWith(bytes: Uint8Array, expected: readonly number[]): boolean {
  return expected.every((value, index) => bytes[index] === value);
}

function endsWith(bytes: Uint8Array, expected: readonly number[]): boolean {
  if (bytes.length < expected.length) return false;
  const offset = bytes.length - expected.length;
  return expected.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

function fail(message: string): never {
  throw new ImageSanitizationError(message);
}
