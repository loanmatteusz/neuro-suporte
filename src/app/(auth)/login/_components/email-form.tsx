"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { normalizeEmail } from "@/lib/email-address";
import { LOGIN_ERROR_MESSAGES } from "@/lib/login-gate";

type ErrorKey = keyof typeof LOGIN_ERROR_MESSAGES;

export function EmailForm({ defaultEmail, psychologistName, contactUrl }: { defaultEmail: string; psychologistName: string; contactUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = normalizeEmail(email);
    setPending(true);
    setError(null);
    const { error: err } = await authClient.emailOtp.sendVerificationOtp({ email: value, type: "sign-in" });
    setPending(false);
    if (err) {
      const code = (err.code ?? (err.status === 429 ? "TOO_MANY_REQUESTS" : "UNKNOWN")) as ErrorKey;
      setError(code in LOGIN_ERROR_MESSAGES ? code : "UNKNOWN");
      return;
    }
    router.push(`/login/verify?email=${encodeURIComponent(value)}`);
  }

  const showContact = error === "NOT_INVITED" || error === "ACCESS_DISABLED" || error === "BANNED_USER";

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 text-base"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "email-error" : undefined}
        />
      </div>
      {error && (
        <div id="email-error" role="alert" className="rounded-xl bg-coral-soft p-3 text-sm text-coral">
          <p>{LOGIN_ERROR_MESSAGES[error].replace("{psychologist}", psychologistName)}</p>
          {showContact && (
            <a href={contactUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-bold underline underline-offset-4">
              Falar com {psychologistName}
            </a>
          )}
        </div>
      )}
      <Button type="submit" className="h-12 w-full text-base" disabled={pending || !email.trim()}>
        {pending ? "Enviando…" : "Receber código"}
      </Button>
    </form>
  );
}
