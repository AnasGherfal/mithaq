import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { PhoneOtpForm } from "./phone-otp-form";

export const dynamic = "force-dynamic";

export default async function JoinPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims?.sub) redirect("/waitlist");

  return (
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-lg">
        <Link href="/" className="inline-flex items-center gap-2 font-black text-[#153d35]">
          <span className="grid size-9 place-items-center rounded-xl bg-[#153d35] text-white">م</span>
          ميثاق
        </Link>

        <div className="mt-8 rounded-[2rem] border border-black/7 bg-white/85 p-6 shadow-[0_25px_70px_rgba(35,43,38,.1)] backdrop-blur sm:p-8">
          <p className="text-sm font-black text-[#9d702d]">قائمة الانتظار</p>
          <h1 className="mt-2 text-3xl font-black text-[#153d35]">ابدأ برقم هاتفك</h1>
          <p className="mt-3 leading-7 text-black/58">
            نستخدم رمز تحقق لمرة واحدة. لن يظهر رقم هاتفك للأعضاء الآخرين.
          </p>

          <PhoneOtpForm />
        </div>

        <p className="mx-auto mt-5 max-w-md text-center text-xs leading-6 text-black/45">
          ميثاق مخصص للبالغين 18 سنة فما فوق. بإكمال التسجيل ستراجع شروط الاستخدام وسياسة الخصوصية قبل الإرسال النهائي.
        </p>
      </div>
    </main>
  );
}
