# برنامه اجرایی علاقه‌مندی‌های Storefront

**وضعیت:** برنامه تأییدشده برای اجرا به‌ترتیب شماره‌ها  
**محدوده:** Backend API، دیتابیس، BFF موجود Storefront و صفحه جزئیات محصول  
**نام قرارداد:** در تمام لایه‌ها از `isFavorite` استفاده شود؛ `isLiked` و `isWishlisted` خارج از محدوده‌اند.  
**خارج از محدوده:** redesign، تغییر صفحه‌های دیگر، اعلان موفقیت افزودن، اشتراک‌گذاری Favorite، شمارنده لایک و refactor جانبی.

## قواعد ثابت اجرا

- هر شماره فقط پس از تکمیل وابستگی‌های قبلی شروع شود و تغییرات همان شماره کوچک و مستقل بماند.
- رفتار فعلی، قراردادهای عمومی و داده‌های موجود حفظ شوند؛ وابستگی جدیدی اضافه نشود.
- پیاده‌سازی به سبک نزدیک‌ترین فایل‌های هر Workspace باشد و abstraction فقط در صورت نیاز واقعی ایجاد شود.
- بالای هر تابع یا بخش جدید دارای منطق مهم، یک کامنت کوتاه و مفید فارسی نوشته شود؛ شماره تسک یا توضیح بدیهی در کامنت نیاید.
- Access/Refresh token هرگز در JavaScript خوانده یا به header جدید تبدیل نشود؛ مسیر موجود Cookie → BFF → Backend حفظ شود.
- BFF هدر `Authorization` نسازد؛ فقط Cookieهای allowlist‌شده `storefront_customer_*` را به Backend عبور دهد. Refresh در `http-client` و از مسیر BFF انجام شود، نه به‌صورت خودکار داخل BFF.
- نام‌های فعلی `storefront_customer_access`، `storefront_customer_refresh` و `storefront_customer_csrf` حفظ شوند تا مرز Customer و Admin صریح بماند.
- Access همان JWT امضاشده و ۱۵ دقیقه‌ای فعلی، Refresh همان credential تصادفی opaque و نشست مطلق همان هفت‌روزه باقی بمانند؛ تغییر TTL یا قالب credential خارج از محدوده است.
- فقط سناریوهای مستقیم هر تغییر تست شوند؛ lint، typecheck، test و build توسط Agent اجرا نشوند و دستورهای دقیق برای Owner گزارش شوند.
- فایل‌های درحال‌تغییر فعلی Owner، مخصوصاً `features/products/product/components/product.tsx` و assetهای قلب، بازنویسی یا revert نشوند.

## قرارداد نهایی مورد توافق

| عملیات | مسیر | احراز هویت | نتیجه مورد انتظار |
| --- | --- | --- | --- |
| دریافت Favorite | `GET /api/v1/favorite` | الزامی | فهرست صفحه‌بندی‌شده و قطعی محصولات Active کاربر فعلی |
| افزودن محصول | `POST /api/v1/favorite/{productId}` | الزامی + CSRF | افزودن idempotent محصول Active به Favorite |
| حذف محصول | `DELETE /api/v1/favorite/{productId}` | الزامی + CSRF | حذف idempotent محصول از Favorite |
| جزئیات محصول | `GET /api/v1/catalog/products/{productId}` | اختیاری | قرارداد فعلی به‌علاوه `isFavorite: boolean` |

- `isFavorite` برای مهمان `false` و برای کاربر احرازشده مطابق رکورد پایگاه داده است.
- POST تکراری وضعیت را خراب نمی‌کند و DELETE تکراری نیز نتیجه موفق و پایدار می‌دهد.
- UI برای افزودن و حذف Optimistic است و هنگام خطا دقیقاً به وضعیت قبلی rollback می‌شود.
- پیام خطای افزودن: `افزودن این محصول به لیست علاقه‌مندی‌های شما ناموفق بود.`
- پیام موفقیت حذف: `محصول «{productName}» از لیست علاقه‌مندی‌های شما حذف شد.`
- پیام خطای حذف: `حذف محصول «{productName}» از لیست علاقه‌مندی‌های شما ناموفق بود.`

## 1. تثبیت قرارداد و تست‌های پذیرش Backend

**هدف:** پیش از تغییر schema، شکل دقیق پاسخ‌ها، خطاها و رفتار احراز هویت در تست‌ها تثبیت شود.

**اقدامات اجرایی:**

1. تست‌های HTTP هدفمند برای چهار مسیر جدول بالا اضافه شود.
2. قرارداد GET Favorite شامل `page` و `pageSize` با سقف هم‌راستا با Catalog، ترتیب قطعی `createdAt DESC, productId DESC` و envelope استاندارد پروژه باشد.
3. POST/DELETE با UUID نامعتبر، محصول ناموجود، محصول غیر Active، کاربر مهمان، CSRF نامعتبر و درخواست تکراری پوشش داده شود.
4. تست جزئیات محصول سه حالت مهمان، کاربر دارای رکورد و کاربر بدون رکورد را برای `isFavorite` پوشش دهد.
5. کدها و پیام‌های Backend امن و پایدار تعریف شوند؛ خطای احراز هویت از قرارداد Customer Auth موجود استفاده کند و وجود محصول یا Favorite کاربر دیگر افشا نشود.

**فایل‌های محتمل:** تست‌های HTTP در `apps/api/test/`، DTOهای جدید Favorite و تست قرارداد Public Catalog.

**معیار پایان:** تست‌ها پیش از پیاده‌سازی به دلیل نبود قابلیت fail شوند و تمام رفتارهای مورد توافق را بدون وابستگی به UI بیان کنند.

## 2. مدل داده و migration علاقه‌مندی‌ها

**هدف:** ایجاد رابطه پایدار و یکتای Customer–Product بدون تغییر یا حذف داده‌های فعلی.

**اقدامات اجرایی:**

1. مدل `CustomerFavoriteItem` با `customerId`, `productId`, `createdAt` به Prisma اضافه شود.
2. قید یکتای `(customerId, productId)` مانع رکورد تکراری شود و index لازم برای ترتیب GET ایجاد گردد.
3. relationهای `Customer.favoriteItems` و `Product.favoriteItems` اضافه شوند.
4. حذف Product نباید قرارداد حذف فعلی Catalog را بشکند؛ رکورد وابسته Favorite با حذف Product پاک شود. سیاست حذف Customer نیز برای داده وابسته و بدون orphan صریح باشد.
5. migration فقط جدول، FK، unique و indexهای همین قابلیت را بسازد؛ داده یا جدول موجود را بازنویسی نکند.
6. تست PostgreSQL هدفمند، یکتایی، FKها و رفتار حذف را اثبات کند.

**فایل‌های محتمل:** `apps/api/prisma/schema.prisma`، یک migration جدید و یک تست constraint هدفمند.

**امنیت و داده:** شناسه Customer هرگز از body/query پذیرفته نشود و فقط از session معتبر استخراج گردد.

**معیار پایان:** schema و migration با قرارداد Task 1 منطبق باشند و هیچ مدل نامرتبطی تغییر نکند.

## 3. ماژول و API مستقل Favorite در Backend

**هدف:** پیاده‌سازی GET/POST/DELETE با مرزبندی Controller → Service → Repository موجود پروژه.

**اقدامات اجرایی:**

1. ماژول Favorite با DTO، error mapping، repository، service و controller کوچک ایجاد شود. نام کلاس‌ها دقیقاً `FavoriteModule`، `FavoriteController`، `FavoriteService` و `FavoriteRepository` و مسیر عمومی endpointها `/api/v1/favorite` باشد.
2. یک guard/context قابل‌استفاده مجدد برای Customer احرازشده، بر پایه Customer session موجود، فراهم شود؛ مکانیزم Admin Auth کپی نشود.
3. GET فقط اقلام Customer فعلی و فقط محصولات Active را با داده summary موردنیاز UI برگرداند.
4. POST وجود و Active بودن محصول را بررسی و با تکیه بر unique constraint به‌شکل race-safe و idempotent درج کند.
5. DELETE فقط رکورد Customer فعلی را هدف بگیرد و نبود رکورد را به‌صورت idempotent موفق تلقی کند.
6. روی POST/DELETE همان Origin، Fetch Metadata و CSRF فعلی Customer Auth اعمال شود؛ retry خودکار mutation ممنوع بماند.
7. Swagger/OpenAPI هر سه endpoint، envelope، پارامترها، پاسخ موفق و خطاهای 400/401/403/404/500 را مستند کند.

**فایل‌های محتمل:** `apps/api/src/favorite/*`، `apps/api/src/app.module.ts` و در صورت ضرورت بخش کوچک و reusable در `customer-authentication`.

**معیار پایان:** تست‌های Favorite در Task 1 پاس شوند؛ درخواست نمی‌تواند customerId دیگری را بخواند یا تغییر دهد.

## 4. شخصی‌سازی امن جزئیات محصول با `isFavorite`

**هدف:** افزودن وضعیت Favorite به قرارداد فعلی محصول، بدون خصوصی‌کردن endpoint عمومی.

**اقدامات اجرایی:**

1. DTO پاسخ `PublicProductDetailDto` با فیلد اجباری boolean به نام `isFavorite` توسعه یابد.
2. یک Customer context اختیاری برای Public Catalog استفاده شود: نبود session یا credential معتبر، درخواست عمومی را fail نکند و مقدار `false` بدهد.
3. برای Customer معتبر، lookup علاقه‌مندی همراه با دریافت جزئیات یا با یک query محدود انجام شود؛ N+1 ایجاد نشود.
4. response شخصی‌سازی‌شده shared-cache نشود؛ headerهای cache طوری تنظیم شوند که وضعیت یک کاربر به کاربر دیگر نرسد.
5. Swagger و تست‌های Task 1 برای هر سه حالت مهمان/علاقه‌مند/غیرعلاقه‌مند به‌روزرسانی شوند.
6. endpoint عمومی در نبود Access معتبر همچنان برای مهمان قابل‌استفاده بماند؛ تشخیص علاقه‌مندی نباید Refresh token را به credential خواندنی Client تبدیل یا Refresh را داخل Catalog پنهان کند.
7. پس از Bootstrap/Refresh موفق، تغییر هویت، login یا logout، cache جزئیات محصول invalidate/clear شود تا `false` مهمان یا مقدار کاربر قبلی باقی نماند.

**فایل‌های محتمل:** `public-catalog.controller.ts`، `public-catalog.service.ts`، `public-catalog.repository.ts`، `public-catalog.dto.ts` و بخش کوچک Customer session context.

**معیار پایان:** تمام پاسخ‌های موفق جزئیات محصول `isFavorite` دارند و داده بین کاربران نشت نمی‌کند.

## 5. قرارداد Storefront، BFF و hookهای Favorite

**هدف:** اتصال Client به API از مسیر استاندارد React Query و BFF فعلی، بدون transport موازی.

**اقدامات اجرایی:**

1. مسیرهای `favorite`, `favoriteProduct(productId)` به `constants/apiRoues.ts` اضافه شوند.
2. `ProductByID` با `readonly isFavorite: boolean` هم‌نام Backend توسعه یابد.
3. key factory مستقل Favorite و typeهای پاسخ نزدیک feature ایجاد شوند.
4. hookهای افزودن/حذف روی `useRQSender`/`useRQDeleter` موجود ساخته شوند؛ `httpClient` مستقیماً از component فراخوانی نشود.
5. GET/POST/DELETE محافظت‌شده Favorite صریحاً `customerAuth.refreshEligible: true` داشته باشند؛ نبود Access باید از `401 AUTHENTICATION_REQUIRED` و Access منقضی از `401 ACCESS_TOKEN_EXPIRED` وارد Refresh مشترک و replay حداکثر یک‌باره شود.
6. برای جزئیات محصول، `onMutate` ابتدا query جاری را cancel و snapshot بگیرد، سپس `isFavorite` را optimistic تغییر دهد؛ `onError` snapshot را برگرداند و `onSettled` وضعیت سرور را reconcile کند.
7. درخواست‌های هم‌زمان برای یک محصول single-flight شوند تا کلیک سریع، پاسخ out-of-order یا rollback اشتباه ایجاد نکند.
8. Product detail پس از تعیین وضعیت Auth و هر Bootstrap/Refresh صادرکننده Access جدید invalidate/refetch شود؛ stale-time فعلی نباید مقدار `isFavorite: false` مهمان را برای Customer احرازشده نگه دارد.
9. GET Favorite هنگام ساخت صفحه Favorite از همان key factory استفاده کند؛ در این محدوده فقط hook/contract آماده می‌شود و ساخت route جدید جداگانه نیازمند تأیید Owner است.

**فایل‌های محتمل:** `constants/apiRoues.ts`، `features/products/product/interfaces/productById.d.ts`، `features/favorite/*` و تست‌های hook/cache.

**BFF Impact:** Route Handler catch-all موجود GET/POST/DELETE را عبور می‌دهد؛ route موازی ساخته نشود. فقط در صورت اثبات نقص Cookie/CSRF همان BFF به‌اندازه لازم اصلاح شود.

**معیار پایان:** cache محصول منبع نمایش قلب است، optimistic update و rollback قطعی‌اند، درخواست محافظت‌شده بدون Access قابل‌بازیابی Refresh می‌شود و mutation retry خودکار ندارد.

## 6. Modal ورود امن برای کاربر مهمان

**هدف:** کلیک مهمان روی قلب به‌جای mutation، مسیر ورود و بازگشت امن را ارائه کند.

**اقدامات اجرایی:**

1. وضعیت احراز هویت از provider/hook فعلی خوانده شود؛ برای مهمان هیچ POST/DELETE و هیچ optimistic heart change انجام نشود.
2. Modal با پیام `برای افزودن این محصول به لیست علاقه‌مندی‌ها ابتدا باید وارد سایت شوید.` و دکمه `ورود به سایت` نمایش داده شود.
3. Modal عنوان قابل‌دسترسی، focus اولیه، بستن با Escape، بازگشت focus و کنترل keyboard داشته باشد و در light/dark و RTL صحیح بماند.
4. دکمه ورود، `pathname + search + hash` فعلی را URL-encode کرده و به `/auth?returnTo=...` هدایت کند.
5. `safeReturnDestination` موجود تنها مرجع sanitize بماند: فقط مسیر نسبی same-origin، بدون protocol-relative، backslash یا مسیر `/auth/**`؛ مقصد ناموجود/نامعتبر `/` باشد.
6. validation مقصد هم هنگام ورود به Auth و هم پیش از redirect نهایی اجرا شود و redirect با `replace` انجام شود تا Open Redirect ممکن نباشد.

**فایل‌های محتمل:** یک Modal shared فقط در صورت وجود مصرف واقعی مشترک؛ در غیر این صورت component نزدیک Favorite/Product، به‌علاوه تست‌های `safeReturnDestination` و جریان Auth موجود.

**معیار پایان:** مهمان به endpoint تغییردهنده دسترسی UI ندارد و پس از احراز هویت فقط به مقصد داخلی معتبر بازمی‌گردد.

## 7. اتصال قلب صفحه جزئیات محصول و Toastها

**هدف:** تکمیل رفتار قابل‌مشاهده روی همان route فعلی محصول، بدون redesign صفحه.

**اقدامات اجرایی:**

1. دو قلب نمایشی فعلی به یک `UiButton` واحد تبدیل شوند که icon آن فقط از `currentProduct.isFavorite` تعیین می‌شود.
2. `aria-label` و در صورت مناسب `aria-pressed` وضعیت افزودن/حذف را شفاف کنند؛ alt تکراری تصویری حذف یا تزئینی شود.
3. کاربر احرازشده با کلیک قلب توخالی فوراً قلب قرمز توپر ببیند و POST آغاز شود؛ خطا rollback و Toast دقیق افزودن را نشان دهد.
4. کلیک قلب توپر فوراً قلب توخالی نشان دهد و DELETE آغاز شود؛ موفقیت Toast نام محصول را نشان دهد و خطا rollback همراه Toast دقیق حذف داشته باشد.
5. در mutation فعال، کلیک تکراری همان محصول مهار شود، اما UI همچنان وضعیت optimistic و نام دسترس‌پذیر درست داشته باشد.
6. assetهای فعلی Owner حفظ و مناسب‌ترین نسخه موجود استفاده شود؛ asset یا styling خارج از این interaction تغییر نکند.
7. صفحه در حدود 360، 768، 1280 و wide desktop از نظر دسترسی به قلب، overflow، focus و هر دو theme بررسی شود.

**فایل اصلی:** `features/products/product/components/product.tsx` با کمترین helper لازم در feature Favorite.

**معیار پایان:** همه مسیرهای add/delete success/failure و guest modal مطابق متن توافق‌شده قابل مشاهده و قابل تلاش مجدد باشند.

## 8. همگام‌سازی، regression هدفمند و مستندسازی نهایی

**هدف:** اثبات هماهنگی Database ↔ Favorite API ↔ Product Detail ↔ React Query UI و ثبت واقعیت جدید.

**اقدامات اجرایی:**

1. سناریوی هدفمند کامل اجرا شود: مهمان → Modal → Login با `returnTo` → بازگشت به همان محصول → افزودن → refresh → حفظ قلب → حذف → refresh.
2. failure مصنوعی POST و DELETE، rollback، متن Toast و امکان تلاش مجدد جداگانه بررسی شوند.
3. race کلیک تکراری، پاسخ دیرهنگام، logout/login با هویت دیگر و حذف Product دارای Favorite پوشش داده شوند.
4. فقط تست‌های مستقیم Backend، migration constraint، hook/component و browser همین قابلیت اجرا شوند؛ suite کامل بدون دلیل مشخص اجرا نشود.
5. specificationهای Catalog، Customer Auth، Database و Frontend Architecture فقط در بخش‌هایی که با پیاده‌سازی واقعاً تغییر کرده‌اند به‌روزرسانی شوند.
6. Swagger/OpenAPI تولیدشده با DTOها و status codeهای نهایی تطبیق داده شود.
7. diff نهایی فقط فایل‌های همین قابلیت را شامل شود؛ تغییرات قبلی Owner تفکیک و حفظ شوند.

**معیار پایان:** تمام Acceptance Criteria بالا شواهد هدفمند دارند، مستندات با واقعیت اجراشده منطبق‌اند و هیچ route یا قابلیت بعدی خودکار آغاز نمی‌شود.

## ترتیب اجرا و وابستگی‌ها

1. Task 1 قرارداد را قفل می‌کند.
2. Task 2 زیربنای داده Taskهای 3 و 4 است.
3. Taskهای 3 و 4 Backend را کامل می‌کنند.
4. Task 5 اتصال و cache frontend را آماده می‌کند.
5. Task 6 جریان مهمان و بازگشت امن را تکمیل می‌کند.
6. Task 7 فقط پس از آماده‌شدن قرارداد و hookها UI را متصل می‌کند.
7. Task 8 آخرین gate و توقف این محدوده است.

## Testing Impact

- Backend: قرارداد HTTP، احراز هویت و CSRF، idempotency، isolation کاربران، وضعیت Active محصول و query شخصی‌سازی‌شده.
- Database: unique/FK/index/cascade فقط برای association جدید.
- Storefront: cache optimistic/rollback، single-flight، پیام‌ها، Modal و sanitize دوطرفه `returnTo`.
- Browser: مسیر مهمان تا بازگشت، add/delete و failure recovery در viewportها و themeهای مورد توافق.

## Swagger / OpenAPI Impact

- سه endpoint جدید Favorite باید کامل به OpenAPI افزوده شوند.
- `PublicProductDetailDto` باید `isFavorite` اجباری و دارای توضیح صریح مهمان/کاربر داشته باشد.
- status code، envelope، error code و مثال‌های موفق/ناموفق باید با تست قرارداد یکسان باشند.
