"use client";

export function BlueFire() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] dark:opacity-100 opacity-0 transition-opacity duration-1000">
      {/* Blue fire gradient background */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 via-blue-800/10 to-transparent" />
      
      {/* Animated blue fire particles */}
      <div className="absolute inset-0">
        {/* Large flame particles */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`flame-${i}`}
            className="absolute rounded-full bg-gradient-radial from-blue-400/30 via-blue-500/20 to-transparent animate-float-up"
            style={{
              left: `${10 + (i * 12)}%`,
              bottom: '-5%',
              width: `${40 + Math.random() * 30}px`,
              height: `${60 + Math.random() * 40}px`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${6 + Math.random() * 3}s`,
            }}
          />
        ))}
        
        {/* Medium flame particles */}
        {[...Array(12)].map((_, i) => (
          <div
            key={`mid-flame-${i}`}
            className="absolute rounded-full bg-gradient-radial from-cyan-400/25 via-blue-400/15 to-transparent animate-float-up"
            style={{
              left: `${5 + (i * 8)}%`,
              bottom: '-3%',
              width: `${25 + Math.random() * 20}px`,
              height: `${35 + Math.random() * 25}px`,
              animationDelay: `${i * 0.6}s`,
              animationDuration: `${4 + Math.random() * 2}s`,
            }}
          />
        ))}
        
        {/* Small sparkle particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={`spark-${i}`}
            className="absolute rounded-full bg-gradient-radial from-blue-300/40 via-cyan-200/20 to-transparent animate-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: `${Math.random() * 50}%`,
              width: `${3 + Math.random() * 8}px`,
              height: `${3 + Math.random() * 8}px`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>
      
      {/* Blue glow overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-500/10 to-transparent" />
      
      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-50vh) scale(1.2);
            opacity: 0.4;
          }
          100% {
            transform: translateY(-100vh) scale(0.8);
            opacity: 0;
          }
        }
        
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
        
        .animate-float-up {
          animation: float-up linear infinite;
        }
        
        .animate-sparkle {
          animation: sparkle ease-in-out infinite;
        }
        
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}