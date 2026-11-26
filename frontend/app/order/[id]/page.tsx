import { OrderResultPage } from "@/components/commerce";
export const dynamic = "force-dynamic";
export default async function Page({params}:{params:Promise<{id:string}>}){ const {id}=await params; return <OrderResultPage id={id}/>; }
