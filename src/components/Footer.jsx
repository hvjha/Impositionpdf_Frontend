import React from 'react';
import { ExternalLink, Globe, Phone } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="glass-footer">
      <div className="footer-inner">
        <span className="footer-copyright">
          © {currentYear} Harsh Vardhan Jha. All rights reserved.
        </span>
        <div className="footer-links">
          <a href="tel:9110163886" className="footer-link">
            <Phone className="footer-link-icon" />
            <span>9110163886</span>
          </a>
          <span className="footer-dot">•</span>
          <a href="https://www.linkedin.com/in/harsh-wardhan-jha-577841242/" target="_blank" rel="noopener noreferrer" className="footer-link">
            <ExternalLink className="footer-link-icon" />
            <span>LinkedIn</span>
          </a>
          <span className="footer-dot">•</span>
          <a href="https://mypotfolio-sgmt.onrender.com/" target="_blank" rel="noopener noreferrer" className="footer-link">
            <Globe className="footer-link-icon" />
            <span>Portfolio</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
