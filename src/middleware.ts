import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Protège toutes les pages sauf /login et les fichiers statiques :
// redirige vers /login si personne n'est connecté, et rafraîchit la
// session Supabase à chaque navigation.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // getSession() lit la session directement depuis le cookie déjà présent
  // (rapide, pas d'aller-retour réseau vers Supabase à chaque page) — elle
  // ne rafraîchit un jeton expiré que si besoin. C'est nettement plus
  // robuste que getUser(), qui revérifie auprès de Supabase à CHAQUE page :
  // si Supabase ralentit ne serait-ce que quelques secondes, getUser()
  // rendait tout le site inutilisable (page bloquée, puis 504).
  //
  // Sécurité en plus : si jamais un rafraîchissement de jeton devait quand
  // même appeler Supabase et que ça traîne, on ne laisse jamais ça bloquer
  // tout le site plus de 8 secondes — au pire on traite comme "pas
  // connecté" (redirige vers /login) plutôt que de planter en 504.
  const user = await Promise.race([
    supabase.auth.getSession().then((res) => res.data.session?.user ?? null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
  ]);

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
