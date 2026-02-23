export { default } from "next-auth/middleware";

export const config = {
    // Protect homepage and admin routes — redirect to /login if not authenticated
    matcher: ["/", "/admin/:path*"],
};
