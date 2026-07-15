import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "./AuthLayout";

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(form);
      const dest = location.state?.from?.pathname || "/dashboard";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthLayout>
      <h2 className="font-display text-2xl font-semibold text-ink">Welcome back</h2>
      <p className="mt-1 text-sm text-muted">Sign in to start or join a meeting.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" />
        <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} autoComplete="current-password" />

        {error && <p className="text-sm text-tally">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-ink py-2.5 text-sm font-semibold text-paper transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New to Signal?{" "}
        <Link to="/register" className="font-medium text-signal-dim hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}

export function Field({ label, name, type = "text", value, onChange, autoComplete, minLength }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input
        name={name}
        type={type}
        required
        minLength={minLength}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-linen bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted-light focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
      />
    </label>
  );
}
