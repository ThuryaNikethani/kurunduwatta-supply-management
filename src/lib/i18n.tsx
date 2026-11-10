"use client";

import { createContext, useCallback, useContext, useEffect } from "react";

/**
 * The whole app is in simple, everyday Sinhala only.
 * Add every piece of text here — never hard-code text in components.
 */

export type Lang = "si";

const si = {
  appName: "කුරුඳුවත්ත බඩු ලැයිස්තු",
  appTagline: "කුස්සියට ඕන බඩු අනුමත කරගන්න",
  villa: "කුරුඳුවත්ත විලා",

  // තනතුරු
  "role.chef": "චෙෆ්",
  "role.supervisor": "සුපවයිසර්",
  "role.hr": "එච්.ආර්.",

  // තත්ත්වය
  "status.pending_supervisor": "සුපවයිසර් බලනකම්",
  "status.returned_to_chef": "චෙෆ්ට ආපහු යැව්වා",
  "status.pending_hr": "එච්.ආර්. බලනකම්",
  "status.returned_to_supervisor": "එච්.ආර්. ආපහු යැව්වා",
  "status.approved": "අනුමතයි",

  // බොත්තම්
  "action.submit": "සුපවයිසර්ට යවන්න",
  "action.resubmit": "ආයෙත් සුපවයිසර්ට යවන්න",
  "action.return_to_chef": "චෙෆ්ට ආපහු යවන්න",
  "action.forward_to_hr": "එච්.ආර්. එකට යවන්න",
  "action.approve": "අනුමත කරන්න",
  "action.reject_to_supervisor": "සුපවයිසර්ට ආපහු යවන්න",

  // කවුද මොකද කළේ
  "did.submit": "බලන්න යැව්වා",
  "did.resubmit": "ආයෙත් යැව්වා",
  "did.return_to_chef": "චෙෆ්ට ආපහු යැව්වා",
  "did.forward_to_hr": "එච්.ආර්. එකට යැව්වා",
  "did.approve": "අනුමත කළා",
  "did.reject_to_supervisor": "සුපවයිසර්ට ආපහු යැව්වා",

  // මෙනුව
  "nav.dashboard": "මුල් පිටුව",
  "nav.newList": "අලුත් ලැයිස්තුවක්",
  "nav.recipes": "කෑම වට්ටෝරු",
  "nav.users": "ගිණුම්",
  "nav.notifications": "පණිවිඩ",
  "nav.menu": "මෙනුව",
  logout: "පිටවෙන්න",

  // ඇතුල් වීම
  "login.title": "ඇතුල් වෙන්න",
  "login.email": "ඊමේල් ලිපිනය",
  "login.password": "මුරපදය",
  "login.submit": "ඇතුල් වෙන්න",
  "login.failed": "ඊමේල් එක හරි මුරපදය හරි වැරදියි.",
  "login.noProfile": "මේ ගිණුමට තාම තනතුරක් දීලා නෑ. එච්.ආර්. එකෙන් අහන්න.",
  "login.inactive": "මේ ගිණුම නවත්වලා තියෙන්නේ. එච්.ආර්. එකට කතා කරන්න.",
  "setup.title": "මුලින්ම සකස් කරන්න",
  "setup.intro": "මුලින්ම එච්.ආර්. ගිණුම හදන්න. ඊට පස්සේ එච්.ආර්. එකට චෙෆ් සහ සුපවයිසර් ගිණුම් හදන්න පුළුවන්.",
  "setup.name": "ඔයාගේ නම",
  "setup.submit": "එච්.ආර්. ගිණුම හදන්න",
  "setup.done": "සකස් කරලා ඉවරයි. දැන් ඇතුල් වෙන්න.",
  "setup.link": "පළවෙනි පාරද? මෙතනින් සකස් කරන්න",
  "config.missing": "පද්ධතිය තාම සම්බන්ධ කරලා නෑ. පරිපාලකට කියන්න.",

  // මුල් පිටුව
  "dash.hello": "ආයුබෝවන්, {name}",
  "dash.needsAction": "ඔයා කරන්න ඕන දේවල්",
  "dash.nothing": "දැනට ඔයා කරන්න ඕන දෙයක් නෑ.",
  "dash.supplyLists": "බඩු ලැයිස්තු",
  "dash.transfers": "ඉතුරු කෑම",
  "dash.all": "ඔක්කොම",
  "dash.everyone": "අමුත්තෝ සහ සේවකයෝ",
  "dash.empty": "තාම මුකුත් නෑ.",
  "dash.recent": "ඔක්කොම වාර්තා",
  "dash.search": "හොයන්න…",
  "stat.waiting": "ඔයා බලන්න ඕන",
  "stat.inReview": "තාම බලනවා",
  "stat.approved": "අනුමතයි",
  "stat.leftovers": "මේ මාසේ ඉතුරු කෑම (දෙනා)",

  // බඩු ලැයිස්තුව
  "supply.new": "අලුත් බඩු ලැයිස්තුවක්",
  "supply.step1": "ලැයිස්තුවේ විස්තර",
  "supply.step2": "කෑම තෝරන්න",
  "supply.step3": "ප්‍රමාණ බලන්න",
  "audience.question": "මේ ලැයිස්තුව කාටද?",
  "audience.guests": "අමුත්තන්ට",
  "audience.staff": "විලා සේවකයන්ට",
  "audience.guestsHint": "විලාවට එන අමුත්තන්ට කෑම",
  "audience.staffHint": "විලාවේ වැඩ කරන අයට කෑම",
  "supply.title": "අමුත්තන්ගේ නම",
  "supply.titleStaff": "විස්තරය",
  "supply.titleStaffPh": "උදා: සේවක දවල් කෑම",
  "supply.staffCount": "සේවකයෝ ගණන",
  "supply.titlePh": "උදා: පෙරේරා පවුල – 10 දෙනා",
  "supply.date": "කෑම දවස",
  "supply.meal": "වේල",
  "supply.guests": "අමුත්තෝ ගණන",
  "supply.dishes": "අමුත්තෝ ඉල්ලපු කෑම",
  "supply.searchDish": "කෑම හොයන්න…",
  "supply.noRecipe": "වට්ටෝරුව නෑ",
  "supply.selected": "කෑම {n}ක් තෝරලා",
  "supply.calculate": "ප්‍රමාණ හදන්න",
  "supply.recalcTitle": "ආයෙත් ගණන් හදන්නද?",
  "supply.recalcWarn": "දැනට තියෙන බඩු ලැයිස්තුව මැකිලා අලුතෙන් ගණන් හැදෙනවා. කරන්නද?",
  "supply.items": "ඕන බඩු",
  "supply.totalItems": "බඩු {n}ක්",
  "supply.item": "බඩුව",
  "supply.qty": "ප්‍රමාණය",
  "supply.unit": "ඒකකය",
  "supply.calc": "ගණන් හැදුණු ප්‍රමාණය",
  "supply.note": "සටහන / හේතුව",
  "supply.addItem": "බඩුවක් එකතු කරන්න",
  "supply.noItems": "තාම බඩු නෑ. කෑම තෝරලා “ප්‍රමාණ හදන්න” ඔබන්න. නැත්නම් ඔයාටම බඩු එකතු කරන්න පුළුවන්.",
  "supply.chefNote": "සුපවයිසර්ට සටහනක් (ඕන නම් විතරක්)",
  "supply.send": "සුපවයිසර්ට යවන්න",
  "supply.saveResend": "වෙනස් කරලා ආයෙත් යවන්න",
  "supply.edit": "ලැයිස්තුව වෙනස් කරන්න",
  "supply.changed": "වෙනස් කළා",
  "supply.recordLeftovers": "ඉතුරු කෑම ලියන්න",

  // වේල්
  "meal.breakfast": "උදේ කෑම",
  "meal.lunch": "දවල් කෑම",
  "meal.dinner": "රෑ කෑම",
  "meal.hightea": "හවස තේ",
  "meal.bbq": "බාබකියු රෑ",
  "meal.other": "වෙනත්",

  // ඒකක
  "unit.g": "ග්‍රෑම්",
  "unit.kg": "කිලෝ",
  "unit.ml": "මිලි",
  "unit.l": "ලීටර්",
  "unit.pcs": "කෑලි",
  "unit.pkt": "පැකට්",
  "unit.btl": "බෝතල්",
  "unit.bunch": "මිටි",

  // ඉතුරු කෑම
  "transfer.new": "සේවකයන්ට දුන්න ඉතුරු කෑම",
  "transfer.date": "දුන්න දවස",
  "transfer.madeFor": "හැදුවේ කී දෙනාටද",
  "people": "{n} දෙනා",
  "transfer.items": "ඉතුරු වුණ කෑම",
  "transfer.dish": "කෑම",
  "transfer.portions": "කී දෙනෙකුට ඇති ද",
  "transfer.addRow": "කෑමක් එකතු කරන්න",
  "transfer.recipients": "කෑම ගත්ත සේවකයෝ",
  "transfer.recipientPh": "නම ලියලා “එකතු කරන්න” ඔබන්න",
  "transfer.add": "එකතු කරන්න",
  "transfer.summary": "{guests} දෙනෙකුට හැදුවා · {portions} දෙනෙකුට ඇති කෑම ඉතුරුයි",
  "transfer.onlyApproved": "ඉතුරු කෑම ලියන්න පුළුවන් අනුමත වුණ ලැයිස්තුවකට විතරයි.",
  "transfer.linked": "ඉතුරු කෑම වාර්තා",

  // විස්තර පිටුව
  "detail.history": "සිද්ධ වුණ දේවල්",
  "detail.createdBy": "හැදුවේ",
  "detail.reason": "හේතුව / සටහන",
  "detail.reasonRequired": "ආපහු යවනවා නම් හේතුව ලියන්න.",
  "detail.notePh": "සටහනක් ලියන්න…",
  "detail.notFound": "හොයාගන්න බැරි වුණා.",
  "detail.yourTurn": "ඔයාගේ වාරය",

  // වට්ටෝරු
  "recipes.title": "කෑම වට්ටෝරු",
  "recipes.intro": "මෙතන තියෙන්නේ එක්කෙනෙකුට යන ප්‍රමාණ. ලැයිස්තුවක අමුත්තෝ ගණනින් මේවා වැඩි වෙනවා.",
  "recipes.load": "විලා මෙනුව ගන්න",
  "recipes.loaded": "මෙනුව එකතු වුණා.",
  "recipes.addDish": "කෑමක් එකතු කරන්න",
  "recipes.dishName": "කෑමේ නම",
  "recipes.category": "වර්ගය",
  "recipes.ingredient": "බඩුව",
  "recipes.perPerson": "එක්කෙනෙකුට",
  "recipes.addIngredient": "බඩුවක් එකතු කරන්න",
  "recipes.ingredients": "බඩු {n}ක්",
  "recipes.empty": "තාම කෑම නෑ.",
  "recipes.delete": "කෑම මකන්න",
  "recipes.deleteConfirm": "මේ කෑම මකන්නද?",
  "recipes.saved": "සේව් කළා.",

  // ගිණුම්
  "users.title": "ගිණුම්",
  "users.add": "අලුත් ගිණුමක්",
  "users.name": "නම",
  "users.role": "තනතුර",
  "users.active": "වැඩ කරනවා",
  "users.disabled": "නවත්වලා",
  "users.passwordHint": "අකුරු 6කට වඩා",
  "users.created": "ගිණුම හැදුවා.",

  // පණිවිඩ
  "notif.title": "පණිවිඩ",
  "notif.markAll": "ඔක්කොම කියෙව්වා",
  "notif.empty": "පණිවිඩ නෑ.",
  "notif.open": "බලන්න",
  "notif.close": "වහන්න",
  "notif.refresh": "ආයෙත් සම්බන්ධ කරන්න",
  "notif.prompt": "ඇප් එක වහලා තිබුණත් පණිවිඩ එන්න, මේ ෆෝන් එකේ පණිවිඩ දාන්න.",
  "notif.enable": "පණිවිඩ එන්න දාන්න",
  "notif.enabled": "මේ ෆෝන් එකට පණිවිඩ එනවා",
  "notif.blocked": "මේ බ්‍රවුසරයේ පණිවිඩ නවත්වලා. සැකසුම් වලින් ඉඩ දෙන්න.",
  "notif.msg.supply": "{by} ({role}) {did}: බඩු ලැයිස්තුව “{title}”",
  "notif.msg.transfer": "{by} ({role}) {did}: ඉතුරු කෑම “{title}”",

  // ප්‍රින්ට්
  "print.button": "ප්‍රින්ට් කරන්න",
  "print.printed": "ප්‍රින්ට් කළේ",

  // පුහුණු මාදිලිය
  "demo.banner": "පුහුණු මාදිලිය — දත්ත සේව් වෙන්නේ මේ බ්‍රවුසරයේ විතරයි. තව ටැබ් එකක් ඇරලා වෙන තනතුරකින් ඇතුල් වුණොත් පණිවිඩ එන හැටි බලන්න පුළුවන්.",
  "demo.accounts": "පුහුණු ගිණුම් — ඔබලා ඇතුල් වෙන්න",
  "demo.password": "මුරපදය: {pw}",
  "demo.reset": "පුහුණු දත්ත මුල ඉඳන්",
  "demo.resetConfirm": "පුහුණු දත්ත ඔක්කොම මකලා මුල ඉඳන් පටන් ගන්නද?",

  // පිරවීම් වැරදි
  "v.required": "මේක පුරවන්න",
  "v.email": "හරි ඊමේල් එකක් දාන්න",
  "v.password": "අකුරු 6කට වඩා දාන්න",
  "v.number": "අංකයක් දාන්න",
  "v.positive": "0ට වඩා වැඩි වෙන්න ඕන",
  "v.guests": "අඩුම තරමේ එක්කෙනෙක් ඉන්න ඕන",
  "v.items": "අඩුම තරමේ එක බඩුවක් දාන්න",
  "v.leftovers": "අඩුම තරමේ එක කෑමක් දාන්න",
  "v.recipients": "අඩුම තරමේ එක නමක් දාන්න",
  "v.fix": "රතු පාටින් පෙන්නන තැන් හදන්න.",

  // වැරදි
  "err.emailUsed": "මේ ඊමේල් එකෙන් දැනටමත් ගිණුමක් තියෙනවා.",
  "err.network": "අන්තර්ජාලය නෑ. සම්බන්ධ වෙලා ආයෙත් උත්සාහ කරන්න.",
  "err.permission": "මේක කරන්න ඔයාට අවසර නෑ.",

  // පොදු
  save: "සේව් කරන්න",
  saving: "සේව් වෙනවා…",
  cancel: "එපා",
  remove: "අයින් කරන්න",
  loading: "පොඩ්ඩක් ඉන්න…",
  error: "මොකක් හරි වැරැද්දක් වුණා. ආයෙත් උත්සාහ කරන්න.",
  back: "ආපහු",
  confirm: "හරි",
  done: "හරි, කළා",
};

export type TKey = keyof typeof si;

/** Translate outside React (e.g. push notification text). */
export function translate(key: TKey, vars?: Record<string, string | number>) {
  let s: string = si[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Turn any thrown error into a simple Sinhala message. */
export function errorText(e: unknown) {
  const m = e instanceof Error ? `${e.message} ${(e as { code?: string }).code ?? ""}` : String(e);
  if (/email-already-in-use|email_exists|already (in use|registered|been registered)/i.test(m)) return translate("err.emailUsed");
  if (/weak-password/i.test(m)) return translate("v.password");
  if (/invalid-email/i.test(m)) return translate("v.email");
  if (/invalid-credential|invalid login credentials|invalid_credentials|wrong-password|user-not-found/i.test(m)) return translate("login.failed");
  if (/already-set-up/i.test(m)) return translate("setup.done");
  if (/weak_password|password should be/i.test(m)) return translate("v.password");
  if (/network|offline|unavailable/i.test(m)) return translate("err.network");
  if (/permission|insufficient/i.test(m)) return translate("err.permission");
  return translate("error");
}

interface I18n {
  lang: Lang;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = "si";
  }, []);
  const t = useCallback((key: TKey, vars?: Record<string, string | number>) => translate(key, vars), []);
  return <Ctx.Provider value={{ lang: "si", t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n must be used inside I18nProvider");
  return c;
}
