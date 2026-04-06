"use client";

const recentTransactions = [
  { title: "Dinner", amount: "-$48.20", subtitle: "Paid by Leila · split 4 ways" },
  { title: "Taxi", amount: "-$18.40", subtitle: "Ali covered · you owe $9.20" },
  { title: "Groceries", amount: "-$32.90", subtitle: "Sana paid · settled" },
  { title: "Coffee", amount: "-$6.50", subtitle: "Shared with team · you paid" },
];

export default function MobileDesign() {
  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[0.95rem] text-slate-700">
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col px-5 pt-10 pb-8">
        <div className="text-center">
          <p className="text-xl font-semibold tracking-wide text-teal-600">SplitEase</p>
          <p className="mt-1 text-sm text-slate-500">Manage shared expenses بسهولة</p>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.5em] text-slate-400">Total Balance</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">$120.50</p>
          <div className="mt-5 flex items-center gap-4">
            {["AL", "RI", "SM", "NO", "LK"].map((user) => (
              <div
                key={user}
                className="h-10 w-10 rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700"
              >
                {user}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button className="flex-1 rounded-2xl border border-teal-200 bg-white py-3 text-sm font-semibold text-teal-600 shadow-[0_10px_30px_rgba(16,185,129,0.1)]">
            + Add Expense
          </button>
          <button className="flex-1 rounded-2xl bg-gradient-to-r from-teal-400 to-sky-500 py-3 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(14,165,233,0.25)]">
            Settle Up
          </button>
        </div>

        <div className="mt-6 flex-1 rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-slate-900">Recent Transactions</p>
            <span className="text-xs uppercase tracking-[0.4em] text-slate-400">Today</span>
          </div>
          <div className="mt-4 space-y-4">
            {recentTransactions.map((transaction) => (
              <div key={transaction.title} className="rounded-2xl border border-slate-100/90 bg-slate-50/60 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-lg text-slate-600">
                      💸
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{transaction.title}</p>
                      <p className="text-xs text-slate-400">{transaction.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{transaction.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-6 flex items-center justify-between rounded-3xl bg-white/70 px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.1)]">
          <div className="flex gap-6">
            <div className="flex flex-col items-start text-center text-xs text-slate-500">
              <span className="text-lg text-slate-900">🏠</span>
              Home
            </div>
            <div className="flex flex-col items-start text-center text-xs text-slate-500">
              <span className="text-lg text-slate-900">🔔</span>
              Activity
            </div>
          </div>
          <div className="absolute right-6 top-1/2 -translate-y-1/2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-sky-500 shadow-[0_20px_50px_rgba(14,165,233,0.35)]">
              <span className="text-3xl text-white">+</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
