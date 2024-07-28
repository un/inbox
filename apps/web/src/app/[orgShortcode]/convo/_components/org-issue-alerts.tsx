import {
  Alert,
  AlertTitle,
  AlertDescription
} from '@/src/components/shadcn-ui/alert';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { usePreferencesState } from '@/src/stores/preferences-store';
import { Badge } from '@/src/components/shadcn-ui/badge';
import { type RouterOutputs } from '@/src/lib/trpc';
import Link from 'next/link';

type Issues = RouterOutputs['org']['store']['getOrgIssues']['issues'];

export function OrgIssueAlerts({ issues }: { issues: Issues }) {
  return (
    <div className="flex flex-col gap-1 p-1">
      {issues.map((issue) => (
        <RenderAlert
          key={issue.id}
          issue={issue}
        />
      ))}
    </div>
  );
}

function RenderAlert({ issue }: { issue: Issues[number] }) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const [issueType, issuePublicId] = issue.id.split(':') as SplitIssue<
    typeof issue.id
  >;
  const [shouldIgnoreIssue, ignoreIssue] = usePreferencesState((state) => [
    state.shouldIgnoreIssue,
    state.ignoreIssue
  ]);

  if (shouldIgnoreIssue(issue.id)) return null;

  switch (issueType) {
    case 'domain_dns_issue':
      return (
        <Alert
          dismissible
          onDismiss={() => ignoreIssue(issue.id)}>
          <AlertTitle className="text-red-9 font-bold">
            DNS issue detected for your Org domain{' '}
            <Link
              href={`/${orgShortcode}/settings/org/mail/domains/${issuePublicId}`}
              className="underline">
              {issue.data.domain}
            </Link>
          </AlertTitle>
          <AlertDescription>
            <div className="text-red-9 font-semibold">{issue.errorMessage}</div>
            <div className="flex gap-1 py-1">
              <Badge variant="secondary">
                Send Mode:{' '}
                {issue.data.sendingMode === 'disabled' ? 'Disabled' : 'Enabled'}
              </Badge>
              <Badge variant="secondary">
                Receive Mode:{' '}
                {issue.data.receivingMode === 'disabled'
                  ? 'Disabled'
                  : 'Enabled'}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      );
    default:
      return null;
  }
}

type SplitIssue<T extends string> = T extends `${infer A}:${infer B}`
  ? [A, B]
  : never;
