-- Corrige un bug de la réinitialisation du journal (/admin/journal) : il
-- manquait la policy RLS autorisant la SUPPRESSION dans "mouvements", donc
-- la sauvegarde se faisait bien (table journal_reset_backups) mais le
-- DELETE qui doit vider le journal ensuite ne supprimait silencieusement
-- aucune ligne (RLS bloque tout ce qui n'a pas de policy correspondante,
-- sans erreur) — d'où les lignes qui "restaient quand même" après reset.
create policy "mouvements_delete_admin" on public.mouvements
  for delete using (public.is_admin());

notify pgrst, 'reload schema';
