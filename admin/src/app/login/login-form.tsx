"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const NOT_ADMIN = "You don't have admin access";

export function LoginForm({ unauthorized }: { unauthorized: boolean }) {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    unauthorized ? NOT_ADMIN : null
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      // Supabase does not distinguish an unknown address from a wrong password,
      // and neither should this screen.
      setError(signInError?.message ?? "Could not sign in");
      setPending(false);
      return;
    }

    // Authenticating is not the same as being an admin. Check membership here
    // so a non-admin gets a straight answer instead of bouncing off the
    // dashboard, and do not leave them holding a session they cannot use.
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!adminRow) {
      await supabase.auth.signOut();
      setError(NOT_ADMIN);
      setPending(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <Card className="mt-7 gap-0 p-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={emailId}>Email</Label>
          <Input
            id={emailId}
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={error ? true : undefined}
            placeholder="you@nilya.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={passwordId}>Password</Label>
          <Input
            id={passwordId}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={error ? true : undefined}
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={pending || !email || !password}
          className="mt-1 h-10 w-full"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </Card>
  );
}
