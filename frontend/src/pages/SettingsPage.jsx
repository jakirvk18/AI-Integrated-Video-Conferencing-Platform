import { useState } from "react";
import Navbar from "../components/Navbar";
import { api, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

function SectionCard({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-xl shadow-[2px_4px_6px_3px_rgba(0,0,0,0.3)] p-7">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8A8A8A]">
        {eyebrow}
      </span>
      <h2
        className="mt-2 text-xl font-bold text-[#0A0A0A]"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-[#8A8A8A]">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8A8A8A]">
        {label}
      </span>
      <input
        {...props}
        className="mt-2 w-full rounded-xl border border-[#0A0A0A]/20 bg-transparent px-3 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#B5B5B5] focus:border-[#E4102A] focus:outline-none disabled:opacity-50"
      />
    </label>
  );
}

function StatusBanner({ tone, children }) {
  const isError = tone === "error";
  return (
    <div className="mt-5 flex items-center gap-3 border border-[#0A0A0A] px-4 py-3 text-sm text-[#0A0A0A]">
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
        style={{ backgroundColor: isError ? "#E4102A" : "#0A0A0A" }}
      >
        {isError ? "!" : "✓"}
      </span>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);

  const profileDirty = name !== (user?.name || "") || email !== (user?.email || "");

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSaved(false);
    setProfileSaving(true);
    try {
      const { data } = await api.patch("/auth/me", { name, email });
      updateUser(data.user ?? data);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(apiErrorMessage(err, "Couldn't save your details."));
    } finally {
      setProfileSaving(false);
    }
  };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  const passwordFormValid =
    currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSaved(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    setPasswordSaving(true);
    try {
      await api.patch("/auth/me/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(apiErrorMessage(err, "Couldn't update your password."));
    } finally {
      setPasswordSaving(false);
    }
  };

  const initials = (user?.name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-center gap-5">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] text-base font-semibold text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {initials}
          </div>
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.35em] text-red-500">
              Your account
            </p>
            <h1
              className="mt-1 text-3xl font-bold tracking-tight text-[#0A0A0A]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Settings
            </h1>
          </div>
        </div>
        <div className="mt-4 h-[3px] w-14 bg-[#E4102A]" />

        <div className="mt-12 flex flex-col gap-10">
          <SectionCard
            eyebrow="01 — Profile"
            title="Account details"
            description="This is how you show up across Signal — hosts and participants will see this name."
          >
            <form onSubmit={handleProfileSave} className="flex flex-col gap-5">
              <Field
                label="Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
              <Field
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              {profileError && <StatusBanner tone="error">{profileError}</StatusBanner>}
              {profileSaved && !profileError && (
                <StatusBanner tone="success">Your details have been saved.</StatusBanner>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={!profileDirty || profileSaving}
                  className="cursor-pointer rounded-xl bg-[#0A0A0A] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#E4102A] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {profileSaving ? "Saving…" : "Save changes"}
                </button>
                {profileDirty && !profileSaving && (
                  <button
                    type="button"
                    onClick={() => {
                      setName(user?.name || "");
                      setEmail(user?.email || "");
                      setProfileError("");
                      setProfileSaved(false);
                    }}
                    className="cursor-pointer text-sm font-medium text-[#8A8A8A] hover:text-[#0A0A0A]"
                  >
                    Discard
                  </button>
                )}
              </div>
            </form>
          </SectionCard>

          <SectionCard
            eyebrow="02 — Security"
            title="Change password"
            description="Use at least 8 characters. You'll stay signed in on this device."
          >
            <form onSubmit={handlePasswordSave} className="flex flex-col gap-5">
              <Field
                label="Current password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <Field
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <Field
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />

              {passwordError && <StatusBanner tone="error">{passwordError}</StatusBanner>}
              {passwordSaved && !passwordError && (
                <StatusBanner tone="success">Your password has been updated.</StatusBanner>
              )}

              <div>
                <button
                  type="submit"
                  disabled={!passwordFormValid || passwordSaving}
                  className="cursor-pointer rounded-xl bg-[#0A0A0A] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#E4102A] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {passwordSaving ? "Updating…" : "Update password"}
                </button>
              </div>
            </form>
          </SectionCard>
        </div>
      </main>
    </div>
  );
}