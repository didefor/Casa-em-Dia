import './globals.css';

export const metadata = { title: 'Casa em Dia', description: 'Finanças da casa' };
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#1f7a5a' };

export default function Raiz({ children }) {
  return (<html lang="pt-BR"><body>{children}</body></html>);
}
