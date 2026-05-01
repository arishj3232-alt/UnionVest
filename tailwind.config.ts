import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ['Oswald', 'Inter', 'sans-serif'],
        script: ['Oswald', 'Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        valentine: {
          blush: "hsl(var(--valentine-blush))",
          "blush-light": "hsl(var(--valentine-blush-light))",
          "blush-dark": "hsl(var(--valentine-blush-dark))",
          rose: "hsl(var(--valentine-rose))",
          "rose-light": "hsl(var(--valentine-rose-light))",
          "rose-dark": "hsl(var(--valentine-rose-dark))",
          cream: "hsl(var(--valentine-cream))",
          warm: "hsl(var(--valentine-warm))",
          "warm-dark": "hsl(var(--valentine-warm-dark))",
          deep: "hsl(var(--valentine-deep))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 16px)",
        heart: "50% 50% 50% 50% / 60% 60% 40% 40%",
      },
      boxShadow: {
        valentine: "0 10px 40px -10px hsl(var(--valentine-blush) / 0.4)",
        rose: "0 8px 30px -8px hsl(var(--valentine-rose) / 0.4)",
        card: "0 4px 20px -4px hsl(350 30% 50% / 0.1)",
        glow: "0 0 30px hsl(var(--valentine-blush) / 0.3)",
        "glow-rose": "0 0 40px hsl(var(--valentine-rose) / 0.4)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up-reveal": {
          "0%": { opacity: "0", transform: "translateY(30px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "scale-reveal": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "60%": { opacity: "1", transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "valentine-reveal": {
          "0%": { opacity: "0", transform: "translateY(25px) scale(0.95) rotate(-1deg)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1) rotate(0deg)" },
        },
        heartbeat: {
          "0%, 100%": { transform: "scale(1)" },
          "10%, 30%": { transform: "scale(1.08)" },
          "20%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.04)" },
          "50%": { transform: "scale(1)" },
        },
        "petal-fall": {
          "0%": { transform: "translateY(-10vh) translateX(0) rotate(0deg)", opacity: "0" },
          "10%": { opacity: "0.6" },
          "50%": { transform: "translateY(45vh) translateX(30px) rotate(180deg)", opacity: "0.4" },
          "100%": { transform: "translateY(100vh) translateX(-20px) rotate(360deg)", opacity: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "25%": { transform: "translateY(-8px) rotate(2deg)" },
          "50%": { transform: "translateY(-4px) rotate(-1deg)" },
          "75%": { transform: "translateY(-10px) rotate(1deg)" },
        },
        sparkle: {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.1)" },
        },
        "soft-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "scale-in": "scale-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "slide-up": "slide-up 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "slide-up-reveal": "slide-up-reveal 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "scale-reveal": "scale-reveal 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "valentine-reveal": "valentine-reveal 0.55s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        heartbeat: "heartbeat 1.5s ease-in-out infinite",
        petal: "petal-fall 12s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        sparkle: "sparkle 2.5s ease-in-out infinite",
        "soft-glow": "soft-glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
