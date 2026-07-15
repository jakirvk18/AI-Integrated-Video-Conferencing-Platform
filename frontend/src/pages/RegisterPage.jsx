import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "./AuthLayout";
import { Field } from "./LoginPage";

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await register(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthLayout>
      <h2 className="font-display text-2xl font-semibold text-ink">Create your account</h2>
      <p className="mt-1 text-sm text-muted">Takes less than a minute.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Field label="Full name" name="name" value={form.name} onChange={handleChange} autoComplete="name" />
        <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
          minLength={6}
        />

        {error && <p className="text-sm text-tally">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-ink py-2.5 text-sm font-semibold text-paper transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-signal-dim hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
