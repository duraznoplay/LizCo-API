import { S3Client } from '@aws-sdk/client-s3'
import { Provider } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { AppEnv } from '../../../config/env.schema'

export const MEDIA_S3_CLIENT = 'MEDIA_S3_CLIENT'

export const mediaS3ClientProvider: Provider = {
  provide: MEDIA_S3_CLIENT,
  useFactory: (config: ConfigService<AppEnv, true>) =>
    new S3Client({
      region: config.get('AWS_REGION', { infer: true }),
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID', { infer: true }),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY', { infer: true }),
      },
    }),
  inject: [ConfigService],
}
