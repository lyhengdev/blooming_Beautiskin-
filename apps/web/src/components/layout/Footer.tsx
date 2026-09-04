import Link from 'next/link';
import Image from 'next/image';
import { Flower2, Package, Gift, Truck, Phone, Heart } from 'lucide-react';

const shopLinks = [
  { name: 'All Products', href: '/shop' },
  { name: 'Cleansers', href: '/shop?category=cleanser' },
  { name: 'Toners', href: '/shop?category=toner' },
  { name: 'Serums', href: '/shop?category=serum' },
  { name: 'Moisturizers', href: '/shop?category=moisturizer' },
  { name: 'Sunscreens', href: '/shop?category=sunscreen' },
];

const helpLinks = [
  { name: 'Contact Us', href: '/contact' },
  { name: 'About Us', href: '/about' },
  // { name: 'Skin Quiz', href: '/skin-quiz' }, // DISABLED
  { name: 'Blog', href: '/blog' },
];

const socialLinks = [
  { name: 'Facebook', href: 'https://www.facebook.com/p/Blooming-Beauty-Skin-100067171744804/' },
  { name: 'Instagram', href: 'https://www.instagram.com/skinbloomingbeauty/' },
  { name: 'TikTok', href: 'https://www.tiktok.com/@skinbloomingbeauty2' },
  { name: 'Telegram', href: 'https://t.me/+vFrCO2pmNHthN2Fl' },
];

const deliveryInfo = [
  { icon: Package, text: <>Free shipping on orders over <strong className="text-primary-600">$30</strong></> },
  { icon: Gift, text: <>Use code <strong className="text-primary-600">BLOOM10</strong> for 10% off</> },
  { icon: Truck, text: <>Phnom Penh same-day available</> },
  { icon: Phone, text: <>Order via Telegram or Facebook</> },
];

const paymentMethods = ['Visa', 'Mastercard', 'ABA Pay', 'Wing', 'COD'];

export default function Footer() {
  return (
    <footer className="bg-blush-50 border-t border-blush-200 pt-10 md:pt-16 pb-6 md:pb-8">
      <div className="container-shop">

        {/* ── Top grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 pb-10 md:pb-12 border-b border-blush-200">

          {/* Brand column */}
          <div className="sm:col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <Image src="/logo.png" alt="Blooming Beauty Skin" width={32} height={32} className="object-contain" />
              <div>
                <p className="font-heading font-extrabold text-primary-600 text-lg leading-tight">
                  Blooming Beauty Skin
                </p>
                <p className="text-xs tracking-[0.2em] text-primary-400 uppercase">Cosmetics</p>
              </div>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              Your trusted skincare &amp; cosmetics partner in Cambodia. Authentic Korean &amp; Japanese
              products, curated with love. <Heart className="inline h-3.5 w-3.5 text-primary-400" />
            </p>

            {/* Social icons */}
            <div className="mt-5 flex flex-wrap gap-2">
              {socialLinks.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white border border-blush-200 px-3 py-1.5
                             text-xs font-semibold text-primary-600 shadow-pink-sm
                             hover:bg-primary-500 hover:text-white hover:border-primary-500
                             transition-all duration-150"
                >
                  {s.name}
                </a>
              ))}
            </div>
          </div>

          {/* Shop column */}
          <div>
            <h4 className="font-heading font-bold text-gray-800 mb-4">Shop</h4>
            <ul className="space-y-2.5 text-sm">
              {shopLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-gray-500 hover:text-primary-500 transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help column */}
          <div>
            <h4 className="font-heading font-bold text-gray-800 mb-4">Help</h4>
            <ul className="space-y-2.5 text-sm">
              {helpLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-gray-500 hover:text-primary-500 transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Delivery column */}
          <div>
            <h4 className="font-heading font-bold text-gray-800 mb-4">Cambodia Delivery</h4>
            <div className="space-y-3 text-sm text-gray-500">
              {deliveryInfo.map((item, i) => (
                <p key={i} className="flex items-start gap-2">
                  <item.icon className="h-4 w-4 text-primary-400 mt-0.5 shrink-0" />
                  <span>{item.text}</span>
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 md:pt-8 text-sm text-gray-400">
          <p className="flex items-center gap-1.5 text-center">
            © 2026 Blooming Beauty Skin · All rights reserved
            <Flower2 className="h-3.5 w-3.5 text-primary-400" />
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {paymentMethods.map((method) => (
              <span
                key={method}
                className="rounded-lg border border-blush-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-500"
              >
                {method}
              </span>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
