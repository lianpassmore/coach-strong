import type { Config } from "tailwindcss";

const config: Config = {
  content:[
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#110c94",   // Dark blue
          mid: "#286181",    // Mid blue
          light: "#05abc4",  // Light blue
          grey: "#7e8a93",   // Grey
          green: "#91d38f",  // Green
          sand: "#f4f6f8"    // Very light grey/blue
        }
      },
      fontFamily: {
        logo:['var(--font-ubuntu)', 'sans-serif'],
        heading:['var(--font-bebas-neue)', 'sans-serif'],
        sans: ['var(--font-nunito)', 'sans-serif'],
      }
    },
  },
  plugins:[],
};
export default config;