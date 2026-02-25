import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_KEY,
  SMTP_FROM_EMAIL,
  SMTP_FROM_NAME,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

let supabaseClient = null;
export function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabaseClient;
}

export function getTransporter() {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_KEY) {
    throw new Error("Configure SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_KEY.");
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_KEY },
  });
}

export const fromAddress = SMTP_FROM_EMAIL || "naoresponda@hublabel.com.br";
export const fromName = SMTP_FROM_NAME || "HubLabel";
