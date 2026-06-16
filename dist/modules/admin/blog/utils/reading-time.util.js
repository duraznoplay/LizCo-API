"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateReadingTime = calculateReadingTime;
function calculateReadingTime(content) {
    if (!content)
        return 1;
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200);
    return Math.max(1, readingTime);
}
//# sourceMappingURL=reading-time.util.js.map