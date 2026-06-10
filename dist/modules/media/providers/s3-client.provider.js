"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaS3ClientProvider = exports.MEDIA_S3_CLIENT = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const config_1 = require("@nestjs/config");
exports.MEDIA_S3_CLIENT = 'MEDIA_S3_CLIENT';
exports.mediaS3ClientProvider = {
    provide: exports.MEDIA_S3_CLIENT,
    useFactory: (config) => new client_s3_1.S3Client({
        region: config.get('AWS_REGION', { infer: true }),
        credentials: {
            accessKeyId: config.get('AWS_ACCESS_KEY_ID', { infer: true }),
            secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY', { infer: true }),
        },
    }),
    inject: [config_1.ConfigService],
};
//# sourceMappingURL=s3-client.provider.js.map