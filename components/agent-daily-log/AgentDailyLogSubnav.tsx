'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AgentDailyLogSubnav() {
  const pathname = usePathname();
  const onCalendar = pathname === '/agent-daily-log/team-calendar';

  const linkCls = 'hover:underline text-emerald-800';
  const sep = <span className="text-gray-400 mx-2">/</span>;

  return (
    <nav
      className="text-sm text-emerald-800 font-medium flex flex-wrap items-center gap-x-0"
      aria-label="Breadcrumb"
    >
      <Link href="/board" className={linkCls}>
        Board
      </Link>
      {sep}
      <Link href="/agent-daily-log" className={linkCls}>
        Agent daily log
      </Link>
      {sep}
      {onCalendar ? (
        <span className="text-gray-900 font-semibold">Team calendar</span>
      ) : (
        <Link href="/agent-daily-log/team-calendar" className={linkCls}>
          Team calendar
        </Link>
      )}
    </nav>
  );
}
