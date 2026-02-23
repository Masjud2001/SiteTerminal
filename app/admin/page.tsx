import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminDashboard from "./AdminDashboard";
import NavBar from "@/components/NavBar";

export default async function AdminPage() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user || user.role !== "ADMIN") {
        redirect("/");
    }

    return (
        <main className="min-h-screen flex flex-col">
            <NavBar user={user} />
            <AdminDashboard />
        </main>
    );
}
