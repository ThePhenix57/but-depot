import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: ReactNode;
  /** Zone à droite du titre (ex: bouton d'action principal). */
  actions?: ReactNode;
}

// En-tête de page standard : même hiérarchie (titre, sous-titre gris,
// actions à droite) sur toutes les pages du site plutôt qu'une mise en
// forme différente à chaque fois.
export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-but-dark">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-but-gray">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
