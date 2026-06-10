"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PG_ERROR_CODES = void 0;
exports.isUniqueViolation = isUniqueViolation;
exports.pgError = pgError;
exports.PG_ERROR_CODES = {
    UNIQUE_VIOLATION: '23505',
    FOREIGN_KEY_VIOLATION: '23503',
    NOT_NULL_VIOLATION: '23502',
};
function isUniqueViolation(error) {
    if (!(error instanceof Error))
        return false;
    const e = error;
    if (e.code === exports.PG_ERROR_CODES.UNIQUE_VIOLATION)
        return true;
    return (e.message.includes('duplicate key') ||
        e.message.includes('23505') ||
        e.message.includes('unique constraint'));
}
function pgError(error) {
    return Object.assign(new Error(error.message), { code: error.code });
}
//# sourceMappingURL=pg-error.js.map