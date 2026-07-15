import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import { FiSettings, FiLogOut, FiUser } from "react-icons/fi";
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
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Signal logo" className="h-10 w-10" />

          <span className="font-display text-5xl font-semibold tracking-tight text-ink">
            Signal
          </span>
        </Link>

        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((prev) => !prev)}
              className="flex items-center cursor-pointer rounded-full transition hover:opacity-90"
            >
              

              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                {getInitials(user.name)}
              </div>
            </button>

            {open && (
              <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-xl rounded-tr-none border border-gray-200 bg-black text-white shadow-xl">
                <div className="border-b px-4 py-3">
                  <p className="text-white font-semibold">
                    {user.name}
                  </p>
                  <p className="text-sm text-gray-100">
                    {user.email}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/settings");
                  }}
                  className="w-full px-4 py-3 text-left text-sm transition hover:bg-red-500 cursor-pointer flex gap-2 items-center"
                >
                  <FiSettings className="h-5 w-5" />
                  Settings
                </button>

                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="w-full px-4 py-3 text-left text-sm  transition hover:bg-red-500 cursor-pointer flex gap-2 items-center "
                >
                   <FiLogOut className="h-5 w-5 text-red-700" />
                   Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}