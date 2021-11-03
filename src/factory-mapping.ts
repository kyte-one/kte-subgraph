import { BigInt } from '@graphprotocol/graph-ts';
import {
  AddAsset,
  AddMarketToken,
  CreateMarket,
  Init,
  UpdateLossConstant,
  UpdateMarketDurationParams,
  UpdateMarketFeesPercentage,
  UpdateMarketWindowParams,
  UpdateMinMarketLiquidity,
} from '../generated/MarketFactory/MarketFactory';
import { Asset, Factory, Market, MarketToken, Pool, User, MarketUser } from '../generated/schema';
import { Market as MarketTemplate } from '../generated/templates';
import { INFINITE_BI, MARKET_FACTORY_ADDRESS, ONE_BI, ZERO_BI } from './constant';
import { updateAssetDayData, updateAssetHourData } from './intervals/asset-interval';
import { updateFactoryDayData, updateFactoryHourData } from './intervals/factory-interval';
import { createMarketUser, createUser, formatAssetFeedType, i32Min } from './utils';

function createAndSavePool(poolId: string, marketId: string, upper: BigInt, lower: BigInt): Pool {
  let pool = new Pool(poolId);
  pool.market = marketId;
  pool.upper = upper;
  pool.lower = lower;
  pool.staked = ZERO_BI;
  pool.rewards = ZERO_BI;
  pool.winningPool = false;
  return pool;
}

function createPools(marketId: string, poolsRange: BigInt[]): void {
  for (let i = 0; i < poolsRange.length; i++) {
    let pool = createAndSavePool(`${marketId}-${i}`, marketId, poolsRange[i], i === 0 ? ZERO_BI : poolsRange[i - 1]);
    pool.save();
  }

  // Create last pool
  let pool = createAndSavePool(
    `${marketId}-${poolsRange.length}`,
    marketId,
    INFINITE_BI,
    poolsRange[poolsRange.length - 1]
  );
  pool.save();
}

export function handleInit(event: Init): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) {
    factory = new Factory(MARKET_FACTORY_ADDRESS);
  }
  factory.owner = event.params.creator.toHexString();
  factory.waitingWindow = event.params.WW.toI32();
  factory.reportingWindow = event.params.RW.toI32();
  factory.disputeWindow = event.params.DW.toI32();
  factory.minMarketLiquidity = event.params.minMarketLiquidity;
  factory.marketMinDuration = event.params.marketMinDuration.toI32();
  factory.marketMaxDuration = event.params.marketMaxDuration.toI32();
  factory.creatorFee = event.params.creatorFee;
  factory.settlerFee = event.params.settlerFee;
  factory.platformFee = event.params.platformFee;
  factory.lossConstant = event.params.lossConstant;
  factory.save();
}

export function handleAddAsset(event: AddAsset): void {
  // Check if factory exists
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;

  let asset = new Asset(event.params.id.toString());
  let assetNames = event.params.asset.toString().split(':');
  asset.asset0 = assetNames[0];
  asset.asset1 = assetNames[1];
  asset.creator = event.params.creator;
  asset.decimals = event.params.decimals;
  asset.assetFeedType = formatAssetFeedType(BigInt.fromI32(event.params.assetFeedType));
  asset.assetFeed = event.params.assetFeed;

  factory.totalAssets = factory.totalAssets + 1;

  updateFactoryHourData(event);
  updateFactoryDayData(event);

  asset.save();
  factory.save();
}

export function handleCreateMarket(event: CreateMarket): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;

  factory.totalMarkets = factory.totalMarkets + 1;
  factory.totalMarketsInTrading = factory.totalMarketsInTrading + 1;

  let userId = event.params.creator.toHexString();
  let assetId = event.params.assetId.toString();
  let marketId = event.params.id.toHexString();
  let createdAt = event.params.creationTime.toI32();
  let duration = event.params.duration.toI32();

  let asset = Asset.load(assetId);
  if (!asset) {
    return;
  }
  asset.totalMarkets = asset.totalMarkets + 1;

  let market = new Market(marketId);

  // Check if user exists
  let user = User.load(userId);
  if (!user) {
    user = createUser(userId);
    factory.totalParticipants = factory.totalParticipants + 1;
  }
  user.totalMarketCreated = user.totalMarketCreated + 1;

  // Load market user
  let marketUserId = `${marketId}-${userId}`;
  let marketUser = MarketUser.load(marketUserId);
  if (!marketUser) {
    marketUser = createMarketUser(userId, marketId);
    user.totalMarketParticipated = user.totalMarketParticipated + 1;
  }
  marketUser.isMarketCreator = true;

  market.phase = 'Trading';
  market.asset = assetId;
  market.duration = duration;

  market.token = event.params.token.toHexString();
  // Market time
  market.createdAtTimestamp = createdAt;
  market.startTimestamp = createdAt;
  market.tradingEndTimestamp = createdAt + duration;
  market.reportingEndTimestamp = market.tradingEndTimestamp + i32Min(factory.reportingWindow, duration);
  market.waitingEndTimestamp = market.reportingEndTimestamp + i32Min(factory.waitingWindow, duration);
  market.disputeEndTimestamp = market.reportingEndTimestamp + factory.disputeWindow;

  market.blockNumber = event.block.number;
  market.liquidity = event.params.liquidity;

  market.creationFee = factory.creatorFee;
  market.settlerFee = factory.settlerFee;
  market.platformFee = factory.platformFee;
  market.lossConstant = factory.lossConstant;

  // Create market pools
  createPools(marketId, event.params.poolsRange);

  updateAssetDayData(event, assetId);
  updateAssetHourData(event, assetId);
  updateFactoryHourData(event);
  updateFactoryDayData(event);

  // create the tracked contract based on the template
  MarketTemplate.create(event.params.id);
  user.save();
  market.save();
  marketUser.save();
  factory.save();
}

export function handleAddMarketToken(event: AddMarketToken): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;
  let marketToken = new MarketToken(event.params.marketToken.toHexString());
  marketToken.creator = event.block.author;
  factory.totalTokens = factory.totalTokens + 1;
  marketToken.save();
  factory.save();
}

export function handleUpdateMinMarketLiquidity(event: UpdateMinMarketLiquidity): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;
  factory.minMarketLiquidity = event.params.liquidity;
  factory.save();
}

export function handleUpdateLossConstant(event: UpdateLossConstant): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;
  factory.lossConstant = event.params.lossConstant;
  factory.save();
}

export function handleUpdateMarketWindowParams(event: UpdateMarketWindowParams): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;
  factory.waitingWindow = event.params.WW.toI32();
  factory.reportingWindow = event.params.RW.toI32();
  factory.disputeWindow = event.params.DW.toI32();
  factory.save();
}

export function handleUpdateMarketDurationParams(event: UpdateMarketDurationParams): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;
  factory.marketMinDuration = event.params.marketMinDuration.toI32();
  factory.marketMaxDuration = event.params.marketMaxDuration.toI32();
  factory.save();
}

export function handleUpdateMarketFeesPercentage(event: UpdateMarketFeesPercentage): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;
  factory.creatorFee = event.params.creatorFee;
  factory.settlerFee = event.params.settlerFee;
  factory.platformFee = event.params.platformFee;
  factory.save();
}
