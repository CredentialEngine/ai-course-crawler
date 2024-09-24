import { renderAsync } from "@react-email/components";
import nodemailer from "nodemailer";
import { getAllEmailAddresses } from "./data/users";
import { Email } from "./emails";

let transporter: nodemailer.Transporter;

async function getMailer() {
  if (transporter) {
    return transporter;
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: "email-smtp.us-east-1.amazonaws.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  return transporter;
}

async function sendMail(to: string[], subject: string, html: string) {
  const mailer = await getMailer();
  const params = {
    from: "AI Course Crawler <do-not-reply.ai-course-crawler@credentialengineregistry.org>",
    to,
    subject,
    html,
  };
  return await mailer.sendMail(params);
}

export async function sendEmailToAll<T>(
  EmailComponent: Email<T>,
  props: T & {},
  subject?: string
) {
  const emailHtml = await renderAsync(<EmailComponent {...props} />);
  const addresses = await getAllEmailAddresses();
  subject = subject || EmailComponent.DefaultSubject || "";
  return await sendMail(addresses, subject, emailHtml);
}
