/**
 * Visual shell only. Authorization lives in each page and each server action
 * (requireAdmin()), never in a layout — layouts are not re-run on every
 * navigation and must not be treated as a security boundary.
 */
export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="min-h-dvh bg-neutral-50 dark:bg-neutral-950">{children}</div>;
}
