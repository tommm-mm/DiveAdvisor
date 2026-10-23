// Shown on legal pages until a professional has reviewed them (CLAUDE.md: required before public opening).
export function LegalDraftNotice({ updated }: { updated: string }) {
  return (
    <p className="mt-3 rounded-lg bg-sand p-3 text-sm">
      Bozza in revisione, aggiornata il {updated}. Il testo definitivo sarà pubblicato prima dell&apos;apertura al pubblico.
    </p>
  );
}

export const contactLine = () => process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "[email di contatto in arrivo]";
