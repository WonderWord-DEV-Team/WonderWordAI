"use client";

import { useState } from "react";

type PasswordInputProps = {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  defaultValue?: string;
};

export function PasswordInput({ id, name, label, autoComplete, defaultValue }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-bold text-gray-900">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
          defaultValue={defaultValue}
          className="w-full min-h-12 rounded-xl border border-gray-200 bg-white px-4 pr-12 text-base text-gray-900 outline-none transition focus:border-red-400"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {visible ? "🙈" : "👁"}
        </button>
      </div>
    </div>
  );
}