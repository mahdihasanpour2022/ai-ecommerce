export const CUSTOMER_AUTH_FLOW_COOKIE_NAME = 'storefront_customer_auth_flow';
export const CUSTOMER_AUTH_FLOW_COOKIE_PATH = '/api/v1/customer-auth';
export const CUSTOMER_ACCESS_COOKIE_NAME = 'storefront_customer_access';
export const CUSTOMER_REFRESH_COOKIE_NAME = 'storefront_customer_refresh';
export const CUSTOMER_CSRF_COOKIE_NAME = 'storefront_customer_csrf';
export const OTP_LIFETIME_SECONDS = 120;
export const OTP_RESEND_SECONDS = 120;
export const OTP_MAX_FAILED_ATTEMPTS = 5;
export const OTP_VERIFICATION_IP_LIMIT = 30;
export const REGISTRATION_GRANT_LIFETIME_SECONDS = 15 * 60;
export const CUSTOMER_ACCESS_LIFETIME_SECONDS = 15 * 60;
export const CUSTOMER_SESSION_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
export const CUSTOMER_ACCESS_AUDIENCE = 'e-commerce-storefront';
export const OTP_MOBILE_LIMIT_15_MINUTES = 3;
export const OTP_MOBILE_LIMIT_24_HOURS = 10;
export const OTP_IP_LIMIT_15_MINUTES = 20;
export const OTP_IP_LIMIT_24_HOURS = 100;

export const OTP_REQUESTED_MESSAGE = 'کد تأیید ارسال شد.';
export const INVALID_REQUEST_MESSAGE = 'درخواست معتبر نیست.';
export const MOBILE_INVALID_MESSAGE = 'شماره موبایل واردشده معتبر نیست.';
export const OTP_RESEND_NOT_READY_MESSAGE = 'برای ارسال مجدد کد کمی صبر کنید.';
export const AUTH_RATE_LIMITED_MESSAGE =
  'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً دوباره تلاش کنید.';
export const OTP_SEND_UNAVAILABLE_MESSAGE =
  'ارسال کد تأیید ممکن نشد. لطفاً کمی بعد دوباره تلاش کنید.';
export const OTP_VERIFIED_MESSAGE = 'شماره موبایل با موفقیت تأیید شد.';
export const CUSTOMER_REGISTERED_MESSAGE = 'ثبت‌نام با موفقیت انجام شد.';
export const CUSTOMER_AUTH_BOOTSTRAPPED_MESSAGE = 'نشست مشتری با موفقیت بررسی شد.';
export const CUSTOMER_SESSION_REFRESHED_MESSAGE = 'نشست مشتری با موفقیت تمدید شد.';
export const CUSTOMER_LOGOUT_MESSAGE = 'خروج با موفقیت انجام شد.';
export const CUSTOMER_FLOW_FETCHED_MESSAGE = 'وضعیت ورود با موفقیت دریافت شد.';
export const AUTH_FLOW_INVALID_MESSAGE =
  'فرایند ورود معتبر نیست. لطفاً دوباره شماره موبایل را وارد کنید.';
export const CUSTOMER_NAME_INVALID_MESSAGE = 'نام و نام خانوادگی واردشده معتبر نیست.';
export const REGISTRATION_GRANT_EXPIRED_MESSAGE =
  'مهلت تکمیل ثبت‌نام به پایان رسیده است. لطفاً دوباره شماره موبایل را تأیید کنید.';
export const OTP_EXPIRED_MESSAGE = 'کد تأیید منقضی شده است. کد جدیدی دریافت کنید.';
export const OTP_INVALID_MESSAGE = 'کد تأیید واردشده صحیح نیست.';
export const OTP_ATTEMPTS_EXCEEDED_MESSAGE =
  'تعداد تلاش‌ها بیش از حد مجاز است. کد جدیدی دریافت کنید.';
export const CUSTOMER_ACCOUNT_DISABLED_MESSAGE = 'امکان ورود به این حساب وجود ندارد.';
export const CUSTOMER_AUTHENTICATION_REQUIRED_MESSAGE = 'برای ادامه وارد حساب کاربری شوید.';
export const CUSTOMER_INVALID_ACCESS_TOKEN_MESSAGE = 'نشست معتبر نیست. لطفاً دوباره وارد شوید.';
export const CUSTOMER_ACCESS_TOKEN_EXPIRED_MESSAGE = 'نشست نیاز به تمدید دارد.';
export const CUSTOMER_CSRF_VALIDATION_FAILED_MESSAGE =
  'درخواست معتبر نیست. لطفاً صفحه را تازه‌سازی و دوباره تلاش کنید.';
export const CUSTOMER_REFRESH_TOKEN_INVALID_MESSAGE =
  'نشست معتبر نیست. لطفاً دوباره وارد شوید.';
export const CUSTOMER_REFRESH_TOKEN_EXPIRED_MESSAGE =
  'نشست منقضی شده است. لطفاً دوباره وارد شوید.';
export const CUSTOMER_REFRESH_TOKEN_REUSED_MESSAGE =
  'نشست به دلایل امنیتی پایان یافت. لطفاً دوباره وارد شوید.';
export const INTERNAL_SERVER_ERROR_MESSAGE = 'خطای داخلی سرور رخ داد.';
