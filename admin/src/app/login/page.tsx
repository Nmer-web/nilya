import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { NilyaMark } from "@/components/nilya-mark";
import { getAdminSession } from "@/lib/admin";
import { firstParam } from "@/lib/format";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  // An admin who is already signed in has no reason to see this page.
  if (await getAdminSession()) redirect("/");

  const searchParams = await props.searchParams;
  const unauthorized = firstParam(searchParams.error) === "unauthorized";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted p-6">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center">
          <NilyaMark size={48} />
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
            Nilya Admin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your admin account
          </p>
        </div>

        <LoginForm unauthorized={unauthorized} />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Access is granted by an owner. There is no sign-up.
        </p>
      </div>
    </main>
  );
}
