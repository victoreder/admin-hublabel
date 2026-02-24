const SALES_ALLOWED_USER_ID =
  import.meta.env.VITE_SALES_ALLOWED_USER_ID ??
  "5097c8dd-43e1-4020-8bcd-b976219fb1bb";

export function canAccessSales(userId: string | undefined): boolean {
  if (!userId) return false;
  return userId === SALES_ALLOWED_USER_ID;
}
