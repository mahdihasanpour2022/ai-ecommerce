import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

import type { ProductImageMediaType } from '../generated/prisma/enums.js';
import type { ProductImageUploadFile, ValidatedProductImage } from './product-image.dto.js';
import { ProductImageError } from './product-image.errors.js';

const MAX_BYTES = 409_599;
const MAX_DIMENSION = 8192;
const MAX_PIXELS = 25_000_000;

const TYPES: Readonly<
  Record<
    string,
    { readonly mediaType: ProductImageMediaType; readonly extension: 'jpg' | 'png' | 'webp' }
  >
> = {
  'image/jpeg': { mediaType: 'JPEG', extension: 'jpg' },
  'image/png': { mediaType: 'PNG', extension: 'png' },
  'image/webp': { mediaType: 'WEBP', extension: 'webp' },
};

@Injectable()
export class ProductImageValidator {
  async validate(file: ProductImageUploadFile): Promise<ValidatedProductImage> {
    if (file.size !== file.buffer.length) {
      throw new ProductImageError('PRODUCT_IMAGE_CONTENT_INVALID');
    }
    if (file.buffer.length > MAX_BYTES) {
      throw new ProductImageError('PRODUCT_IMAGE_TOO_LARGE');
    }
    if (file.buffer.length === 0) {
      throw new ProductImageError('PRODUCT_IMAGE_CONTENT_INVALID');
    }
    const expected = TYPES[file.mimetype];
    if (expected === undefined) {
      throw new ProductImageError('PRODUCT_IMAGE_TYPE_UNSUPPORTED');
    }
    const signature = detectAndValidateContainer(file.buffer);
    if (signature !== expected.mediaType) {
      throw new ProductImageError('PRODUCT_IMAGE_TYPE_UNSUPPORTED');
    }

    try {
      const metadata = await sharp(file.buffer, {
        animated: true,
        failOn: 'warning',
        limitInputPixels: MAX_PIXELS,
      }).metadata();
      if (
        metadata.format !== expected.extension.replace('jpg', 'jpeg') ||
        metadata.width === undefined ||
        metadata.height === undefined ||
        metadata.width < 1 ||
        metadata.height < 1 ||
        metadata.width > MAX_DIMENSION ||
        metadata.height > MAX_DIMENSION ||
        metadata.width * metadata.height > MAX_PIXELS
      ) {
        throw new ProductImageError('PRODUCT_IMAGE_DIMENSIONS_INVALID');
      }
      if ((metadata.pages ?? 1) !== 1) {
        throw new ProductImageError('PRODUCT_IMAGE_CONTENT_INVALID');
      }
      await sharp(file.buffer, {
        failOn: 'warning',
        limitInputPixels: MAX_PIXELS,
      })
        .raw()
        .toBuffer();
      return {
        bytes: file.buffer,
        mediaType: expected.mediaType,
        extension: expected.extension,
        byteSize: file.buffer.length,
        width: metadata.width,
        height: metadata.height,
      };
    } catch (error) {
      if (error instanceof ProductImageError) throw error;
      throw new ProductImageError('PRODUCT_IMAGE_CONTENT_INVALID');
    }
  }
}

function detectAndValidateContainer(bytes: Buffer): ProductImageMediaType {
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    validatePng(bytes);
    return 'PNG';
  }
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  ) {
    validateWebp(bytes);
    return 'WEBP';
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    validateJpeg(bytes);
    return 'JPEG';
  }
  throw new ProductImageError('PRODUCT_IMAGE_TYPE_UNSUPPORTED');
}

function validatePng(bytes: Buffer): void {
  let offset = 8;
  let first = true;
  let ended = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) invalidContent();
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (first && type !== 'IHDR') invalidContent();
    if (type === 'acTL') invalidContent();
    if (type === 'IEND') {
      if (length !== 0 || end !== bytes.length) invalidContent();
      ended = true;
    }
    if (ended && end !== bytes.length) invalidContent();
    first = false;
    offset = end;
  }
  if (!ended || offset !== bytes.length) invalidContent();
}

function validateWebp(bytes: Buffer): void {
  if (bytes.readUInt32LE(4) + 8 !== bytes.length) invalidContent();
  let offset = 12;
  let hasImage = false;
  while (offset + 8 <= bytes.length) {
    const type = bytes.toString('ascii', offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    const end = dataStart + length;
    const paddedEnd = end + (length % 2);
    if (paddedEnd > bytes.length) invalidContent();
    if (type === 'ANIM' || type === 'ANMF') invalidContent();
    if (type === 'VP8X' && length >= 1 && ((bytes[dataStart] ?? 0) & 0x02) !== 0) {
      invalidContent();
    }
    if (type === 'VP8 ' || type === 'VP8L' || type === 'VP8X') hasImage = true;
    offset = paddedEnd;
  }
  if (!hasImage || offset !== bytes.length) invalidContent();
}

function validateJpeg(bytes: Buffer): void {
  let offset = 2;
  let sawScan = false;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) invalidContent();
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    if (marker === undefined || marker === 0x00 || marker === 0xd8) invalidContent();
    offset += 1;
    if (marker === 0xd9) {
      if (!sawScan || offset !== bytes.length) invalidContent();
      return;
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) invalidContent();
    if (offset + 2 > bytes.length) invalidContent();
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) invalidContent();
    offset += length;
    if (marker !== 0xda) continue;
    sawScan = true;
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const markerStart = offset;
      while (bytes[offset] === 0xff) offset += 1;
      const scanMarker = bytes[offset];
      if (scanMarker === undefined) invalidContent();
      if (scanMarker === 0x00 || (scanMarker >= 0xd0 && scanMarker <= 0xd7)) {
        offset += 1;
        continue;
      }
      offset = markerStart;
      break;
    }
  }
  invalidContent();
}

function invalidContent(): never {
  throw new ProductImageError('PRODUCT_IMAGE_CONTENT_INVALID');
}
