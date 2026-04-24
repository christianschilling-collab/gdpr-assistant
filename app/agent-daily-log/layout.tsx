import { AgentDailyLogSubnav } from '@/components/agent-daily-log/AgentDailyLogSubnav';

export default function AgentDailyLogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[50vh] bg-gray-50/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <AgentDailyLogSubnav />
      </div>
      {children}
    </div>
  );
}
