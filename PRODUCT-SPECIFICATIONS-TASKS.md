# برنامه اجرایی مشخصات محصول و ایمنی ورودی متنی

**وضعیت:** پیشنهادی؛ پیاده‌سازی آغاز نشده است.

این فایل فقط دامنه‌ای را پوشش می‌دهد که دربارهٔ آن توافق شده است. ترتیب شماره‌ها، ترتیب پیشنهادی اجراست. شروع هر تسک به معنی مجوز خودکار برای تسک بعدی نیست.

## 1. تثبیت قرارداد محصول و نهایی‌سازی تصمیم‌ها

**وضعیت:** بسته‌شده؛ تصمیم‌های این بخش نهایی هستند.

### هدف

قبل از تغییر پایگاه داده یا API، شکل دقیق `specifications` و `mainSpecs` قطعی شود تا فرم، Backend و Storefront قرارداد متفاوتی نسازند.

### الزامات قطعی

- `specifications` در ایجاد و ویرایش محصول اختیاری است و حداکثر ۳۰ جفت کلید/مقدار دارد.
- `mainSpecs` در ایجاد و ویرایش محصول اختیاری است و حداکثر ۳ جفت کلید/مقدار دارد.
- قرارداد HTTP هر دو فیلد را به‌صورت آرایه‌ای از آیتم‌های `{ title, description }` می‌پذیرد و برمی‌گرداند؛ ذخیره‌سازی داخلی همچنان object است.
- نبود هر بخش در ورودی معادل مجموعهٔ خالی است.
- هر دو بخش در پاسخ جزئیات Admin و `GET /api/v1/catalog/products/{productId}` وجود دارند.
- در فرم‌های ایجاد و ویرایش، هر بخش با خط افقی از بخش‌های قبلی جدا می‌شود.
- عنوان‌ها متن راهنمای کوچک و واضح دارند:
  - `مشخصات محصول (اختیاری — حداکثر ۳۰ مورد)`
  - `مشخصات اصلی (اختیاری — حداکثر ۳ مورد)`
- جدول محصولات یک ستون مرتب برای مشخصات دارد.

### تصمیم‌های نهایی

- `mainSpecs` مجموعه‌ای مستقل نیست و فقط از میان کلیدهای موجود در `specifications` انتخاب می‌شود. ترتیب حداکثر سه کلید منتخب حفظ می‌شود و مقدار هر مورد از `specifications` به دست می‌آید.
- سقف طول هر کلید ۲۰ نویسه و سقف طول هر مقدار ۱۰۰ نویسه است.
- کلید خالی پس از normalization پذیرفته نمی‌شود.
- یکتایی کلیدها پس از normalization و با مقایسهٔ غیرحساس به بزرگی/کوچکی حروف سنجیده می‌شود؛ متن normalized با بزرگی/کوچکی حروف واردشدهٔ کاربر برای نمایش حفظ می‌شود.

### خروجی تسک

- تصمیم‌های بالا در همین فایل نهایی می‌شوند.
- هیچ migration یا تغییر قرارداد قبل از بسته‌شدن این تصمیم‌ها ایجاد نمی‌شود.

## 2. ایجاد helper مشترک برای بررسی امنیت متن ساده

**وضعیت:** پیاده‌سازی‌شده؛ نصب workspace و اعتبارسنجی در انتظار اجرای مالک است.

### هدف

یک مرز مشترک و بدون وابستگی ثالث برای بررسی ورودی‌های متنی آزاد در Backend، Admin و Storefront ایجاد شود.

### معماری پیشنهادی

- package داخلی `@e-commerce/plain-text-security` زیر `packages/plain-text-security/` ایجاد شده است.
- package فقط TypeScript خالص و بدون API مرورگر یا Node باشد تا هر سه application بتوانند آن را مصرف کنند.
- افزودن package داخلی و وابستگی workspace آن برای API، Admin و Storefront به‌صورت دقیق اعلام و تأیید شده است؛ هیچ کتابخانهٔ sanitizer ثالثی اضافه نشده است.
- API helper متن را بی‌صدا بازنویسی نکند. خروجی باید یا مقدار normalized امن باشد یا نتیجهٔ نامعتبر با reason محدود و قابل تست.

### رفتار لازم

- normalization یونیکد و فاصله‌ها قبل از بررسی انجام شود.
- control characterهای غیرمجاز رد شوند.
- markup یا tagهای HTML، protocolهای اجرایی مانند `javascript:`، event-handlerهای HTML و الگوهای متداول اجرای script شناسایی شوند.
- وجود واژهٔ عادی `script` به‌تنهایی دلیل رد ورودی نباشد؛ بررسی باید الگوی اجرایی را هدف بگیرد تا false positive بی‌دلیل ایجاد نشود.
- helper ادعای پوشش کامل XSS نکند. خروجی امن همچنان باید با rendering امن React/Next و بدون `dangerouslySetInnerHTML` نمایش داده شود.
- Frontend پیام inline همان فیلد و در زمان submit یک Toast عمومی مانند `متن واردشده شامل محتوای غیرمجاز است.` نمایش دهد؛ جزئیات signature یا قاعدهٔ داخلی به کاربر افشا نشود.
- Backend همان بررسی را به‌عنوان مرز authoritative تکرار و درخواست نامعتبر را با خطای validation امن رد کند.

### مواردی که جایگزین نمی‌شوند

- `apps/admin/utils/image-sanitizer.ts` باقی می‌ماند؛ بررسی فایل تصویر با بررسی متن متفاوت است.
- validatorهای تخصصی نام مشتری، URL، UUID، عدد، قیمت، فایل و سایر domainها باقی می‌مانند.
- validator نام مشتری می‌تواند helper عمومی متن را به‌عنوان لایهٔ اول صدا بزند، اما allowlist اختصاصی نام را حذف نمی‌کند.

### Testing Impact

این helper امنیتی بدون تست قابل قبول نیست. فقط یک فایل تست متمرکز لازم است که نمونهٔ سالم، control character، tag، event-handler، protocol اجرایی، Unicode normalization و false-positive واژهٔ عادی `script` را پوشش دهد.

### معیار پذیرش

- هر سه application بتوانند یک API واحد را import کنند.
- نتیجه در Client و Backend برای fixtureهای یکسان یکسان باشد.
- هیچ رفتار image sanitizer یا validator تخصصی حذف نشود.

## 3. افزودن persistence مشخصات محصول

### پیش‌نیاز

- تسک ۱ بسته شده باشد.
- PostgreSQL/Docker disposable مورد تأیید پروژه قبل از ساخت migration در دسترس باشد.

### مدل پیشنهادی

بر اساس تصمیم نهایی زیرمجموعه‌بودن `mainSpecs`:

- `Product.specifications` به‌صورت JSONB object ذخیره شود.
- ترتیب مشخصات اصلی در فیلد جداگانهٔ `mainSpecKeys` نگهداری شود.
- `mainSpecs` در پاسخ از `specifications` و `mainSpecKeys` ساخته شود تا مقدار تکراری و قابل ناسازگاری ذخیره نشود.
- رکوردهای موجود بدون migration و همچنان به‌صورت JSONB object خوانده شوند؛ شکل آرایه فقط قرارداد HTTP است.

### قواعد persistence

- در مرز HTTP فقط آرایهٔ آیتم‌های دارای دقیقاً دو فیلد string با نام‌های `title` و `description` پذیرفته شود؛ object خام و آیتم ناشناخته یا nested رد شوند و آرایهٔ خالی حذف کامل را نشان دهد.
- حداکثر ۳۰ کلید برای `specifications` و حداکثر ۳ کلید برای `mainSpecKeys` اعمال شود.
- هر کلید اصلی باید در `specifications` وجود داشته باشد.
- ترتیب `mainSpecKeys` حفظ شود.
- migration فقط ستون‌ها و constraintهای لازم همین قابلیت را اضافه کند.

### فایل‌ها/ماژول‌های تحت تأثیر

- `apps/api/prisma/schema.prisma`
- یک migration جدید زیر `apps/api/prisma/migrations/`
- select/projectionهای Product repository

### Database Impact

- migration افزایشی و دارای default امن برای محصولات موجود است.
- index جدید لازم نیست، چون این قابلیت در scope فعلی برای filtering یا sorting دیتابیسی استفاده نمی‌شود.

### Testing Impact

- فقط validation ساختار schema/migration و یک سناریوی persistence در تست موجود Product لازم است.
- تست migration یا مجموعه‌تست کامل جداگانه ایجاد نشود مگر ابزار موجود نتواند default محصولات قبلی را اثبات کند.

## 4. گسترش قراردادهای Backend و Swagger/OpenAPI

### هدف

ایجاد، ویرایش، جزئیات Admin، summary موردنیاز جدول و جزئیات Public قرارداد واحدی داشته باشند.

### ورودی create/update

- `specifications` و `mainSpecs` اختیاری باشند.
- اگر ارسال شدند، آرایهٔ مستقیم `{ title, description }` باشند و unknown/nested value رد شود.
- create در نبود فیلدها مجموعهٔ خالی ایجاد کند.
- PATCH در صورت ارسال، replacement کامل همان مجموعه را انجام دهد؛ merge ضمنی انجام نشود.
- اگر فقط `specifications` تغییر کند و یکی از `mainSpecs`های فعلی حذف شود، درخواست باید به‌صورت صریح رد شود یا هر دو فیلد با هم ارسال شوند؛ رفتار انتخاب‌شده در قرارداد مستند شود و حذف ضمنی انجام نشود.
- تمام کلیدها و مقدارها از helper مشترک تسک ۲ و سپس قواعد طول/domain عبور کنند.

### خروجی‌ها

- Product detail محافظت‌شده همیشه `specifications` و `mainSpecs` را برگرداند.
- Public Product detail در `GET /api/v1/catalog/products/{productId}` همیشه این دو آرایهٔ آیتم‌محور را برگرداند.
- Public Product list تغییر نکند.
- Product summary مربوط به جدول Admin فقط `mainSpecs` و `specificationCount` را برگرداند؛ بارگذاری تمام ۳۰ مقدار در هر ردیف جدول انجام نشود.
- پاسخ create/update، DTO کامل و normalized را برگرداند تا Admin داده را حدس نزند.

### Security Implications

- Client validation مرز امنیتی نیست.
- Backend قبل از persistence تمام متن‌های آزاد را اعتبارسنجی می‌کند.
- خطا جزئیات regex/signature داخلی را افشا نمی‌کند.
- نمایش Public فقط plain text و framework-escaped است.

### Swagger / OpenAPI Impact

- DTOهای request/response، optional بودن، سقف ۳۰ و ۳، نمونهٔ `{ title, description }` و رفتار replacement مستند شوند.
- OpenAPI تولیدشده باید با رفتار تست‌شده یکسان باشد.

### Testing Impact

سناریوها در تست‌های موجود Product و Public Catalog افزوده شوند:

- create بدون مشخصات؛
- create/update با مقدار معتبر؛
- رد سقف بیشتر از ۳۰ یا ۳؛
- رد ساختار nested یا متن مشکوک؛
- projection صحیح Admin detail و Public detail.

سناریوهای تکراری یا suite جدید عمومی ایجاد نشود.

## 5. افزودن بخش مشخصات به فرم ایجاد محصول Admin

**وضعیت:** بخش‌های `specifications` و `mainSpecs` در فرم ایجاد محصول Admin با افزودن، نمایش ترتیبی، حذف و اعتبارسنجی مشترک پیاده‌سازی شدند.

### هدف

کاربر بتواند بدون اجباری‌شدن فرم، مشخصات محصول و حداکثر سه مشخصهٔ اصلی را مدیریت کند.

### پیاده‌سازی

- فرم موجود React Hook Form/Zod گسترش یابد؛ معماری فرم عوض نشود.
- بعد از فیلدهای فعلی یک جداکنندهٔ افقی و بخش `specifications` اضافه شود.
- بخش `mainSpecs` نیز با جداکننده و متن سقف خودش نمایش داده شود.
- هر ردیف شامل labelهای پایدار برای کلید و مقدار و action حذف keyboard-accessible باشد.
- action افزودن در سقف مربوطه غیرفعال شود، اما submit فرم طبق استاندارد پروژه برای آشکارکردن خطاهای inline قابل استفاده بماند.
- کاربر مشخصات اصلی را از مشخصات ثبت‌شده انتخاب و مرتب می‌کند؛ مقدار را دوباره تایپ نمی‌کند.
- تغییر یا حذف یک specification که در `mainSpecs` استفاده شده، قبل از submit به‌صورت واضح حل یا رد شود.
- helper مشترک برای بازخورد زودهنگام Client استفاده شود و Backend همچنان authoritative بماند.
- layout در ۳۶۰، ۷۶۸ و ۱۲۸۰ پیکسل بدون horizontal page scroll قابل استفاده باشد و light/dark/RTL را حفظ کند.

### Affected files/modules

- schema ایجاد محصول
- component ایجاد محصول
- قرارداد TypeScript و hook mutation موجود
- shared primitive فقط در صورت تکرار واقعی ردیف کلید/مقدار میان فرم ایجاد و ویرایش

### Testing Impact

تست‌های این بخش نباید به فایل سنگین `add-product.test.tsx` افزوده شوند. پوشش به واحدهای کوچک و مستقل تفکیک شود تا هر فایل با process isolation پیش‌فرض Node اجرا و حافظهٔ آن پس از پایان آزاد شود؛ اجرای مجموعهٔ این فایل‌ها نیز با `--test-concurrency=1` انجام شود.

- schema/helper test بدون JSDOM برای submit بدون مشخصه، تبدیل payload، سقف ۳۰ و ۳، و متن مشکوک؛
- component test مستقل و کوچک برای افزودن/حذف یک ردیف معتبر؛
- component test مستقل و کوچک برای خطای inline و Toast عمومی؛
- وضعیت غیرفعال‌شدن action در سقف با harness محدود بخش مشخصات آزموده شود، نه با render کامل فرم و ۳۰ بار افزودن ردیف Ant Design؛
- fixtureها و setup مشترک فقط در helper تست قرار گیرند و هیچ فایل component بیش از یک render سنگین از فرم کامل نداشته باشد؛
- هر فایل ابتدا به‌تنهایی اجرا شود و فقط پس از قبولی، مجموعهٔ همین فایل‌های feature به‌صورت ترتیبی اجرا شود.

## 6. افزودن بخش مشخصات به فرم ویرایش محصول Admin

**وضعیت:** بخش‌های `specifications` و `mainSpecs` در فرم ویرایش محصول Admin با مقدار اولیهٔ Product detail، افزودن/حذف و PATCH جایگزینی پیاده‌سازی شدند؛ ویرایش واریانت‌ها تغییری نکرد.

### هدف

مقادیر ذخیره‌شده hydrate شوند و کاربر بتواند آن‌ها را اضافه، ویرایش، حذف و مرتب کند.

### پیاده‌سازی

- فرم ویرایش از Product detail مقدار اولیه بگیرد، نه summary ناقص جدول.
- همان component یا primitive تأییدشدهٔ تسک ۵ استفاده شود؛ منطق مشابه کپی نشود.
- diff فرم فقط در صورت تغییر، `specifications` و `mainSpecs` را برای PATCH ارسال کند.
- آرایهٔ `[]` حذف کامل مشخصات را به‌صورت صریح نمایش دهد.
- pending/single-flight، خطاهای inline، focus و Toast موجود حفظ شوند.

### Testing Impact

تست component موجود ویرایش فقط hydration، replacement، حذف کامل و عدم ارسال فیلد تغییرنکرده را پوشش دهد.

## 7. نمایش مرتب مشخصات در جدول محصولات Admin

**وضعیت:** ستون `ویژگی‌های اصلی` با نمایش مرتب `عنوان: مقدار` و ستون `ویژگی‌های فرعی` با تعداد summary و مشاهدهٔ جزئیات on-demand از Product detail پیاده‌سازی شد.

### هدف

اطلاعات مفید بدون متراکم‌کردن یا شکستن جدول قابل مشاهده باشد.

### رفتار ستون

- ستون جدید `مشخصات` اضافه شود.
- حداکثر سه `mainSpecs` به‌ترتیب ذخیره‌شده و به‌شکل `کلید: مقدار` نمایش داده شوند.
- `specificationCount` تعداد کل مشخصات را نشان دهد.
- action `مشاهده مشخصات` فقط هنگام نیاز، Product detail را از مسیر موجود دریافت و همهٔ مشخصات را مرتب در Popover/Drawer قابل دسترس نمایش دهد.
- وقتی هیچ مقداری وجود ندارد، متن `بدون مشخصات` نمایش داده شود.
- متن‌های بلند wrap/truncate کنترل‌شده داشته باشند و مقدار کامل به‌شکل accessible در دسترس باشد.
- در viewport کوچک، اطلاعات به card/stack موجود منتقل شود و horizontal page scroll ایجاد نکند.

### API Impact

- جدول از summary فقط `mainSpecs` و `specificationCount` استفاده می‌کند.
- تمام `specifications` فقط از detail endpoint خوانده می‌شود؛ endpoint جدید لازم نیست.

### Testing Impact

تست جدول موجود فقط حالت خالی، ترتیب سه مورد اصلی و بازشدن detail مشخصات را پوشش دهد. تست snapshot یا حالت‌های تکراری ظاهری اضافه نشود.

## 8. مصرف و نمایش در صفحه جزئیات محصول Storefront

### هدف

Storefront دو فیلد جدید Public Product detail را مصرف و به‌صورت plain text نمایش دهد.

### پیاده‌سازی

- interface پاسخ Product detail به `specifications` و `mainSpecs` گسترش یابد.
- مشخصات اصلی نزدیک اطلاعات کلیدی محصول و همهٔ مشخصات در بخش جدا و خوانا نمایش داده شوند.
- ترتیب `mainSpecs` حفظ شود.
- اگر هر دو آرایه خالی‌اند، بخش خالی نمایش داده نشود.
- هیچ HTML از مقدارها render نشود و `dangerouslySetInnerHTML` استفاده نشود.
- RTL، theme، mobile و متن بلند رعایت شوند.

### Testing Impact

- اگر تست component موجود برای صفحه جزئیات وجود دارد، یک سناریوی معتبر و یک حالت خالی به آن افزوده شود.
- اگر تست مرتبطی وجود ندارد، فقط برای منطق شرطی‌ای که بدون تست قابل اثبات نیست تست کوچک ایجاد شود؛ تست گستردهٔ جدید ساخته نشود.

## 9. به‌روزرسانی مستندات امنیت و Catalog

### Security Baseline

- تمام ورودی‌های **متنی آزاد** باید از helper مشترک plain-text و validator تخصصی field عبور کنند.
- عدد، UUID، URL، نام، فایل و rich HTML هرکدام validator متناسب خود را لازم دارند؛ helper عمومی جایگزین آن‌ها نیست.
- Client check برای UX است و Backend check مرجع نهایی است.
- blacklist هیچ‌گاه دفاع کامل XSS محسوب نمی‌شود؛ framework escaping، ممنوعیت HTML غیرمجاز و CSP همچنان لازم‌اند.

### Catalog Specification

- optional بودن، سقف‌ها، normalization، رابطهٔ `mainSpecs` و `specifications`، رفتار PATCH و projectionهای Admin/Public ثبت شوند.
- Product summary جدول و Product detail دقیقاً مطابق قرارداد واقعی مستند شوند.

### Frontend Standards

- پیام عمومی inline/Toast و ممنوعیت نمایش signature داخلی ثبت شود.
- render متن‌های برگشتی فقط به‌صورت plain text انجام شود.

## 10. اعتبارسنجی نهایی محدود به دامنه

### اصل اجرا

هیچ test suite کامل repository برای این قابلیت اجرا نشود. هر بار فقط فایل تست یا سناریوی مستقیماً مرتبط با تغییر همان مرحله اجرا شود.

### حداقل gateهای لازم پس از تکمیل همهٔ تسک‌ها

- Prisma format/validate و بررسی migration در PostgreSQL disposable؛
- typecheck برای API، Admin و Storefront چون قرارداد میان هر سه تغییر می‌کند؛
- lint فقط workspaceهای متأثر؛
- تست متمرکز helper امنیت متن؛
- سناریوهای هدفمند Product/Public Catalog؛
- سناریوهای هدفمند فرم ایجاد، فرم ویرایش و جدول Admin؛
- سناریوی کوچک Storefront فقط در صورت وجود رفتار شرطی جدید؛
- بررسی OpenAPI تولیدشده برای دو فیلد جدید.

هر gate فقط بعد از آخرین تغییری که آن را invalid می‌کند اجرا شود و نتیجهٔ قبلاً معتبر بدون دلیل تکرار نشود.

## خارج از scope

- تغییر یا حذف image sanitizer؛
- افزودن rich-text editor یا پذیرش HTML؛
- افزودن dependency ثالث sanitizer بدون تصمیم جداگانه؛
- filtering، searching یا sorting محصولات بر اساس specifications؛
- تغییر Variant، Inventory، pricing، image lifecycle یا authorization؛
- بازطراحی عمومی فرم‌ها، جدول، Admin یا Storefront؛
- refactor سایر ورودی‌های پروژه خارج از فایل‌هایی که در این قابلیت لمس می‌شوند؛
- migration سراسری تمام validatorهای قدیمی در همین کار؛
- تغییر مسیرهای API موجود یا افزودن endpoint غیرضروری.
