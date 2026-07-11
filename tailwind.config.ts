import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9edff",
          500: "#0d6efd",
          600: "#0b5ed7",
          700: "#0a4fb3",
        },
      },
    },
  },
  plugins: [],
};
export default config;
