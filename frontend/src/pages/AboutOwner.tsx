import { useState, useEffect } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import {
  Mail,
  ExternalLink,
  GraduationCap,
  Cpu,
  Layers,
  Code,
  Terminal,
  Database,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";

export default function AboutOwner() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"skills" | "architecture" | "faq">("skills");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const skillsData = [
    {
      category: "Backend & Systems",
      icon: <Terminal className="size-5 text-brand-500" />,
      skills: ["Java (Spring Boot 3.x)", "Microservices Architecture", "RESTful APIs", "Spring Security (JWT)", "JUnit & Mockito Testing", "Log Tracing & Diagnostics"]
    },
    {
      category: "Frontend & Data",
      icon: <Code className="size-5 text-brand-500" />,
      skills: ["TypeScript / JavaScript", "React.js (Functional / Hooks)", "Tailwind CSS v4", "SQL (Multi-Table Joins)", "Data Analytics & Reporting", "Responsive UI Design"]
    },
    {
      category: "Database & Cloud",
      icon: <Database className="size-5 text-brand-500" />,
      skills: ["PostgreSQL", "Supabase Queues (pgmq)", "Row Level Security (RLS)", "Vercel Frontend Hosting", "Render Cloud Deployment", "Git & GitHub CI/CD"]
    }
  ];

  const faqData = [
    {
      question: "Why software development and core transaction systems?",
      answer: "Enterprise fintech and transaction systems thrive on absolute precision, high concurrency, and data accuracy. Developing portfolio and payment tracking architectures forces me to prioritize stateless optimization, robust asynchronous data processing, and bulletproof input validation where errors are not an option."
    },
    {
      question: "What is your core development philosophy?",
      answer: "Design for architectural decoupling, security first, and strict constraint awareness. Writing modular clean code is vital, but optimization comes from working effectively within environment limitations (like a 512MB RAM cloud container). Decoupling processing intensive work via message queues ensures reliable user experiences."
    },
    {
      question: "What was the most challenging part of building this system?",
      answer: "Configuring a robust security filter chain while balancing data streaming needs. Syncing custom JWT credentials across decoupled state parameters requires clean handler hooks, structural input scrubbing to prevent IDOR vulnerabilities, and optimized multi-table resource joins to keep query response windows minimal."
    }
  ];

  return (
    <>
      <PageMeta
        title="About Developer | TechFolio Dashboard"
        description="Learn more about Ace, the owner of TechFolio, highlighting technical expertise, portfolio features and software engineering capabilities."
      />

      <div className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <PageBreadcrumb pageTitle="About System Owner" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Profile Card */}
        <div className={`lg:col-span-1 transition-all duration-1000 delay-150 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="flex flex-col items-center p-6 border border-gray-200 bg-white rounded-2xl dark:border-gray-800 dark:bg-gray-900 text-center relative overflow-hidden h-full">
            {/* Background design elements */}
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-brand-600 to-brand-400 opacity-80"></div>
            
            {/* Profile Avatar */}
            <div className="relative mt-8 z-10 size-28 rounded-full border-4 border-white dark:border-gray-900 overflow-hidden bg-gray-100 shadow-lg group">
              <img
                src="/images/user/owner.jpg"
                alt="Ace - Developer"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150";
                }}
              />
            </div>

            <h3 className="mt-4 text-xl font-bold text-gray-800 dark:text-white/90">
              Ace
            </h3>
            <p className="text-sm font-medium text-brand-500 dark:text-brand-400">
              Full-Stack / Backend Software Engineer
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Specialized in Core Transaction Flows & FinTech Solutions
            </p>

            <hr className="w-full my-5 border-gray-100 dark:border-gray-800" />

            {/* Introduction paragraph */}
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 text-left">
              I am a results-oriented software engineer with an enterprise foundation in building high-throughput backend services and real-time analytical dashboards. With academic distinction from TAR UMT and field experience from Ant International, I design systems with high technical craftsmanship and performance optimization at their core.
            </p>

            <hr className="w-full my-5 border-gray-100 dark:border-gray-800" />

            {/* Social Links */}
            <div className="flex flex-col gap-3 w-full">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition duration-200 dark:text-gray-300 dark:bg-white/5 dark:hover:bg-white/10 dark:border-gray-800 group"
              >
                <span className="flex items-center gap-2">
                  <FaGithub className="size-4 text-gray-500 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white" />
                  GitHub Profile
                </span>
                <ExternalLink className="size-3.5 text-gray-400" />
              </a>

              <a
                href="https://linkedin.com/in/junwaing"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition duration-200 dark:text-gray-300 dark:bg-white/5 dark:hover:bg-white/10 dark:border-gray-800 group"
              >
                <span className="flex items-center gap-2">
                  <FaLinkedin className="size-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-500" />
                  LinkedIn
                </span>
                <ExternalLink className="size-3.5 text-gray-400" />
              </a>

              <a
                href="mailto:jwng0401@gmail.com"
                className="flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition duration-200 dark:text-gray-300 dark:bg-white/5 dark:hover:bg-white/10 dark:border-gray-800 group"
              >
                <span className="flex items-center gap-2">
                  <Mail className="size-4 text-gray-500 dark:text-gray-400 group-hover:text-brand-500" />
                  Contact Me (Email)
                </span>
                <ExternalLink className="size-3.5 text-gray-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Columns: Stats, Tabs, and Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Metrics Dashboard Grid */}
          <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 transition-all duration-1000 delay-200 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="p-4 border border-gray-200 bg-white rounded-2xl dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">BACHELOR CGPA</p>
              <h4 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">3.945 / 4.0</h4>
              <p className="text-[11px] text-brand-500 font-semibold mt-1">First Class Honours</p>
            </div>
            
            <div className="p-4 border border-gray-200 bg-white rounded-2xl dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">ACADEMIC HONORS</p>
              <h4 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">5x Listed</h4>
              <p className="text-[11px] text-brand-500 font-semibold mt-1">President's & Dean's</p>
            </div>

            <div className="p-4 border border-gray-200 bg-white rounded-2xl dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">DIPLOMA CGPA</p>
              <h4 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">3.955 / 4.0</h4>
              <p className="text-[11px] text-brand-500 font-semibold mt-1">Distinction & Book Prize Award</p>
            </div>

          
          </div>

          {/* Interactive Navigation Tabs */}
          <div className={`transition-all duration-1000 delay-300 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="border border-gray-200 bg-white rounded-2xl dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
              <div className="flex border-b border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setActiveTab("skills")}
                  className={`flex-1 py-4 text-center text-sm font-semibold transition ${
                    activeTab === "skills"
                      ? "text-brand-500 border-b-2 border-brand-500 dark:text-brand-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  Technical Stack
                </button>
                <button
                  onClick={() => setActiveTab("architecture")}
                  className={`flex-1 py-4 text-center text-sm font-semibold transition ${
                    activeTab === "architecture"
                      ? "text-brand-500 border-b-2 border-brand-500 dark:text-brand-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  TechFolio Architecture
                </button>
                <button
                  onClick={() => setActiveTab("faq")}
                  className={`flex-1 py-4 text-center text-sm font-semibold transition ${
                    activeTab === "faq"
                      ? "text-brand-500 border-b-2 border-brand-500 dark:text-brand-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  Interview Q&A
                </button>
              </div>

              <div className="p-6">
                {/* Tab content 1: Technical Stack */}
                {activeTab === "skills" && (
                  <div className="space-y-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      An enterprise-focused engineering stack designed around performance, security, and asynchronous system operations.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {skillsData.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 border border-gray-100 rounded-xl dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02] hover:border-brand-500/30 transition duration-300"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            {item.icon}
                            <h5 className="font-bold text-gray-800 dark:text-white/90">
                              {item.category}
                            </h5>
                          </div>
                          <ul className="space-y-2">
                            {item.skills.map((skill, sIdx) => (
                              <li key={sIdx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <CheckCircle2 className="size-4 mt-0.5 text-brand-500 shrink-0" />
                                <span>{skill}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab content 2: Architecture Spotlight */}
                {activeTab === "architecture" && (
                  <div className="space-y-6">
                    <div className="p-4 border border-brand-500/20 bg-brand-500/5 rounded-xl dark:border-brand-500/10">
                      <div className="flex gap-3">
                        <Cpu className="size-6 text-brand-500 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-bold text-gray-800 dark:text-white/90">
                            Cloud Environment Memory Management
                          </h5>
                          <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                            Designed to map within restrictive cloud engine constraints. The Spring architecture operates via fine-tuned JVM boundaries (`-Xmx300m -Xss512k`) and active garbage collection profiling, squeezing massive analytical performance out of low-footprint compute environments.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 border border-gray-100 rounded-xl dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
                        <h6 className="font-bold text-gray-800 dark:text-white/90 mb-2 flex items-center gap-2">
                          <Layers className="size-4.5 text-brand-500" />
                          Stateless Authentication Gateways
                        </h6>
                        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                          Ensures maximum route throughput by operating full stateless filters. Identity claims are cryptographically verified through integrated API filter tokens, safeguarding transactions and verifying domain query boundaries.
                        </p>
                      </div>

                      <div className="p-4 border border-gray-100 rounded-xl dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
                        <h6 className="font-bold text-gray-800 dark:text-white/90 mb-2 flex items-center gap-2">
                          <Database className="size-4.5 text-brand-500" />
                          Message Queuing & Data Isolation
                        </h6>
                        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                          Database protection handles structural separation right at the record boundary. Heavy-duty query workloads are decoupled cleanly into processing channels to keep active server processing free of analytical deadlocks.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab content 3: Interview Q&A Accordion */}
                {activeTab === "faq" && (
                  <div className="space-y-4">
                    {faqData.map((faq, idx) => (
                      <div
                        key={idx}
                        className="border border-gray-100 rounded-xl dark:border-gray-800 overflow-hidden bg-gray-50/50 dark:bg-white/[0.01]"
                      >
                        <button
                          onClick={() => toggleFaq(idx)}
                          className="flex items-center justify-between w-full p-4 text-left font-semibold text-gray-800 dark:text-white/90 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                        >
                          <span>{faq.question}</span>
                          <ChevronDown
                            className={`size-4 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${
                              expandedFaq === idx ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        <div
                          className={`transition-all duration-300 overflow-hidden ${
                            expandedFaq === idx ? "max-h-60 border-t border-gray-100 dark:border-gray-800" : "max-h-0"
                          }`}
                        >
                          <p className="p-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900/50">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Education & Experience Sleek Timeline */}
          <div className={`p-6 border border-gray-200 bg-white rounded-2xl dark:border-gray-800 dark:bg-gray-900 transition-all duration-1000 delay-400 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h4 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-5 flex items-center gap-2">
              <GraduationCap className="size-5 text-brand-500" />
              Professional Experience & Education
            </h4>

            <div className="relative pl-6 border-l-2 border-gray-100 dark:border-gray-800 space-y-8 ml-3">

                {/* Timeline item 2: Internship */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 bg-brand-500 border-4 border-white dark:border-gray-900 size-4 rounded-full"></div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h5 className="font-bold text-gray-800 dark:text-white/90">
                    Backend Software Engineer Intern (Core FinTech Platforms)
                  </h5>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 self-start sm:self-center">
                    Jan 2026 - July 2026
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Ant International</p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Developed and maintained mission-critical Java/Spring microservices inside global card acquiring platforms. Optimized large-scale data queries through multi-table database processing and shipped live adjustments smoothly across enterprise deployment pipelines.
                </p>
              </div>

              {/* Timeline item 1: Degree */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 bg-brand-500 border-4 border-white dark:border-gray-900 size-4 rounded-full"></div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h5 className="font-bold text-gray-800 dark:text-white/90">
                    Bachelor of Software Engineering (Honours)
                  </h5>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 self-start sm:self-center">
                    2024 - 2026
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">TAR UMT | First Class Honours — CGPA 3.945 / 4.0</p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Specialized in advanced software modeling, algorithmic optimizations, system design paradigms, and multi-tier network infrastructures. Academic recognition via multiple consecutive President's List and Dean's List entries.
                </p>
              </div>

              {/* Timeline item 3: Diploma */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 bg-brand-500 border-4 border-white dark:border-gray-900 size-4 rounded-full"></div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h5 className="font-bold text-gray-800 dark:text-white/90">
                    Diploma in Information Technology
                  </h5>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 self-start sm:self-center">
                    Graduated
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">TAR UMT | Graduation with Distinction — CGPA 3.955 / 4.0</p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Acquired deep underlying core competencies across application logic patterns, OOP fundamentals, and structural SQL data administration. Awarded the prestigious Book Prize Award for grading as the top overall academic performer within the cohort.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}