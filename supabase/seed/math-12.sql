-- Seed: Math 12 course (the launch course)
-- Run this AFTER 0001_init.sql, AFTER you've signed up at least one user
-- account that will be the instructor.
--
-- USAGE:
--   1. Sign up via /signup with the email you want to teach as.
--   2. Find that user's id in Supabase: select id from auth.users;
--   3. Replace <INSTRUCTOR_USER_ID> below with that uuid.
--   4. Update profiles.is_instructor = true for that user.
--   5. Run this whole file in the SQL editor.

-- Promote the instructor account
update public.profiles
set is_instructor = true,
    display_name = coalesce(display_name, 'Vo Hoang Ngan')
where id = '768e7436-fbbe-47f2-999e-41b17fcd16bb'::uuid;

-- The course
insert into public.courses (
  slug, title, subtitle, description, cover_image, price_vnd, level, duration_minutes,
  instructor_id, status
) values (
  'math-12',
  'Toán 12 — Luyện thi & Hiểu sâu',
  'Lộ trình ôn luyện môn Toán lớp 12 từ căn bản đến nâng cao',
  E'Khoá học Toán 12 được thiết kế dành cho học sinh lớp 12 đang chuẩn bị cho kỳ thi tốt nghiệp THPT và xét tuyển đại học.\n\nMỗi bài giảng kết hợp video giải thích chi tiết, flashcard ôn tập theo phương pháp lặp lại ngắt quãng (SRS), và bài quiz cuối bài để kiểm tra hiểu bài.\n\nTrọng tâm: Hàm số · Mũ và Logarit · Nguyên hàm Tích phân · Số phức · Hình học không gian · Phương pháp toạ độ.',
  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80',
  500000,
  'intermediate',
  3600,
  '768e7436-fbbe-47f2-999e-41b17fcd16bb'::uuid,
  'published'
)
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  description = excluded.description,
  price_vnd = excluded.price_vnd,
  status = excluded.status,
  updated_at = now();

-- Modules + lessons (placeholder structure; you'll edit titles + add Bunny video IDs in /teacher later)
do $$
declare
  v_course_id uuid;
  v_module_id uuid;
begin
  select id into v_course_id from public.courses where slug = 'math-12';

  -- Module 1: Hàm số
  insert into public.modules (course_id, title, order_index)
  values (v_course_id, 'Chương 1 — Khảo sát hàm số', 1)
  returning id into v_module_id;

  insert into public.lessons (module_id, course_id, slug, title, order_index, is_preview, duration_seconds) values
    (v_module_id, v_course_id, 'gioi-thieu', 'Giới thiệu khoá học', 0, true, 480),
    (v_module_id, v_course_id, 'don-dieu-cua-ham-so', 'Tính đơn điệu của hàm số', 1, false, 1200),
    (v_module_id, v_course_id, 'cuc-tri-cua-ham-so', 'Cực trị của hàm số', 2, false, 1500),
    (v_module_id, v_course_id, 'gtln-gtnn', 'GTLN và GTNN của hàm số', 3, false, 1300);

  -- Module 2: Mũ và Logarit
  insert into public.modules (course_id, title, order_index)
  values (v_course_id, 'Chương 2 — Hàm số mũ và logarit', 2)
  returning id into v_module_id;

  insert into public.lessons (module_id, course_id, slug, title, order_index, is_preview, duration_seconds) values
    (v_module_id, v_course_id, 'ham-so-mu-logarit', 'Hàm số mũ và hàm số logarit', 0, false, 1400),
    (v_module_id, v_course_id, 'phuong-trinh-mu-logarit', 'Phương trình mũ và logarit', 1, false, 1700),
    (v_module_id, v_course_id, 'bat-phuong-trinh-mu-logarit', 'Bất phương trình mũ và logarit', 2, false, 1500);

  -- Module 3: Nguyên hàm — Tích phân
  insert into public.modules (course_id, title, order_index)
  values (v_course_id, 'Chương 3 — Nguyên hàm và tích phân', 3)
  returning id into v_module_id;

  insert into public.lessons (module_id, course_id, slug, title, order_index, is_preview, duration_seconds) values
    (v_module_id, v_course_id, 'nguyen-ham', 'Nguyên hàm', 0, false, 1500),
    (v_module_id, v_course_id, 'tich-phan', 'Tích phân', 1, false, 1800),
    (v_module_id, v_course_id, 'ung-dung-tich-phan', 'Ứng dụng của tích phân', 2, false, 1500);

  -- Module 4: Số phức
  insert into public.modules (course_id, title, order_index)
  values (v_course_id, 'Chương 4 — Số phức', 4)
  returning id into v_module_id;

  insert into public.lessons (module_id, course_id, slug, title, order_index, is_preview, duration_seconds) values
    (v_module_id, v_course_id, 'khai-niem-so-phuc', 'Khái niệm số phức', 0, false, 1100),
    (v_module_id, v_course_id, 'phep-toan-so-phuc', 'Các phép toán với số phức', 1, false, 1300),
    (v_module_id, v_course_id, 'phuong-trinh-so-phuc', 'Phương trình số phức', 2, false, 1200);

  -- Module 5: Hình học không gian
  insert into public.modules (course_id, title, order_index)
  values (v_course_id, 'Chương 5 — Hình học không gian', 5)
  returning id into v_module_id;

  insert into public.lessons (module_id, course_id, slug, title, order_index, is_preview, duration_seconds) values
    (v_module_id, v_course_id, 'the-tich-khoi-da-dien', 'Thể tích khối đa diện', 0, false, 1600),
    (v_module_id, v_course_id, 'mat-tron-xoay', 'Mặt tròn xoay', 1, false, 1500),
    (v_module_id, v_course_id, 'khoi-cau-tru-non', 'Khối cầu, khối trụ, khối nón', 2, false, 1400);

  -- Module 6: Toạ độ trong không gian
  insert into public.modules (course_id, title, order_index)
  values (v_course_id, 'Chương 6 — Phương pháp toạ độ trong không gian', 6)
  returning id into v_module_id;

  insert into public.lessons (module_id, course_id, slug, title, order_index, is_preview, duration_seconds) values
    (v_module_id, v_course_id, 'toa-do-diem-vector', 'Toạ độ điểm và vector', 0, false, 1300),
    (v_module_id, v_course_id, 'mat-phang', 'Phương trình mặt phẳng', 1, false, 1500),
    (v_module_id, v_course_id, 'duong-thang', 'Phương trình đường thẳng', 2, false, 1400),
    (v_module_id, v_course_id, 'mat-cau', 'Phương trình mặt cầu', 3, false, 1200);

end $$;

-- Sample flashcards for the free preview lesson — these are visible
-- without signing up so prospects can try the SRS deck before paying.
-- Re-runnable: clear existing rows for the preview lesson first so we
-- don't accumulate duplicates if the seed is replayed.
do $$
declare
  v_course_id uuid;
  v_lesson_id uuid;
begin
  select id into v_course_id from public.courses where slug = 'math-12';
  select id into v_lesson_id
  from public.lessons
  where course_id = v_course_id and slug = 'gioi-thieu';

  if v_lesson_id is null then
    return;
  end if;

  delete from public.flashcards where lesson_id = v_lesson_id;

  insert into public.flashcards (lesson_id, course_id, front_md, back_md, order_index) values
    (v_lesson_id, v_course_id,
      'Đạo hàm của f(x) = x^n là gì?',
      'f''(x) = n · x^(n-1). Đây là công thức nền tảng để khảo sát hàm số.',
      0),
    (v_lesson_id, v_course_id,
      'Hàm số y = f(x) đồng biến trên khoảng (a; b) khi nào?',
      'Khi f''(x) ≥ 0 với mọi x ∈ (a; b) và f''(x) = 0 chỉ tại hữu hạn điểm.',
      1),
    (v_lesson_id, v_course_id,
      'Điều kiện để x₀ là điểm cực trị của hàm số y = f(x)?',
      'f''(x₀) = 0 (hoặc f''(x₀) không xác định) và f''(x) đổi dấu khi qua x₀.',
      2),
    (v_lesson_id, v_course_id,
      'log_a(xy) = ?',
      'log_a(x) + log_a(y), với a > 0, a ≠ 1, x > 0, y > 0.',
      3),
    (v_lesson_id, v_course_id,
      '∫ x^n dx = ? (với n ≠ -1)',
      'x^(n+1) / (n+1) + C. Đây là công thức nguyên hàm cơ bản nhất.',
      4),
    (v_lesson_id, v_course_id,
      'Modulus của số phức z = a + bi tính như thế nào?',
      '|z| = √(a² + b²). Bằng khoảng cách từ điểm biểu diễn z đến gốc toạ độ.',
      5);
end $$;
