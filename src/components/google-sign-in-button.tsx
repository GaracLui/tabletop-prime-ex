'use client'

/**
 * GoogleSignInButton — renders a Google Sign-In button that follows
 * Google's branding guidelines:
 *   • Standard multicolor Google "G" logo (not monochrome)
 *   • White background in light mode, dark in dark mode
 *   • Text: "Sign in with Google" (or localized)
 *   • Pill shape, proper padding (12px left, 10px after logo, 12px right)
 *   • Google Sans font (falls back to system-ui if not installed)
 *
 * Per Google's guidelines:
 *   • The "G" logo must be the standard color version
 *   • Cannot use the Chrome icon (that's what we had before — wrong)
 *   • The button should have similar prominence to other sign-in options
 *
 * Reference: https://developers.google.com/identity/branding-guidelines
 */

interface GoogleSignInButtonProps {
  onClick: () => void
  disabled?: boolean
  label: string
}

export function GoogleSignInButton({ onClick, disabled, label }: GoogleSignInButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-3 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
      style={{
        // Per Google guidelines:
        // Light theme: fill #FFFFFF, stroke #747775 1px, font #1F1F1F
        // Dark theme: fill #131314, stroke #8E918F 1px, font #E3E3E3
        backgroundColor: 'var(--google-btn-bg, #FFFFFF)',
        borderColor: 'var(--google-btn-border, #747775)',
        color: 'var(--google-btn-text, #1F1F1F)',
        borderWidth: '1px',
        fontFamily: "'Google Sans', 'Roboto', system-ui, sans-serif",
      }}
    >
      {/* Google "G" logo — standard multicolor version */}
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
        <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V5.458H.957C.348 6.675 0 8.05 0 9s.348 2.325.957 3.542l3.007-2.332z" />
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 5.458L3.964 7.79C4.672 5.664 6.656 4.08 9 3.58z" />
      </svg>
      <span>{label}</span>
    </button>
  )
}
