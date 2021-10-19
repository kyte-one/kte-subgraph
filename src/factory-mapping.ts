import { Bytes, Value, BigInt } from "@graphprotocol/graph-ts";
import {
  AddAsset,
  CreateMarket,
  AddMarketToken,
  UpdateMinMarketLiquidity,
  UpdateLossConstant,
} from "../generated/MarketFactory/MarketFactory";
import { Asset, Market, Factory, User } from "../generated/schema";

import { ZERO_BI, MARKET_FACTORY_ADDRESS, ONE_BI } from './constant';
import { formatAssetFeedType } from './utils';

function createFactory(owner: string): Factory {
  let factory = new Factory(MARKET_FACTORY_ADDRESS);
  factory.totalMarkets = ZERO_BI;
  factory.totalPredictions = ZERO_BI;
  factory.totalParticipants = ZERO_BI;
  factory.totalParticipation = ZERO_BI;
  factory.totalRewardsDistributed = ZERO_BI;
  factory.totalMarketsInTrading = ZERO_BI;
  factory.totalMarketsInWaiting = ZERO_BI;
  factory.totalMarketsInReporting = ZERO_BI;
  factory.totalMarketsReadyToSettled = ZERO_BI;
  factory.totalMarketsInDispute = ZERO_BI;
  factory.totalMarketsSettled = ZERO_BI;
  factory.owner = owner;
  return factory;
}

function createUser(userId: string): User {
  let user = new User(userId);
  user.totalMarketCreated = ZERO_BI;
  user.totalPredictions = ZERO_BI;
  user.totalSettled = ZERO_BI;
  user.totalRewardClaimed = ZERO_BI;
  user.totalPRClaimed = ZERO_BI;
  user.totalMCRClaimed = ZERO_BI;
  user.totalSRClaimed = ZERO_BI;
  user.totalLoss = ZERO_BI;
  user.totalPNL = ZERO_BI;
  return user;
}

export function handleAssetAdded(event: AddAsset): void {
  // Check if factory exists
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (factory === null) {
    factory = createFactory(event.params.creator.toString());
  }

  let asset = new Asset(event.params.id.toString());
  let assetNames = Value.fromBytes(event.params.asset).toString().split(':');
  asset.asset0 = assetNames[0];
  asset.asset1 = assetNames[1];
  asset.creator = event.params.creator;
  asset.decimals = event.params.decimals;
  // TODO
  asset.assetFeedType = 'Price';
  asset.assetFeed = event.params.assetFeed;
  asset.totalMarkets = ZERO_BI;
  asset.totalPredictions = ZERO_BI;
  asset.totalParticipants = ZERO_BI;
  asset.totalParticipation = ZERO_BI;
  asset.totalRewardsDistributed = ZERO_BI;
  asset.save();
  factory.save();
}

export function handleMarketCreated(event: CreateMarket): void {
  let userId = event.params.creator.toString();
  let market = new Market(event.params.id.toString());
  let user = User.load(userId);
  if (user === null) {
    user = createUser(userId);
  }
  user.totalMarketCreated = user.totalMarketCreated.plus(ONE_BI);
}

export function handleAddMarketToken(event: AddMarketToken): void {}

export function handleUpdateMinMarketLiquidity(
  event: UpdateMinMarketLiquidity
): void {}

export function handleUpdateLossConstant(event: UpdateLossConstant): void {}
