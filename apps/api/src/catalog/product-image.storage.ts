import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

import type { ApiEnvironment } from '../config/environment.js';
import { API_ENVIRONMENT } from '../config/tokens.js';
import { ProductImageError } from './product-image.errors.js';

export interface PreparedProductImage {
  readonly storageKey: string;
  readonly stagingKey: string;
}

@Injectable()
export class ProductImageStorage {
  constructor(@Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment) {}

  async prepare(bytes: Buffer, extension: 'jpg' | 'png' | 'webp'): Promise<PreparedProductImage> {
    const root = await this.ensureRoot();
    const id = randomUUID();
    const storageKey = `objects/${id}.${extension}`;
    const stagingKey = `.staging/${id}.tmp`;
    try {
      await writeFile(this.pathFor(root, stagingKey), bytes, { flag: 'wx' });
      return { storageKey, stagingKey };
    } catch {
      throw new ProductImageError('PRODUCT_IMAGE_STORAGE_UNAVAILABLE');
    }
  }

  async promote(prepared: PreparedProductImage): Promise<void> {
    const root = await this.ensureRoot();
    try {
      await lstat(this.pathFor(root, prepared.storageKey)).then(
        () => Promise.reject(new Error('target exists')),
        () => undefined,
      );
      await rename(
        this.pathFor(root, prepared.stagingKey),
        this.pathFor(root, prepared.storageKey),
      );
    } catch {
      throw new ProductImageError('PRODUCT_IMAGE_STORAGE_UNAVAILABLE');
    }
  }

  async discard(key: string): Promise<void> {
    const root = await this.ensureRoot();
    const target = this.pathFor(root, key);
    try {
      const stat = await lstat(target);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('unsafe object');
      await unlink(target);
    } catch (error) {
      if (isMissing(error)) return;
      throw new ProductImageError('PRODUCT_IMAGE_STORAGE_UNAVAILABLE');
    }
  }

  async read(storageKey: string): Promise<Buffer> {
    const root = await this.ensureRoot();
    const target = this.pathFor(root, storageKey);
    try {
      const stat = await lstat(target);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('unsafe object');
      return await readFile(target);
    } catch {
      throw new ProductImageError('PRODUCT_IMAGE_STORAGE_UNAVAILABLE');
    }
  }

  private async ensureRoot(): Promise<string> {
    const configured = this.environment.productImages.localStorageRoot;
    if (configured === null) {
      throw new ProductImageError('PRODUCT_IMAGE_STORAGE_UNAVAILABLE');
    }
    try {
      await mkdir(configured, { recursive: true });
      const rootStat = await lstat(configured);
      if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error('unsafe root');
      const root = await realpath(configured);
      for (const child of ['.staging', 'objects']) {
        const directory = join(root, child);
        await mkdir(directory, { recursive: true });
        const stat = await lstat(directory);
        if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('unsafe directory');
        if ((await realpath(directory)) !== directory) throw new Error('escaped directory');
      }
      return root;
    } catch (error) {
      if (error instanceof ProductImageError) throw error;
      throw new ProductImageError('PRODUCT_IMAGE_STORAGE_UNAVAILABLE');
    }
  }

  private pathFor(root: string, key: string): string {
    if (!/^(?:objects\/[0-9a-f-]+\.(?:jpg|png|webp)|\.staging\/[0-9a-f-]+\.tmp)$/u.test(key)) {
      throw new ProductImageError('PRODUCT_IMAGE_STORAGE_UNAVAILABLE');
    }
    const target = resolve(root, ...key.split('/'));
    const pathRelative = relative(root, target);
    if (
      pathRelative.length === 0 ||
      pathRelative.startsWith(`..${sep}`) ||
      isAbsolute(pathRelative)
    ) {
      throw new ProductImageError('PRODUCT_IMAGE_STORAGE_UNAVAILABLE');
    }
    return target;
  }
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  );
}
