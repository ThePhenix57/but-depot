import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-but-gray-light px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          {/* Remplace ce bloc par le logo une fois /public/logo-but.png ajouté */}
          <span className="flex h-12 w-12 items-center justify-center rounded bg-but-red text-lg font-black text-white">
            BUT
          </span>
          <h1 className="text-xl font-bold text-but-dark">BUT Dépôt</h1>
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
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-but-red focus:outline-none"
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
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-but-red focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-but-red-dark">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-2 rounded bg-but-red px-4 py-2 font-semibold text-white transition hover:bg-but-red-dark"
          >
            Se connecter
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-but-gray">
          Pas encore de compte ? Demande à ton responsable de t&apos;en créer
          un depuis l&apos;espace Employés.
        </p>
      </div>
    </div>
  );
}
