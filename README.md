Contest Aggregator - A Next.js Dashboard!


A sleek, fast, and responsive web application built with Next.js that fetches and displays upcoming programming contests from dozens of platforms. This project serves as a one-stop dashboard for competitive programmers to keep track of all important events in one place.

The application leverages the power of Next.js Server Components for fast initial page loads and a dynamic, interactive client-side experience for filtering and real-time countdowns.

✨ Key Features
Comprehensive Contest Data: Fetches data from dozens of platforms including Codeforces, LeetCode, AtCoder, HackerEarth, and more, powered by the CLIST.by API.

Server-Side Rendering (SSR): Built with the Next.js App Router. The initial contest list is rendered on the server for optimal performance and SEO.

Dynamic Filtering: Instantly filter the contest list by platform with a clean, user-friendly interface.

Real-Time Countdowns: Every contest card features a live countdown timer that shows exactly when the event starts.

Responsive Design: A modern UI built with Tailwind CSS that looks great on all devices, from mobile phones to desktop monitors.

Automatic Time Zone Conversion: Contest start times are automatically displayed in the user's local time zone.

🚀 Tech Stack
Framework: Next.js 14+ (App Router)

Language: TypeScript

UI Library: React

Styling: Tailwind CSS

Bundler: Turbopack (for development)

Linting: ESLint

Data Source: CLIST.by API

🛠️ Getting Started
Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

Prerequisites
Node.js (v18.17 or later)

npm or yarn

Installation & Setup
Clone the repository:

git clone https://github.com/your-username/contest-aggregator-nextjs.git
cd contest-aggregator-nextjs

Install dependencies:

npm install

Set up environment variables:

Create a file named .env.local in the root of your project.

Get a free API key from clist.by.

Add your API key to the .env.local file:

NEXT_PUBLIC_CLIST_API_KEY=your_username:your_api_key

Run the development server:
This project is configured to use Turbopack for a faster development experience.

npm run dev -- --turbo

Open the application:
Open http://localhost:3000 in your browser to see the result.

🧠 Project Highlights & Learnings
This project is a practical demonstration of several modern web development concepts:

Next.js App Router: Structuring the application using the latest app directory paradigm, separating server and client logic.

Server Components: Using Server Components for efficient data fetching and rendering, reducing the amount of JavaScript sent to the client.

Client Components: Using the 'use client' directive for interactive components that require state and browser-side effects (e.g., filtering, countdowns).

Hydration: Understanding and fixing common hydration errors by ensuring that server-rendered and client-rendered content matches, particularly for time-sensitive information.

API Integration: Fetching data from a third-party REST API on the server side.

TypeScript Integration: Leveraging TypeScript for type safety in props, state, and API response handling.
