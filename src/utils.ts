import { BigInt } from "@graphprotocol/graph-ts";

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
