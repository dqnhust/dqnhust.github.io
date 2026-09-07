# dqnhust.github.io — TumbGames showroom

Trang giới thiệu game của TumbGames, host trên GitHub Pages tại
<https://dqnhust.github.io>.

## Cách thêm / sửa game

`data.json` là nguồn dữ liệu duy nhất. Sau khi sửa nó:

```bash
node build.js
git add -A && git commit -m "Add new game" && git push
```

`build.js` sinh ra:

| File | Vai trò |
| --- | --- |
| `index.html` | Danh mục game, nội dung render sẵn trong HTML |
| `games/<slug>/index.html` | 1 landing page riêng cho mỗi game |
| `sitemap.xml` | Danh sách URL nộp cho Google |
| `robots.txt` | Cho phép crawl, chặn các trang redirect |

Không sửa tay các file trên — lần build sau sẽ ghi đè.

GitHub Actions (`.github/workflows/build.yml`) cũng tự chạy `node build.js` và
commit lại mỗi khi `data.json` được push, nên nếu quên chạy tay thì vẫn ổn.

## Vì sao trang được tách ra nhiều file

Trước đây toàn bộ danh sách game được `js/myscript.js` nạp từ `data.json` bằng
JavaScript lúc runtime. Googlebot phải render JS mới thấy nội dung, việc này
thường bị hoãn hoặc bỏ qua, nên trang gần như trắng trong mắt search engine.
Giờ nội dung nằm thẳng trong HTML và mỗi game có URL riêng để rank theo tên game.

`js/myscript.js` không còn được `index.html` dùng nữa (giữ lại để tham khảo).

## Việc phải làm thủ công trên Google Search Console

Các bước này chỉ chủ sở hữu domain làm được, code không tự làm thay:

1. Vào <https://search.google.com/search-console>, thêm property
   `https://dqnhust.github.io/`. Domain đã có sẵn file xác minh
   `googlec133224ae3e015f2.html`.
2. Mục **Sitemaps** → nộp `sitemap.xml`.
3. Mục **URL Inspection** → dán `https://dqnhust.github.io/` → **Request
   indexing**. Làm tương tự cho vài trang game quan trọng nhất.
4. Sau 1–2 tuần xem **Performance** để biết từ khoá nào đang có impression, rồi
   chỉnh `description` trong `data.json` cho khớp từ khoá đó.
