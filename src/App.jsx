import React, { useState } from "react";
import AccountCard from "./components/AccountCard";

export default function App() {
  const [addresses, setAddresses] = useState("");
  const [submitted, setSubmitted] = useState([]);

  function handleSubmit(e) {
    e.preventDefault();
    const list = addresses
      .split("\n")
      .map((a) => a.trim())
      .filter((a) => a.startsWith("0x"));
    setSubmitted(list);
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Lighter Stats</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-xl mb-6">
        <textarea
          value={addresses}
          onChange={(e) => setAddresses(e.target.value)}
          placeholder="Enter one or more addresses (0x...) each on a new line"
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
          rows={4}
        />
        <button
          type="submit"
          className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
        >
          Show
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
        {submitted.map((addr, i) => (
          <AccountCard key={i} address={addr} />
        ))}
      </div>

      <footer className="mt-10 text-slate-600 text-sm">
        Built by{" "}
        <a
          href="https://x.com/mashybrid"
          target="_blank"
          className="text-emerald-400"
        >
          @mashybrid
        </a>
      </footer>
    </div>
  );
}
