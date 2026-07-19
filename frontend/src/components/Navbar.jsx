import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import { FiSettings, FiLogOut } from "react-icons/fi";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get initials from first two words
  const getInitials = (name = "") => {
    const words = name.trim().split(/\s+/);

    if (words.length === 1) {
      return words[0][0]?.toUpperCase();
    }

    return (
      (words[0][0] || "") +
      (words[1][0] || "")
    ).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#0B0D10]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Signal logo" className="h-8 w-8" />
          <span
            className="text-2xl font-semibold tracking-tight text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Signal
          </span>
        </Link>

        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((prev) => !prev)}
              className="flex cursor-pointer items-center rounded-full transition hover:ring-2 hover:ring-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900  text-sm font-semibold text-white transition-colors hover:bg-white/[0.05]">
                {getInitials(user.name)}
              </div>
            </button>

            {open && (
              <div className="absolute right-0 mt-3 w-60 origin-top-right animate-[fadeIn_0.12s_ease-out] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#14171B] shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
                <div className="border-b border-white/[0.08] px-4 py-3.5">
                  <p className="truncate font-semibold text-white">{user.name}</p>
                  <p className="truncate text-sm text-[#9AA0A6]">{user.email}</p>
                </div>

                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/settings");
                  }}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-left text-sm text-[#F5F4F1] transition-colors hover:bg-white/[0.05]"
                >
                  <FiSettings className="h-4 w-4 text-[#9AA0A6]" />
                  Settings
                </button>

                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-left text-sm text-[#FF7A6B] transition-colors hover:bg-[#FF7A6B]/[0.08]"
                >
                  <FiLogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </header>
  );
}