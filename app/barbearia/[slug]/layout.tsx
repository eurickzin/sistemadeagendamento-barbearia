import { notFound } from "next/navigation";
import { carregarBarbeariaPublica } from "@/lib/neon/public-data";

export default async function BarbeariaLayout({
  children,
  params,
}: LayoutProps<"/barbearia/[slug]">) {
  const { slug } = await params;
  const { data, error } = await carregarBarbeariaPublica(slug);
  if (!data && !error) notFound();
  return children;
}
