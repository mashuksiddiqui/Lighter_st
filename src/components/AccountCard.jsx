import React, { useEffect, useState } from "react";

export default function AccountCard({ address }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marketMap, setMarketMap] = useState({});

  // fallback symbols
  const FALLBACK_MARKET_SYMBOLS = {
    0: "ETH", 1: "BTC", 2: "SOL", 3: "DOGE", 4: "1000PEPE", 7: "XRP",
    9: "AVAX", 10: "NEAR", 13: "TAO", 15: "TRUMP", 16: "SUI", 18: "1000BONK",
    25: "BNB", 29: "ENA", 31: "APT", 37: "PENDLE", 45: "PUMP", 50: "ARB",
    56: "ZK", 64: "ETHFI", 67: "TIA", 76: "LINEA", 83: "ASTER",
  };

  // ✅ Fetch live markets for mapping
  useEffect(() => {
    async function fetchMarkets() {
      try {
        const res = await fetch("https://mainnet.zklighter.elliot.ai/api/v1/markets");
        if (!res.ok) throw new Error("Failed to load markets");
        const json = await res.json();
        const map = {};
        if (Array.isArray(json.markets)) {
          json.markets.forEach((m) => {
            if (m.market_id !== undefined && m.symbol) map[m.market_id] = m.symbol;
          });
        }
        setMarketMap(map);
      } catch {
        console.warn("⚠️ Market fetch failed — using fallback map");
        setMarketMap(FALLBACK_MARKET_SYMBOLS);
      }
    }
    fetchMarkets();
  }, []);

  // ✅ Fetch account data + balances
  useEffect(() => {
    if (!address) return;

    async function fetchAccount() {
      try {
        setLoading(true);
        setError(null);

        // 1️⃣ Explorer API for positions & logs
        const explorerRes = await fetch(`https://explorer.elliot.ai/api/search?q=${address}`);
        if (!explorerRes.ok) throw new Error(`Explorer API error: ${explorerRes.status}`);
        const explorerJson = await explorerRes.json();
        const account = explorerJson.find((a) => a.type === "account");
        if (!account) throw new Error("No account data found");

        const positions = Object.values(account.account_positions?.positions || {});
        positions.forEach((p) => {
          p.symbol = marketMap[p.market_index] || FALLBACK_MARKET_SYMBOLS[p.market_index] || `#${p.market_index}`;
        });

        // 2️⃣ Mainnet API for balance info
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
        } catch (err) {
          console.warn("⚠️ Balance fetch failed:", err);
        }

        // 3️⃣ Compute balances and PnL
        let totalBalance = totalAssetValue ?? availableBalance;
        let totalPnL = 0;
        positions.forEach((p) => {
          const pnlVal = parseFloat(p.unrealized_pnl ?? p.pnl ?? 0);
          totalPnL += isNaN(pnlVal) ? 0 : pnlVal;
        });

        // 4️⃣ Recent trades
        const logs = account.account_logs || [];
        const executedTrades = logs
          .filter((log) => log.status === "executed" && log.pubdata?.trade_pubdata_with_funding)
          .slice(-2)
          .reverse();

        const trades = executedTrades.map((t) => {
          const trade = t.pubdata.trade_pubdata_with_funding;
          const symbol = marketMap[trade.market_index] || FALLBACK_MARKET_SYMBOLS[trade.market_index] || `#${trade.market_index}`;
          return {
            symbol,
            entry: parseFloat(trade.price || 0),
            size: Math.abs(parseFloat(trade.size || 0)),
            side: trade.is_taker_ask ? "SHORT" : "LONG",
          };
        });

        let recentTradePnL = null;
        if (trades.length === 2) {
          const [entryTrade, closeTrade] = trades;
          const pnl =
            closeTrade.side === "LONG"
              ? (closeTrade.entry - entryTrade.entry) * closeTrade.size
              : (entryTrade.entry - closeTrade.entry) * closeTrade.size;
          recentTradePnL = {
            symbol: closeTrade.symbol,
            entry: entryTrade.entry,
            close: closeTrade.entry,
            pnl,
          };
        }

        setData({
          positions,
          recentTradePnL,
          availableBalance,
          totalBalance,
          totalPnL,
        });
      } catch (err) {
        console.error("❌ Error fetching account:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAccount();
  }, [address, marketMap]);

  if (loading)
    return <div className="text-gray-400 text-sm text-center py-2">Loading data for {address}...</div>;
  if (error)
    return <div className="text-red-400 text-sm text-center py-2">{error}</div>;

  const { positions, recentTradePnL, availableBalance, totalBalance, totalPnL } = data;
  const balanceColor = totalPnL > 0 ? "text-green-400" : totalPnL < 0 ? "text-red-400" : "text-slate-200";

  return (
    <div className="bg-slate-900 rounded-2xl p-6 shadow-lg text-white">
      {/* Wallet Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold break-all text-emerald-400">{address}</h2>
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
                <th className="p-2 text-right">PnL ($ / %)</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => {
                let side = p.side;
                if (!side && p.sign !== undefined)
                  side = parseInt(p.sign, 10) > 0 ? "LONG" : parseInt(p.sign, 10) < 0 ? "SHORT" : undefined;
                side = side?.toUpperCase();

                const pnl = parseFloat(p.unrealized_pnl ?? p.pnl ?? 0) || 0;
                const value = parseFloat(p.position_value || 0) || 0;
                const pnlPercent = value > 0 ? (pnl / value) * 100 : 0;

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
                    <td className="p-2 text-right">
                      {Math.abs(parseFloat(p.position || p.size || 0)).toFixed(4)}
                    </td>
                    <td className="p-2 text-right">
                      ${parseFloat(p.avg_entry_price || p.entry_price || 0).toFixed(2)}
                    </td>
                    <td
                      className={`p-2 text-right ${
                        pnl >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      ${pnl.toFixed(3)} ({pnlPercent.toFixed(2)}%)
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

      {/* Recent Trades */}
      {recentTradePnL && (
        <section className="mt-6">
          <h3 className="text-md font-semibold mb-2 text-slate-200">Recent Trade Summary</h3>
          <div className="bg-slate-800 rounded-lg p-4 text-sm">
            <p>
              Token:{" "}
              <span className="text-slate-100 font-semibold">{recentTradePnL.symbol}</span>
            </p>
            <p>
              Entry Price:{" "}
              <span className="text-slate-100">${recentTradePnL.entry.toFixed(2)}</span>
            </p>
            <p>
              Close Price:{" "}
              <span className="text-slate-100">${recentTradePnL.close.toFixed(2)}</span>
            </p>
            <p
              className={`font-semibold ${
                recentTradePnL.pnl >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              PnL: ${recentTradePnL.pnl.toFixed(3)}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
