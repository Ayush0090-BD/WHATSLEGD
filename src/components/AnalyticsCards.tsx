import React from "react";
import { Users, Briefcase, IndianRupee, Landmark } from "lucide-react";
import { DashboardAnalytics } from "../types";

interface Props {
  analytics: DashboardAnalytics;
}

export default function AnalyticsCards({ analytics }: Props) {
  const cards = [
    {
      id: "total_customers",
      title: "Total Customers",
      value: analytics.total_customers,
      icon: Users,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      description: "Unique active customers logged"
    },
    {
      id: "total_jobs",
      title: "Active Services",
      value: analytics.total_jobs,
      icon: Briefcase,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      description: "Total jobs tracked on WhatsApp"
    },
    {
      id: "payments_collected",
      title: "Payments Collected",
      value: `₹${analytics.payments_collected.toLocaleString("en-IN")}`,
      icon: Landmark,
      color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
      description: "Successful cash & bank receipts"
    },
    {
      id: "outstanding_dues",
      title: "Outstanding Dues",
      value: `₹${analytics.outstanding_dues.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      description: "Receivables requiring follow-up"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            id={`analytics-card-${card.id}`}
            className="p-5 rounded-lg border border-brand-border bg-brand-surface hover:border-zinc-700 transition duration-200 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-400 tracking-wider uppercase font-mono">
                {card.title}
              </span>
              <div className={`p-2 rounded-md border ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold tracking-tight text-white font-mono">
                {card.value}
              </span>
            </div>
            
            <p className="mt-1 text-xs text-zinc-400">
              {card.description}
            </p>

            {/* Aesthetic trend indicator or backdrop light */}
            <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-tr from-zinc-800/20 to-transparent rounded-full blur-xl pointer-events-none" />
          </div>
        );
      })}
    </div>
  );
}
