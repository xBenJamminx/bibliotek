"use client"

import { useState, type FC, type ReactNode } from "react"

interface AuthTabsProps {
  signInForm: ReactNode
  signUpForm: ReactNode
}

export const AuthTabs: FC<AuthTabsProps> = ({ signInForm, signUpForm }) => {
  const [mode, setMode] = useState<"signin" | "signup">("signin")

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-lg dark:bg-neutral-900">
      <div className="mb-6 flex rounded-t-xl bg-gray-100 dark:bg-neutral-800">
        <button
          onClick={() => setMode("signin")}
          className={`flex-1 py-4 text-center font-medium transition-colors ${
            mode === "signin"
              ? "bg-white text-blue-600 dark:bg-neutral-900 dark:text-blue-400"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
          }`}
          type="button"
        >
          Sign In
        </button>
        <button
          onClick={() => setMode("signup")}
          className={`flex-1 py-4 text-center font-medium transition-colors ${
            mode === "signup"
              ? "bg-white text-blue-600 dark:bg-neutral-900 dark:text-blue-400"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
          }`}
          type="button"
        >
          Sign Up
        </button>
      </div>

      <div className="px-6 pb-8 pt-2 text-gray-900 dark:text-gray-100">
        <div style={{ display: mode === "signin" ? "block" : "none" }}>
          {signInForm}
        </div>
        <div style={{ display: mode === "signup" ? "block" : "none" }}>
          {signUpForm}
        </div>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
          {mode === "signin" ? (
            <p>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => setMode("signup")}
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                type="button"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                onClick={() => setMode("signin")}
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                type="button"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
