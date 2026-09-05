import Image from 'next/image';

export function AppLoading({
  message = 'لطفا منتظر بمانید...',
  fullscreen = false,
}: Readonly<{ message?: string; fullscreen?: boolean }>) {
  return (
    <div
      className={fullscreen ? 'app-loading app-loading-fullscreen' : 'app-loading'}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Image src="/admin-loader.svg" width={72} height={72} alt="" priority={fullscreen} />
      <p className="app-loading-message">{message}</p>
    </div>
  );
}
