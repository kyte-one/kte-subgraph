import { BigInt } from '@graphprotocol/graph-ts';
import { User, MarketUser } from '../generated/schema';
import { ZERO_BI, ONE_BI, TWO_BI } from './constant';

export function formatAssetFeedType(feedType: BigInt): string {
  if (feedType.equals(ZERO_BI)) {
    return 'Price';
  }

  if (feedType.equals(ONE_BI)) {
    return 'Volume';
  }

  if (feedType.equals(TWO_BI)) {
    return 'Rank';
  }

  return 'Price';
}

export function i32Min(a: i32, b: i32): i32 {
  if (a > b) return b;
  return a;
}

export function createUser(userId: string): User {
  let user = new User(userId);
  return user;
}

export function createMarketUser(userId: string, marketId: string): MarketUser {
  let marketUserId = `${marketId}-${userId}`;
  let marketUser = new MarketUser(marketUserId);
  marketUser.user = userId;
  marketUser.market = marketId;
  return marketUser;
}
