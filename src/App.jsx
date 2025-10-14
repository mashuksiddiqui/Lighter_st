import React, { useState } from "react";
import AccountCard from "./components/AccountCard";

export default function App() {
  const [textareaValue, setTextareaValue] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [refresh, setRefresh] = useState(0);

  const handleShow = (e) => {
    e.preventDefault();
    const inputAddresses = textareaValue
      .split("\n")
      .map((a) => a.trim())
      .filter((a) => /^0x[a-fA-F0-9]{40}$/.test(a)); // only valid EVM addresses
    setAddresses(inputAddresses);
    setRefresh((prev) => prev + 1); // ✅ trigger refresh
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-start justify-center">
      <div className="w-full max-w-5xl bg-slate-900 rounded-2xl p-6 shadow-lg">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-emerald-400">Lighter Stats</span>
          </h1>
          <a
            href="https://x.com/mashybrid"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1200 1227"
              className="w-5 h-5"
              fill="currentColor"
            >
              <path d="M714 519l453-519h-107L661 460 440 0H0l477 882L0 1227h107l420-481 238 481h440L714 519zm-157 180l-49-90L175 80h184l157 295 49 90 338 636H719L557 699z" />
            </svg>
            <span className="font-semibold">Mass / Mashybrid</span>
          </a>
        </header>

        {/* Address input */}
        <form onSubmit={handleShow} className="space-y-4">
          <textarea
            value={textareaValue}
            onChange={(e) => setTextareaValue(e.target.value)}
            placeholder="Enter one or more EVM addresses (0x...) — one per line"
            className="w-full h-32 border border-slate-700 bg-slate-800 rounded-md p-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold rounded-md shadow disabled:opacity-50 transition"
            >
              Show
            </button>
          </div>
        </form>

        {/* Display results */}
        {addresses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {addresses.map((addr) => (
              <AccountCard key={addr} address={addr} refresh={refresh} /> // ✅ now passes refresh
            ))}
          </div>
        ) : (
          <div className="text-slate-400 mt-8 text-center">
            Enter one or more addresses above, then click{" "}
            <span className="text-emerald-400">Show</span> to fetch stats.
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 text-xs text-slate-500 text-center">
          © 2025 <span className="text-emerald-400 font-semibold">Mass / Mashybrid</span>. Powered by Lighter API.
        </footer>
      </div>
    </div>
  );
}
