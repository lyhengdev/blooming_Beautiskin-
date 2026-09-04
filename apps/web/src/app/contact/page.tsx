'use client';

import { useState } from 'react';
import { Phone, Mail, MapPin, MessageCircle, Clock } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import api from '@/lib/api';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/contact', formData);
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-br from-primary-50 to-pink-50 py-10 lg:py-16">
          <div className="container-shop text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-gray-900">Contact Us</h1>
            <p className="mt-3 text-gray-600">We&apos;d love to hear from you</p>
          </div>
        </div>

        <div className="container-shop py-12 lg:py-16">
          <div className="grid lg:grid-cols-[1fr_380px] gap-8 lg:gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-heading font-bold text-gray-900 mb-6">Send us a message</h2>
              <form onSubmit={handleSubmit} className="card p-6 space-y-4">
                {submitted && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
                    Message sent! We will get back to you soon.
                  </div>
                )}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {error}
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input type="text" required className="input-field" value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" required className="input-field" value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input type="text" required className="input-field" value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea required rows={5} className="input-field" value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })} />
                </div>
                <button type="submit" disabled={submitting}
                  className="btn-primary disabled:opacity-50">
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Get in Touch</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-gray-600">+855 12 345 678</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-primary-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-gray-600">hello@bloomingbeautyskin.com</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageCircle className="h-5 w-5 text-primary-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">WhatsApp</p>
                      <p className="text-sm text-gray-600">+855 12 345 678</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Address</p>
                      <p className="text-sm text-gray-600">
                        Street 123, Toul Tompoung<br />
                        Phnom Penh, Cambodia
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Business Hours</p>
                      <p className="text-sm text-gray-600">Mon - Sat: 9:00 AM - 6:00 PM</p>
                      <p className="text-sm text-gray-600">Sunday: Closed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Placeholder */}
              <div className="card overflow-hidden">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">Google Map</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
