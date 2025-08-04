// app/ContestClientComponent.tsx

'use client'; // This directive marks the component as a Client Component

import React, { useState, useMemo, useEffect } from 'react';

// --- Type Definitions ---
interface Contest {
  id: number;
  event: string;
  host: string;
  href: string;
  start: string; // ISO 8601 date string
  duration: number; // in seconds
}

// --- Helper Functions ---
const formatDuration = (seconds: number): string => {
  if (seconds <= 0) return "bhenchod";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  let result = '';
  if (hours > 0) result += `${hours} hour${hours > 1 ? 's' : ''} `;
  if (minutes > 0) result += `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return result.trim() || "Less than a minute";
};

const formatStartTime = (utcDateString: string): string => {
  const date = new Date(utcDateString);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// --- Child Components with Typed Props ---

const CountdownTimer = ({ startTime }: { startTime: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(startTime).getTime() - new Date().getTime();
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        
        let timerString = '';
        if (days > 0) timerString += `${days}d `;
        if (hours > 0 || days > 0) timerString += `${hours}h `;
        timerString += `${minutes}m ${seconds}s`;
        
        setTimeLeft(timerString);
      } else {
        setTimeLeft('Started!');
      }
    };

    // Set the initial value
    calculateTimeLeft();

    // Update the value every second
    const timer = setInterval(calculateTimeLeft, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(timer);
  }, [startTime]);

  return <span className="text-sm font-semibold text-indigo-600">{timeLeft}</span>;
};

const ContestCard = ({ contest }: { contest: Contest }) => {
    // --- HYDRATION FIX ---
    // This state ensures that time-sensitive info is only rendered on the client
    const [hasMounted, setHasMounted] = useState(false);
    useEffect(() => {
        setHasMounted(true);
    }, []);
    // --- END FIX ---

    const platformLogos: { [key: string]: string } = {
        'codeforces.com': 'https://sta.codeforces.com/s/94338/images/codeforces-logo-with-text.png',
        'leetcode.com': 'https://leetcode.com/static/images/LeetCode_logo_rvs.png',
        'atcoder.jp': 'https://img.atcoder.jp/assets/atcoder.png',
        'topcoder.com': 'https://images.ctfassets.net/b5f1djy59z3a/4Fk4Ie7L62lhw52mKnA007/a9582587597c366432a233b62f5f9999/Topcoder_Logo_2021.svg',
        'codingninjas.com/codestudio': 'https://files.codingninjas.in/cn-logo-dark-9826.svg',
        'hackerearth.com': 'https://static-fastly.hackerearth.com/static/he-logo-new.svg',
        'geeksforgeeks.org': 'https://media.geeksforgeeks.org/wp-content/cdn-uploads/20210420155809/gfg-new-logo.png',
        'codechef.com': 'https://cdn.codechef.com/images/cc-logo.svg',
      };
    
      const logoUrl = platformLogos[contest.host] || `https://placehold.co/100x40/f0f0f0/333?text=${contest.host.split('.')[0]}`;

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out overflow-hidden flex flex-col">
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-4">
          <img 
            src={logoUrl} 
            alt={`${contest.host} logo`} 
            className="h-8 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src=`https://placehold.co/100x40/f0f0f0/333?text=${contest.host.split('.')[0]}`; }}
          />
          {/* --- HYDRATION FIX --- */}
          {/* Conditionally render the countdown timer only on the client */}
          {hasMounted ? <CountdownTimer startTime={contest.start} /> : <span className="text-sm font-semibold text-indigo-600">Loading...</span>}
          {/* --- END FIX --- */}
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2 leading-tight">{contest.event}</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Starts:</strong> 
            {/* --- HYDRATION FIX --- */}
            {/* Conditionally render the formatted time only on the client */}
            {hasMounted ? formatStartTime(contest.start) : '...'}
            {/* --- END FIX --- */}
          </p>
          <p><strong>Duration:</strong> {formatDuration(contest.duration)}</p>
        </div>
      </div>
      <div className="bg-gray-50 p-4">
        <a
          href={contest.href}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full block text-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
        >
          Go to Contest
        </a>
      </div>
    </div>
  );
};

// --- Main Client Component ---
interface ContestClientComponentProps {
  initialContests: Contest[];
}

export default function ContestClientComponent({ initialContests }: ContestClientComponentProps) {
  const [contests] = useState<Contest[]>(initialContests);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const allPlatforms = useMemo(() => {
    const platforms = new Set(contests.map(c => c.host));
    return Array.from(platforms).sort();
  }, [contests]);

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const filteredContests = useMemo(() => {
    if (selectedPlatforms.length === 0) {
      return contests;
    }
    return contests.filter(c => selectedPlatforms.includes(c.host));
  }, [contests, selectedPlatforms]);

  return (
    <>
      <div className="bg-white p-4 rounded-lg shadow-md mb-8">
        <h3 className="font-bold text-gray-700 mb-3">Filter by Platform:</h3>
        <div className="flex flex-wrap gap-2">
          {allPlatforms.map(platform => (
            <button
              key={platform}
              onClick={() => handlePlatformToggle(platform)}
              className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors duration-200 ${
                selectedPlatforms.includes(platform)
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {platform}
            </button>
          ))}
          {selectedPlatforms.length > 0 && (
            <button
              onClick={() => setSelectedPlatforms([])}
              className="px-3 py-1 text-sm font-semibold rounded-full transition-colors duration-200 bg-red-500 text-white hover:bg-red-600"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredContests.length > 0 ? (
          filteredContests.map(contest => <ContestCard key={contest.id} contest={contest} />)
        ) : (
          <p className="col-span-full text-center text-xl font-semibold text-gray-700">No upcoming contests found for the selected platforms.</p>
        )}
      </div>
    </>
  );
}
