import Mailer from '../mailing/Mailer';

export async function sendVerificationEmail(mailer: Mailer, to: string, token: string, verifyEmailUrl: string): Promise<void> {
  await mailer.send(
    to,
    'Verify Email Address',
    `<p>Click on <a href="${verifyEmailUrl}/${token}">this link</a> to verify your email address. The link expires in 48 hours.</p>`
  );
}

export async function sendPasswordResetEmail(mailer: Mailer, to: string, token: string, resetPasswordUrl: string): Promise<void> {
  await mailer.send(
    to,
    'Reset Password',
    `<p>Click on <a href="${resetPasswordUrl}/${token}">this link</a> to reset your password. The link expires in 48 hours.</p>`
  );
}
