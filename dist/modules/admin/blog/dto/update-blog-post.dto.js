"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBlogPostDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_blog_post_dto_1 = require("./create-blog-post.dto");
class UpdateBlogPostDto extends (0, mapped_types_1.PartialType)(create_blog_post_dto_1.CreateBlogPostDto) {
}
exports.UpdateBlogPostDto = UpdateBlogPostDto;
//# sourceMappingURL=update-blog-post.dto.js.map