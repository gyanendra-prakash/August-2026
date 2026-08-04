const createNextIntlPlugin = require("next-intl/plugin");

// Ye plugin next-intl ko batata hai ki humari config file
// (jo locale ke hisaab se JSON load karti hai) kahan hai
const withNextIntl = createNextIntlPlugin("./lib/i18n-request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = withNextIntl(nextConfig);
