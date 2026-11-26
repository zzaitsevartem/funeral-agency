"use client";

import dynamic from "next/dynamic";

const AdminApp = dynamic(() => import("./AdminApp"), { ssr: false });

export function AdminClient() {
  return <AdminApp />;
}
