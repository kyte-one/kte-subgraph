import { BigInt } from '@graphprotocol/graph-ts';
import { Asset, Factory, Market, MarketPrediction, MarketUser, Pool, User } from '../generated/schema';
import { ClaimReturns, DistributeMarketFee, PlacePrediction, SettleMarket } from '../generated/templates/Market/Market';
import { MARKET_FACTORY_ADDRESS, ONE_BI, TWO_BI, ZERO_BI } from './constant';
import { updateAssetDayData, updateAssetHourData } from './intervals/asset-interval';
import { updateFactoryDayData, updateFactoryHourData } from './intervals/factory-interval';
import { updateUserDayData, updateUserMonthData } from './intervals/user-interval';
import { createMarketUser, createUser } from './utils';

export function handlePlacePrediction(event: PlacePrediction): void {
  let amount = event.params.amount;
  let leverage = event.params.leverage;
  // Load factory
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;

  // Load market
  let marketId = event.params.market.toString();
  let market = Market.load(marketId);
  if (!market) return;

  //   Load asset
  let asset = Asset.load(market.asset);
  if (!asset) {
    return;
  }

  // Load or create new user
  let userId = event.params.user.toString();
  let user = User.load(userId);
  if (!user) {
    factory.totalParticipants = factory.totalParticipants.plus(ONE_BI);
    user = createUser(userId);
  }

  // Load market user
  let marketUserId = `${marketId}-${userId}`;
  let marketUser = MarketUser.load(marketUserId);
  if (!marketUser) {
    market.totalParticipants = market.totalParticipants + 1;
    marketUser = createMarketUser(userId, marketId);
  }

  // Load pool
  let poolId = `${marketId}-${event.params.prediction}`;
  let pool = Pool.load(poolId);
  if (!pool) return;

  // Create new prediction
  let predictionId = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  let marketPrediction = new MarketPrediction(predictionId);
  marketPrediction.market = marketId;
  marketPrediction.marketUser = marketUserId;
  marketPrediction.pool = poolId;
  marketPrediction.positions = event.params.positions;
  marketPrediction.leverage = leverage;
  marketPrediction.user = userId;
  marketPrediction.amount = amount;
  marketPrediction.boostMode = false;
  marketPrediction.timestamp = event.block.timestamp;

  // Update factory stats
  factory.totalParticipation = factory.totalParticipation.plus(amount);
  factory.totalPredictions = factory.totalPredictions.plus(ONE_BI);

  // Update user stats
  user.totalPredictions = user.totalPredictions + 1;
  user.totalParticipationAmount = user.totalParticipationAmount.plus(amount);
  user.numReturnsPending = user.numReturnsPending + 1;

  // Update market stats
  market.totalParticipation = market.totalParticipation.plus(amount);
  market.totalPredictions = market.totalPredictions + 1;

  // Update assets
  asset.totalParticipation = asset.totalParticipation.plus(amount);
  asset.totalPredictions = asset.totalPredictions.plus(ONE_BI);

  // Update market user stats
  marketUser.totalParticipationAmount = marketUser.totalParticipationAmount.plus(amount);

  // Update pool stats
  pool.staked = pool.staked.plus(amount);
  pool.rewards = pool.rewards.plus(
    amount.times(BigInt.fromI32(leverage)).times(BigInt.fromI32(market.lossConstant)).div(BigInt.fromString('100'))
  );

  updateAssetDayData(event, market.asset);
  updateAssetHourData(event, market.asset);
  updateFactoryHourData(event);
  updateFactoryDayData(event);

  // Save changes
  marketPrediction.save();
  pool.save();
  asset.save();
  marketUser.save();
  market.save();
  user.save();
  factory.save();
}

export function handleSettleMarket(event: SettleMarket): void {
  // Load factory
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;

  // Load market
  let marketId = event.params.market.toString();
  let market = Market.load(marketId);
  if (!market) return;

  // Load pool
  let poolId = `${marketId}-${event.params.winningPool}`;
  let pool = Pool.load(poolId);
  if (!pool) return;

  // Load or create new user
  let userId = event.params.settler.toString();
  let user = User.load(userId);
  if (!user) {
    user = createUser(userId);
  }

  //   Load asset
  let asset = Asset.load(market.asset);
  if (!asset) {
    return;
  }

  // Load market user
  let marketUserId = `${marketId}-${userId}`;
  let marketUser = MarketUser.load(marketUserId);
  if (!marketUser) {
    marketUser = createMarketUser(userId, marketId);
  }

  user.totalSettled = user.totalSettled + 1;

  pool.winningPool = true;

  market.winningPool = poolId;
  market.settler = event.params.settler;
  market.creatorReward = event.params.creatorReward;
  market.platformReward = event.params.platformReward;
  market.settlerReward = event.params.settlerReward;
  market.usersRewardPool = event.params.usersRewardPool;

  marketUser.isMarketSettler = true;

  factory.totalMarketsSettled = factory.totalMarketsSettled + 1;
  factory.totalRewards = factory.totalRewards.plus(event.params.rewardPool);
  if (factory.totalMarketsInTrading > 0) {
    factory.totalMarketsInTrading = factory.totalMarketsInTrading - 1;
  }

  asset.totalRewards = asset.totalRewards.plus(event.params.rewardPool);

  updateAssetDayData(event, market.asset);
  updateAssetHourData(event, market.asset);
  updateFactoryHourData(event);
  updateFactoryDayData(event);

  user.save();
  pool.save();
  asset.save();
  marketUser.save();
  market.save();
  factory.save();
}

export function handleDistributeMarketFee(event: DistributeMarketFee): void {
  // Load market
  let marketId = event.params.market.toString();
  let market = Market.load(marketId);
  if (!market) return;

  // Load or create new user
  let userId = event.params.user.toString();
  let user = User.load(userId);
  if (!user) {
    user = createUser(userId);
  }

  // Load market user
  let marketUserId = `${marketId}-${userId}`;
  let marketUser = MarketUser.load(marketUserId);
  if (!marketUser) {
    marketUser = createMarketUser(userId, marketId);
  }

  // 0: Creator, 1: Settler, 2: platform
  let awardType = BigInt.fromI32(event.params.awardType);
  let reward = event.params.amount;

  if (awardType.gt(TWO_BI)) {
    return;
  }

  if (awardType.equals(ZERO_BI)) {
    // update market user
    marketUser.creationRewardClaimed = true;
    marketUser.creationReward = reward;

    // update market
    market.creationRewardClaimed = true;

    // Update user
    user.totalMarketCreationRewardClaimed = user.totalMarketCreationRewardClaimed.plus(reward);
  } else if (awardType.equals(ONE_BI)) {
    // update market user
    marketUser.settlementRewardClaimed = true;
    marketUser.settlementReward = reward;

    // update market
    market.settlementRewardClaimed = true;

    // Update user
    user.totalSettlementRewardClaimed = user.totalSettlementRewardClaimed.plus(reward);
  } else {
    // update market
    market.platformRewardClaimed = true;
  }

  if (awardType.le(ONE_BI)) {
    user.totalRewardsClaimed = user.totalRewardsClaimed.plus(reward);
    user.totalPNL = user.totalPNL.plus(reward);
  }

  market.save();
  marketUser.save();
  user.save();
}

export function handleClaimReturns(event: ClaimReturns): void {
  let marketId = event.params.market.toString();

  // Load or create new user
  let userId = event.params.user.toString();
  let user = User.load(userId);
  if (!user) {
    user = createUser(userId);
  }

  // Load market user
  let marketUserId = `${marketId}-${userId}`;
  let marketUser = MarketUser.load(marketUserId);
  if (!marketUser) {
    marketUser = createMarketUser(userId, marketId);
  }

  let totalReturns = event.params.totalReturns;
  let profitLoss = totalReturns.minus(event.params.participationAmount);

  marketUser.totalReturns = totalReturns;
  marketUser.returnsClaimed = true;

  user.totalReturnsClaimed = user.totalReturnsClaimed.plus(totalReturns);
  if (profitLoss.ge(ZERO_BI)) {
    user.totalRewardsClaimed = user.totalRewardsClaimed.plus(profitLoss);
  }
  user.totalPNL = user.totalPNL.plus(profitLoss);
  if (user.numReturnsPending > 0) {
    user.numReturnsPending = user.numReturnsPending - 1;
  }

  updateUserDayData(event, userId);
  updateUserMonthData(event, userId);

  user.save();
  marketUser.save();
}
