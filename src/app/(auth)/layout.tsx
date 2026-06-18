// The auth screens render their own full-page layout (gradient + glass card),
// so this just passes through.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
