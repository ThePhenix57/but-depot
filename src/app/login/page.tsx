import { login } from "./actions";
import Button from "@/components/ui/Button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-but-gray-light px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <img src="/logo-but.png" alt="BUT" className="h-16 w-16 rounded-xl shadow-sm" />
          <h1 className="text-xl font-bold tracking-tight text-but-dark">BUT Dépôt</h1>
          <p className="text-sm text-but-gray">
            Fiche rangement de marchandise
          </p>
        </div>

        <form action={login} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-but-dark">
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              autoComplete="username"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-but-red focus:outline-none"
              placeholder="prenom.nom@but.fr"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-but-dark">
              Mot de passe
            </label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-but-red focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-but-red/20 bg-but-red-light px-3 py-2 text-sm text-but-red-dark">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="mt-2 w-full">
            Se connecter
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-but-gray">
          Pas encore de compte ? Demande à ton responsable de t&apos;en créer
          un depuis l&apos;espace Employés.
        </p>
      </div>
    </div>
  );
}
