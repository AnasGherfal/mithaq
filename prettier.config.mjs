/** @type {import("prettier").Config} */
const config = {
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./src/app/globals.css",
  proseWrap: "always",
  semi: true,
  singleQuote: false,
};

export default config;
