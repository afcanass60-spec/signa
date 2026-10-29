/**
 * Programme des leçons.
 *
 * Les gestes eux-mêmes ne sont PAS décrits ici : ils viennent des références enregistrées
 * dans le Studio par une personne qui signe (idéalement sourde ou interprète), et chaque
 * signe renvoie vers sa vidéo officielle sur Elix, le dictionnaire de LSF en ligne.
 * Ainsi l'app n'enseigne jamais un signe inventé.
 */

export interface Sign {
  slug: string;
  label: string;
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  premium: boolean;
  signs: Sign[];
}

const s = (slug: string, label: string): Sign => ({ slug, label });

export const UNITS: Unit[] = [
  {
    id: "premiers-mots",
    title: "Premiers mots",
    description: "Saluer, remercier, répondre. De quoi engager une première conversation.",
    premium: false,
    signs: [s("bonjour", "Bonjour"), s("merci", "Merci"), s("oui", "Oui"), s("non", "Non"), s("s-il-te-plait", "S'il te plaît"), s("pardon", "Pardon")],
  },
  {
    id: "les-personnes",
    title: "Les personnes",
    description: "Parler de soi, des autres et de sa famille.",
    premium: false,
    signs: [s("moi", "Moi"), s("toi", "Toi"), s("famille", "Famille"), s("ami", "Ami"), s("maman", "Maman"), s("papa", "Papa")],
  },
  {
    id: "quotidien",
    title: "Au quotidien",
    description: "Les verbes et les lieux de tous les jours.",
    premium: true,
    signs: [s("manger", "Manger"), s("boire", "Boire"), s("dormir", "Dormir"), s("travailler", "Travailler"), s("maison", "Maison"), s("ecole", "École")],
  },
  {
    id: "emotions",
    title: "Les émotions",
    description: "Dire comment on se sent.",
    premium: true,
    signs: [s("content", "Content"), s("triste", "Triste"), s("fatigue", "Fatigué"), s("peur", "Peur"), s("aimer", "Aimer"), s("colere", "Colère")],
  },
  {
    id: "sante",
    title: "Santé et urgences",
    description: "Le vocabulaire utile chez le médecin ou en cas de problème.",
    premium: true,
    signs: [s("aider", "Aider"), s("mal", "Avoir mal"), s("medecin", "Médecin"), s("hopital", "Hôpital"), s("urgence", "Urgence"), s("medicament", "Médicament")],
  },
];

export const ALL_SIGNS = UNITS.flatMap((u) => u.signs.map((sign) => ({ ...sign, unit: u })));

export function findSign(slug: string) {
  return ALL_SIGNS.find((x) => x.slug === slug) ?? null;
}

/** Lien de recherche vers le dictionnaire Elix (vidéos de signes par des locuteurs). */
export function elixUrl(label: string) {
  return `https://dico.elix-lsf.fr/dictionnaire/${encodeURIComponent(label.toLowerCase())}`;
}
