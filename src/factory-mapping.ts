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
import { Asset, Factory, Market, MarketToken, Pool, User } from '../generated/schema';
import { MARKET_FACTORY_ADDRESS, ZERO_BI } from './constant';
import { updateAssetDayData, updateAssetHourData } from './intervals/asset-interval';
import { updateFactoryDayData, updateFactoryHourData } from './intervals/factory-interval';
import { BigMin, createUser, formatAssetFeedType } from './utils';

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

  let lastPoolId = poolsRange.length + 1;

  // Create last pool
  let pool = createAndSavePool(
    `${marketId}-${lastPoolId}`,
    marketId,
    BigInt.fromString(Number.MAX_SAFE_INTEGER.toString()),
    poolsRange[poolsRange.length]
  );
  pool.save();
}

export function handleInit(event: Init): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) {
    factory = new Factory(MARKET_FACTORY_ADDRESS);
  }
  factory.owner = event.params.creator.toHexString();
  factory.ww = event.params.WW;
  factory.rw = event.params.RW;
  factory.dw = event.params.DW;
  factory.minMarketLiquidity = event.params.minMarketLiquidity;
  factory.marketMinDuration = event.params.marketMinDuration;
  factory.marketMaxDuration = event.params.marketMaxDuration;
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
  let createdAt = event.params.creationTime;

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
  }
  user.totalMarketCreated = user.totalMarketCreated + 1;

  market.phase = 'Trading';
  market.asset = assetId;
  market.duration = event.params.duration;

  market.token = event.params.token.toHexString();
  // Market time
  market.createdAtTimestamp = createdAt;
  market.tradingEndTimestamp = createdAt.plus(market.duration);
  market.reportingEndTimestamp = market.tradingEndTimestamp.plus(BigMin(factory.rw, market.duration));
  market.waitingEndTimestamp = market.reportingEndTimestamp.plus(BigMin(factory.ww, market.duration));
  market.disputeEndTimestamp = market.reportingEndTimestamp.plus(factory.dw);

  market.createdAtBlockNumber = event.block.number;
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

  user.save();
  market.save();
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
  factory.ww = event.params.WW;
  factory.rw = event.params.RW;
  factory.dw = event.params.DW;
  factory.save();
}

export function handleUpdateMarketDurationParams(event: UpdateMarketDurationParams): void {
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;
  factory.marketMinDuration = event.params.marketMinDuration;
  factory.marketMaxDuration = event.params.marketMaxDuration;
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
