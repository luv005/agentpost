import { generateEmailLocal } from "./id.js";
import { env } from "../config/env.js";

export { generateEmailLocal } from "./id.js";

export function generateEmailAddress(): string {
  const local = generateEmailLocal();
  return `${local}@${env().SES_FROM_DOMAIN}`;
}
