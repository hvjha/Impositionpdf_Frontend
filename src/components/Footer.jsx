import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="w-full py-4 bg-black/30 backdrop-blur-md border-t border-white/10 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-center gap-2">
      <span>© {currentYear} Harsh Vardhan Jha. All rights reserved.</span>
      <span className="hidden sm:inline">•</span>
      <a href="tel:9110163886" className="hover:text-cyan-400 transition-colors">Contact: 9110163886</a>
      <span className="hidden sm:inline">•</span>
      <a href="https://www.linkedin.com/in/harsh-vardhan-jha-577841242/" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">LinkedIn</a>
      <span className="hidden sm:inline">•</span>
      <a href="https://mypotfolio-sgmt.onrender.com/" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">Portfolio</a>
    </footer>
  );
}
