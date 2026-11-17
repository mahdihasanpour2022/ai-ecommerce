export const OTP_SENDER = Symbol('OTP_SENDER');

export interface SendOtpCommand {
  readonly mobile: string;
  readonly code: string;
  readonly clientReferenceId: string;
}

export type SendOtpOutcome =
  | Readonly<{ status: 'ACCEPTED' }>
  | Readonly<{ status: 'REJECTED' }>
  | Readonly<{ status: 'UNKNOWN' }>;

export interface OtpSender {
  send(command: SendOtpCommand): Promise<SendOtpOutcome>;
}
