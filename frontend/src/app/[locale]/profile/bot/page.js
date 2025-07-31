// app/bots/page.js
import BotsPageClient from './BotsPageClient';

export const metadata = {
  title: 'my Bots',
  description: 'Kullanıcıya ait bot listesinin yönetildiği sayfa.',
};

export default function BotsPage() {
  return <BotsPageClient />;
}
