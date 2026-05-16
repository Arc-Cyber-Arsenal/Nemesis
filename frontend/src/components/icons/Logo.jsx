/**
 * Custom Logo - Exegol + AI fusion
 */
const Logo = ({ className = "w-8 h-8" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shield base (Exegol security) */}
      <path
        d="M50 10 L80 25 L80 50 C80 70 65 85 50 90 C35 85 20 70 20 50 L20 25 Z"
        fill="currentColor"
        opacity="0.1"
      />
      <path
        d="M50 10 L80 25 L80 50 C80 70 65 85 50 90 C35 85 20 70 20 50 L20 25 Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      
      {/* AI Neural network nodes */}
      <circle cx="50" cy="45" r="4" fill="currentColor" />
      <circle cx="35" cy="35" r="3" fill="currentColor" opacity="0.7" />
      <circle cx="65" cy="35" r="3" fill="currentColor" opacity="0.7" />
      <circle cx="35" cy="55" r="3" fill="currentColor" opacity="0.7" />
      <circle cx="65" cy="55" r="3" fill="currentColor" opacity="0.7" />
      
      {/* Neural connections */}
      <line x1="50" y1="45" x2="35" y2="35" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <line x1="50" y1="45" x2="65" y2="35" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <line x1="50" y1="45" x2="35" y2="55" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <line x1="50" y1="45" x2="65" y2="55" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      
      {/* Terminal cursor accent */}
      <rect x="45" y="60" width="10" height="2" fill="currentColor" rx="1">
        <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
};

export default Logo;

