export interface User {
  id: string;
  authId: string;
  nickname: string;
  phone: string;
  profilePicture?: string;
  invitationCode: string;
  referredBy?: string;
  balance: number;
  totalRecharge: number;
  totalWithdrawal: number;
  productRevenue: number;
  createdAt: Date;
}

export interface VIPPack {
  id: string;
  name: string;
  category: 'silver' | 'gold' | 'activity';
  level: number;
  price: number;
  dailyEarning: number;
  duration: number;
  totalRevenue: number;
  isLocked: boolean;
  isPaused?: boolean;
  requiredLevel?: number;
  image?: string;
}

export interface Order {
  id: string;
  userId: string;
  packId: string;
  pack: VIPPack;
  status: 'running' | 'completed';
  investedAmount: number;
  earnedAmount: number;
  maxRevenue: number;
  purchasedAt: Date;
  completesAt: Date;
}

export interface RechargeRequest {
  id: string;
  userId: string;
  amount: number;
  screenshot: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  processedAt?: Date;
}

export interface WithdrawRequest {
  id: string;
  userId: string;
  amount: number;
  taxAmount: number;
  netAmount: number;
  upiId?: string;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountName: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  processedAt?: Date;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  level: number;
  earnings: number;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'earning' | 'withdrawal' | 'referral' | 'offer' | 'system' | 'deposit' | 'purchase';
  isRead: boolean;
  createdAt: Date;
}
