import { ContentArticle } from "@/components/content";
import { getPublishedPage } from "@/lib/catalog";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{slug:string[]}>}){const {slug}=await params; const path=slug.join("/"); const page=await getPublishedPage(`company/news/${path}`); return <ContentArticle page={page} slug={path}/>;}
