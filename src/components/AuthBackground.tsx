import { useEffect, useState } from 'react';

interface FloatingPaper {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
}

export default function AuthBackground() {
  const [papers, setPapers] = useState<FloatingPaper[]>([]);

  useEffect(() => {
    const generatePapers = () => {
      const newPapers: FloatingPaper[] = [];
      for (let i = 0; i < 15; i++) {
        newPapers.push({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 20,
          duration: 15 + Math.random() * 20,
          size: 30 + Math.random() * 40,
          rotation: Math.random() * 360,
        });
      }
      setPapers(newPapers);
    };
    generatePapers();
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Dark blue gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,50%,15%)] via-[hsl(220,50%,12%)] to-[hsl(220,50%,8%)]" />
      
      {/* Subtle animated gradient overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,60%,20%)] via-transparent to-transparent animate-pulse" 
             style={{ animationDuration: '8s' }} />
      </div>

      {/* Floating paper sheets */}
      {papers.map((paper) => (
        <div
          key={paper.id}
          className="absolute opacity-[0.06] animate-float-paper"
          style={{
            left: `${paper.left}%`,
            animationDelay: `${paper.delay}s`,
            animationDuration: `${paper.duration}s`,
          }}
        >
          <svg
            width={paper.size}
            height={paper.size * 1.4}
            viewBox="0 0 40 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ transform: `rotate(${paper.rotation}deg)` }}
          >
            {/* Paper sheet with folded corner */}
            <path
              d="M0 4C0 1.79086 1.79086 0 4 0H28L40 12V52C40 54.2091 38.2091 56 36 56H4C1.79086 56 0 54.2091 0 52V4Z"
              fill="hsl(210, 40%, 98%)"
            />
            <path
              d="M28 0L40 12H32C29.7909 12 28 10.2091 28 8V0Z"
              fill="hsl(210, 30%, 85%)"
            />
            {/* Text lines */}
            <rect x="6" y="18" width="28" height="2" rx="1" fill="hsl(220, 30%, 75%)" />
            <rect x="6" y="24" width="24" height="2" rx="1" fill="hsl(220, 30%, 75%)" />
            <rect x="6" y="30" width="26" height="2" rx="1" fill="hsl(220, 30%, 75%)" />
            <rect x="6" y="36" width="20" height="2" rx="1" fill="hsl(220, 30%, 75%)" />
            <rect x="6" y="42" width="22" height="2" rx="1" fill="hsl(220, 30%, 75%)" />
          </svg>
        </div>
      ))}

      {/* Soft vignette effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(220,50%,8%)_100%)] opacity-40" />
    </div>
  );
}
