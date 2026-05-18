"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

export default function UserAccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, right: 16 });

  const updatePosition = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    updatePosition();

    const onResizeOrScroll = () => updatePosition();
    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true);

    let removeClickListener = () => {};
    const timer = window.setTimeout(() => {
      const onDocumentClick = (event) => {
        const panel = document.getElementById("user-account-menu-panel");
        if (buttonRef.current?.contains(event.target)) return;
        if (panel?.contains(event.target)) return;
        setOpen(false);
      };
      document.addEventListener("click", onDocumentClick, true);
      removeClickListener = () => document.removeEventListener("click", onDocumentClick, true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      removeClickListener();
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!user) setOpen(false);
  }, [user]);

  if (!user) return null;

  const toggleMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!open) updatePosition();
    setOpen((prev) => !prev);
  };

  const menuPanel = open ? (
    <div
      id="user-account-menu-panel"
      role="menu"
      className="fixed z-[9999] w-56 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-2xl border border-slate-200 py-2"
      style={{ top: position.top, right: position.right }}
    >
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-sm font-medium text-slate-900">{user.name || "Kullanıcı"}</p>
        <p className="text-xs text-slate-500 truncate">{user.email}</p>
      </div>
      <Link
        href="/profile"
        role="menuitem"
        onClick={() => setOpen(false)}
        className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      >
        Profil
      </Link>
      <Link
        href="/orders"
        role="menuitem"
        onClick={() => setOpen(false)}
        className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      >
        Siparişlerim
      </Link>
      {user.role === "admin" ? (
        <Link
          href="/admin"
          role="menuitem"
          onClick={() => setOpen(false)}
          className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Admin Panel
        </Link>
      ) : null}
      <hr className="my-2 border-slate-100" />
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          setOpen(false);
          onLogout?.();
        }}
        className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
      >
        Çıkış Yap
      </button>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Hesap menüsü"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={toggleMenu}
        className="flex items-center space-x-1.5 p-2 text-slate-700 hover:text-primary transition-all duration-200 rounded-lg hover:bg-slate-50 relative z-[1]"
      >
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center shadow-md">
          <span className="text-sm font-bold text-white">
            {user.name?.charAt(0)?.toUpperCase() || "U"}
          </span>
        </div>
        <svg
          className={`w-4 h-4 hidden sm:block transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {mounted && menuPanel ? createPortal(menuPanel, document.body) : null}
    </>
  );
}
