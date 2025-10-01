import { Link } from "react-router-dom";
import { Mail, Twitter, Linkedin, Github } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Footer = () => {
  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-10 w-10 flex items-center justify-center rounded-lg overflow-hidden bg-card">
                <img src="/logo.png" alt="Cog.ai logo" className="h-8 w-8 object-contain" />
              </div>
              <span className="text-xl font-bold text-gradient">Cog.ai</span>
            </div>
            <p className="text-muted-foreground mb-4 max-w-md">
              AI-powered early dementia detection app. Helping families and doctors detect cognitive issues early through simple tests and easy-to-understand reports.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Cog.ai is a research prototype. Not a medical device.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link to="/" className="block text-muted-foreground hover:text-primary transition-colors">
                Home
              </Link>
              <Link to="/about" className="block text-muted-foreground hover:text-primary transition-colors">
                About
              </Link>
              <Link to="/features" className="block text-muted-foreground hover:text-primary transition-colors">
                Features
              </Link>
              <Link to="/assessment" className="block text-muted-foreground hover:text-primary transition-colors">
                Assessment
              </Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Resources</h3>
            <div className="space-y-2">
              <Link to="/resources" className="block text-muted-foreground hover:text-primary transition-colors">
                Blog
              </Link>
              <Link to="/contact" className="block text-muted-foreground hover:text-primary transition-colors">
                Contact
              </Link>
              <a
                href="https://www.freeprivacypolicy.com/live/2f8ae647-8c7a-4bbb-8311-bd01f9664f05"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="https://www.freeprivacypolicy.com/live/15fb06da-cfcf-4fef-b1fd-2e359bc63d0c"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                Terms & Conditions
              </a>
            </div>
          </div>
        </div>

        {/* Social Links & Copyright */}
        <div className="border-t border-border mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex space-x-4 mb-4 sm:mb-0">
            <a
              href="#"
              aria-label="Twitter"
              onClick={(e) => { e.preventDefault(); toast({ title: "Coming soon", description: "Our Twitter/X is brewing ☕" }); }}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="#"
              aria-label="LinkedIn"
              onClick={(e) => { e.preventDefault(); toast({ title: "Coming soon", description: "LinkedIn page launching shortly 🚀" }); }}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Linkedin className="h-5 w-5" />
            </a>
            <a
              href="#"
              aria-label="GitHub"
              onClick={(e) => { e.preventDefault(); toast({ title: "Coming soon", description: "Repos will go public soon 🔧" }); }}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="#"
              aria-label="Email"
              onClick={(e) => { e.preventDefault(); toast({ title: "Coming soon", description: "Newsletter signups opening soon ✉️" }); }}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="h-5 w-5" />
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Cog.ai. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;