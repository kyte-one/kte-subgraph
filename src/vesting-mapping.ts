import { Claim, User, VestingSchedule } from '../generated/schema';
import { AddVestingSchedule, ReleaseVestedToken } from '../generated/TokenVesting/TokenVesting';

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
  let amountReleased = event.params.amountReleased;
  let claimType = 'PostVesting';
  
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
  claim.amount = amountReleased;
  claim.beneficiary = userId;
  claim.vestingSchedule = vestingScheduleId;
  claim.claimType = claimType;
  claim.timestamp = event.block.timestamp.toI32();

  vestingSchedule.released = vestingSchedule.released.plus(amountReleased);

  user.totalReleased = user.totalReleased.plus(amountReleased);

  user.save();
  vestingSchedule.save();
  claim.save();
}
