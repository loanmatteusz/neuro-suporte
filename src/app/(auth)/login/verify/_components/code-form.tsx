"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authClient } from "@/lib/auth-client";
import { LOGIN_ERROR_MESSAGES } from "@/lib/login-gate";

const RESEND_SECONDS = 30;

export function CodeForm({ email }: { email: string }) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function verify(code: string) {
    setPending(true);
    setMessage(null);
    const { data, error } = await authClient.signIn.emailOtp({ email, otp: code });
    if (error) {
      setPending(false);
      setOtp("");
      const key = (error.code ?? "INVALID_OTP") as keyof typeof LOGIN_ERROR_MESSAGES;
      setMessage((LOGIN_ERROR_MESSAGES[key] ?? LOGIN_ERROR_MESSAGES.INVALID_OTP).replace("{psychologist}", "a psicóloga"));
      return;
    }
    const role = (data?.user as { role?: string } | undefined)?.role;
    router.replace(role === "admin" ? "/admin" : "/course");
    router.refresh();
  }

  async function resend() {
    setCooldown(RESEND_SECONDS);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    setMessage(error ? LOGIN_ERROR_MESSAGES.TOO_MANY_REQUESTS : "Enviamos um novo código.");
  }

  return (
    <div className="mt-6 space-y-5">
      <InputOTP
        maxLength={6}
        value={otp}
        onChange={(v) => {
          setOtp(v);
          if (v.length === 6) void verify(v);
        }}
        disabled={pending}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Código de 6 números"
        containerClassName="justify-center"
      >
        <InputOTPGroup>
          {Array.from({ length: 6 }, (_, i) => (
            <InputOTPSlot key={i} index={i} className="size-12 text-xl" />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {message && (
        <p role="status" className="text-center text-sm text-muted-foreground">
          {message}
        </p>
      )}
      <Button className="h-12 w-full text-base" disabled={pending || otp.length < 6} onClick={() => verify(otp)}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      <div className="flex items-center justify-between text-sm">
        <Link href={`/login?email=${encodeURIComponent(email)}`} className="underline underline-offset-4">
          Trocar e-mail
        </Link>
        <button type="button" onClick={resend} disabled={cooldown > 0} className="min-h-11 underline underline-offset-4 disabled:no-underline disabled:opacity-60">
          {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
        </button>
      </div>
    </div>
  );
}
