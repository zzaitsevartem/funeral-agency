import { notFound } from "next/navigation";
import { ContentPage, knownContentRoute } from "@/components/content";
import { getPublishedPage } from "@/lib/catalog";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params; if(!knownContentRoute(`company/${slug}`)) notFound(); const content=await getPublishedPage(`company/${slug}`); return <ContentPage slug={slug} content={content}/>;}
