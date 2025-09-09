// app/admin/page.tsx — серверная обёртка
export const revalidate = 0;
export const runtime = 'nodejs';

import AdminClient from './AdminClient';

export default function Page() {
  return <AdminClient />;
}
