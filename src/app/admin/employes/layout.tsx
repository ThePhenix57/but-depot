import { requireAdminStrict } from "@/lib/requireAdminStrict";

// Section réservée aux vrais admins — le rôle "dev" (autorisé dans
// /admin/zones, /admin/alveoles, /admin/categories par le layout parent)
// est renvoyé ailleurs ici.
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAdminStrict();
  return <>{children}</>;
}
