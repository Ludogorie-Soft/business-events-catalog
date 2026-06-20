import { CredentialsSignin } from "next-auth";

export class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

export const EMAIL_NOT_VERIFIED_CODE = "email_not_verified";
