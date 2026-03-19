import { nanoid } from "nanoid";
import { env } from "../config/env.js";

export function generateMessageId(): string {
  return `<${nanoid(24)}@${env().SES_FROM_DOMAIN}>`;
}
