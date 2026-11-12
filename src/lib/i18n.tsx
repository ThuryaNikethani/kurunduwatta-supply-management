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
  "nav.reports": "වාර්තා",
  "nav.notifications": "පණිවිඩ",
  "nav.menu": "මෙනුව",
  logout: "පිටවෙන්න",

  // ඇතුල් වීම
  "login.title": "ඇතුල් වෙන්න",
  "login.username": "ලොග් වෙන නම",
  "login.password": "මුරපදය",
  "login.submit": "ඇතුල් වෙන්න",
  "login.failed": "ලොග් වෙන නම හරි මුරපදය හරි වැරදියි.",
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
  "supply.step3": "ඕන බඩු",
  "supply.step3Manual": "ඕන බඩු ලියන්න",
  "supply.mode": "ලැයිස්තුව හදන විදිය",
  "supply.modeCalc": "කෑම තෝරන්න",
  "supply.modeCalcHint": "බඩු ඉබේම ගණන් වෙනවා",
  "supply.modeManual": "අතින් ලියන්න",
  "supply.modeManualHint": "බඩු ඔයාම ලියනවා",
  "supply.manualHelp": "කෑම නම් මෙතන ලියන්න. ඕන බඩු පහළින් ලියන්න.",
  "supply.ownDishes": "කෑම වල නම්",
  "supply.ownDishPh": "උදා: කුකුල් මස් කරිය",
  "supply.ownDishAdd": "එකතු කරන්න",
  "supply.noItemsManual": "තාම බඩු නෑ. “බඩුවක් එකතු කරන්න” ඔබලා ලියන්න.",
  "audience.change": "වෙනස් කරන්න",
  "audience.question":"මේ ලැයිස්තුව කාටද?",
  "audience.guests": "අමුත්තන්ට",
  "audience.staff": "විලා සේවකයන්ට",
  "audience.guestsHint": "විලාවට එන අය",
  "audience.staffHint": "විලාවේ වැඩ කරන අය",
  "supply.title": "අමුත්තන්ගේ නම (ඕන නම් විතරක්)",
  "supply.titleStaff": "විස්තරය",
  "supply.titleStaffPh": "උදා: සේවක දවල් කෑම",
  "supply.staffCount": "සේවකයෝ ගණන",
  "supply.orderDate": "ඇණවුම් කරන දිනය",
  "supply.days": "දින කීයක් සඳහාද",
  "supply.forDays": "දින {n}ක් සඳහා",
  "supply.staffTitle": "සේවක කෑම — දින {n}ක්",
  "supply.titlePh": "උදා: පෙරේරා පවුල – 10 දෙනා",
  "supply.date": "කෑම දවස",
  "supply.meal": "වේල",
  "supply.guests": "අමුත්තෝ ගණන",
  "supply.dishes": "අමුත්තෝ ඉල්ලපු කෑම",
  "supply.searchDish": "කෑම හොයන්න…",
  "supply.noRecipe": "වට්ටෝරුව නෑ",
  "supply.selected": "කෑම {n}ක් තෝරලා",
  "supply.calculate": "ප්‍රමාණ හදන්න",
  "supply.calcFor": "{n} දෙනා × දින {d}",
  "supply.recalc": "ආයෙ ගණන් හදන්න",
  "supply.autoTitle": "අමුත්තෝ {n} දෙනා",
  "supply.noRecipeAll": "මේ කෑම වලට තාම ප්‍රමාණ දාලා නෑ:",
  "supply.noRecipeSome": "මේ කෑම වලට තාම ප්‍රමාණ නෑ. ඒවා ගණනට ගත්තේ නෑ:",
  "supply.noRecipeHelp": "ඒවට ඕන බඩු පහළින් ඔයාම ලියන්න.",
  "supply.addRecipes": "වට්ටෝරු දාන්න (අලුත් ටැබ් එකක)",
  "supply.recalcTitle": "ආයෙත් ගණන් හදන්නද?",
  "supply.recalcWarn": "ඔයා වෙනස් කරපු ප්‍රමාණ මැකිලා අලුතෙන් හැදෙනවා. කරන්නද?",
  "supply.items": "ඕන බඩු",
  "supply.totalItems": "බඩු {n}ක්",
  "supply.item": "බඩුව",
  "supply.qty": "ප්‍රමාණය",
  "supply.unit": "ඒකකය",
  "supply.calc": "ගණන් හැදුණු ප්‍රමාණය",
  "supply.note": "සටහන / හේතුව",
  "supply.addItem": "බඩුවක් එකතු කරන්න",
  "supply.noItems": "කෑම තෝරපු ගමන් ඕන බඩු මෙතන ඉබේම එනවා.",
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
  "meal.allday": "තුන් වේලටම",

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
  "recipes.menuGuests": "අමුත්තන්ගේ මෙනුව",
  "recipes.menuStaff": "සේවක කෑම",
  "recipes.optional": "ඕන නම් විතරක්",
  "supply.newDish": "අලුත් කෑමක් එකතු කරන්න",
  "supply.newDishHint": "ලැයිස්තුවේ නැති කෑමක් නම් මෙතනින් එකතු කරන්න. ඒක මෙනුවටත් එකතු වෙනවා, ඊළඟ පාරත් තෝරන්න පුළුවන්.",
  "supply.menuFor": "පෙන්නන්නේ: {menu}",
  "recipes.progress": "වට්ටෝරු {total}න් {done}ක් බැලුවා",
  "recipes.progressHint": "දැනට තියෙන්නේ සාමාන්‍ය ප්‍රමාණ. විලාවේ ප්‍රමාණ වලට ගැලපෙනවද කියලා බලලා සේව් කරන්න.",
  "recipes.filter": "පෙන්නන්න",
  "recipes.todo": "බලන්න ඕන",
  "recipes.done": "බැලුවා",
  "recipes.reviewed": "බැලුවා",
  "recipes.needsCheck": "බලන්න ඕන",
  "recipes.saveMarks": "ප්‍රමාණ හරිද කියලා බලලා සේව් කළාම මේ වට්ටෝරුව “බැලුවා” කියලා සලකුණු වෙනවා.",
  "recipes.reminder": "වට්ටෝරු {n}ක් තාම බලලා නෑ. ඒවායේ තියෙන්නේ සාමාන්‍ය ප්‍රමාණ, විලාවේ ප්‍රමාණ නෙවෙයි.",
  "recipes.reminderAction": "වට්ටෝරු බලන්න",

  // ගිණුම්
  "users.title": "ගිණුම්",
  "users.add": "අලුත් ගිණුමක්",
  "users.usernameHint": "සිංහලෙන් හරි ඉංග්‍රීසියෙන් හරි එක වචනයක්. උදා: චන්දන",
  "users.loginAs": "ලොග් වෙන නම: {name}",
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
  "notif.stopHere": "මේ උපාංගයට මගේ පණිවිඩ නවත්වන්න",
  "notif.stoppedHere": "මේ උපාංගයට ඔයාගේ පණිවිඩ නවත්වලා.",
  "notif.startHere": "ආයෙත් දාන්න",
  "notif.sharedHint": "මේ ෆෝන් එක කිහිප දෙනෙක් පාවිච්චි කරනවා නම්, මෙතනින් ඇතුල් වෙන හැමෝටම තමන්ගේ පණිවිඩ මෙතනට එනවා.",
  "notif.prompt": "ඇප් එක වහලා තිබුණත් පණිවිඩ එන්න, මේ ෆෝන් එකේ පණිවිඩ දාන්න.",
  "notif.enable": "පණිවිඩ එන්න දාන්න",
  "notif.enabled": "මේ ෆෝන් එකට පණිවිඩ එනවා",
  "notif.blocked": "මේ බ්‍රවුසරයේ පණිවිඩ නවත්වලා. සැකසුම් වලින් ඉඩ දෙන්න.",
  "notif.msg.supply": "{by} ({role}) {did}: බඩු ලැයිස්තුව “{title}”",
  "notif.msg.transfer": "{by} ({role}) {did}: ඉතුරු කෑම “{title}”",

  // ගබඩාව
  "nav.stock": "ගබඩාව",
  "nav.orders": "ඇණවුම්",
  "stock.title": "ගබඩාව",
  "stock.intro": "හාල්, තෙල්, ලුණු, සීනි වගේ ගබඩාවේ තියාගන්න වියළි බඩු. හැමදාම කඩෙන් අලුතින් ගන්න බඩු මෙතනට දාන්න ඕන නෑ. ප්‍රමාණ වෙනස් වෙන හැම වෙලාවකම හේතුව සටහන් වෙනවා.",
  "stock.add": "අලුත් බඩුවක්",
  "stock.item": "බඩුව",
  "stock.have": "දැනට තියෙන්නේ",
  "stock.min": "අඩුම ප්‍රමාණය",
  "stock.minHint": "මේ ප්‍රමාණයට වඩා අඩු වුණොත් “අඩුයි” කියලා පෙන්නනවා.",
  "stock.start": "දැනට තියෙන ප්‍රමාණය",
  "stock.low": "අඩුයි",
  "stock.lowCount": "අඩු බඩු {n}ක්",
  "stock.items": "බඩු {n}ක්",
  "stock.empty": "ගබඩාවේ තාම බඩු නෑ. හාල්, තෙල් වගේ තියාගන්න බඩු “අලුත් බඩුවක්” ඔබලා එකතු කරන්න.",
  "stock.adjust": "ප්‍රමාණය හදන්න",
  "stock.adjustTitle": "{name} — ප්‍රමාණය හදන්න",
  "stock.addMore": "එකතු කරන්න (+)",
  "stock.takeOut": "අඩු කරන්න (−)",
  "stock.amount": "ප්‍රමාණය",
  "stock.reason": "හේතුව",
  "stock.reasonPh": "උදා: ගණන් කරලා බැලුවා / නරක් වුණා",
  "stock.reasonRequired": "හේතුව ලියන්න.",
  "stock.history": "ඉතිහාසය",
  "stock.historyTitle": "{name} — ඉතිහාසය",
  "stock.noHistory": "තාම වෙනසක් නෑ.",
  "stock.after": "ඉතුරු",
  "stock.edit": "වෙනස් කරන්න",
  "stock.saved": "සේව් කළා.",
  "stock.startNote": "මුල් ප්‍රමාණය",
  "stock.reason.issue": "නිකුත් කළා",
  "stock.reason.receive": "ලැබුණා",
  "stock.reason.adjust": "හැදුවා",
  "stock.orderLow": "අඩු බඩු වලට ඇණවුමක්",
  "stock.notEnough": "ගබඩාවේ ඒ තරම් නෑ.",
  "stock.exists": "මේ නමින් සහ ඒකකයෙන් බඩුවක් දැනටමත් තියෙනවා.",

  // ගබඩාවෙන් නිකුත් කිරීම
  "issue.title": "ගබඩාවෙන් නිකුත් කිරීම",
  "issue.intro": "මේ ලැයිස්තුවේ ගබඩාවේ තියෙන වියළි බඩු විතරක් මෙතනින් අඩු කරන්න. එක පාරක් විතරයි කරන්න පුළුවන්.",
  "issue.need": "ඕන",
  "issue.inStock": "ගබඩාවේ",
  "issue.give": "නිකුත් කරන්නේ",
  "issue.short": "මදි",
  "issue.fresh": "කඩෙන් අලුතින් ගන්න බඩු {n}ක්",
  "issue.freshHint": "මේවා ගබඩාවේ තියාගන්නේ නැති බඩු. ගබඩාවෙන් අඩු වෙන්නේ නෑ, ඇණවුම් කරන්නත් ඕන නෑ.",
  "issue.allFresh": "මේ ලැයිස්තුවේ බඩු ඔක්කොම කඩෙන් අලුතින් ගන්න ඒවා. ගබඩාවෙන් නිකුත් කරන්න දෙයක් නෑ.",
  "issue.button": "ගබඩාවෙන් නිකුත් කරන්න",
  "issue.confirm": "මේ බඩු ගබඩාවෙන් අඩු කරන්නද? මේක ආපහු කරන්න බෑ.",
  "issue.done": "ගබඩාවෙන් නිකුත් කළා",
  "issue.doneBy": "{name} · {time}",
  "issue.shortTitle": "මදි බඩු {n}ක් තියෙනවා",
  "issue.orderShort": "මදි බඩු වලට ඇණවුමක් හදන්න",
  "issue.waiting": "සුපවයිසර් ගබඩාවෙන් නිකුත් කරනකම්.",

  // ඇණවුම්
  "orders.title": "මිලදී ගැනීමේ ඇණවුම්",
  "orders.intro": "සුපවයිසර් ඇණවුම හදනවා → එච්.ආර්. අනුමත කරනවා → බඩු ලැබුණාම ගබඩාවට එකතු වෙනවා.",
  "orders.new": "අලුත් ඇණවුමක්",
  "orders.edit": "ඇණවුම වෙනස් කරන්න",
  "orders.supplier": "සැපයුම්කරු",
  "orders.supplierPh": "උදා: නුවරඑළිය එළවළු වෙළඳසැල",
  "orders.items": "ගන්න ඕන බඩු",
  "orders.addItem": "බඩුවක් එකතු කරන්න",
  "orders.addLow": "අඩු බඩු එකතු කරන්න",
  "orders.noLow": "දැනට අඩු බඩු නෑ.",
  "orders.note": "එච්.ආර්. එකට සටහනක් (ඕන නම් විතරක්)",
  "orders.send": "එච්.ආර්. එකට යවන්න",
  "orders.saveResend": "වෙනස් කරලා ආයෙත් යවන්න",
  "orders.empty": "තාම ඇණවුම් නෑ.",
  "orders.itemCount": "බඩු {n}ක්",
  "orders.receiveTitle": "බඩු ලැබුණාද?",
  "orders.receiveIntro": "ලැබුණු ප්‍රමාණ ගබඩාවට එකතු වෙනවා. ගබඩාවේ නැති බඩු අලුතින් එකතු වෙනවා.",
  "orders.newItem": "අලුත් බඩුවක්",
  "orders.fromList": "ලැයිස්තුවේ මදි බඩු",
  "order.status.pending_hr": "එච්.ආර්. බලනකම්",
  "order.status.returned": "සුපවයිසර්ට ආපහු යැව්වා",
  "order.status.approved": "අනුමතයි — බඩු ගන්න",
  "order.status.received": "බඩු ලැබුණා",
  "action.po_submit": "එච්.ආර්. එකට යවන්න",
  "action.po_resubmit": "ආයෙත් එච්.ආර්. එකට යවන්න",
  "action.po_approve": "අනුමත කරන්න",
  "action.po_return": "සුපවයිසර්ට ආපහු යවන්න",
  "action.po_receive": "බඩු ලැබුණා",
  "did.po_submit": "අනුමැතියට යැව්වා",
  "did.po_resubmit": "ආයෙත් යැව්වා",
  "did.po_approve": "අනුමත කළා",
  "did.po_return": "සුපවයිසර්ට ආපහු යැව්වා",
  "did.po_receive": "බඩු ලැබුණා කියලා සටහන් කළා",
  "notif.msg.po": "{by} ({role}) {did}: ඇණවුම “{title}”",
  "dash.orders": "ඇණවුම්",

  // උපස්ථ (බැකප්)
  "backup.title": "උපස්ථ (බැකප්)",
  "backup.intro": "හැම ඉරිදාම පාන්දර දත්ත ඔක්කොම ස්වයංක්‍රීයව සේව් වෙනවා. අන්තිම සති 12ක උපස්ථ තියාගන්නවා.",
  "backup.now": "දැන් උපස්ථයක් ගන්න",
  "backup.download": "බාගන්න",
  "backup.empty": "තාම උපස්ථ නෑ.",
  "backup.done": "උපස්ථය ගත්තා.",
  "backup.hint": "වැදගත්: මාසෙකට සැරයක් අලුත්ම උපස්ථය බාගෙන කම්පියුටරේ තියාගන්න.",

  // වාර්තා
  "reports.title": "මාසික වාර්තා",
  "reports.intro": "අනුමත වුණ ලැයිස්තු සහ ඉතුරු කෑම අනුව.",
  "reports.prev": "කලින් මාසය",
  "reports.next": "ඊළඟ මාසය",
  "reports.approved": "අනුමත වුණ ලැයිස්තු",
  "reports.people": "කෑම හැදුවේ (දෙනා)",
  "reports.split": "අමුත්තෝ {guests} · සේවකයෝ {staff}",
  "reports.leftovers": "ඉතුරු කෑම (දෙනා)",
  "reports.leftoverPct": "හැදුවේ කෑමෙන් {pct}%",
  "reports.avgHours": "අනුමත වෙන්න ගිය සාමාන්‍ය පැය",
  "reports.waiting": "දැනට බලාගෙන ඉන්න {n}ක්",
  "reports.perDay": "දවසට කී දෙනෙකුට කෑම හැදුවද",
  "reports.total": "එකතුව",
  "reports.day": "දවස",
  "reports.showTable": "වගුවක් විදියට පෙන්නන්න",
  "reports.hideTable": "වගුව හංගන්න",
  "reports.empty": "මේ මාසේ තාම අනුමත වුණ ලැයිස්තු නෑ.",
  "reports.topDishes": "වැඩිපුරම හැදුව කෑම",
  "reports.leftoverDishes": "ඉතුරු වුණ කෑම",
  "reports.ingredients": "මේ මාසේ ඕන වුණ බඩු (එකතුව)",
  "reports.ingredientsHint": "අනුමත වුණ ලැයිස්තු වල තිබ්බ බඩු ඔක්කොම එකතු කරලා.",

  // iPhone
  "ios.title": "අයිෆෝන් එකට පණිවිඩ ගන්න",
  "ios.why": "අයිෆෝන් එකේ පණිවිඩ එන්නේ මේ ඇප් එක හෝම් ස්ක්‍රීන් එකට දාලා එතනින් ඇරියොත් විතරයි.",
  "ios.step1": "පහළ තියෙන “ශෙයාර්” බොත්තම ඔබන්න (උඩට ඊතලයක් තියෙන කොටුව)",
  "ios.step2": "“ඇඩ් ටු හෝම් ස්ක්‍රීන්” ඔබලා “ඇඩ්” ඔබන්න",
  "ios.step3": "හෝම් ස්ක්‍රීන් එකේ “බඩු ලැයිස්තු” අයිකන් එකෙන් ඇප් එක අරින්න",
  "ios.step4": "ඇතුල් වෙලා “පණිවිඩ එන්න දාන්න” ඔබලා “අලවු” ඔබන්න",
  "ios.later": "පස්සේ",

  // මුරපද
  "pw.button": "මුරපදය",
  "pw.mine": "මගේ මුරපදය වෙනස් කරන්න",
  "pw.resetFor": "{name}ගේ මුරපදය වෙනස් කරන්න",
  "pw.resetHint": "අලුත් මුරපදය හදලා {name}ට කියන්න. එයාට පස්සේ ඒක වෙනස් කරගන්න පුළුවන්.",
  "pw.new": "අලුත් මුරපදය",
  "pw.confirm": "අලුත් මුරපදය ආයෙත්",
  "pw.mismatch": "මුරපද දෙක සමාන නෑ",
  "pw.done": "මුරපදය වෙනස් කළා.",
  "login.forgot": "මුරපදය අමතකද? එච්.ආර්. එකට කියන්න. එයාට අලුත් මුරපදයක් දෙන්න පුළුවන්.",

  // සේව් නොකළ වැඩ
  "draft.restored": "ඔයා කලින් පුරවපු දේවල් ආපහු ගත්තා ({time})",
  "draft.discard": "මකලා මුල ඉඳන් පටන් ගන්න",

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
  "v.username": "ලොග් වෙන නමට අකුරු 2ත් 30ත් අතර ඕන.",
  "v.usernameSpace": "ලොග් වෙන නමේ හිස් තැන් තියන්න එපා. එක වචනයක් දාන්න.",
  "v.password": "අකුරු 6කට වඩා දාන්න",
  "v.number": "අංකයක් දාන්න",
  "v.positive": "0ට වඩා වැඩි වෙන්න ඕන",
  "v.days": "දින ගණන 1ක් හරි ඊට වැඩි හරි වෙන්න ඕන.",
  "v.guests": "අඩුම තරමේ එක්කෙනෙක් ඉන්න ඕන",
  "v.items": "අඩුම තරමේ එක බඩුවක් දාන්න",
  "v.leftovers": "අඩුම තරමේ එක කෑමක් දාන්න",
  "v.recipients": "අඩුම තරමේ එක නමක් දාන්න",
  "v.fix": "රතු පාටින් පෙන්නන තැන් හදන්න.",

  // වැරදි
  "err.usernameUsed": "මේ ලොග් වෙන නම දැනටමත් වෙන කෙනෙක් පාවිච්චි කරනවා. වෙන නමක් දාන්න.",
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
  if (/username-taken/i.test(m)) return translate("err.usernameUsed");
  if (/weak-password/i.test(m)) return translate("v.password");
  if (/invalid-credential|invalid login credentials|invalid_credentials|wrong-password|user-not-found/i.test(m)) return translate("login.failed");
  if (/already-set-up/i.test(m)) return translate("setup.done");
  if (/stock-exists|stock_items_name_unit_idx/i.test(m)) return translate("stock.exists");
  if (/not enough stock/i.test(m)) return translate("stock.notEnough");
  if (/reason is needed/i.test(m)) return translate("stock.reasonRequired");
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
