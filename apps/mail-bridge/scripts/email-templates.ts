import { nanoid } from 'nanoid';

export const testEmail = ({ from, to }: { from: string; to: string }) =>
  `
X-Postal-Spam: no
X-Postal-Spam-Threshold: 5.0
X-Postal-Spam-Score: -0.1
X-Postal-Threat: no
Received: from zero.e.uninbox.com (zero.e.uninbox.com [5.161.244.126]) by zero.e.uninbox.dev with SMTP; Fri, 16 Aug 2024 12:11:19 -0000
Resent-Sender: svc1si@unrp.uninbox.com
DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;
	d=uninbox.com;
	s=unplatform-ZqqqgePA; t=1723810279;
	bh=jGTLdTi+Nu+6d2Vfh9z99cMVoICgU6gc5Q9wnRwXOh8=;
	h=date:from:sender:to:message-id:subject:mime-version:content-type:content-transfer-encoding;
	b=JzYNWFTFigG8gHZrk6tr4gRiv/LW8M7P7Uy0hyL3RILQNm8mGcw4eFlrm04zIa3T/tkSdL5q
	Fu5ncLMjULJ4nDk7jPUT0O2MUc7LqW0SSDQJFU/G35ne0x2//QHMi6Y5OC0HEvJ/nOK7ReQF
	Yjgv5g+W+NJf6eDn0NvmjNdq/ZE=
X-Postal-MsgID: fJ077hTPCLaYaRzp
Received: from api (2a00:20:6089:11a1:9038:24ab:ce50:b528 [2a00:20:6089:11a1:9038:24ab:ce50:b528]) by zero.e.uninbox.com with HTTP; Fri, 16 Aug 2024 12:10:24 +0000
Date: Fri, 16 Aug 2024 12:10:24 +0000
From: ${from}
Sender: ${from}
To: ${to}
Message-ID: <${nanoid(16)}@rp.zero.e.uninbox.com>
Subject: Mock email for ${to}
Mime-Version: 1.0
Content-Type: multipart/mixed;
 boundary="--==_mimepart_66bf41b0450df_9e498410621";
 charset=UTF-8
Content-Transfer-Encoding: 7bit


----==_mimepart_66bf41b0450df_9e498410621
Content-Type: multipart/alternative;
 boundary="--==_mimepart_66bf41b044f79_9e4984105b3"
Content-Transfer-Encoding: 7bit


----==_mimepart_66bf41b044f79_9e4984105b3
Content-Type: text/plain;
 charset=UTF-8
Content-Transfer-Encoding: 7bit

This is a test email
----==_mimepart_66bf41b044f79_9e4984105b3
Content-Type: text/html;
 charset=UTF-8
Content-Transfer-Encoding: 7bit

<p>This is a test email</p>
----==_mimepart_66bf41b044f79_9e4984105b3--

----==_mimepart_66bf41b0450df_9e498410621--
`.trim();
