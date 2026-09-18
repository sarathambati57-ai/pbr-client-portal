import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { phoneToInternalEmail } from "@/lib/phone";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { companyName, contactName, email, phone, password, loginMethod } = await request.json();

  if (!companyName || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (loginMethod === "email" && !email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (loginMethod === "phone" && !phone) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: client, error: clientError } = await admin
    .from("clients")
    .insert({
      company_name: companyName,
      contact_name: contactName || null,
      email: email || null,
      phone: phone || null,
    })
    .select()
    .single();

  if (clientError) {
    if (clientError.message.includes("duplicate")) {
      return NextResponse.json({ error: "A client with this email or phone already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }

  // Create their login account. For email clients, this is a normal
  // Supabase email login. For phone clients, we log them in behind the
  // scenes using a made-up email derived from their phone number — see
  // lib/phone.ts for why. Either way, no OTP/SMS is ever sent; you're
  // setting their password directly, so they can log in immediately.
  const createUserPayload =
    loginMethod === "email"
      ? { email, password, email_confirm: true }
      : { email: phoneToInternalEmail(phone), password, email_confirm: true };

  const { data: authUser, error: authError } = await admin.auth.admin.createUser(createUserPayload);

  if (authError) {
    await admin.from("clients").delete().eq("id", client.id);
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    role: "client",
    full_name: contactName || companyName,
    email: email || null,
    phone: phone || null,
    client_id: client.id,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, client });
}
