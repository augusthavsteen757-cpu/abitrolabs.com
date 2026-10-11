import { fileURLToPath } from "node:url";


const isDev = process.env.NODE_ENV !== "production";

// Strict Content Security Policy. Next.js needs inline scripts for hydration ('unsafe-inline');
// everything else (other sites, frames, plugins, form targets) is blocked.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'self'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Our file limit is 10 MB; leave room for the multipart overhead so such files get our own error message.
  experimental: { middlewareClientMaxBodySize: "12mb" },
  serverExternalPackages: ["@libsql/client", "libsql", "bcryptjs"],
  // Backport of a React 19.3 hydration fix into Next's bundled React – see scripts/react-hydration-fix-loader.cjs.
  webpack(config, { isServer, dev }) {
    if (isServer) return config;
    config.module.rules.push({
      test: /[\\/]next[\\/]dist[\\/]compiled[\\/]react-dom(-experimental)?[\\/]cjs[\\/]react-dom-client\.(production|development)\.js$/,
      use: [fileURLToPath(new URL("./scripts/react-hydration-fix-loader.cjs", import.meta.url))],
    });
    // Production only: the dev server compiles pages bit by bit, so a single compilation may not contain React.
    if (!dev) config.plugins.push({
      apply(compiler) {
        // Fails the build if the browser bundle contains Next's React without the fix (also when webpack reuses its cache).
        compiler.hooks.done.tap("KlardalHydrationFixCheck", ({ compilation }) => {
          const reactDom = [...compilation.modules].filter((m) => /[\\/]next[\\/]dist[\\/]compiled[\\/]react-dom(-experimental)?[\\/]cjs[\\/]react-dom-client\.(production|development)\.js$/.test(m.resource ?? ""));
          const unpatched = reactDom.filter((m) => !String(m.originalSource()?.source() ?? "").includes("klardal: react 19.3 hydration replay fix"));
          if (reactDom.length === 0 || unpatched.length > 0) {
            throw new Error("React hydration fix was not applied – see scripts/react-hydration-fix-loader.cjs.");
          }
        });
      },
    });
    return config;
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
