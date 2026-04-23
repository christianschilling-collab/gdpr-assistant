import { redirect } from 'next/navigation';

/** Legacy URL; main dashboard lives at `/reporting`. */
export default function ReportingViewRedirectPage() {
  redirect('/reporting');
}
