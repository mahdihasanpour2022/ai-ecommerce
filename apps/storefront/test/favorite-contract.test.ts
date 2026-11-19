import assert from 'node:assert/strict';
import test from 'node:test';
import type { FavoriteProductResponse } from '../features/favorite/favorite';
import {
  favoriteKeys,
  runFavoriteSingleFlight,
  withFavoriteStatus,
} from '../features/favorite/favorite';

const productResponse = {
  statusCode: 200,
  hasError: false,
  message: 'ok',
  code: 'OPERATION_SUCCESS',
  count: 0,
  result: null,
  singleResult: {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'product',
    description: 'description',
    category: { id: '00000000-0000-4000-8000-000000000002', name: 'category' },
    image: '/image',
    alt: 'product',
    original_price: 100,
    final_price: 100,
    discount: 0,
    currency: 'IRR',
    quantity: 1,
    isAvailable: true,
    isFavorite: false,
    categoryPath: [],
    variants: [],
  },
  details: null,
} as const satisfies FavoriteProductResponse;

void test('favorite keys include every paging variable', () => {
  assert.deepEqual(favoriteKeys.list(2, 24), ['favorite', 'list', { page: 2, pageSize: 24 }]);
});

void test('optimistic update changes only isFavorite', () => {
  const updated = withFavoriteStatus(productResponse, true);
  assert.deepEqual(updated, {
    ...productResponse,
    singleResult: { ...productResponse.singleResult, isFavorite: true },
  });
  assert.equal(productResponse.singleResult.isFavorite, false);
});

void test('concurrent favorite operations for one product share one request', async () => {
  let calls = 0;
  let resolveRequest: ((value: string) => void) | undefined;
  const request = () => {
    calls += 1;
    return new Promise<string>((resolve) => {
      resolveRequest = resolve;
    });
  };

  const first = runFavoriteSingleFlight('product-1', request);
  const second = runFavoriteSingleFlight('product-1', request);
  assert.equal(calls, 1);
  resolveRequest?.('done');
  assert.equal(await first, 'done');
  assert.equal(await second, 'done');
});
