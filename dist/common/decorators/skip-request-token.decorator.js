"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipRequestToken = exports.SKIP_REQUEST_TOKEN_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.SKIP_REQUEST_TOKEN_KEY = 'skipRequestToken';
const SkipRequestToken = () => (0, common_1.SetMetadata)(exports.SKIP_REQUEST_TOKEN_KEY, true);
exports.SkipRequestToken = SkipRequestToken;
//# sourceMappingURL=skip-request-token.decorator.js.map