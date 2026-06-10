"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assistantTourCatalogSchema = void 0;
const zod_1 = require("zod");
exports.assistantTourCatalogSchema = zod_1.z.object({
    message: zod_1.z.string().trim().min(1).max(2000),
    language: zod_1.z.enum(['en', 'es', 'fr']).default('en'),
});
//# sourceMappingURL=assistant.dto.js.map