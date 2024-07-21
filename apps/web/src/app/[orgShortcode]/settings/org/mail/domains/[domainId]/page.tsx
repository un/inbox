'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/src/components/shadcn-ui/accordion';
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@/src/components/shadcn-ui/alert';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { ArrowLeft, ArrowClockwise } from '@phosphor-icons/react';
import { Button } from '@/src/components/shadcn-ui/button';
import { CopyButton } from '@/src/components/copy-button';
import { Badge } from '@/src/components/shadcn-ui/badge';
import { useTimeAgo } from '@/src/hooks/use-time-ago';
import { type TypeId } from '@u22n/utils/typeid';
import { platform } from '@/src/lib/trpc';
import Link from 'next/link';

export default function Page({
  params
}: {
  params: { domainId: TypeId<'domains'> };
}) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);

  const {
    data: domainInfo,
    isLoading,
    refetch
  } = platform.org.mail.domains.getDomain.useQuery({
    orgShortcode,
    domainPublicId: params.domainId
  });

  const {
    data: domainDNSRecord,
    isLoading: dnsLoading,
    refetch: recheckDNS,
    error: dnsError,
    isRefetching: isRecheckingDNS
  } = platform.org.mail.domains.getDomainDns.useQuery({
    orgShortcode,
    domainPublicId: params.domainId
  });

  const lastChecked = useTimeAgo(domainDNSRecord?.checked ?? new Date());

  return (
    <div className="flex h-full w-full flex-col gap-2 overflow-y-auto p-4">
      <div className="flex w-full gap-4 py-2">
        <Button
          asChild
          size="icon"
          variant="outline">
          <Link href="./">
            <ArrowLeft className="size-6" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center">
          <h1 className="font-mono text-2xl leading-5">
            {isLoading ? 'Loading...' : domainInfo?.domainData?.domain}
          </h1>
        </div>
        {!isLoading && (
          <Badge className="uppercase">
            {domainInfo?.domainData?.domainStatus}
          </Badge>
        )}
      </div>
      {isLoading && <div>Loading...</div>}
      {domainInfo ? (
        <>
          <div className="text-base-11 font-bold uppercase">Status</div>
          <div className="flex flex-col gap-2 py-2">
            {domainInfo.domainData?.domainStatus !== 'active' ? (
              <>
                <span>
                  Your Domain is not yet active, please make sure you have
                  applied all DNS settings correctly.
                </span>
                <span>
                  Copy the DNS Records given below and apply them to your DNS
                  Provider, it may take up to 24 hours for the changes to take
                  effect.
                </span>
              </>
            ) : (
              <>
                <span>Your Domain is active.</span>
                <span>
                  You can{' '}
                  {domainInfo.domainData.sendingMode === 'native' && 'Send'}{' '}
                  {domainInfo.domainData.sendingMode === 'native' &&
                  domainInfo.domainData.receivingMode === 'native'
                    ? 'and'
                    : ''}{' '}
                  {domainInfo.domainData.receivingMode === 'native' &&
                    'Receive'}{' '}
                  using your domain.
                </span>
              </>
            )}

            {domainDNSRecord?.error && (
              <Alert>
                <AlertTitle className="font-bold">
                  We have detected an error with your DNS settings
                </AlertTitle>
                <AlertDescription className="text-red-10">
                  {domainDNSRecord.error}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <div className="text-base-11 font-bold uppercase">Mail</div>
          <div>
            <Accordion
              type="multiple"
              className="w-full">
              <AccordionItem value="incoming">
                <AccordionTrigger>
                  <div className="flex w-full justify-between px-2">
                    <span className="font-bold">Incoming</span>
                    <Badge className="uppercase">
                      {domainInfo.domainData?.receivingMode}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-3 p-2">
                    {domainInfo.domainData?.receivingMode === 'disabled' && (
                      <div>
                        Incoming mail is disabled for this domain. Please verify
                        the domain by adding a DNS record to start sending
                        messages.
                      </div>
                    )}
                    <div className="flex flex-row items-center justify-between">
                      <span className="font-semibold"> Native Mode </span>
                      <Badge className="uppercase">
                        {domainInfo.domainData?.receivingMode === 'native'
                          ? 'Enabled'
                          : 'Disabled'}
                      </Badge>
                    </div>
                    <span>
                      All your incoming email is sent directly to UnInbox.
                    </span>
                    <span>
                      You can still forward in emails using the address below
                    </span>

                    <div className="flex flex-col gap-2">
                      <div className="flex flex-row items-center justify-between">
                        <span className="font-semibold">Forwarding Mode</span>
                        <Badge className="uppercase">
                          {domainInfo.domainData?.receivingMode === 'forwarding'
                            ? 'Enabled'
                            : 'Disabled'}
                        </Badge>
                      </div>
                      <span>
                        You can forward emails from any external email system to
                        be processed in UnInbox.
                      </span>
                      <span>
                        A single forwarding address can be used for all your
                        domain&apos;s email accounts.
                      </span>
                      <div className="mt-[8px] flex flex-col gap-1">
                        <span className="text-base-11 overflow-hidden text-xs uppercase">
                          Forwarding Address
                        </span>
                        <div className="flex flex-row items-center gap-2">
                          <div className="bg-base-3 flex w-fit min-w-[50px] flex-col items-center rounded-lg p-4">
                            <span className="break-anywhere w-fit text-left font-mono text-sm">
                              {domainInfo?.domainData?.forwardingAddress}
                            </span>
                          </div>
                          <CopyButton
                            text={
                              domainInfo?.domainData?.forwardingAddress ?? ''
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="outgoing">
                <AccordionTrigger>
                  <div className="flex w-full justify-between px-2">
                    <span className="font-bold">Outgoing</span>
                    <Badge className="uppercase">
                      {domainInfo.domainData?.sendingMode}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex h-fit w-full flex-col justify-center gap-4 p-2">
                    <div className="flex flex-col justify-center gap-8">
                      {domainInfo.domainData?.sendingMode === 'disabled' && (
                        <div>
                          <span>
                            Outgoing mail is disabled for this domain. Please
                            add the SPF, DKIM and Return Path DNS records listed
                            below.
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-row items-center justify-between">
                          <span className="font-semibold"> Native Mode </span>
                          <Badge className="uppercase">
                            {domainInfo.domainData?.sendingMode === 'native'
                              ? 'Enabled'
                              : 'Disabled'}
                          </Badge>
                        </div>
                        <span>
                          Your outgoing mail can be sent directly by UnInbox.
                        </span>
                        <span>
                          Receivers will be able to verify that the message came
                          from an authorized sender.
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-row items-center justify-between">
                          <span className="font-semibold"> External Mode </span>
                          <Badge className="uppercase">
                            {domainInfo.domainData?.sendingMode === 'external'
                              ? 'Enabled'
                              : 'Disabled'}
                          </Badge>
                        </div>
                        <span>
                          Outgoing emails sent through UnInbox will be passed
                          onto separate email system for sending.
                        </span>
                        <span>
                          In this mode you must ensure that the sender can be
                          verified by the receiving email system.
                        </span>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <div className="flex justify-between">
            <div className="flex flex-col">
              <div className="text-base-11 font-bold uppercase">
                DNS Records
              </div>
              {!dnsLoading && (
                <div className="text-base-11 text-sm">
                  Last Checked: {lastChecked}
                </div>
              )}
            </div>
            <Button
              onClick={async () => {
                await recheckDNS();
                await refetch();
              }}
              variant="outline"
              disabled={isRecheckingDNS}
              size="icon">
              <ArrowClockwise
                className={`size-4 ${isRecheckingDNS && 'animate-spin'}`}
              />
            </Button>
          </div>

          {dnsError && (
            <Alert>
              <AlertTitle className="font-bold">
                There was an error while fetching DNS records
              </AlertTitle>
              <AlertDescription>{dnsError.message}</AlertDescription>
            </Alert>
          )}

          {domainDNSRecord?.dnsRecords && (
            <div>
              <Accordion
                type="multiple"
                className="w-full">
                <AccordionItem value="verification">
                  <AccordionTrigger>
                    <div className="flex w-full justify-between px-2">
                      <span className="font-bold">Verification</span>
                      <Badge className="uppercase">
                        {domainDNSRecord?.dnsRecords.verification.valid
                          ? 'Valid'
                          : 'Invalid'}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-2">
                      <div>
                        This record is used to verify that you own the domain.
                        Do not delete the record after verification.
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Type
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            TXT
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Name
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            {domainDNSRecord.dnsRecords.verification.name}
                          </span>
                        </div>
                        <CopyButton
                          iconSize={20}
                          text={domainDNSRecord.dnsRecords.verification.name}
                        />
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Value
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            {domainDNSRecord.dnsRecords.verification.value}
                          </span>
                        </div>
                        <CopyButton
                          iconSize={20}
                          text={domainDNSRecord.dnsRecords.verification.value}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="mx">
                  <AccordionTrigger>
                    <div className="flex w-full justify-between px-2">
                      <span className="font-bold">MX Records</span>
                      <Badge className="uppercase">
                        {domainDNSRecord?.dnsRecords.mx.valid
                          ? 'Valid'
                          : 'Invalid'}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-2">
                      <div>
                        To receive email natively into UnInbox without another
                        mail system, add an MX record with the following values.
                        This should be the only MX record for this domain. MX
                        records tell other email servers where to send email for
                        your domain.
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Type
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            MX
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Name
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            {domainDNSRecord.dnsRecords.mx.name}
                          </span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Priority
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3 text-center">
                            {domainDNSRecord.dnsRecords.mx.priority}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Value
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            {domainDNSRecord.dnsRecords.mx.value}
                          </span>
                        </div>
                        <CopyButton
                          iconSize={20}
                          text={domainDNSRecord.dnsRecords.mx.value}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="dkim">
                  <AccordionTrigger>
                    <div className="flex w-full justify-between px-2">
                      <span className="font-bold">DKIM Record</span>
                      <Badge className="uppercase">
                        {domainDNSRecord?.dnsRecords.dkim.valid
                          ? 'Valid'
                          : 'Invalid'}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-2">
                      <div>
                        To ensure email sent via UnInbox is delivered properly,
                        add a TXT record with the following value. DKIM records
                        help receivers verify the signature of an authorized
                        sender.
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Type
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            TXT
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Name
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            {domainDNSRecord.dnsRecords.dkim.name}
                          </span>
                        </div>
                        <CopyButton
                          iconSize={20}
                          text={domainDNSRecord.dnsRecords.dkim.name}
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Value
                          </span>
                          <span className="bg-muted text-base-11 break-all rounded p-3">
                            {domainDNSRecord.dnsRecords.dkim.value}
                          </span>
                        </div>
                        <CopyButton
                          iconSize={20}
                          text={domainDNSRecord.dnsRecords.dkim.value}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="spf">
                  <AccordionTrigger>
                    <div className="flex w-full justify-between px-2">
                      <span className="font-bold">SPF Records</span>
                      <Badge className="uppercase">
                        {domainDNSRecord?.dnsRecords.spf.valid
                          ? 'Valid'
                          : 'Invalid'}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-2">
                      <div>
                        To ensure email sent via UnInbox is delivered properly,
                        add a TXT record with the following value. SPF records
                        help receivers verify the email came from an authorized
                        sender.
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Type
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            TXT
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Name
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            {domainDNSRecord.dnsRecords.spf.name}
                          </span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Value
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            {domainDNSRecord.dnsRecords.spf.value}
                          </span>
                        </div>
                        <CopyButton
                          iconSize={20}
                          text={domainDNSRecord.dnsRecords.spf.value}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="return-path">
                  <AccordionTrigger>
                    <div className="flex w-full justify-between px-2">
                      <span className="font-bold">Return Path</span>
                      <Badge className="uppercase">
                        {domainDNSRecord?.dnsRecords.returnPath.valid
                          ? 'Valid'
                          : 'Invalid'}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-2">
                      <div>
                        To add a layer of reliability for sending emails, add a
                        CNAME record with the following values. Adding a return
                        path record helps stop undelivered emails from spamming
                        external services. Make sure to disable any proxy
                        settings.
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Type
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            CNAME
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Name
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            {domainDNSRecord.dnsRecords.returnPath.name}
                          </span>
                        </div>
                        <CopyButton
                          iconSize={20}
                          text={domainDNSRecord.dnsRecords.returnPath.name}
                        />
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Value
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            {domainDNSRecord.dnsRecords.returnPath.value}
                          </span>
                        </div>
                        <CopyButton
                          iconSize={20}
                          text={domainDNSRecord.dnsRecords.returnPath.value}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="dmarc">
                  <AccordionTrigger>
                    <div className="flex w-full justify-between px-2">
                      <span className="font-bold">DMARC Record</span>
                      <Badge className="uppercase">
                        {(domainDNSRecord?.dnsRecords.dmarc.policy ??
                          'none') !== 'none'
                          ? 'Valid'
                          : 'Invalid'}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-2">
                      <div>
                        DMARC records help receivers verify the email came from
                        an authorized sender. If you will only be sending email
                        via UnInbox, add a TXT record with the following value.
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Type
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            TXT
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Name
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            {domainDNSRecord.dnsRecords.dmarc.name}
                          </span>
                        </div>
                        <CopyButton
                          iconSize={20}
                          text={domainDNSRecord.dnsRecords.dmarc.name}
                        />
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Value
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            {domainDNSRecord.dnsRecords.dmarc.optimal}
                          </span>
                        </div>
                        <CopyButton
                          iconSize={20}
                          text={domainDNSRecord.dnsRecords.dmarc.optimal}
                        />
                      </div>
                      <div>
                        If you&apos;ll be sending mail from other services that
                        don&apos;t enforce DMARC, use this record instead.
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Type
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            TXT
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Name
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            {domainDNSRecord.dnsRecords.dmarc.name}
                          </span>
                        </div>
                        <CopyButton
                          iconSize={20}
                          text={domainDNSRecord.dnsRecords.dmarc.name}
                        />
                        <div className="flex flex-col">
                          <span className="text-base-11 text-sm uppercase">
                            Value
                          </span>
                          <span className="bg-muted text-base-11 rounded p-3">
                            {domainDNSRecord.dnsRecords.dmarc.acceptable}
                          </span>
                        </div>
                        <CopyButton
                          iconSize={20}
                          text={domainDNSRecord.dnsRecords.dmarc.acceptable}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </>
      ) : (
        !isLoading && (
          <div className="flex h-full flex-1 flex-col items-center justify-center gap-2">
            <div className="text-lg font-bold">Domain not found</div>
            <Button
              asChild
              className="w-fit">
              <Link href="./">Go Back</Link>
            </Button>
          </div>
        )
      )}
    </div>
  );
}
