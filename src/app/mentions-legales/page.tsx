"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { IconArrowRight, IconAlertTriangle } from "@/components/icons";

// Page de mentions légales / avertissement d'usage, accessible depuis le
// tout petit lien en pied de page. Rappelle clairement ce qu'est (et
// surtout ce que n'est PAS) ce site, pour éviter toute confusion avec les
// outils officiels BUT.
export default function MentionsLegalesPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-but-gray hover:text-but-red"
      >
        <IconArrowRight className="h-4 w-4 rotate-180" />
        Retour
      </button>

      <h1 className="mb-1 text-2xl font-bold tracking-tight text-but-dark">
        Mentions légales &amp; avertissement d&apos;usage
      </h1>
      <p className="mb-6 text-sm text-but-gray">
        À lire une fois — pour savoir exactement ce qu&apos;est ce site et
        comment l&apos;utiliser correctement.
      </p>

      <Card className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <IconAlertTriangle className="h-5 w-5 text-but-red" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-but-gray">
            Ce que ce site n&apos;est PAS
          </h2>
        </div>
        <ul className="list-inside list-disc space-y-2 text-sm text-but-dark">
          <li>
            Ce n&apos;est pas un outil accordé, validé ou reconnu par la
            direction générale de BUT : c&apos;est un outil interne, créé et
            maintenu par l&apos;équipe du dépôt BUT de Nancy Houdemont pour
            son usage quotidien.
          </li>
          <li>
            Il n&apos;est relié à aucun système informatique officiel de BUT
            (Nosica, Ylios, gestion de stock, etc.) et ne peut donc ni les
            consulter, ni les modifier, ni s&apos;y substituer.
          </li>
          <li>
            Il ne remplace en aucun cas les outils officiels du groupe pour
            la gestion des stocks, le suivi SAV, ou toute autre procédure
            définie par BUT. En cas de doute entre ce que dit ce site et ce
            que dit un outil officiel, l&apos;outil officiel a toujours
            raison.
          </li>
        </ul>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-but-gray">
          Ce que ce site EST
        </h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-but-dark">
          <li>
            Un référentiel indicatif : il aide à retrouver où un produit a
            été rangé, à repérer une alvéole, à imprimer une étiquette ou à
            consulter le planning de l&apos;équipe — rien de plus.
          </li>
          <li>
            Les informations affichées (emplacements, quantités, plannings)
            sont indicatives et dépendent de ce que les employés y
            renseignent ; elles peuvent être incomplètes ou obsolètes.
          </li>
          <li>
            Aucune donnée saisie ici n&apos;est transmise à BUT au niveau
            national : elle reste propre à ce dépôt.
          </li>
        </ul>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-but-gray">
          Responsabilité &amp; contact
        </h2>
        <p className="text-sm text-but-dark">
          Ce site est développé et maintenu bénévolement par un employé du
          dépôt, en dehors de tout cadre officiel BUT, à titre d&apos;outil
          d&apos;entraide interne à l&apos;équipe. Il est fourni « en
          l&apos;état », sans garantie de disponibilité ou d&apos;exactitude
          des informations affichées. Pour toute question, signalement
          d&apos;un problème ou suggestion, adresse-toi directement à la
          personne qui gère le site au sein de l&apos;équipe.
        </p>
      </Card>

      <div className="mt-8 flex justify-center">
        <Link href="/">
          <Button variant="outline">Retour à l&apos;accueil</Button>
        </Link>
      </div>
    </div>
  );
}
