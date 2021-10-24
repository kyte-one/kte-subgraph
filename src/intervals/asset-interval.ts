import { ethereum } from '@graphprotocol/graph-ts';
import { Asset, AssetDayData, AssetHourData } from '../../generated/schema';

export function updateAssetHourData(event: ethereum.Event, assetId: string): void {
  let asset = Asset.load(assetId);
  if (!asset) return;

  let timestamp = event.block.timestamp.toI32();
  let hourIndex = timestamp / 3600; // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600; // want the rounded effect
  let assetHourId = assetId.concat('-').concat(hourIndex.toString());
  let assetHourData = AssetHourData.load(assetHourId);
  if (!assetHourData) {
    assetHourData = new AssetHourData(assetHourId);
    assetHourData.timestamp = hourStartUnix;
  }

  assetHourData.participation = asset.totalParticipation;
  assetHourData.predictions = asset.totalPredictions;
  assetHourData.rewards = asset.totalRewards;

  assetHourData.save();
}

export function updateAssetDayData(event: ethereum.Event, assetId: string): void {
  let asset = Asset.load(assetId);
  if (!asset) return;

  let timestamp = event.block.timestamp.toI32();
  let dayId = timestamp / 86400; // rounded
  let dayStartTimestamp = dayId * 86400;

  let assetDayData = AssetDayData.load(dayId.toString());

  if (!assetDayData) {
    assetDayData = new AssetDayData(dayId.toString());
    assetDayData.timestamp = dayStartTimestamp;
  }

  assetDayData.participation = asset.totalParticipation;
  assetDayData.predictions = asset.totalPredictions;
  assetDayData.rewards = asset.totalRewards;

  assetDayData.save();
}
