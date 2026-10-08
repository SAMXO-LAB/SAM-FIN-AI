import {
  Banknote, Briefcase, Car, CircleDashed, CirclePlus, Clapperboard, CreditCard, Gift, GraduationCap, HeartPulse, House,
  Landmark, Laptop, Percent, PiggyBank, Plane, Receipt, Repeat, ShoppingBag, ShoppingBasket, Smartphone, Store, TrendingUp,
  Utensils, Wallet, ArrowLeftRight, Target, Shield, type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  banknote: Banknote, briefcase: Briefcase, car: Car, "circle-dashed": CircleDashed, "circle-plus": CirclePlus,
  clapperboard: Clapperboard, "credit-card": CreditCard, gift: Gift, "graduation-cap": GraduationCap, "heart-pulse": HeartPulse,
  house: House, landmark: Landmark, laptop: Laptop, percent: Percent, "piggy-bank": PiggyBank, plane: Plane, receipt: Receipt,
  repeat: Repeat, "shopping-bag": ShoppingBag, "shopping-basket": ShoppingBasket, smartphone: Smartphone, store: Store,
  "trending-up": TrendingUp, utensils: Utensils, wallet: Wallet, "arrow-left-right": ArrowLeftRight, target: Target, shield: Shield,
};

/** Renders an icon stored by name in the database (e.g. a category icon). */
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const C = MAP[name] ?? CircleDashed;
  return <C size={size} strokeWidth={1.75} aria-hidden="true" />;
}
