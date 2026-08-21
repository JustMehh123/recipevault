import type { ShoppingRegion } from "@/lib/shopping/region";

export interface GroceryChain {
  id: string;
  name: string;
  pattern: RegExp;
  searchUrl: (query: string, region: ShoppingRegion) => string;
}

function q(query: string): string {
  return encodeURIComponent(query);
}

/**
 * Known grocery / drugstore chains. Used to (a) recognize nearby OSM/Flipp
 * merchants and (b) build a product-search URL on that chain's real website.
 * Shared banners (Walmart, Costco, Amazon) switch to .ca when shopping in Canada.
 */
export const GROCERY_CHAINS: GroceryChain[] = [
  // Canada-first so "Superstore" / "IGA" match before generic US names.
  { id: "loblaws", name: "Loblaws", pattern: /\bloblaws?\b/i, searchUrl: (s) => `https://www.loblaws.ca/search?search-bar=${q(s)}` },
  { id: "superstore", name: "Real Canadian Superstore", pattern: /\b(real canadian )?superstore\b/i, searchUrl: (s) => `https://www.realcanadiansuperstore.ca/search?search-bar=${q(s)}` },
  { id: "nofrills", name: "No Frills", pattern: /\bno\s*frills\b/i, searchUrl: (s) => `https://www.nofrills.ca/search?search-bar=${q(s)}` },
  { id: "independent", name: "Your Independent Grocer", pattern: /\bindependent grocer\b|\byour independent\b/i, searchUrl: (s) => `https://www.yourindependentgrocer.ca/search?search-bar=${q(s)}` },
  { id: "fortinos", name: "Fortinos", pattern: /\bfortinos\b/i, searchUrl: (s) => `https://www.fortinos.ca/search?search-bar=${q(s)}` },
  { id: "zehrs", name: "Zehrs", pattern: /\bzehrs?\b/i, searchUrl: (s) => `https://www.zehrs.ca/search?search-bar=${q(s)}` },
  { id: "provigo", name: "Provigo", pattern: /\bprovigo\b/i, searchUrl: (s) => `https://www.provigo.ca/search?search-bar=${q(s)}` },
  { id: "maxi", name: "Maxi", pattern: /\bmaxi\b/i, searchUrl: (s) => `https://www.maxi.ca/search?search-bar=${q(s)}` },
  { id: "atlantic-superstore", name: "Atlantic Superstore", pattern: /\batlantic superstore\b/i, searchUrl: (s) => `https://www.atlanticsuperstore.ca/search?search-bar=${q(s)}` },
  { id: "dominion", name: "Dominion", pattern: /\bdominion\b/i, searchUrl: (s) => `https://www.newfoundlandgrocerystores.ca/search?search-bar=${q(s)}` },
  { id: "sobeys", name: "Sobeys", pattern: /\bsobeys\b/i, searchUrl: (s) => `https://www.sobeys.com/en/search/?search_keyword=${q(s)}` },
  { id: "freshco", name: "FreshCo", pattern: /\bfreshco\b/i, searchUrl: (s) => `https://freshco.com/store/search?q=${q(s)}` },
  { id: "foodland", name: "Foodland", pattern: /\bfoodland\b/i, searchUrl: (s) => `https://foodland.ca/store/search?q=${q(s)}` },
  { id: "iga", name: "IGA", pattern: /\biga\b/i, searchUrl: (s) => `https://www.iga.net/en/search?text=${q(s)}` },
  { id: "metro", name: "Metro", pattern: /\bm[eé]tro\b/i, searchUrl: (s) => `https://www.metro.ca/en/online-grocery/search?filter=${q(s)}` },
  { id: "foodbasics", name: "Food Basics", pattern: /\bfood basics\b/i, searchUrl: (s) => `https://www.foodbasics.ca/search?filter=${q(s)}` },
  { id: "superc", name: "Super C", pattern: /\bsuper\s*c\b/i, searchUrl: (s) => `https://www.superc.ca/en/search?filter=${q(s)}` },
  { id: "saveonfoods", name: "Save-On-Foods", pattern: /\bsave-?on-?foods\b/i, searchUrl: (s) => `https://www.saveonfoods.com/sm/pickup/rsid/2000/results?q=${q(s)}` },
  { id: "tnt", name: "T&T", pattern: /\bt\s*&\s*t\b|\btnt supermarket\b/i, searchUrl: (s) => `https://www.tntsupermarket.com/eng/catalogsearch/result/?q=${q(s)}` },
  { id: "shoppers", name: "Shoppers Drug Mart", pattern: /\bshoppers( drug mart)?\b/i, searchUrl: (s) => `https://www.shoppersdrugmart.ca/search?text=${q(s)}` },
  { id: "londondrugs", name: "London Drugs", pattern: /\blondon drugs\b/i, searchUrl: (s) => `https://www.londondrugs.com/search/?q=${q(s)}` },
  { id: "farmboy", name: "Farm Boy", pattern: /\bfarm boy\b/i, searchUrl: (s) => `https://farmboy.instacart.com/store/s?k=${q(s)}` },
  { id: "longos", name: "Longo's", pattern: /\blongo'?s\b/i, searchUrl: (s) => `https://www.longos.com/search?q=${q(s)}` },
  { id: "gianttiger", name: "Giant Tiger", pattern: /\bgiant tiger\b/i, searchUrl: (s) => `https://www.gianttiger.com/search?q=${q(s)}` },
  { id: "dollarama", name: "Dollarama", pattern: /\bdollarama\b/i, searchUrl: (s) => `https://www.dollarama.com/en-CA/Search?q=${q(s)}` },
  { id: "safeway-ca", name: "Safeway Canada", pattern: /\bsafeway\b/i, searchUrl: (s, region) =>
      region === "ca"
        ? `https://www.safeway.ca/sm/pickup/rsid/2660/results?q=${q(s)}`
        : `https://www.safeway.com/shop/search-results.html?q=${q(s)}` },
  { id: "coop", name: "Co-op", pattern: /\bco-?op\b/i, searchUrl: (s) => `https://www.calgarycoop.com/search?q=${q(s)}` },
  { id: "thrifty", name: "Thrifty Foods", pattern: /\bthrifty foods\b/i, searchUrl: (s) => `https://www.thriftyfoods.com/search?search-bar=${q(s)}` },
  { id: "qualityfoods", name: "Quality Foods", pattern: /\bquality foods\b/i, searchUrl: (s) => `https://www.qualityfoods.com/search?q=${q(s)}` },

  { id: "walmart", name: "Walmart", pattern: /\bwalmart\b/i, searchUrl: (s, region) =>
      region === "ca" ? `https://www.walmart.ca/en/search?q=${q(s)}` : `https://www.walmart.com/search?q=${q(s)}` },
  { id: "costco", name: "Costco", pattern: /\bcostco\b/i, searchUrl: (s, region) =>
      region === "ca" ? `https://www.costco.ca/CatalogSearch?keyword=${q(s)}` : `https://www.costco.com/CatalogSearch?keyword=${q(s)}` },
  { id: "amazon", name: "Amazon", pattern: /\bamazon\b/i, searchUrl: (s, region) =>
      region === "ca" ? `https://www.amazon.ca/s?k=${q(s)}` : `https://www.amazon.com/s?k=${q(s)}` },
  { id: "instacart", name: "Instacart", pattern: /\binstacart\b/i, searchUrl: (s, region) =>
      region === "ca" ? `https://www.instacart.ca/store/s?k=${q(s)}` : `https://www.instacart.com/store/s?k=${q(s)}` },
  { id: "wholefoods", name: "Whole Foods", pattern: /\bwhole foods\b/i, searchUrl: (s) => `https://www.wholefoodsmarket.com/search?text=${q(s)}` },

  { id: "target", name: "Target", pattern: /\btarget\b/i, searchUrl: (s) => `https://www.target.com/s?searchTerm=${q(s)}` },
  { id: "samsclub", name: "Sam's Club", pattern: /\bsam'?s club\b/i, searchUrl: (s) => `https://www.samsclub.com/s/${q(s)}` },
  { id: "bjs", name: "BJ's", pattern: /\bbj'?s\b/i, searchUrl: (s) => `https://www.bjs.com/search?q=${q(s)}` },
  { id: "kroger", name: "Kroger", pattern: /\bkroger\b/i, searchUrl: (s) => `https://www.kroger.com/search?query=${q(s)}` },
  { id: "ralphs", name: "Ralphs", pattern: /\bralphs\b/i, searchUrl: (s) => `https://www.ralphs.com/search?query=${q(s)}` },
  { id: "fredmeyer", name: "Fred Meyer", pattern: /\bfred meyer\b/i, searchUrl: (s) => `https://www.fredmeyer.com/search?query=${q(s)}` },
  { id: "kingsoopers", name: "King Soopers", pattern: /\bking soopers\b/i, searchUrl: (s) => `https://www.kingsoopers.com/search?query=${q(s)}` },
  { id: "albertsons", name: "Albertsons", pattern: /\balbertsons\b/i, searchUrl: (s) => `https://www.albertsons.com/shop/search-results.html?q=${q(s)}` },
  { id: "vons", name: "Vons", pattern: /\bvons\b/i, searchUrl: (s) => `https://www.vons.com/shop/search-results.html?q=${q(s)}` },
  { id: "publix", name: "Publix", pattern: /\bpublix\b/i, searchUrl: (s) => `https://www.publix.com/search?searchTerm=${q(s)}` },
  { id: "traderjoes", name: "Trader Joe's", pattern: /\btrader joe/i, searchUrl: (s) => `https://www.traderjoes.com/home/search?q=${q(s)}` },
  { id: "aldi", name: "Aldi", pattern: /\baldi\b/i, searchUrl: (s) => `https://www.aldi.us/results/?q=${q(s)}` },
  { id: "lidl", name: "Lidl", pattern: /\blidl\b/i, searchUrl: (s) => `https://www.lidl.com/products?searchTerm=${q(s)}` },
  { id: "heb", name: "H-E-B", pattern: /\bh-?e-?b\b/i, searchUrl: (s) => `https://www.heb.com/search/?q=${q(s)}` },
  { id: "wegmans", name: "Wegmans", pattern: /\bwegmans\b/i, searchUrl: (s) => `https://www.wegmans.com/search?search=${q(s)}` },
  { id: "shoprite", name: "ShopRite", pattern: /\bshop.?rite\b/i, searchUrl: (s) => `https://www.shoprite.com/sm/pickup/rsid/3000/results?q=${q(s)}` },
  { id: "stopandshop", name: "Stop & Shop", pattern: /\bstop\s*(&|and)\s*shop\b/i, searchUrl: (s) => `https://stopandshop.com/sm/pickup/rsid/3000/results?q=${q(s)}` },
  { id: "foodlion", name: "Food Lion", pattern: /\bfood lion\b/i, searchUrl: (s) => `https://www.foodlion.com/sm/pickup/rsid/3000/results?q=${q(s)}` },
  { id: "giant", name: "Giant", pattern: /\bgiant\b/i, searchUrl: (s) => `https://giantfood.com/sm/pickup/rsid/3000/results?q=${q(s)}` },
  { id: "meijer", name: "Meijer", pattern: /\bmeijer\b/i, searchUrl: (s) => `https://www.meijer.com/shopping/search.html?search=${q(s)}` },
  { id: "harristeeter", name: "Harris Teeter", pattern: /\bharris teeter\b/i, searchUrl: (s) => `https://www.harristeeter.com/search?query=${q(s)}` },
  { id: "weismarkets", name: "Weis", pattern: /\bweis\b/i, searchUrl: (s) => `https://www.weismarkets.com/sm/pickup/rsid/3000/results?q=${q(s)}` },
  { id: "sprouts", name: "Sprouts", pattern: /\bsprouts\b/i, searchUrl: (s) => `https://shop.sprouts.com/sm/pickup/rsid/3000/results?q=${q(s)}` },
  { id: "winco", name: "WinCo", pattern: /\bwinco\b/i, searchUrl: (s) => `https://www.wincofoods.com/search?search_query=${q(s)}` },
  { id: "foodbazaar", name: "Food Bazaar", pattern: /\bfood bazaar\b/i, searchUrl: (s) => `https://www.foodbazaar.com/sm/pickup/rsid/3000/results?q=${q(s)}` },
  { id: "cvs", name: "CVS", pattern: /\bcvs\b/i, searchUrl: (s) => `https://www.cvs.com/search?searchTerm=${q(s)}` },
  { id: "walgreens", name: "Walgreens", pattern: /\bwalgreens\b/i, searchUrl: (s) => `https://www.walgreens.com/search/results.jsp?Ntt=${q(s)}` },
  { id: "riteaid", name: "Rite Aid", pattern: /\brite aid\b/i, searchUrl: (s) => `https://www.riteaid.com/shop/catalogsearch/result/?q=${q(s)}` },
  { id: "dollargeneral", name: "Dollar General", pattern: /\bdollar general\b/i, searchUrl: (s) => `https://www.dollargeneral.com/search?q=${q(s)}` },
  { id: "familydollar", name: "Family Dollar", pattern: /\bfamily dollar\b/i, searchUrl: (s) => `https://www.familydollar.com/search?q=${q(s)}` },
];

const GROCERY_HINT =
  /\b(market|mart|foods?|grocery|supermarket|supercenter|pharmacy|drugstore|club|wholesale|fare|depot|grocers?|frills|iga|metro|loblaw|sobeys)\b/i;

export function matchChain(storeName: string | null | undefined): GroceryChain | null {
  if (!storeName) return null;
  for (const chain of GROCERY_CHAINS) {
    if (chain.pattern.test(storeName)) return chain;
  }
  return null;
}

export function isGroceryMerchant(storeName: string | null | undefined): boolean {
  if (!storeName) return false;
  if (matchChain(storeName)) return true;
  return GROCERY_HINT.test(storeName);
}

/** Best product URL for a store + item: chain search page, or a Google Shopping fallback. */
export function productSearchUrl(storeName: string, query: string, region: ShoppingRegion = "us"): string {
  const chain = matchChain(storeName);
  if (chain) return chain.searchUrl(query, region);
  const shopHost = region === "ca" ? "https://www.google.ca/search" : "https://www.google.com/search";
  return `${shopHost}?tbm=shop&q=${q(`${query} ${storeName}`)}`;
}

export function storeMapsUrl(storeName: string, address: string | null, lat?: number | null, lng?: number | null): string {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${q([storeName, address].filter(Boolean).join(" "))}`;
}
