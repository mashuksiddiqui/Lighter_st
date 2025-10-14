import React, { useEffect, useState } from "react";

export default function AccountCard({ address }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!address) return;

    async function fetchAccount() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`https://explorer.elliot.ai/api/search?q=${address}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const json = await res.json();
        if (!Array.isArray(json) || json.length === 0)
          throw new Error("No data found for this address");

        const account = json.find((a) => a.type === "account");
        if (!account) throw new Error("No account object found");

        const positions = Object.values(account.account_positions?.positions || {});

        const symbolMap = {};
        positions.forEach((p) => {
          if (p.market_index !== undefined && p.symbol) {
            symbolMap[p.market_index] = p.symbol;
          }
        });

        const availableBalance = parseFloat(account.account_positions?.available_balance || 0);

        let positionValueTotal = 0;
        positions.forEach((p) => {
          const posVal = parseFloat(p.position_value || 0);
          const marginFrac = parseFloat(p.initial_margin_fraction || 0);
          if (marginFrac > 0) {
            const leverage = 100 / marginFrac;
            positionValueTotal += posVal / leverage;
          }
        });

        const totalBalance = availableBalance + positionValueTotal;

        const logs = account.account_logs || [];
        const executedTrades = logs
          .filter(
            (log) =>
              log.status === "executed" &&
              log.pubdata?.trade_pubdata_with_funding
          )
          .slice(-2)
          .reverse();

        const trades = executedTrades.map((t) => {
          const trade = t.pubdata.trade_pubdata_with_funding;
          const marketIndex = trade.market_index;
          const symbol = symbolMap[marketIndex] || `#${marketIndex}`;
          return {
            symbol,
            entry: parseFloat(trade.price || 0),
            size: Math.abs(parseFloat(trade.size || 0)),
            side: trade.is_taker_ask ? "SHORT" : "LONG",
            time: t.time,
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

        setData({ positions, recentTradePnL, availableBalance, totalBalance });
      } catch (err) {
        console.error("Error fetching account:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAccount();
  }, [address]);

  if (loading)
    return (
      <div className="text-gray-400 text-sm text-center py-2">
        Loading data for {address}...
      </div>
    );

  if (error)
    return (
      <div className="text-red-400 text-sm text-center py-2">
        {error}
      </div>
    );

  const { positions, recentTradePnL, availableBalance, totalBalance } = data;

  return (
    <div className="bg-slate-900 rounded-2xl p-6 shadow-lg text-white">
      {/* Wallet header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold break-all text-emerald-400">
          {address}
        </h2>
        <div className="text-right text-sm">
          <p className="text-slate-400">Tradeable Balance:</p>
          <p className="font-semibold">${availableBalance.toFixed(3)}</p>
          <p className="text-slate-400 mt-1">Total Balance:</p>
          <p className="font-semibold text-emerald-400">${totalBalance.toFixed(3)}</p>
        </div>
      </div>

      {/* Open Positions */}
      <section>
        <h3 className="text-md font-semibold mb-2 text-slate-200">
          Open Positions
        </h3>
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
                const side = p.side?.toUpperCase() || "—";
                const pnl = parseFloat(p.pnl || 0);
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
                      {p.symbol || `#${p.market_index}`}
                    </td>
                    <td className="p-2 text-right">
                      {Math.abs(parseFloat(p.size || 0)).toFixed(4)}
                    </td>
                    <td className="p-2 text-right">
                      ${parseFloat(p.entry_price || 0).toFixed(2)}
                    </td>
                    <td
                      className={`p-2 text-right ${
                        pnl >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      ${pnl.toFixed(3)}
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

      {/* Recent Trade Summary */}
      {recentTradePnL && (
        <section className="mt-6">
          <h3 className="text-md font-semibold mb-2 text-slate-200">
            Recent Trade Summary
          </h3>
          <div className="bg-slate-800 rounded-lg p-4 text-sm">
            <p>
              Token:{" "}
              <span className="text-slate-100 font-semibold">
                {recentTradePnL.symbol}
              </span>
            </p>
            <p>
              Entry Price:{" "}
              <span className="text-slate-100">
                ${recentTradePnL.entry.toFixed(2)}
              </span>
            </p>
            <p>
              Close Price:{" "}
              <span className="text-slate-100">
                ${recentTradePnL.close.toFixed(2)}
              </span>
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
