import type { Timestamp } from "firebase/firestore";

export type CompanyStatus = "researching" | "ready" | "error";

export type KeyPerson = {
  name: string;
  role: string;
  source?: string;
};

export type RecentNewsItem = {
  headline: string;
  date?: string;
  url: string;
  summary?: string;
};

export type FundingInfo = {
  lastRound?: string;
  amount?: string;
  date?: string;
  investors?: string[];
};

export type SocialLinks = {
  linkedin?: string;
  twitter?: string;
};

export type CompanyProfile = {
  description?: string;
  industry?: string;
  sizeEstimate?: string;
  headquarters?: string;
  technologies?: string[];
  keyPeople?: KeyPerson[];
  recentNews?: RecentNewsItem[];
  funding?: FundingInfo;
  socials?: SocialLinks;
};

export type SourceRef = {
  url: string;
  title?: string;
  fetchedAt: Timestamp;
};

export type Company = {
  id: string;
  name: string;
  domain: string;
  interest?: string;
  status: CompanyStatus;
  profile: CompanyProfile;
  sources: SourceRef[];
  ownerUid?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type EmailStatus = "draft" | "pending_approval" | "approved" | "rejected";

export type DraftedEmail = {
  id: string;
  subject: string;
  body: string;
  recommendedSendTrigger: string;
  status: EmailStatus;
  draftedAt: Timestamp;
  approvedAt?: Timestamp;
  revisionOf?: string;
};
