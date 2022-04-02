import { BigInt } from '@graphprotocol/graph-ts';
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
