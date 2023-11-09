import {
  checkBlobSizesQuery,
  deleteBlobMutation,
  fetchWithTraceReport,
  listBlobsQuery,
  setBlobMutation,
} from '@affine/graphql';
import { fetcher } from '@affine/workspace/affine/gql';
import type { BlobStorage } from '@blocksuite/store';

import { predefinedStaticFiles } from './local-static-storage';
import { isSvgBuffer } from './util';

export const createCloudBlobStorage = (workspaceId: string): BlobStorage => {
  return {
    crud: {
      get: async key => {
        const suffix = predefinedStaticFiles.includes(key)
          ? `/static/${key}`
          : `/api/workspaces/${workspaceId}/blobs/${key}`;

        const buffer = await fetchWithTraceReport(
          runtimeConfig.serverUrlPrefix + suffix
        ).then(res => {
          if (!res.ok) {
            // status not in the range 200-299
            return null;
          }
          return res.arrayBuffer();
        });
        if (!buffer) {
          return null;
        }
        const isSVG = isSvgBuffer(new Uint8Array(buffer));
        // for svg blob, we need to explicitly set the type to image/svg+xml
        return isSVG
          ? new Blob([buffer], { type: 'image/svg+xml' })
          : new Blob([buffer]);
      },
      set: async (key, value) => {
        const {
          checkBlobSize: { size },
        } = await fetcher({
          query: checkBlobSizesQuery,
          variables: {
            workspaceId,
            size: value.size,
          },
        });

        if (size <= 0) {
          throw new Error('Blob size limit exceeded');
        }

        const result = await fetcher({
          query: setBlobMutation,
          variables: {
            workspaceId,
            blob: new File([value], key),
          },
        });
        console.assert(result.setBlob === key, 'Blob hash mismatch');
        return key;
      },
      list: async () => {
        const result = await fetcher({
          query: listBlobsQuery,
          variables: {
            workspaceId,
          },
        });
        return result.listBlobs;
      },
      delete: async (key: string) => {
        await fetcher({
          query: deleteBlobMutation,
          variables: {
            workspaceId,
            hash: key,
          },
        });
      },
    },
  };
};
