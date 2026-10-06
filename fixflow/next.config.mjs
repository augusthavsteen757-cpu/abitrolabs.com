/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ["@libsql/client", "libsql", "bcryptjs"],
  },
};

export default nextConfig;
