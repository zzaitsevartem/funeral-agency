import { PaymentPage } from "@/components/commerce";
export const dynamic = "force-dynamic";
export default async function Page({params}:{params:Promise<{reference:string}>}){ const {reference}=await params; return <PaymentPage reference={reference}/>; }
