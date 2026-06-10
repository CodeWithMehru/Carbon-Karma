import { ReactNode } from 'react';
import { DashboardNavbar } from '@/components/dashboard/navbar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fafdf7] flex flex-col">
      <DashboardNavbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
