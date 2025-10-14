import React, { useEffect, useState } from "react";

export default function AccountCard({ address, refresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marketMap, setMarketMap] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  const FALLBACK_MARKET_SYMBOLS = {
    0: "ETH", 1: "BTC", 2: "SOL", 3: "DOGE", 4: "1000PEPE", 7: "XRP",
    9: "AVAX", 10: "NEAR", 13: "TAO", 15: "TRUMP", 16: "SUI", 18: "1000BONK",
    25: "BNB", 29: "ENA", 31: "APT", 37: "PENDLE", 45: "PUMP", 50: "ARB",
    56: "ZK", 64: "ETHFI", 67: "TIA", 76: "LINEA", 83: "ASTER",
  };

  // ✅ Fetch live market map
  useEffect(() => {
    async function fetchMarkets() {
      try {
        const res = await fetch("https://mainnet.zklighter.elliot.ai/api/v1/markets");
        if (!res.ok) throw new Error("Failed to load markets");
        const json = await res.json();
        const map = {};
        if (Array.isArray(json.markets)) {
          json.markets.forEach((m) => (map[m.market_id] = m.symbol));
        }
        setMarketMap(map);
      } catch {
        setMarketMap(FALLBACK_MARKET_SYMBOLS);
      }
    }
    fetchMarkets();
  }, []);

  // ✅ Fetch account data on address OR refresh change
  useEffect(() => {
    if (!address) return;

    async function fetchAccount() {
      try {
        setLoading(true);
        setError(null);

        // Step 1: Fetch account info
        const explorerRes = await fetch(`https://explorer.elliot.ai/api/search?q=${address}`);
        if (!explorerRes.ok) throw new Error(`Explorer API error: ${explorerRes.status}`);
        const explorerJson = await explorerRes.json();
        const account = explorerJson.find((a) => a.type === "account");
        if (!account) throw new Error("No account data found");

        const positions = Object.values(account.account_positions?.positions || {});
        positions.forEach((p) => {
          p.symbol =
            marketMap[p.market_index] || FALLBACK_MARKET_SYMBOLS[p.market_index] || `#${p.market_index}`;
        });

        // Step 2: Fetch balance info
        let availableBalance = 0;
        let totalAssetValue = null;
        try {
          const mainnetRes = await fetch(
            `https://mainnet.zklighter.elliot.ai/api/v1/account?by=l1_address&value=${address}`
          );
          if (mainnetRes.ok) {
            const mainnetJson = await mainnetRes.json();
            const acc = mainnetJson.account || (Array.isArray(mainnetJson.accounts) && mainnetJson.accounts[0]);
            if (acc) {
              availableBalance = parseFloat(acc.available_balance || 0);
              if (acc.total_asset_value) totalAssetValue = parseFloat(acc.total_asset_value);
              else if (acc.cross_asset_value) totalAssetValue = parseFloat(acc.cross_asset_value);
            }
          }
        } catch {}

        // Step 3: Calculate balances and PnL
        let totalBalance = totalAssetValue ?? availableBalance;
        let totalPnL = 0;
        positions.forEach((p) => {
          const pnlVal = parseFloat(p.unrealized_pnl ?? p.pnl ?? 0);
          totalPnL += isNaN(pnlVal) ? 0 : pnlVal;
        });

        // ✅ Update data
        setData({ positions, availableBalance, totalBalance, totalPnL });
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAccount();
  }, [address, marketMap, refresh]); // 👈 refresh added here

  if (loading)
    return (
      <div className="text-gray-400 text-sm text-center py-2">
        Loading data for {address}...
      </div>
    );
  if (error)
    return <div className="text-red-400 text-sm text-center py-2">{error}</div>;

  const { positions, availableBalance, totalBalance, totalPnL } = data;
  const balanceColor =
    totalPnL > 0 ? "text-green-400" : totalPnL < 0 ? "text-red-400" : "text-slate-200";

  return (
    <div className="bg-slate-900 rounded-2xl p-6 shadow-lg text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-medium break-all text-emerald-400">{address}</h2>
        <div className="text-right text-sm">
          <p className="text-slate-400">Tradeable Balance:</p>
          <p className="font-semibold">${(availableBalance || 0).toFixed(3)}</p>
          <p className="text-slate-400 mt-1">Total Balance:</p>
          <p className={`font-semibold ${balanceColor}`}>${(totalBalance || 0).toFixed(3)}</p>
        </div>
      </div>

      {/* Open Positions */}
      <section>
        <h3 className="text-md font-semibold mb-2 text-slate-200">Open Positions</h3>
        {positions.length > 0 ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800">
                <th className="p-2 text-left">Token</th>
                <th className="p-2 text-right">Size</th>
                <th className="p-2 text-right">Entry</th>
                <th className="p-2 text-right">PnL</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => {
                let side = p.side;
                if (!side && p.sign !== undefined)
                  side =
                    parseInt(p.sign, 10) > 0
                      ? "LONG"
                      : parseInt(p.sign, 10) < 0
                      ? "SHORT"
                      : undefined;
                side = side?.toUpperCase();

                const pnl = parseFloat(p.unrealized_pnl ?? p.pnl ?? 0) || 0;
                const entry = parseFloat(p.avg_entry_price || p.entry_price || 0) || 0;
                const size = Math.abs(parseFloat(p.position || p.size || 0)) || 0;
                const pnlPercent = entry > 0 && size > 0 ? (pnl / (entry * size)) * 100 : 0;

                return (
                  <tr key={i} className="border-t border-slate-800">
                    <td
                      className={`p-2 font-semibold ${
                        side === "LONG"
                          ? "text-green-400"
                          : side === "SHORT"
                          ? "text-red-400"
                          : "text-slate-300"
                      }`}
                    >
                      {p.symbol}
                    </td>
                    <td className="p-2 text-right">{size.toFixed(4)}</td>
                    <td className="p-2 text-right">${entry.toFixed(2)}</td>
                    <td
                      className={`p-2 text-right ${
                        pnl >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      ${pnl.toFixed(3)}{" "}
                      <span className="text-slate-400">
                        ({pnlPercent.toFixed(2)}%)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-slate-400">No active positions.</p>
        )}
      </section>

      {/* Last Updated */}
      {lastUpdated && (
        <p className="text-xs text-slate-500 mt-3 text-right">
          Last updated: {lastUpdated}
        </p>
      )}
    </div>
  );
}
