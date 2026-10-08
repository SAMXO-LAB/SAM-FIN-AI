export type NavIcon = "Sparkles" | "LayoutDashboard" | "ArrowLeftRight" | "Wallet" | "Landmark" | "HandCoins" | "Handshake" | "ChartPie" | "Target" | "TrendingUp" | "Lightbulb" | "Gauge" | "Bell" | "Settings";
export type NavGroup = { group: string; items: { href: string; label: string; icon: NavIcon }[] };

export const NAV: NavGroup[] = [
  { group: "Overview", items: [
    { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/assistant", label: "Ask Sam", icon: "Sparkles" },
    { href: "/transactions", label: "Transactions", icon: "ArrowLeftRight" },
    { href: "/accounts", label: "Accounts", icon: "Wallet" },
  ] },
  { group: "Obligations", items: [
    { href: "/loans", label: "EMIs & Loans", icon: "Landmark" },
    { href: "/lent", label: "Money Lent", icon: "HandCoins" },
    { href: "/borrowed", label: "Money Borrowed", icon: "Handshake" },
  ] },
  { group: "Planning", items: [
    { href: "/budgets", label: "Budgets", icon: "ChartPie" },
    { href: "/goals", label: "Goals", icon: "Target" },
  ] },
  { group: "Insights", items: [
    { href: "/health", label: "Health Score", icon: "Gauge" },
    { href: "/alerts", label: "Alerts", icon: "Bell" },
    { href: "/forecast", label: "Forecast", icon: "TrendingUp" },
    { href: "/recommendations", label: "Recommendations", icon: "Lightbulb" },
  ] },
  { group: "", items: [{ href: "/settings", label: "Settings", icon: "Settings" }] },
]; 
