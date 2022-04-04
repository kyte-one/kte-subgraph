import { Claim, User, VestingSchedule } from '../generated/schema';
import { AddVestingSchedule, ReleaseVestedToken, UpfrontTokenTransfer } from '../generated/TokenVesting/TokenVesting';

export function handleAddVestingSchedule(event: AddVestingSchedule): void {
  // Create a new vesting schedule
  let vestingScheduleId = event.params.vestingScheduleId.toHexString();
  let vestingSchedule = new VestingSchedule(vestingScheduleId);
  // Load or create new user
  let userId = event.params.beneficiary.toHexString();
  let user = User.load(userId);
  if (!user) {
    user = new User(userId);
  }

  vestingSchedule.id = vestingScheduleId;
  vestingSchedule.beneficiary = userId;

  vestingSchedule.cliff = event.params.cliff.toI32();
  vestingSchedule.start = event.params.start.toI32();
  vestingSchedule.duration = event.params.duration.toI32();
  vestingSchedule.slicePeriodSeconds = event.params.slicePeriodSeconds.toI32();
  vestingSchedule.revocable = event.params.revocable;
  vestingSchedule.amountTotal = event.params.amountTotal;
  vestingSchedule.released = event.params.released;
  vestingSchedule.revoked = event.params.revoked;
  vestingSchedule.upFront = event.params.upFront;

  user.totalAllocation = user.totalAllocation.plus(vestingSchedule.amountTotal);

  user.save();
  vestingSchedule.save();
}

export function handleReleaseVestedToken(event: ReleaseVestedToken): void {
  let vestingScheduleId = event.params.vestingScheduleId.toHexString();
  let userId = event.params.beneficiary.toHexString();
  let amount = event.params.amount;
  let vestingSchedule = VestingSchedule.load(vestingScheduleId);
  if (!vestingSchedule) {
    return;
  }

  let user = User.load(userId);
  if (!user) {
    return;
  }

  //Extract to common function
  let claim = new Claim(event.transaction.hash.toHexString());
  claim.amount = amount;
  claim.beneficiary = userId;
  claim.vestingSchedule = vestingScheduleId;
  claim.timestamp = event.block.timestamp.toI32();
  claim.claimType = 'PostVesting';

  vestingSchedule.released = vestingSchedule.released.plus(amount);
  user.totalReleased = user.totalReleased.plus(amount);

  user.save();
  vestingSchedule.save();
  claim.save();
}

export function handleUpfrontTokenTransfer(event: UpfrontTokenTransfer): void {
  let vestingScheduleId = event.params.vestingScheduleId.toHexString();
  let amount = event.params.amount;

  // Load or create new user
  let userId = event.params.beneficiary.toHexString();
  let user = User.load(userId);
  if (!user) {
    user = new User(userId);
  }

  // Load or create vesting
  let vestingId = event.params.vestingScheduleId.toHexString();
  let vesting = VestingSchedule.load(vestingId);
  if (!vesting) {
    vesting = new VestingSchedule(vestingId);
  }

  //Extract to common function
  let claim = new Claim(event.transaction.hash.toHexString());
  claim.amount = amount;
  claim.beneficiary = userId;
  claim.vestingSchedule = vestingScheduleId;
  claim.timestamp = event.block.timestamp.toI32();
  claim.claimType = 'UpFront';

  vesting.released = vesting.released.plus(amount);
  user.totalReleased = user.totalReleased.plus(amount);

  user.save();
  vesting.save();
  claim.save();
}
