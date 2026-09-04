import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Flower2, ShieldCheck, Microscope, MapPin } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary-50 to-pink-50 py-10 lg:py-24">
          <div className="container-shop text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-heading font-bold text-gray-900">
              About Blooming Beauty Skin
            </h1>
            <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Your trusted destination for authentic Korean and Japanese skincare in Cambodia
            </p>
          </div>
        </section>

        {/* Story */}
        <section className="py-16 lg:py-20">
          <div className="container-shop">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900">Our Story</h2>
                <p className="mt-4 text-gray-600 leading-relaxed">
                  Blooming Beauty Skin was born from a simple belief: everyone deserves access to
                  authentic, high-quality skincare products. Founded in Cambodia, we saw a gap in the
                  market for genuine Korean and Japanese skincare brands.
                </p>
                <p className="mt-4 text-gray-600 leading-relaxed">
                  We personally curate every product in our collection, working directly with brands
                  to ensure authenticity. From the cult-favorite COSRX Snail Mucin to the luxurious
                  Beauty of Joseon Glow Serum, we bring the best of K-beauty and J-beauty to your doorstep.
                </p>
              </div>
              <div className="aspect-square bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center">
                <Flower2 className="h-32 w-32 text-primary-400" />
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 lg:py-20 bg-gray-50">
          <div className="container-shop">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 text-center mb-12">
              Our Values
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: 'Authentic Products',
                  desc: 'Every product is sourced directly from authorized distributors. We guarantee 100% authenticity.',
                  icon: ShieldCheck,
                },
                {
                  title: 'Expert Curation',
                  desc: 'Our skincare-obsessed team tests every product before adding it to our collection.',
                  icon: Microscope,
                },
                {
                  title: 'Cambodian First',
                  desc: 'We understand Cambodian skin and climate. Our recommendations are tailored for you.',
                  icon: MapPin,
                },
              ].map((value) => (
                <div key={value.title} className="card p-8 text-center">
                  <value.icon className="h-10 w-10 text-primary-600 mx-auto" />
                  <h3 className="text-xl font-heading font-bold mt-4">{value.title}</h3>
                  <p className="mt-3 text-gray-600">{value.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-20">
          <div className="container-shop text-center">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900">
              Start Your Skincare Journey
            </h2>
            <p className="mt-3 text-gray-600">Browse our curated collection of skincare products</p>
            <a href="/shop" className="mt-6 inline-block btn-primary">Shop Now</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
