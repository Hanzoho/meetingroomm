import Link from 'next/link'
import { LayoutDashboard, BookCopy } from 'lucide-react'

export default function StaffLayout({ children }) {
    return (
        <div className="flex min-h-screen bg-background">
            <aside className="hidden w-64 flex-shrink-0 border-r bg-muted/40 p-4 md:block">
                <Link href="/staff" className="mb-8 flex h-16 items-center">
                    <h2 className="text-xl font-bold">Staff Panel</h2>
                </Link>
                <nav className="flex flex-col space-y-2">
                    <Link
                        href="/staff"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                    </Link>
                    <Link
                        href="/staff/managebookings"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                    >
                        <BookCopy className="h-4 w-4" />
                        <span>จัดการการจอง</span>
                    </Link>
                    <Link
                        href="/staff/profile"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                    >
                        <BookCopy className="h-4 w-4" />
                        <span>จัดการโปรไฟล์</span>
                    </Link>
                </nav>
            </aside>
            <main className="flex-1 p-6">{children}</main>
        </div>
    )
}