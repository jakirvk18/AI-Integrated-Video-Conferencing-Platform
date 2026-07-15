import TallyDot from "../components/TallyDot";
import { TypeAnimation } from "react-type-animation";
export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gray-950 px-12 py-12 text-paper lg:flex">
        <div className="bg-noise absolute inset-0 opacity-60" />
        <div className="relative flex items-center gap-2">
          <img src="./logo.png" alt="LOGO" className="h-10 w-10" />
          <span className="font-display text-5xl font-semibold tracking-tight">Signal</span>
        </div>

        <div className="relative w-full min-h-[200px]">
          <p className="font-mono text-sm uppercase tracking-[0.3em] text-tally">
            <TallyDot size="md" />
            <span className="ml-3">On air</span>
          </p>
          
          <TypeAnimation
              sequence={[
                "Quick Meetings", 2200,
                "AI Integrated Monitoring", 2200,
                "Secure and Private", 2200,
                "High Quality Audio and Video", 2200,
              ]}
              wrapper="span"
              speed={55}
              deletionSpeed={72}
              repeat={Infinity}
              className="mt-2 font-sans font-extralight text-2xl tracking-wide sm:text-4xl"
            />
          <p className="text-sm text-white/60 mt-3">
              The Signal AI Powered Meeting Platform is a cutting-edge solution that leverages artificial intelligence to enhance the meeting experience.  
              It ensures that every meeting is productive and efficient.Whether you're hosting a small team meeting or a large conference.
          </p>
        </div>
        
  
  

        <div className="relative items-center gap-6 text-xs text-muted">
          
          <p>&copy; {new Date().getFullYear()} Signal. All rights reserved. Developed by <a href="https://github.com/jakirvk18" target="_blank" rel="noopener noreferrer">Jakir Hussain</a>.</p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-paper px-6 py-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
