import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto min-w-0 lg:ml-[70px]">
        <div className="w-full max-w-full px-4 sm:px-6 py-6 pt-14 lg:pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
