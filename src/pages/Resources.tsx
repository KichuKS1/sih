import { useState } from "react";
import { Calendar, User, ArrowRight, BookOpen, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import emailjs from "@emailjs/browser";
import { useToast } from "@/hooks/use-toast";

const Resources = () => {
  const articles = [
    {
      id: 1,
      title: "Depression Scale in older primary care patients",
      excerpt: "The utility of the Center for Epidemiological Studies-Depression Scale in older primary care patients",
      category: "Research",
      author: "P. A. AREAN &J. MIRANDA",
      date: "09 Jun 2010",
      readTime: "8 min read",
      featured: true,
      icon: BookOpen,
      link: "https://www.tandfonline.com/doi/abs/10.1080/13607869757371"
    },
    {
      id: 2,
      title: "Technology and Dementia: The Future is Now",
      excerpt: "Technology has multiple potential applications to dementia from diagnosis and assessment to care delivery and supporting ageing in place.",
      category: "Technology",
      author: "Dement Geriatr Cogn Disord",
      date: "June 27, 2019",
      readTime: "12 min read",
      featured: true,
      icon: BookOpen,
      link: "https://karger.com/dem/article/47/3/131/103431"
    },
    {
      id: 3,
      title: "Caregiver Support: Guidelines",
      excerpt: "A NICE-SCIE guideline on supporting people with dementia and their carers in health and social care.",
      category: "Caregiver Tips",
      author: "National Collaborating Centre for Mental Health (UK)",
      featured: false,
      icon: Users,
      link: "https://pubmed.ncbi.nlm.nih.gov/21834193/"
    },
    {
      id: 4,
      title: "Early Diagnosis of Dementia",
      excerpt: "Breakthrough studies show how early intervention can significantly improve quality of life outcomes.",
      category: "Research",
      author: "Karen S. Santacruz, Daniel Swagerty",
      featured: false,
      icon: BookOpen,
      link: "https://www.aafp.org/pubs/afp/issues/2001/0215/p703.html"
    },
    {
      id: 5,
      title: "Dementia-friendly community initiatives: An integrative review",
      excerpt: "To synthesise international research conducted on dementia-friendly community initiatives.",
      category: "Community",
      author: "Kay Shannon, Kasia Bail, Stephen Neville",
      featured: false,
      icon: Users,
      link: "https://onlinelibrary.wiley.com/doi/abs/10.1111/jocn.14746"
    }
  ];

  const categories = [
    { name: "All Articles", count: articles.length },
    { name: "Caregiver Tips", count: articles.filter(a => a.category === "Caregiver Tips").length },
    { name: "Research", count: articles.filter(a => a.category === "Research").length },
    { name: "Technology", count: articles.filter(a => a.category === "Technology").length },
    { name: "Community", count: articles.filter(a => a.category === "Community").length }
  ];

  const featuredArticles = articles.filter(article => article.featured);
  const regularArticles = articles.filter(article => !article.featured);

  const { toast } = useToast();
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailJsServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || "service_88thx9v";
  const emailJsTemplateId = import.meta.env.VITE_EMAILJS_SUBSCRIPTION_TEMPLATE_ID || "template_3x38jas";
  const emailJsPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "h13VIYUe0nUpzgcpr";

  const handleSubscribe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!subscriberEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address before subscribing.",
        variant: "destructive",
      });
      return;
    }

    if (!emailJsServiceId || !emailJsTemplateId || !emailJsPublicKey) {
      toast({
        title: "Subscription unavailable",
        description: "Email service is not configured. Please set the EmailJS environment variables.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await emailjs.send(
        emailJsServiceId,
        emailJsTemplateId,
        {
          to_email: subscriberEmail,
          subscriber_email: subscriberEmail,
          subject: "Thank you for subscribing",
          message: "Thank you for subscribing - You will receive updates soon",
        },
        emailJsPublicKey
      );

      toast({
        title: "Subscribed!",
        description: "We've sent a confirmation email to your inbox.",
      });

      setSubscriberEmail("");
    } catch (error) {
      const errorDetails =
        error instanceof Error
          ? error.message
          : typeof error === "object"
            ? JSON.stringify(error)
            : String(error);

      console.error("Subscription email failed", errorDetails);
      toast({
        title: "Subscription failed",
        description: `We couldn't send the confirmation email. Details: ${errorDetails}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFeaturedCard = (article: typeof articles[number]) => {
    const card = (
      <Card className="shadow-card card-hover transition-transform">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
              {article.category}
            </span>
            <div className="p-2 bg-gradient-hero rounded-lg">
              <article.icon className="h-5 w-5 text-white" />
            </div>
          </div>
          <CardTitle className="text-xl hover:text-primary transition-colors">
            {article.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            {article.excerpt}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>{article.author}</span>
              </div>
              {article.date && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{article.date}</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 text-primary">
              <span className="text-sm font-medium">Read More</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );

    return article.link ? (
      <a
        key={article.id}
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-2xl"
      >
        {card}
      </a>
    ) : (
      <div key={article.id} className="block">
        {card}
      </div>
    );
  };

  const renderRegularCard = (article: typeof articles[number]) => {
    const card = (
      <Card className="shadow-soft card-hover transition-transform h-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="px-3 py-1 bg-secondary/10 text-secondary text-xs font-medium rounded-full">
              {article.category}
            </span>
            <div className="p-1 bg-gradient-hero rounded">
              <article.icon className="h-4 w-4 text-white" />
            </div>
          </div>
          <CardTitle className="text-lg hover:text-primary transition-colors line-clamp-2">
            {article.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
            {article.excerpt}
          </p>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{article.author}</span>
            </div>
            {(article.date || article.readTime) && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {article.date ? (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-3 w-3" />
                    <span>{article.date}</span>
                  </div>
                ) : (
                  <span />
                )}
                {article.readTime && <span>{article.readTime}</span>}
              </div>
            )}
          </div>
          <div className="mt-4 inline-flex items-center space-x-2 text-primary">
            <span className="text-sm font-medium">Read More</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    );

    return article.link ? (
      <a
        key={article.id}
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-2xl"
      >
        {card}
      </a>
    ) : (
      <div key={article.id} className="block">
        {card}
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-brain overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/35 via-primary/10 to-secondary/40 opacity-80" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 animate-fade-in">
            Resources & <span className="text-gradient">Insights</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto animate-slide-up">
            Expert guidance, research insights, and practical support for families navigating cognitive health.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-4 justify-center">
            {categories.map((category, index) => (
              <button
                key={category.name}
                className={`px-4 py-2 rounded-full transition-all duration-300 ${
                  index === 0
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground mb-8">Featured Articles</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {featuredArticles.map(renderFeaturedCard)}
          </div>

          {/* All Articles */}
          <h2 className="text-3xl font-bold text-foreground mb-8">All Articles</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularArticles.map(renderRegularCard)}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-brain">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-6">Stay Updated</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Get the latest research insights, caregiver tips, and Cog.ai updates delivered to your inbox.
          </p>

          <div className="max-w-md mx-auto">
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4">
              <label htmlFor="subscription-email" className="sr-only">
                Email address
              </label>
              <input
                id="subscription-email"
                type="email"
                value={subscriberEmail}
                onChange={(event) => setSubscriberEmail(event.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <button
                type="submit"
                className="btn-hero whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Subscribe"}
              </button>
            </form>
            <p className="text-sm text-muted-foreground mt-3">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Resources;