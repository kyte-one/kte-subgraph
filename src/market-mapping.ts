import {
  PlacePrediction,
  SettleMarket,
  DistributeMarketFee,
  ClaimReturns,
} from "../generated/templates/Market/Market";
import {
  MarketPrediction,
  User,
  Factory,
  Pool,
  Market,
} from "../generated/schema";
import { createMarketUser, createUser } from "./utils";
import { MARKET_FACTORY_ADDRESS, ONE_BI, ZERO_BI, TWO_BI } from "./constant";
import { BigInt } from "@graphprotocol/graph-ts";
import { MarketUser } from "../generated/schema";

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
    marketUser = createMarketUser(userId, marketId);
  }

  // Load pool
  let poolId = `${marketId}-${event.params.prediction}`;
  let pool = Pool.load(poolId);
  if (!pool) return;

  // Create new prediction
  let predictionId =
    event.transaction.hash.toHex() + "-" + event.logIndex.toString();
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
  user.totalPredictions = user.totalPredictions.plus(ONE_BI);
  user.totalParticipationAmount = user.totalParticipationAmount.plus(amount);

  // Update market stats
  market.totalParticipation = factory.totalParticipation.plus(amount);
  market.totalPredictions = factory.totalPredictions.plus(ONE_BI);

  // Update market user stats
  marketUser.totalParticipationAmount = marketUser.totalParticipationAmount.plus(
    amount
  );

  // Update pool stats
  pool.staked = pool.staked.plus(amount);
  pool.rewards = pool.rewards.plus(
    amount
      .times(BigInt.fromI32(leverage))
      .times(BigInt.fromI32(market.lossConstant))
      .div(BigInt.fromString("100"))
  );

  // Save changes
  marketPrediction.save();
  pool.save();
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

  // Load market user
  let marketUserId = `${marketId}-${userId}`;
  let marketUser = MarketUser.load(marketUserId);
  if (!marketUser) {
    marketUser = createMarketUser(userId, marketId);
  }

  user.totalSettled = user.totalSettled.plus(ONE_BI);

  pool.winningPool = true;

  market.winningPool = poolId;
  market.settler = event.params.settler;
  market.creatorReward = event.params.creatorReward;
  market.platformReward = event.params.platformReward;
  market.settlerReward = event.params.settlerReward;
  market.usersRewardPool = event.params.usersRewardPool;

  marketUser.isMarketSettler = true;

  factory.totalMarketsSettled = factory.totalMarketsSettled.plus(ONE_BI);
  if (factory.totalMarketsInTrading.gt(ZERO_BI)) {
    factory.totalMarketsInTrading = factory.totalMarketsInTrading.minus(ONE_BI);
  }

  user.save();
  pool.save();
  marketUser.save();
  market.save();
  factory.save();
}

export function handleDistributeMarketFee(event: DistributeMarketFee): void {
  // Load factory
  let factory = Factory.load(MARKET_FACTORY_ADDRESS);
  if (!factory) return;

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
    user.totalMarketCreationRewardClaimed = user.totalMarketCreationRewardClaimed.plus(
      reward
    );
    user.totalRewardClaimed = user.totalRewardClaimed.plus(reward);
  } else if (awardType.equals(ONE_BI)) {
    // update market user
    marketUser.settlementRewardClaimed = true;
    marketUser.creationReward = reward;

    // update market
    market.settlementRewardClaimed = true;

    // Update user
    user.totalSettlementRewardClaimed = user.totalSettlementRewardClaimed.plus(
      reward
    );
    user.totalRewardClaimed = user.totalRewardClaimed.plus(reward);
  } else {
    // update market
    market.platformRewardClaimed = true;
  }

  factory.totalRewardsDistributed = factory.totalRewardsDistributed.plus(
    reward
  );

  market.save();
  marketUser.save();
  user.save();
}

export function handleClaimReturns(event: ClaimReturns): void {

  // Load market
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

  if (profitLoss.ge(ZERO_BI)) {
    user.totalRewardClaimed = user.totalRewardClaimed.plus(profitLoss);
  }
  user.totalPNL = user.totalPNL.plus(profitLoss);

  user.save();
  marketUser.save();
}
