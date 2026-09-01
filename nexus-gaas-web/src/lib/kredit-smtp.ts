import { createRequire } from "node:module";

export type SmtpAuth = {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
};

export type ProofMailPayload = {
  to: string;
  from: string;
  subject: string;
  text: string;
  filename: string;
  content: Buffer;
  contentType: string;
};

type Transport = {
  sendMail: (opts: {
    to: string;
    from: string;
    subject: string;
    text: string;
    attachments: { filename: string; content: Buffer; contentType: string }[];
  }) => Promise<unknown>;
};

/**
 * Optional SMTP for proof-of-transfer mail. Loaded at runtime so a missing
 * package cannot fail Turbopack compile of the whole Channel Portal.
 */
export async function sendProofWithNodemailer(smtp: SmtpAuth, payload: ProofMailPayload): Promise<void> {
  let createTransport: ((opts: unknown) => Transport) | undefined;
  try {
    const require = createRequire(import.meta.url);
    const pkg = `node${"mailer"}`;
    const loaded = require(pkg) as {
      createTransport?: (opts: unknown) => Transport;
      default?: { createTransport?: (opts: unknown) => Transport };
    };
    createTransport = loaded.createTransport ?? loaded.default?.createTransport;
  } catch {
    createTransport = undefined;
  }
  if (typeof createTransport !== "function") {
    throw new Error("nodemailer tidak terpasang. Bukti tetap di disk; Kredit belum naik.");
  }
  const transporter = createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });
  await transporter.sendMail({
    to: payload.to,
    from: payload.from,
    subject: payload.subject,
    text: payload.text,
    attachments: [{ filename: payload.filename, content: payload.content, contentType: payload.contentType }],
  });
}
