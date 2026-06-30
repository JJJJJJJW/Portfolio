import SplitText from "../components/SplitText.tsx";
import LogoLoop from "../components/LogoLoop.tsx";
import LiveBackground from "../LiveBackground.tsx";
import { SiReact, SiTailwindcss, SiSpringboot, SiSupabase, SiGooglegemini } from 'react-icons/si';
import { Rocket } from 'lucide-react';

const techLogos = [
    { node: <span className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 whitespace-nowrap shadow-lg"><SiReact className="text-[#61DAFB] text-lg" /> React</span> },
    { node: <span className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 whitespace-nowrap shadow-lg"><SiTailwindcss className="text-[#06B6D4] text-lg" /> Tailwind CSS</span> },
    { node: <span className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 whitespace-nowrap shadow-lg"><SiSpringboot className="text-[#6DB33F] text-lg" /> Java Spring</span> },
    { node: <span className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 whitespace-nowrap shadow-lg"><SiSupabase className="text-[#3ECF8E] text-lg" /> Supabase</span> },
    { node: <span className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 whitespace-nowrap shadow-lg"><SiGooglegemini className="text-[#8E75B2] text-lg" /> Gemini AI</span> },
    { node: <span className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 whitespace-nowrap shadow-lg"><Rocket className="text-orange-400 w-4 h-4" /> Antigravity</span> },
];

const LandingPage = () => {
    return (
        <div className="relative dark:bg-slate-900/40 text-slate-200 min-h-screen font-sans flex flex-col pt-70 overflow-hidden">
            <div className="absolute inset-0 z-0 pointer-events-auto">
                <LiveBackground />
            </div>

            <div className="relative z-10 flex flex-col flex-1">
                {/* Hero Section */}
                <header className="px-6 text-center max-w-4xl mx-auto">
                    <h1 className="flex flex-wrap justify-center gap-4 text-4xl md:text-6xl font-extrabold mb-6">
                        <SplitText
                            text="ACE"
                            className="text-black dark:text-white"
                            delay={200}
                            duration={2}
                            ease="power3.out"
                            splitType="chars"
                            from={{ opacity: 0, y: 30 }}
                            to={{ opacity: 1, y: 0 }}
                            tag="span"
                        />
                        <SplitText
                            text="TechFolio"
                            className="text-emerald-400"
                            delay={200}
                            duration={2}
                            ease="power3.out"
                            splitType="chars"
                            from={{ opacity: 0, y: 30 }}
                            to={{ opacity: 1, y: 0 }}
                            tag="span"
                        />
                    </h1>
                    <div className="text-lg text-slate-300 mb-10 pt-3 max-w-3xl mx-auto leading-relaxed flex flex-wrap justify-center gap-x-1.5">
                        <SplitText
                            text="A portfolio where Tech meets"
                            className=" text-black dark:text-slate-300 font-medium"
                            delay={300}
                            duration={0.6}
                            ease="power3.out"
                            splitType="words"
                            from={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
                            to={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            tag="span"
                        />
                        <SplitText
                            text="Finance."
                            className="text-emerald-400 font-bold"
                            delay={6000000}
                            duration={8}
                            ease="power3.out"
                            splitType="words"
                            from={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
                            to={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            tag="span"
                        />
                    </div>
                </header>

                {/* Tech Stack Chips */}
                <section className="pb-10 flex flex-col items-center opacity-80 w-full overflow-hidden">
                    <p className="text-sm text-slate-600 text-slate-900 dark:text-slate-400 mb-6 font-medium uppercase tracking-widest">
                        This website is built with:
                    </p>
                    <div className="w-full max-w-3xl mx-auto px-4">
                        <LogoLoop
                            logos={techLogos}
                            speed={40}
                            direction="left"
                            logoHeight={40}
                            gap={20}
                            hoverSpeed={10}
                            scaleOnHover
                            fadeOut
                        />
                    </div>
                </section>

                {/* Scroll to continue */}
                <div
                    className="mt-auto pb-12 flex flex-col items-center justify-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => document.getElementById('dashboard-content')?.scrollIntoView({ behavior: 'smooth' })}
                >
                    <span className="text-xl mb-2 text-black dark:text-slate-300 font-medium">Scroll to explore</span>
                    <svg className="w-5 h-5 text-emerald-500 dark:text-emerald-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;