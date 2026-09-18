// We use Supabase's normal EMAIL login under the hood for phone-based clients,
// because enabling Supabase's native Phone provider requires setting up a real
// SMS service (Twilio etc.) even if we never send an OTP — unnecessary cost
// and paperwork for something we don't need.
//
// Instead, a phone number like "+919876543210" is turned into a made-up,
// never-emailed address like "p919876543210@clients.pbrportal.internal".
// This is deterministic — the same phone number always produces the same
// address — so login and account-creation always match, as long as the
// phone number is typed the same way (country code included) both times.

export function phoneToInternalEmail(phone: string): string {
  const digitsOnly = phone.replace(/[^0-9]/g, "");
  return `p${digitsOnly}@clients.pbrportal.internal`;
}
