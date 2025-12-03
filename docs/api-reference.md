# ArchiHAU API Reference

Tài liệu này mô tả toàn bộ REST API hiện có trong dự án, bao gồm phương thức, endpoint, yêu cầu xác thực và cấu trúc dữ liệu trả về.

## 1. Chuẩn chung

- Base URL: `http://<host>:<port>` (mặc định `http://localhost:3000`).
- Dữ liệu yêu cầu và phản hồi sử dụng `application/json`.
- Các endpoint yêu cầu đăng nhập phải gửi header `Authorization: Bearer <JWT>`.
- JWT sinh ra từ `/auth/login` hoặc `/auth/register` với thời gian sống mặc định `2h`.
- Hệ thống quyền hiện có: `manager`, `editor`. Các quyền khác (nếu thêm) có thể sử dụng middleware `authorizeRoles`.

## 2. Định nghĩa dữ liệu

### 2.1 User
```json
{
  "id": number,
  "username": string,
  "password_hash": string,
  "email": string,
  "full_name": string | null,
  "avatar_url": string | null,
  "status": "active" | "inactive" | "banned",
  "created_at": string (ISO datetime),
  "updated_at": string (ISO datetime),
  "userRoles": [
    {
      "user_id": number,
      "role_id": number,
      "role": {
        "id": number,
        "name": string,
        "display_name": string,
        "description": string | null
      }
    }
  ],
  "posts": [Post]
}
```

### 2.2 Role & UserRole
```json
Role {
  "id": number,
  "name": string,
  "display_name": string,
  "description": string | null
}

UserRole {
  "user_id": number,
  "role_id": number,
  "user": User,
  "role": Role
}
```

### 2.3 Category
```json
{
  "id": number,
  "name": string,
  "slug": string,
  "description": string | null,
  "display_order": number,
  "created_at": string,
  "updated_at": string,
  "parent_id": number | null,
  "parent": Category | null,
  "children": Category[],
  "postCategories": PostCategory[],
  "postCount": number
}
```

### 2.4 Post
```json
{
  "id": number,
  "title": string,
  "slug": string,
  "excerpt": string | null,
  "content": string,
  "thumbnail_url": string | null,
  "status": "draft" | "pending" | "published" | "rejected",
  "view_count": number,
  "author": User,
  "author_id": number,
  "created_at": string,
  "updated_at": string,
  "published_at": string | null,
  "postCategories": PostCategory[],
  "postTags": PostTag[]
}
```

### 2.5 Tag & PostTag
```json
Tag {
  "id": number,
  "name": string,
  "slug": string,
  "postTags": PostTag[]
}

PostTag {
  "post_id": number,
  "tag_id": number,
  "post": Post,
  "tag": Tag
}
```

### 2.6 PostCategory
```json
{
  "post_id": number,
  "category_id": number,
  "is_primary": boolean,
  "post": Post,
  "category": Category
}
```

### 2.7 Event
```json
{
  "id": number,
  "name": string,
  "start_time": string,
  "end_time": string,
  "title": string,
  "content": string,
  "location": string,
  "created_at": string,
  "updated_at": string,
  "status": "upcoming" | "ongoing" | "finished"
}
```

## 3. Auth API

### POST `/auth/register`
- **Mô tả**: Tạo tài khoản mới và trả về JWT.
- **Body**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "full_name": "string (optional)",
  "avatar_url": "string (optional)"
}
```
- **Phản hồi** `201`:
```json
{
  "token": "JWT",
  "user": {
    "id": number,
    "username": string,
    "email": string,
    "full_name": string | null,
    "status": string,
    "avatar_url": string | null,
    "roles": string[]
  }
}
```

### POST `/auth/login`
- **Mô tả**: Đăng nhập bằng username hoặc email.
- **Body**:
```json
{
  "identifier": "username or email",
  "password": "string"
}
```
- **Phản hồi** `200`: giống `/auth/register`.

### GET `/auth/me`
- **Auth**: Bắt buộc (Bearer token).
- **Phản hồi**:
```json
{
  "user": {
    "id": number,
    "username": string,
    "email": string,
    "full_name": string | null,
    "status": string,
    "avatar_url": string | null,
    "roles": string[]
  }
}
```

## 4. User API (chỉ dành cho `manager`)

| Method | Endpoint      | Mô tả                     |
|--------|---------------|---------------------------|
| GET    | `/users`      | Lấy toàn bộ user + roles + posts |
| GET    | `/users/:id`  | Lấy chi tiết user         |
| POST   | `/users`      | Tạo user mới (body = `username`, `email`, `password` + optional dữ liệu khác và `roles: string[]`) |
| PUT    | `/users/:id`  | Cập nhật user (có thể đổi `password`, các field khác và danh sách `roles`) |
| DELETE | `/users/:id`  | Xóa user                  |
| POST   | `/users/:id/roles` | Gán role cho user (body `{ "role": "manager" }`) |
| DELETE | `/users/:id/roles/:roleName` | Gỡ role khỏi user |

> Lưu ý: phản hồi luôn trả về toàn bộ trường của entity `User` (bao gồm `password_hash`, `userRoles`, `posts`). Cần che giấu ở client nếu không muốn hiển thị hash. Với hai endpoint gán/gỡ role, body/response cũng trả về user đầy đủ sau khi cập nhật.
> Khi tạo user qua `/users`, cần gửi `password` (API sẽ tự hash). Có thể thêm `roles: ["editor","manager"]` để gán role ngay. Các role phải tồn tại sẵn trong bảng `roles`. Endpoint `PUT /users/:id` cũng nhận `password` để đổi mật khẩu và `roles` để set lại toàn bộ quyền của user (gửi mảng rỗng để xóa hết role).

## 5. Post API

| Method | Endpoint                         | Auth | Quyền                 | Mô tả |
|--------|----------------------------------|------|-----------------------|-------|
| GET    | `/posts`                         | Không| -                     | Danh sách bài viết |
| GET    | `/posts/latest`                  | Không| -                     | 5 bài viết mới nhất, có thể chỉnh `limit` qua query (tối đa 20). |
| GET    | `/posts/category/:slug/latest`   | Không| -                     | 5 bài viết mới nhất thuộc category slug tương ứng (VD: `hoat-dong-khoa`), có thể chỉnh `limit` (tối đa 20). |
| GET    | `/posts/:id`                     | Không| -                     | Chi tiết bài viết |
| POST   | `/posts`       | Có   | `editor` hoặc `manager` | Tạo bài viết. Nếu không truyền `author_id` sẽ dùng `req.user.id`. |
| PUT    | `/posts/:id`   | Có   | `editor` hoặc `manager` | Cập nhật bài viết. |
| DELETE | `/posts/:id`   | Có   | `editor` hoặc `manager` | Xóa bài viết. |

- **Body chung** (`POST`/`PUT`):
```json
{
  "title": "string",
  "slug": "string",
  "excerpt": "string/null",
  "content": "string",
  "thumbnail_url": "string/null",
  "status": "draft|pending|published|rejected",
  "view_count": number,
  "author_id": number (optional),
  "published_at": "datetime/null",
  "category_ids": [1, 2, 3],  // optional, có thể null để bỏ qua
  "tag_ids": [4, 5] // optional, có thể null để bỏ qua
}
```
- **Phản hồi**: luôn trả về Post đầy đủ cùng các quan hệ `author`, `postCategories`, `postTags`.
- Nếu gửi `category_ids` hoặc `tag_ids`, hệ thống sẽ kiểm tra tồn tại; nếu danh sách trống nghĩa là xóa hết quan hệ hiện tại. Có thể gửi `null`/không gửi để giữ nguyên.

## 6. Category API

| Method | Endpoint        | Auth | Quyền     | Mô tả |
|--------|-----------------|------|-----------|-------|
| GET    | `/categories`   | Không| -         | Danh sách category (kèm parent, children, postCategories). |
| GET    | `/categories/:id` | Không| -       | Chi tiết category. |
| POST   | `/categories`   | Có   | `manager` | Tạo category mới. |
| PUT    | `/categories/:id` | Có | `manager` | Cập nhật category. |
| DELETE | `/categories/:id` | Có | `manager` | Xóa category (chỉ khi không có `children`). |

- **Body** (`POST`/`PUT`):
```json
{
  "name": "string",
  "slug": "string",
  "description": "string/null",
  "display_order": number,
  "parent_id": number | null
}
```
- **Phản hồi**: trả về Category đầy đủ (bao gồm `parent`, `children`, `postCategories`).

## 7. Tag API

| Method | Endpoint   | Auth | Quyền                 | Mô tả |
|--------|------------|------|-----------------------|-------|
| GET    | `/tags`    | Không| -                     | Danh sách tag. |
| GET    | `/tags/:id`| Không| -                     | Chi tiết tag. |
| POST   | `/tags`    | Có   | `editor` hoặc `manager` | Tạo tag. |
| PUT    | `/tags/:id`| Có   | `editor` hoặc `manager` | Cập nhật tag. |
| DELETE | `/tags/:id`| Có   | `editor` hoặc `manager` | Xóa tag. |

- **Body** (`POST`/`PUT`):
```json
{
  "name": "string",
  "slug": "string"
}
```
- **Phản hồi**: trả về Tag với quan hệ `postTags`.

## 8. Event API

| Method | Endpoint     | Auth | Quyền     | Mô tả |
|--------|--------------|------|-----------|-------|
| GET    | `/events`    | Không| -         | Danh sách sự kiện (sắp xếp theo `start_time` DESC). |
| GET    | `/events/:id`| Không| -         | Chi tiết sự kiện. |
| POST   | `/events`    | Có   | `manager` | Tạo sự kiện mới (`name`, `start_time`, `end_time`, `title`, `content`). |
| PUT    | `/events/:id`| Có   | `manager` | Cập nhật sự kiện. |
| DELETE | `/events/:id`| Có   | `manager` | Xóa sự kiện. |

- **Body** (`POST`/`PUT`):
```json
{
  "name": "string",
  "start_time": "datetime",
  "end_time": "datetime",
  "title": "string",
  "content": "string",
  "location": "string"
}
```
- **Phản hồi**: trả về Event đầy đủ và các trường `created_at`, `updated_at`.
- **Trạng thái**: thuộc tính `status` được tính tự động dựa trên thời gian hiện tại so với `start_time`/`end_time` (`upcoming`, `ongoing`, `finished`).

## 9. YouTube API

| Method | Endpoint               | Auth | Quyền | Mô tả |
|--------|------------------------|------|-------|-------|
| GET    | `/youtube/posts`       | Không| -     | Lấy danh sách video mới nhất của một kênh YouTube. Có thể truyền `channelId` hoặc sử dụng kênh mặc định cấu hình qua `YOUTUBE_DEFAULT_CHANNEL_ID`. Optional `limit` (tối đa 20). |

- **Query**:
  - `channelId` (tuỳ chọn nếu đã cấu hình `YOUTUBE_DEFAULT_CHANNEL_ID`): ID kênh YouTube (ví dụ `UC_x5XG1OV2P6uZZ5FSM9Ttw`).
  - `limit` (tuỳ chọn): số video muốn lấy (1-20, mặc định 5).
- **Env**: server cần `YOUTUBE_API_KEY` hợp lệ để gọi YouTube Data API. Có thể đặt `YOUTUBE_DEFAULT_CHANNEL_ID` để mặc định lấy video từ một kênh cụ thể.
- **Phản hồi** ví dụ:
```json
[
  {
    "id": "abc123",
    "title": "Video title",
    "description": "Mô tả",
    "publishedAt": "2024-12-01T07:00:00Z",
    "thumbnails": {
      "default": { "url": "https://..." }
    },
    "duration": "PT10M20S",
    "url": "https://www.youtube.com/watch?v=abc123"
  }
]
```

## 10. Healthcheck

- **GET** `/health`
  - Không cần auth.
  - Phản hồi: `{ "status": "ok" }`.

## 11. Ghi chú bổ sung

- Các endpoint CRUD đều trả về lỗi `400/401/403/404/500` kèm `{ "message": string }` và có thể thêm trường `details` trong một số trường hợp (ví dụ trong controller `post`).
- Để middleware phân quyền hoạt động đúng cần seeded bảng `roles` với các tên trùng (manager/editor). Người dùng mới đăng ký sẽ nhận role mặc định `editor` (có thể thay đổi bằng env `DEFAULT_USER_ROLE`).
- Mọi thời gian trả về ở định dạng ISO string từ trường `Date` của TypeORM.
