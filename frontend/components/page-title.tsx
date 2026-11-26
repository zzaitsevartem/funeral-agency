export function ContentTitleBand({ title, className = "" }: { title: string; className?: string }) {
  return <div className={`content-title-band ${className}`.trim()}><div className="content-title-inner"><h1>{title}</h1></div></div>;
}
