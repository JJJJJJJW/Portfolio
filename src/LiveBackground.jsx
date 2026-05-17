import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim"; 
import { useTheme } from "./context/ThemeContext";

const LiveBackground = () => {
    const [init, setInit] = useState(false);
    const { theme } = useTheme();

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    const options = {
        fullScreen: { enable: false },
        background: { color: { value: "transparent" } }, // Let your CSS handle the bg color
        fpsLimit: 60,
        interactivity: {
            events: {
                onHover: { enable: true, mode: "grab" }, // Lines "grab" your mouse like a magnetic field
            },
            modes: {
                grab: { distance: 140, links: { opacity: 0.8 } },
            },
        },
        particles: {
            color: { value: theme === "light" ? "#000000ff" : "#FFFFFF" },
            links: {
                color: theme === "light" ? "#000000ff" : "#FFFFFF",
                distance: 150,
                enable: true,
                opacity: 0.3,
                width: 1,
                frequency: 0.8,
                triangles: {
                    enable: true,
                    opacity: 0.05
                },
                
            },
            move: {
                enable: true,
                speed: 1.6, 
                direction: "none",
                random: false,
                straight: false,
                outModes: { default: "out" },
            },
            number: {
                density: { enable: true, area: 800 },
                value: 100, // Keep it clean, don't overcrowd
            },
            opacity: { value: 0.3 },
            shape: { type: "circle" },
            size: { value: { min: 1, max: 3 } },
        },
    };

    if (init) {
        return <Particles id="tsparticles" options={options} />;
    }

    return null;
};

export default LiveBackground;

