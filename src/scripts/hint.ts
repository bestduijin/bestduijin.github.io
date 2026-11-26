// A one-line note under the language link, offered when the visitor's browser prefers
// the site's other language. It never redirects: the visitor follows the link or closes it.
//
// Page.astro renders one hidden `.hint[data-hint]` per language the visitor might want
// (only those that point to the other page). This script unhides at most one of them.

export type HintKey = 'zh-Hans' | 'zh-Hant' | 'en';

const TRADITIONAL = ['hant', 'tw', 'hk', 'mo'];

// The first language in the visitor's list that the site has, as the note to show.
// Chinese is Traditional when the tag names the script (Hant) or a region that writes it
// (TW, HK, MO), unless it says Hans outright; otherwise Simplified. Nothing matched → null.
export function preferred(languages: readonly string[]): HintKey | null {
  for (const tag of languages) {
    const parts = tag.toLowerCase().split(/[-_]/);
    if (parts[0] === 'en') return 'en';
    if (parts[0] === 'zh') {
      if (parts.includes('hans')) return 'zh-Hans';
      return parts.some((p) => TRADITIONAL.includes(p)) ? 'zh-Hant' : 'zh-Hans';
    }
  }
  return null;
}

// Remembered once the visitor closes the note or picks a language from the switch link.
// Storage may be blocked (private mode, site data off); then nothing is remembered.
const KEY = 'serico:lang-hint';
const remembered = () => {
  try {
    return localStorage.getItem(KEY) === 'off';
  } catch {
    return false;
  }
};
const remember = () => {
  try {
    localStorage.setItem(KEY, 'off');
  } catch {
    // nothing to do
  }
};

export function startHint() {
  if (remembered()) return;
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  const key = preferred(languages);
  const hint = key && document.querySelector<HTMLElement>(`.hint[data-hint="${key}"]`);
  if (!hint) return; // the visitor is already on their language, or the site has none of theirs

  // Closed from the keyboard while focus is in the note, focus goes to the language link above
  // it (hiding the note would otherwise drop it to the start of the page). A mouse click leaves
  // focus alone.
  const close = (byKeyboard: boolean) => {
    if (byKeyboard && hint.contains(document.activeElement)) document.querySelector<HTMLElement>('.switch')?.focus();
    hint.hidden = true;
    remember();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close(true);
  };

  // A click from Enter or Space on the button has no pointer behind it (detail 0).
  hint.querySelector('.hint-close')?.addEventListener('click', (e) => close((e as MouseEvent).detail === 0));
  // Choosing a language by hand also means "don't ask again". The note's own link doesn't.
  // (the link at the top, and the one in the footer)
  for (const link of document.querySelectorAll('.switch, [data-switch]')) link.addEventListener('click', remember);
  document.addEventListener('keydown', onKey);
  hint.hidden = false; // shown without moving focus
}
