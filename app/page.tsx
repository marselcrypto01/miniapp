// app/page.tsx — серверная обёртка главной
export const revalidate = 0;
export const runtime = 'nodejs';

import HomeClient from './HomeClient';

export default function Page() {
  return <HomeClient />;
}


