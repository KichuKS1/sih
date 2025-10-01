import { Brain, Smartphone, Shield, FileText, Clock, Users } from "lucide-react";

const Features = () => {
  const mainFeatures = [
    {
      icon: Brain,
      title: "AI-Powered Detection",
      description:
        "Advanced machine learning algorithms analyze cognitive patterns to identify early signs of dementia and mild cognitive impairment.",
      benefits: [
        "Clinical-grade accuracy",
        "Continuous learning from data",
        "Pattern recognition beyond human capability",
        "Real-time analysis and scoring",
      ],
    },
    {
      icon: Smartphone,
      title: "Easy Interface",
      description:
        "Intuitive design that works seamlessly across mobile devices and desktop computers, accessible for users of all technical skill levels.",
      benefits: [
        "Mobile-first responsive design",
        "Large, clear buttons and text",
        "Voice guidance available",
        "Offline capability for tests",
      ],
    },
    {
      icon: Shield,
      title: "Data Privacy & Security",
      description:
        "Your sensitive health information is protected with enterprise-grade encryption and DPDPA-compliant storage systems.",
      benefits: [
        "End-to-end encryption",
        "DPDPA compliance",
        "Local data processing",
        "No third-party data sharing",
      ],
    },
    {
      icon: FileText,
      title: "Reports for Everyone",
      description:
        "Clear, understandable reports designed for both caregivers and healthcare professionals, with different detail levels for each audience.",
      benefits: [
        "Family-friendly summaries",
        "Detailed clinical reports",
        "Visual progress tracking",
        "Printable and shareable formats",
      ],
    },
  ];

  const additionalFeatures = [
    { icon: Clock, title: "Progress Tracking", description: "Monitor cognitive health over time with trend analysis." },
    { icon: Users, title: "Family Support", description: "Resources to help families navigate cognitive health." },
  ];

  const technology = [
    {
      title: "Machine Learning",
      description:
        "Deep models trained on cognitive assessments to identify subtle patterns in responses.",
      tech: "TensorFlow, PyTorch, Clinical Datasets",
    },
    {
      title: "Data Security",
      description: "Encryption and zero-trust practices to protect sensitive information.",
      tech: "AES-256, DPDPA Compliance, Zero-Trust Architecture",
    },
    {
      title: "Clinical Validation",
      description:
        "Currently in prototype / research stage, not yet clinically validated.",
      tech: "Algorithm Testing, Benchmark Testing, Future Clinical Trials",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-brain overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/35 via-primary/10 to-secondary/40 opacity-80" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
            <span className="text-gradient">Cog.ai</span> Features
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive cognitive health tools designed for families and healthcare providers.
          </p>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-16">
            {mainFeatures.map((feature, index) => (
              <div
                key={index}
                className={`flex flex-col lg:flex-row items-center gap-12 ${index % 2 === 1 ? "lg:flex-row-reverse" : ""}`}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="p-3 bg-gradient-hero rounded-lg">
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-foreground">{feature.title}</h3>
                  </div>
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">{feature.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {feature.benefits.map((b, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                        <span className="text-foreground">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="bg-card rounded-2xl p-8 shadow-card">
                    <div className="bg-gradient-brain rounded-xl p-12 text-center">
                      <div className="w-32 h-32 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-6 animate-float">
                        <feature.icon className="h-16 w-16 text-white" />
                      </div>
                      <h4 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h4>
                      <p className="text-muted-foreground">Advanced healthcare technology made simple</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">More Features</h2>
            <p className="text-lg text-muted-foreground">Additional tools to support your cognitive health journey</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {additionalFeatures.map((f, i) => (
              <div key={i} className="bg-card rounded-2xl p-8 shadow-soft card-hover">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-gradient-hero rounded-lg">
                    <f.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{f.title}</h3>
                </div>
                <p className="text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Built on Advanced Technology</h2>
            <p className="text-lg text-muted-foreground">The science and technology that powers Cog.ai</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {technology.map((t, i) => (
              <div key={i} className="bg-card rounded-2xl p-6 shadow-soft text-center">
                <h3 className="text-xl font-semibold text-foreground mb-3">{t.title}</h3>
                <p className="text-muted-foreground mb-4">{t.description}</p>
                <div className="text-sm text-primary font-medium">{t.tech}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-brain">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-6">Experience These Features</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Jump into the assessment to see how these features work together for cognitive insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/assessment" className="btn-hero">Start Assessment</a>
            <a href="/contact" className="btn-secondary">Request Full Access</a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Features;