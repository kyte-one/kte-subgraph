import { BigInt } from "@graphprotocol/graph-ts";
import { CreateMarket } from '../generated/MarketFactory/MarketFactory';

export function formatAssetFeedType(feedType: BigInt): string {
  if (feedType.equals(BigInt.fromString("0"))) {
    return "Price";
  }

  if (feedType.equals(BigInt.fromString("1"))) {
    return "Volume";
  }

  if (feedType.equals(BigInt.fromString("2"))) {
    return "Rank";
  }

  return "Price";
}

export function BigMin(a: BigInt, b: BigInt): BigInt {
    if (a.gt(b)) {
        return b;
    }
    return a;
}
