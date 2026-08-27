import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Field, inputClass } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { authService } from "@/lib/services";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — CampSolver" },
      {
        name: "description",
        content: "Create your CampSolver student account to report campus issues.",
      },
      { property: "og:title", content: "Create account — CampSolver" },
      {
        property: "og:description",
        content: "Join CampSolver and start reporting campus issues.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await authService.register(
        form.name.trim(),
        form.email.trim(),
        form.password,
      );
      signIn(token, user);
      navigate({ to: "/home", replace: true });
    } catch {
      toast.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Create account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Takes less than a minute.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name">
          <input
            required
            autoComplete="name"
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Aarav Sharma"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@college.edu"
          />
        </Field>
        <Field label="Password" hint="Minimum 6 characters.">
          <input
            type="password"
            required
            autoComplete="new-password"
            className={inputClass}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </Field>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link to="/login" className="font-semibold text-primary underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
