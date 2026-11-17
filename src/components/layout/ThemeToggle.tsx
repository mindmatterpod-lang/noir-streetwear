import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem("noir-theme", next ? "dark" : "light");
    } catch {
      // Theme still switches for this visit when storage is blocked.
    }
    setDark(next);
  };
  return (
    <button aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} onClick={toggle}>
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
