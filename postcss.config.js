// postcss.config.js
// zwingend CommonJS, damit Next/Webpack-PostCSS-Loader es findet
module.exports = {
  plugins: {
    // Tailwind v4 PostCSS-Plugin
    '@tailwindcss/postcss': {},
    // optional, aber empfohlen
    autoprefixer: {},
  },
}
