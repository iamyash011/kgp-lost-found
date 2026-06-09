import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[#e8eaed] dark:border-[#2d2f33] bg-[#f8f9fa] dark:bg-[#111214]">
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 font-heading text-lg font-bold text-blue-600 dark:text-blue-400">
              <div className="w-3 h-3 bg-blue-600 dark:bg-blue-400 rounded-full" />
              KGP Find
            </Link>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
              The smart, secure way to recover lost belongings on the IIT Kharagpur campus. Designed exclusively for the KGP community.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li><Link to="/" className="hover:text-blue-500 transition-colors">Home Feed</Link></li>
              <li><Link to="/report" className="hover:text-blue-500 transition-colors">Report an Item</Link></li>
              <li><Link to="/profile" className="hover:text-blue-500 transition-colors">My Profile & Claims</Link></li>
            </ul>
          </div>

          {/* Legal / Info */}
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4 text-sm uppercase tracking-wider">Information</h4>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li><a href="#" className="hover:text-blue-500 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors">Community Guidelines</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#e8eaed] dark:border-[#2d2f33] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} KGP Find. All rights reserved.
          </p>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            Built with <Heart className="w-3 h-3 text-red-400 fill-current" /> for IIT Kharagpur
          </p>
        </div>
      </div>
    </footer>
  );
}
