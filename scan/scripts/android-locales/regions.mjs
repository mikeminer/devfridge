// Superteam country chapters: https://superteam.fun/ (checked 2026-09-19).
// Balkan is expanded into country/language choices at the publisher's request.
// These choices select a translation; they do not assert TopShelf eligibility.
export const regions = [
  ['ae','AE','ar'],['es','ES','es'],['pl','PL','pl'],['br','BR','pt-BR'],
  ['ua','UA','uk'],['nl','NL','nl'],['kz','KZ','kk'],['ar','AR','es'],
  ['th','TH','th'],['vn','VN','vi'],['jp','JP','ja'],['sg','SG','en'],
  ['kr','KR','ko'],['de','DE','de'],['us','US','en'],['ie','IE','en'],
  ['ge','GE','ka'],['gb','GB','en'],['my','MY','ms'],['tr','TR','tr'],
  ['ca','CA','en'],['ca-fr','CA','fr'],['in','IN','hi'],['in-en','IN','en'],
  ['au','AU','en'],['ng','NG','en'],['it','IT','it'],
  ['al','AL','sq'],['ba','BA','bs'],['bg','BG','bg'],['hr','HR','hr'],
  ['gr','GR','el'],['hu','HU','hu'],['xk','XK','sq'],['me','ME','sr-Latn'],
  ['mk','MK','mk'],['ro','RO','ro'],['rs','RS','sr-Latn'],['si','SI','sl'],
].map(([id,country,lang])=>({id,country,lang,path:`/android/${id}`}));

export const languages = {
  en:'English',it:'Italiano',ar:'العربية',es:'Español',pl:'Polski','pt-BR':'Português',
  uk:'Українська',nl:'Nederlands',kk:'Қазақша',th:'ไทย',vi:'Tiếng Việt',ja:'日本語',
  ko:'한국어',de:'Deutsch',ka:'ქართული',ms:'Bahasa Melayu',tr:'Türkçe',hi:'हिन्दी',
  fr:'Français',sq:'Shqip',bs:'Bosanski',bg:'Български',hr:'Hrvatski',el:'Ελληνικά',
  hu:'Magyar','sr-Latn':'Srpski (latinica)',mk:'Македонски',ro:'Română',sl:'Slovenščina',
};
