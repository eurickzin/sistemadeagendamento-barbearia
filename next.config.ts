import type { NextConfig } from "next";

const storageEndpoint = process.env.AWS_ENDPOINT_URL_S3;
let storageImagePattern: NonNullable<NextConfig["images"]>["remotePatterns"] = [];
if (storageEndpoint) {
  try {
    const endpoint = new URL(storageEndpoint);
    if (endpoint.protocol === "https:" && !endpoint.username && !endpoint.password) {
      storageImagePattern = [{
        protocol: "https",
        hostname: endpoint.hostname,
        port: endpoint.port,
        pathname: "/profile-images/**",
        search: "",
      }];
    }
  } catch {
    // Storage remains unavailable until the endpoint is configured correctly.
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: storageImagePattern,
    maximumRedirects: 0,
  },
};

export default nextConfig;
