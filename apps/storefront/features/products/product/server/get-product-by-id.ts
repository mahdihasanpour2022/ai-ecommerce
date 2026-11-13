import 'server-only';

import { serverHttpClient } from '@/app/http/server-http-client';
import { ApiRoutes } from '@/constants/apiRoues';
import type { ProductResponse } from '../hooks/useGetProductById';

export async function getProductById(productId: string): Promise<ProductResponse> {
  return serverHttpClient.get<ProductResponse>(ApiRoutes.product(productId));
}
