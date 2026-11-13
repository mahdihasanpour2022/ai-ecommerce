import 'server-only';

import { serverHttpClient } from '@/app/http/server-http-client';
import { ApiRoutes } from '@/constants/apiRoues';
import { cache } from 'react';
import type { ProductResponse } from '../hooks/useGetProductById';

// یک فچر سمت سرور که درخواست زا زده و دیتا را به ریکت کوئری پاس میدهد
const fetchProductById = async (productId: string): Promise<ProductResponse> => {
  return serverHttpClient.get<ProductResponse>(ApiRoutes.product(productId));
};

export const getProductById = cache(fetchProductById);
