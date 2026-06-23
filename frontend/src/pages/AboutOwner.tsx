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
  ChevronDown
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
      skills: ["Java (Spring Boot 3.x)", "RESTful APIs", "Spring Security", "JWT Authentication", "Python", "JUnit Testing"]
    },
    {
      category: "Frontend & Design",
      icon: <Code className="size-5 text-brand-500" />,
      skills: ["TypeScript / JavaScript", "React.js (Functional / Hooks)", "Tailwind CSS v4", "HTML5 & Semantic CSS", "Responsive UI Design"]
    },
    {
      category: "Database & Cloud",
      icon: <Database className="size-5 text-brand-500" />,
      skills: ["PostgreSQL", "Supabase", "Row Level Security (RLS)", "Docker & Containerization", "Render Cloud Deployment", "Git & GitHub CI/CD"]
    }
  ];

  const faqData = [
    {
      question: "Why software development and finance-modern technologies?",
      answer: "Technology and finance both thrive on precision, speed, and algorithmic problem-solving. Developing financial dashboards and portfolio tooling allows me to combine strict backend optimization (handling volatile live stock/currency rates) with high-density frontend data visualization. It is the ultimate testbed for engineering highly performant, real-time products."
    },
    {
      question: "What is your core development philosophy?",
      answer: "Statelessness, security first, and constraint-based design. Writing clean, modular code is essential, but understanding the system constraints of your deployment platform (e.g. strict RAM and CPU allocations) makes code resilient. I believe in designing APIs that validate input robustly and fail gracefully with sanitized user feedback."
    },
    {
      question: "What was the most challenging part of building the TechFolio Dashboard?",
      answer: "Implementing secure, row-level data isolation that syncs between a frontend Supabase OAuth flow and a stateless Spring Boot backend API. Resolving this required building a Spring Security JWT authentication filter chain that extracts user claims directly from the OAuth token and strictly validates database ownership (preventing IDOR) before any resource update, all while staying within the 512MB RAM constraints."
    }
  ];

  return (
    <>
      <PageMeta
        title="About Developer | TechFolio Dashboard"
        description="Learn more about Ace, the creator of TechFolio, highlighting technical expertise, portfolio features, and software engineering capabilities."
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
                  // Fallback if image doesn't load
                  e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150";
                }}
              />
            </div>

            <h3 className="mt-4 text-xl font-bold text-gray-800 dark:text-white/90">
              Ace
            </h3>
            <p className="text-sm font-medium text-brand-500 dark:text-brand-400">
              Full-Stack Software Engineer
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Specialized in Finance-Tech & AI Integrations
            </p>

            <hr className="w-full my-5 border-gray-100 dark:border-gray-800" />

            {/* Introduction paragraph */}
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 text-left">
              I am a results-oriented aspiring software engineer specializing in building robust, performant full-stack systems. Driven by a passion for backend systems architecture and modern user interfaces, I designed **TechFolio** to demonstrate advanced capabilities in Java/Spring Boot, React, and system-level optimization.
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
                href="https://linkedin.com"
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
                href="mailto:developer.ace@example.com"
                className="flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition duration-200 dark:text-gray-300 dark:bg-white/5 dark:hover:bg-white/10 dark:border-gray-800 group"
              >
                <span className="flex items-center gap-2">
                  <Mail className="size-4 text-gray-500 dark:text-gray-400 group-hover:text-brand-500" />
                  developer.ace@example.com
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
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">CUMULATIVE GPA</p>
              <h4 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">3.85 / 4.0</h4>
              <p className="text-[11px] text-brand-500 font-semibold mt-1">Computer Science Major</p>
            </div>
            
            <div className="p-4 border border-gray-200 bg-white rounded-2xl dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">DSA PROBLEMS</p>
              <h4 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">350+ Solved</h4>
              <p className="text-[11px] text-brand-500 font-semibold mt-1">LeetCode / Hackerrank</p>
            </div>

            <div className="p-4 border border-gray-200 bg-white rounded-2xl dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">PROJECTS BUILT</p>
              <h4 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">8+ Completed</h4>
              <p className="text-[11px] text-brand-500 font-semibold mt-1">Full-Stack Deployments</p>
            </div>

            <div className="p-4 border border-gray-200 bg-white rounded-2xl dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">OPTIMIZATION LIMIT</p>
              <h4 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">512MB RAM</h4>
              <p className="text-[11px] text-brand-500 font-semibold mt-1">Stateless Spring Boot Bridge</p>
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
                      Hover over sections to see skill layouts. These skills were directly applied to design and optimize the TechFolio dashboard.
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
                            Severe Resource Constraints Optimization
                          </h5>
                          <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                            TechFolio is designed with production limits in mind. To stay fully responsive within a **512MB RAM Render Free Tier environment**, I set custom JVM memory boundaries (`-Xmx300m -Xss512k`) and forced a Serial Garbage Collector (`-XX:+UseSerialGC`) to minimize garbage-collection footprint overhead.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 border border-gray-100 rounded-xl dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
                        <h6 className="font-bold text-gray-800 dark:text-white/90 mb-2 flex items-center gap-2">
                          <Layers className="size-4.5 text-brand-500" />
                          Stateless & Secure JWT Gateways
                        </h6>
                        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                          To guarantee high request throughput, sessions are fully stateless. Authentication is managed using JWT validation in Spring Security. Public pathways are protected with lightweight rate-limiters, and resource endpoints strictly authorize user IDs to prevent IDOR vulnerabilities.
                        </p>
                      </div>

                      <div className="p-4 border border-gray-100 rounded-xl dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
                        <h6 className="font-bold text-gray-800 dark:text-white/90 mb-2 flex items-center gap-2">
                          <Database className="size-4.5 text-brand-500" />
                          Supabase RLS & Pagination
                        </h6>
                        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                          Database operations run against Supabase PostgreSQL. Database-level protection is established using Row-Level Security (RLS) policies. Large data feeds are paginated to avoid load spikes on the Spring Boot backend service layers.
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
              Education & Milestones
            </h4>

            <div className="relative pl-6 border-l-2 border-gray-100 dark:border-gray-800 space-y-8 ml-3">
              {/* Timeline item 1 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 bg-brand-500 border-4 border-white dark:border-gray-900 size-4 rounded-full"></div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h5 className="font-bold text-gray-800 dark:text-white/90">
                    B.Sc. in Computer Science
                  </h5>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 self-start sm:self-center">
                    2022 - 2026
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">State University | GPA 3.85 / 4.00</p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Focus on Data Structures, Algorithms, Software Design, and Distributed Systems. Actively involved as a tech lead in group projects.
                </p>
              </div>

              {/* Timeline item 2 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 bg-brand-500 border-4 border-white dark:border-gray-900 size-4 rounded-full"></div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h5 className="font-bold text-gray-800 dark:text-white/90">
                    Full-Stack Software Engineer Intern
                  </h5>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 self-start sm:self-center">
                    Summer 2025
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">InnovateTech Solutions</p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Developed interactive customer management dashboards using React and Spring Boot. Optimized database write speeds by 15% through JPA batch query setups.
                </p>
              </div>

              {/* Timeline item 3 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 bg-brand-500 border-4 border-white dark:border-gray-900 size-4 rounded-full"></div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h5 className="font-bold text-gray-800 dark:text-white/90">
                    Independent Creator - TechFolio
                  </h5>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 self-start sm:self-center">
                    2024 - Present
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Personal Development Project</p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Architected a complete goal and personal finance dashboard. Handled integration with live currency rates and secure Spring Security JWT endpoint filtering.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
